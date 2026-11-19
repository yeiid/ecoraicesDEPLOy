import os
import time
import uuid
import asyncio
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.db.database import get_db
from app.models import Observation, Species, User, Category, Comment, Community
from .users import get_current_user_id

router = APIRouter(
    prefix="/observations",
    tags=["observations"]
)

UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", "/app/public/uploads/observations"))

import re

def _extract_height_meters(obs) -> float:
    """Obtiene la altura arbórea en metros desde notas ('Altura: Xm') o altitud válida de copa (2..45m)."""
    notes_txt = getattr(obs, "notes", None) or ""
    match = re.search(r"Altura:\s*(\d+(?:\.\d+)?)\s*m", notes_txt, flags=re.IGNORECASE)
    if match:
        val = float(match.group(1))
        if 2.0 <= val <= 45.0:
            return val
    alt = getattr(obs, "altitude", None)
    if alt is not None:
        try:
            alt_f = float(alt)
            if 2.0 <= alt_f <= 45.0:
                return alt_f
        except (TypeError, ValueError):
            pass
    return 10.0

async def sync_observation_to_postgis(species, observation, explicit_height: Optional[float] = None):
    postgis_url = os.getenv("POSTGIS_URL")
    if not postgis_url:
        print("[PostGIS Sync] POSTGIS_URL no definido. La sincronización geoespacial estará desactivada.")
        return None
        
    try:
        import asyncpg
        conn = await asyncpg.connect(postgis_url)
        
        if explicit_height is not None and 2.0 <= float(explicit_height) <= 45.0:
            height = float(explicit_height)
        else:
            height = _extract_height_meters(observation)
        
        speciesName = "Árbol Registrado"
        if species:
            speciesName = species.name or getattr(species, 'scientificName', "Árbol Registrado")
        
        type_ = "arbol"
        if species and species.category:
            type_ = species.category.name or "arbol"
            
        query = """
            INSERT INTO gis.geo2 (geom, height, name, type)
            VALUES (
              ST_SetSRID(ST_Point($1, $2), 4326),
              $3,
              $4,
              $5
            )
            RETURNING id;
        """
        
        values = (
            float(observation.longitude),
            float(observation.latitude),
            height,
            speciesName,
            type_
        )
        
        row = await conn.fetchrow(query, *values)
        await conn.close()
        
        print(f"[PostGIS Sync] Sincronización exitosa. Creado registro ID {row['id']} en tabla 'geo2'.")
        return row['id']
    except Exception as e:
        print(f"[PostGIS Sync] Error al sincronizar con PostGIS: {e}")
        return None

@router.get("/geojson")
def get_observations_geojson(
    limit: int = 500,
    db: Session = Depends(get_db)
):
    """Devuelve el Catastro Arbóreo en formato GeoJSON (RFC 7946) listo para capas WebGL 3D (fill-extrusion) y GIS."""
    limit = max(1, min(limit, 1000))
    observations = db.query(Observation).order_by(Observation.createdAt.desc()).limit(limit).all()
    species_ids = {o.speciesId for o in observations if o.speciesId}
    species_map = {s.id: s for s in db.query(Species).filter(Species.id.in_(species_ids)).all()} if species_ids else {}
    category_ids = {s.categoryId for s in species_map.values() if getattr(s, 'categoryId', None)}
    category_map = {c.id: c for c in db.query(Category).filter(Category.id.in_(category_ids)).all()} if category_ids else {}

    features = []
    for obs in observations:
        if obs.latitude is None or obs.longitude is None:
            continue
        sp = species_map.get(obs.speciesId)
        cat = category_map.get(getattr(sp, 'categoryId', None)) if sp else None
        sp_name = sp.name if sp else "Árbol Registrado"
        sci_name = getattr(sp, 'scientificName', None) if sp else None
        low = f"{sp_name} {sci_name or ''}".lower()
        is_invasive = any(k in low for k in ("neem", "nim", "azadirachta"))
        height_m = _extract_height_meters(obs)
        canopy_r = round(max(2.2, min(6.0, height_m * 0.42)), 2)

        features.append({
            "type": "Feature",
            "id": obs.id,
            "geometry": {
                "type": "Point",
                "coordinates": [float(obs.longitude), float(obs.latitude)]
            },
            "properties": {
                "id": obs.id,
                "speciesId": obs.speciesId,
                "speciesName": sp_name,
                "scientificName": sci_name,
                "category": cat.name if cat else None,
                "municipio": obs.municipio,
                "heightMeters": height_m,
                "canopyRadiusMeters": canopy_r,
                "trunkRadiusMeters": round(max(0.38, canopy_r * 0.14), 2),
                "status": obs.status,
                "verified": obs.status == "APPROVED",
                "isInvasive": is_invasive,
                "imageUrl": obs.imageUrl,
                "notes": obs.notes,
                "observationDate": obs.observationDate.isoformat() if obs.observationDate else None,
            }
        })

    return {
        "type": "FeatureCollection",
        "name": "ecoraices_catastro_arboreo",
        "features": features
    }

@router.get("")
@router.get("/")
def get_observations(
    categoryId: Optional[str] = None,
    verified: Optional[bool] = None,
    dateFrom: Optional[str] = None,
    dateTo: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    limit = max(1, min(limit, 500))
    query = db.query(Observation)
    
    if categoryId:
        query = query.join(Species).filter(Species.categoryId == categoryId)
        
    if verified is True:
        query = query.filter(Observation.status == 'APPROVED')
        
    if dateFrom:
        query = query.filter(Observation.observationDate >= datetime.fromisoformat(dateFrom))
        
    if dateTo:
        end_date = datetime.fromisoformat(dateTo)
        query = query.filter(Observation.observationDate <= end_date.replace(hour=23, minute=59, second=59))
        
    query = query.order_by(Observation.createdAt.desc()).offset(offset).limit(limit)
    observations = query.all()

    # Batch-load related entities INSTEAD of N+1 queries.
    species_ids = {o.speciesId for o in observations if o.speciesId}
    user_ids = {o.userId for o in observations if o.userId}
    species_map = {s.id: s for s in db.query(Species).filter(Species.id.in_(species_ids)).all()} if species_ids else {}
    category_ids = {s.categoryId for s in species_map.values() if getattr(s, 'categoryId', None)}
    category_map = {c.id: c for c in db.query(Category).filter(Category.id.in_(category_ids)).all()} if category_ids else {}
    user_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    formatted = []
    for obs in observations:
        obs_dict = {
            "id": obs.id,
            "speciesId": obs.speciesId,
            "userId": obs.userId,
            "observationDate": obs.observationDate.isoformat() if obs.observationDate else None,
            "latitude": obs.latitude,
            "longitude": obs.longitude,
            "altitude": obs.altitude,
            "heightMeters": _extract_height_meters(obs),
            "municipio": obs.municipio,
            "estadoConservacion": obs.estadoConservacion,
            "notes": obs.notes,
            "imageUrl": obs.imageUrl,
            "status": obs.status,
            "createdAt": obs.createdAt.isoformat() if obs.createdAt else None,
            "verified": obs.status == 'APPROVED',
            "isVerified": obs.status == 'APPROVED',
        }
        species_obj = species_map.get(obs.speciesId)
        if species_obj:
            category_obj = category_map.get(getattr(species_obj, 'categoryId', None))
            obs_dict["species"] = {
                "id": species_obj.id,
                "name": species_obj.name,
                "scientificName": getattr(species_obj, 'scientificName', None),
                "category": {"id": category_obj.id, "name": category_obj.name} if category_obj else None,
            }
        user_obj = user_map.get(obs.userId)
        if user_obj:
            obs_dict["user"] = {"id": user_obj.id, "username": user_obj.username, "avatarUrl": user_obj.avatarUrl}
        formatted.append(obs_dict)

    return formatted

from pydantic import BaseModel

class ObservationValidationRequest(BaseModel):
    scientificName: Optional[str] = None
    commonName: Optional[str] = None
    notes: Optional[str] = None
    approved: Optional[bool] = False

@router.post("")
@router.post("/")
async def create_observation(
    request: Request,
    clientId: Optional[str] = Form(None),
    speciesId: Optional[str] = Form(None),
    nombreComunitario: Optional[str] = Form(None),
    nombreCientificoPropuesto: Optional[str] = Form(None),
    communityId: Optional[str] = Form(None),
    verificationNotes: Optional[str] = Form(None),
    estadoFitosanitario: Optional[str] = Form(None),
    observationDate: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    altitude: Optional[float] = Form(None),
    alturaArbol: Optional[float] = Form(None),
    municipio: Optional[str] = Form(None),
    estadoConservacion: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    imageUrl: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    from sqlalchemy.exc import IntegrityError

    user_id = get_current_user_id(request)
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(status_code=401, detail="Sesión inválida o usuario no encontrado. Inicia sesión nuevamente.")

    clean_client_id = clientId.strip()[:64] if clientId and clientId.strip() else None

    # Idempotencia para sincronización offline (Web PWA y App React Native):
    # Si el árbol con este clientId ya fue registrado previamente, devolvemos el existente
    # sin volver a escribir la imagen ni duplicar puntos en PostgreSQL/PostGIS.
    if clean_client_id:
        existing_obs = db.query(Observation).filter(Observation.id == clean_client_id).first()
        if existing_obs:
            return {
                "id": existing_obs.id,
                "speciesId": existing_obs.speciesId,
                "userId": existing_obs.userId,
                "communityId": existing_obs.communityId,
                "observationDate": existing_obs.observationDate.isoformat() if existing_obs.observationDate else None,
                "latitude": existing_obs.latitude,
                "longitude": existing_obs.longitude,
                "altitude": existing_obs.altitude,
                "municipio": existing_obs.municipio,
                "estadoConservacion": existing_obs.estadoConservacion,
                "notes": existing_obs.notes,
                "imageUrl": existing_obs.imageUrl,
                "status": existing_obs.status,
                "deduplicated": True,
            }

    # Validar si el speciesId enviado realmente existe en el catálogo remoto
    resolved_species_id = speciesId.strip() if speciesId and speciesId.strip() else None
    if resolved_species_id:
        existing_by_id = db.query(Species).filter(Species.id == resolved_species_id).first()
        if not existing_by_id:
            resolved_species_id = None

    # Resolver especie por nombre común o científico si no se envió un speciesId válido
    if not resolved_species_id:
        if not nombreComunitario or not nombreComunitario.strip():
            raise HTTPException(status_code=400, detail="Debes indicar el nombre comunitario o local del árbol.")

        comm_name = nombreComunitario.strip()
        sci_prop = (nombreCientificoPropuesto or "").strip()

        existing_sp = db.query(Species).filter(Species.name.ilike(comm_name)).first()
        if not existing_sp and sci_prop:
            existing_sp = db.query(Species).filter(Species.scientificName.ilike(sci_prop)).first()

        if existing_sp:
            resolved_species_id = existing_sp.id
        else:
            first_cat = db.query(Category).first()
            if not first_cat:
                first_cat = Category(
                    id="c" + uuid.uuid4().hex[:24],
                    name="Flora General",
                    description="Categoría creada automáticamente para observaciones comunitarias."
                )
                db.add(first_cat)
                db.flush()

            new_sci = sci_prop if sci_prop else f"Pendiente ({comm_name[:18]} - {uuid.uuid4().hex[:6]})"
            new_sp = Species(
                id="c" + uuid.uuid4().hex[:24],
                name=comm_name,
                scientificName=new_sci,
                categoryId=first_cat.id,
                status="PENDIENTE_VALIDACION",
                description=f"Ejemplar registrado por la comunidad en {municipio or 'el territorio'}. Pendiente de validación taxonómica por la red local."
            )
            db.add(new_sp)
            try:
                db.commit()
                db.refresh(new_sp)
                resolved_species_id = new_sp.id
            except IntegrityError:
                db.rollback()
                fallback_sp = (
                    db.query(Species).filter(Species.scientificName.ilike(new_sci)).first()
                    or db.query(Species).filter(Species.name.ilike(comm_name)).first()
                )
                if fallback_sp:
                    resolved_species_id = fallback_sp.id
                else:
                    retry_sp = Species(
                        id="c" + uuid.uuid4().hex[:24],
                        name=comm_name,
                        scientificName=f"{new_sci[:40]} ({uuid.uuid4().hex[:6]})",
                        categoryId=first_cat.id,
                        status="PENDIENTE_VALIDACION",
                        description=f"Ejemplar registrado por la comunidad en {municipio or 'el territorio'}."
                    )
                    db.add(retry_sp)
                    db.commit()
                    db.refresh(retry_sp)
                    resolved_species_id = retry_sp.id

    # Validar communityId si fue enviado para evitar errores de clave foránea con IDs offline
    resolved_community_id = None
    if communityId and communityId.strip():
        comm_obj = db.query(Community).filter(Community.id == communityId.strip()).first()
        if comm_obj:
            resolved_community_id = comm_obj.id

    image_url = None
    file_path = None
    if image and image.filename:
        try:
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            ext = "".join(Path(image.filename).suffixes)
            if not ext or len(ext) > 10:
                ext = ".jpg"
            file_name = f"{uuid.uuid4().hex}-{int(time.time() * 1000)}{ext}"
            file_path = UPLOADS_DIR / file_name
            # Streaming write in 1 MiB chunks with 10 MiB cap — avoids loading into RAM
            MAX_IMAGE_SIZE = 10 * 1024 * 1024
            size = 0
            with open(file_path, "wb") as f:
                while True:
                    chunk = await image.read(1 * 1024 * 1024)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > MAX_IMAGE_SIZE:
                        f.close()
                        file_path.unlink(missing_ok=True)
                        raise HTTPException(status_code=413, detail="La imagen supera el tamaño máximo de 10 MiB")
                    f.write(chunk)

            if size > 0:
                image_url = f"/uploads/observations/{file_name}"
            else:
                file_path.unlink(missing_ok=True)
                file_path = None
        except HTTPException:
            raise
        except OSError as upload_err:
            print(f"[Observations Upload] No se pudo guardar imagen en disco: {upload_err}")
            if file_path is not None:
                file_path.unlink(missing_ok=True)
                file_path = None
            image_url = None
    elif imageUrl and imageUrl.strip().startswith("/uploads/"):
        image_url = imageUrl.strip()

    # Parsear fecha ISO de manera segura
    clean_date = (observationDate or "").strip()
    if clean_date.endswith("Z"):
        clean_date = clean_date[:-1]
    try:
        parsed_date = datetime.fromisoformat(clean_date) if clean_date else datetime.utcnow()
    except ValueError:
        parsed_date = datetime.utcnow()

    full_notes = notes or ""
    if alturaArbol is not None and 2.0 <= alturaArbol <= 45.0:
        if not re.search(r"Altura:\s*\d", full_notes, flags=re.IGNORECASE):
            full_notes = f"Altura: {round(alturaArbol, 1)}m. {full_notes}".strip()
    if estadoFitosanitario and estadoFitosanitario.strip():
        fit_note = f"Condición de salud: {estadoFitosanitario.strip()}"
        full_notes = f"{fit_note}. {full_notes}".strip()

    # ObservationStatus enum en PostgreSQL solo admite PENDING | APPROVED | REJECTED
    status_initial = "PENDING"

    observation = Observation(
        id=clean_client_id if clean_client_id else uuid.uuid4().hex,
        speciesId=resolved_species_id,
        userId=user_id,
        communityId=resolved_community_id,
        observationDate=parsed_date,
        latitude=latitude,
        longitude=longitude,
        altitude=altitude,
        municipio=municipio.strip() if municipio and municipio.strip() else None,
        estadoConservacion=estadoConservacion,
        notes=full_notes if full_notes else None,
        imageUrl=image_url,
        status=status_initial,
        verificationNotes=verificationNotes.strip() if verificationNotes and verificationNotes.strip() else None
    )

    db.add(observation)
    try:
        db.commit()
        db.refresh(observation)
    except IntegrityError as ie:
        db.rollback()
        if file_path is not None:
            file_path.unlink(missing_ok=True)
        if clean_client_id:
            existing_obs = db.query(Observation).filter(Observation.id == clean_client_id).first()
            if existing_obs:
                return {
                    "id": existing_obs.id,
                    "speciesId": existing_obs.speciesId,
                    "userId": existing_obs.userId,
                    "communityId": existing_obs.communityId,
                    "observationDate": existing_obs.observationDate.isoformat() if existing_obs.observationDate else None,
                    "latitude": existing_obs.latitude,
                    "longitude": existing_obs.longitude,
                    "altitude": existing_obs.altitude,
                    "heightMeters": _extract_height_meters(existing_obs),
                    "municipio": existing_obs.municipio,
                    "estadoConservacion": existing_obs.estadoConservacion,
                    "notes": existing_obs.notes,
                    "imageUrl": existing_obs.imageUrl,
                    "status": existing_obs.status,
                    "deduplicated": True,
                }
        print(f"[Observations Create] IntegrityError: {ie}")
        raise HTTPException(status_code=400, detail="No se pudo guardar la observación por conflicto de datos relacionados.")

    species = db.query(Species).filter(Species.id == resolved_species_id).first()
    asyncio.create_task(sync_observation_to_postgis(species, observation, alturaArbol))

    return {
        "id": observation.id,
        "speciesId": observation.speciesId,
        "userId": observation.userId,
        "communityId": observation.communityId,
        "observationDate": observation.observationDate.isoformat() if observation.observationDate else None,
        "latitude": observation.latitude,
        "longitude": observation.longitude,
        "altitude": observation.altitude,
        "heightMeters": _extract_height_meters(observation),
        "municipio": observation.municipio,
        "estadoConservacion": observation.estadoConservacion,
        "notes": observation.notes,
        "imageUrl": observation.imageUrl,
        "status": observation.status,
    }

@router.post("/{id}/validate")
def validate_observation_community(
    id: str,
    data: ObservationValidationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(request)
    obs = db.query(Observation).filter(Observation.id == id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observación no encontrada")

    user = db.query(User).filter(User.id == user_id).first()
    author_name = user.name or user.username if user else "Validador comunitario"

    # Actualizar o sugerir nombre científico
    if data.scientificName and data.scientificName.strip():
        sci_clean = data.scientificName.strip()
        matched = db.query(Species).filter(Species.scientificName.ilike(sci_clean)).first()
        if not matched:
            current_sp = db.query(Species).filter(Species.id == obs.speciesId).first()
            if current_sp and "Pendiente" in (current_sp.scientificName or ""):
                current_sp.scientificName = sci_clean
                if data.commonName and data.commonName.strip():
                    current_sp.name = data.commonName.strip()
                current_sp.status = "VALIDADA_COMUNIDAD"
                db.commit()
            else:
                first_cat = db.query(Category).first()
                new_sp = Species(
                    id="c" + uuid.uuid4().hex[:24],
                    name=data.commonName.strip() if data.commonName else (current_sp.name if current_sp else "Árbol Validado"),
                    scientificName=sci_clean,
                    categoryId=first_cat.id if first_cat else None,
                    status="VALIDADA_COMUNIDAD"
                )
                db.add(new_sp)
                db.commit()
                db.refresh(new_sp)
                obs.speciesId = new_sp.id
        else:
            obs.speciesId = matched.id

    if data.notes and data.notes.strip():
        prev_notes = obs.verificationNotes or ""
        new_entry = f"[{author_name}]: {data.notes.strip()}"
        obs.verificationNotes = f"{prev_notes}\n{new_entry}".strip()

    if data.approved:
        obs.status = "APPROVED"
        obs.verifiedById = user_id
        obs.verifiedAt = datetime.utcnow()
    else:
        obs.status = "PENDING"

    db.commit()
    db.refresh(obs)
    return {"message": "Validación comunitaria registrada con éxito", "status": obs.status}

@router.get("/{id}")
def get_observation_detail(id: str, db: Session = Depends(get_db)):
    obs = db.query(Observation).filter(Observation.id == id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observación no encontrada")
        
    species_obj = db.query(Species).filter(Species.id == obs.speciesId).first() if obs.speciesId else None
    category_obj = None
    if species_obj and getattr(species_obj, 'categoryId', None):
        category_obj = db.query(Category).filter(Category.id == species_obj.categoryId).first()
        
    user_obj = db.query(User).filter(User.id == obs.userId).first() if obs.userId else None
    
    community_obj = None
    if obs.communityId:
        community_obj = db.query(Community).filter(Community.id == obs.communityId).first()

    comments = db.query(Comment).filter(Comment.observationId == id).order_by(Comment.createdAt.asc()).all()
    comments_list = []
    for c in comments:
        c_user = db.query(User).filter(User.id == c.userId).first() if c.userId else None
        comments_list.append({
            "id": c.id,
            "content": c.content,
            "createdAt": c.createdAt.isoformat() if c.createdAt else None,
            "user": {
                "id": c_user.id if c_user else c.userId,
                "username": c_user.username if c_user else "Usuario",
                "name": c_user.name if c_user else None,
                "avatarUrl": c_user.avatarUrl if c_user else None,
            }
        })
        
    community_data = {
        "id": community_obj.id,
        "name": community_obj.name,
        "location": community_obj.location,
        "description": community_obj.description
    } if community_obj else None

    return {
        "id": obs.id,
        "speciesId": obs.speciesId,
        "userId": obs.userId,
        "communityId": obs.communityId,
        "community": community_data,
        "observationDate": obs.observationDate.isoformat() if obs.observationDate else None,
        "latitude": obs.latitude,
        "longitude": obs.longitude,
        "altitude": obs.altitude,
        "municipio": obs.municipio,
        "estadoConservacion": obs.estadoConservacion,
        "notes": obs.notes,
        "imageUrl": obs.imageUrl,
        "status": obs.status,
        "verificationNotes": obs.verificationNotes,
        "verified": obs.status == "APPROVED",
        "isVerified": obs.status == "APPROVED",
        "createdAt": obs.createdAt.isoformat() if obs.createdAt else None,
        "species": {
            "id": species_obj.id,
            "name": species_obj.name,
            "scientificName": getattr(species_obj, 'scientificName', None),
            "description": getattr(species_obj, 'description', None),
            "imageUrl": getattr(species_obj, 'imageUrl', None),
            "commonName": getattr(species_obj, 'name', None),
            "category": {
                "id": category_obj.id,
                "name": category_obj.name
            } if category_obj else None
        } if species_obj else None,
        "category": {
            "id": category_obj.id,
            "name": category_obj.name
        } if category_obj else None,
        "user": {
            "id": user_obj.id if user_obj else obs.userId,
            "username": user_obj.username if user_obj else "Anónimo",
            "name": user_obj.name if user_obj else None,
            "avatarUrl": user_obj.avatarUrl if user_obj else None,
        } if user_obj else None,
        "comments": comments_list
    }

@router.delete("/{id}")
def delete_observation(id: str, request: Request, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    user = db.query(User).filter(User.id == user_id).first()
    
    obs = db.query(Observation).filter(Observation.id == id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observación no encontrada")
        
    if obs.userId != user_id and not getattr(user, 'isAdmin', False):
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar esta observación")
        
    db.delete(obs)
    db.commit()
    return {"message": "Observación eliminada exitosamente"}

