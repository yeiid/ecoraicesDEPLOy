import os
import time
import uuid
import asyncio
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db
from app.models import Observation, Species, User, Category
from .users import get_current_user_id

router = APIRouter(
    prefix="/observations",
    tags=["observations"]
)

UPLOADS_DIR = Path("/home/yeiid/Escritorio/marcaneuraljira/EcoRaicesastro/ecoraices/frontend/public/uploads/observations")

async def sync_observation_to_postgis(species, observation):
    postgis_url = os.getenv("POSTGIS_URL")
    if not postgis_url:
        print("[PostGIS Sync] POSTGIS_URL no definido. La sincronización geoespacial estará desactivada.")
        return None
        
    try:
        import asyncpg
        conn = await asyncpg.connect(postgis_url)
        
        measuredHeight = float(observation.altitude) if observation.altitude is not None else None
        height = measuredHeight if measuredHeight is not None and measuredHeight > 0 else 12.0
        
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

@router.get("/")
def get_observations(
    categoryId: Optional[str] = None,
    verified: Optional[bool] = None,
    dateFrom: Optional[str] = None,
    dateTo: Optional[str] = None,
    db: Session = Depends(get_db)
):
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
        
    query = query.order_by(Observation.createdAt.desc())
    observations = query.all()
    
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
            "municipio": obs.municipio,
            "estadoConservacion": obs.estadoConservacion,
            "notes": obs.notes,
            "imageUrl": obs.imageUrl,
            "status": obs.status,
            "createdAt": obs.createdAt.isoformat() if obs.createdAt else None,
            "verified": obs.status == 'APPROVED',
            "isVerified": obs.status == 'APPROVED',
        }
        
        species_obj = db.query(Species).filter(Species.id == obs.speciesId).first()
        if species_obj:
            category_obj = db.query(Category).filter(Category.id == species_obj.categoryId).first() if getattr(species_obj, 'categoryId', None) else None
            obs_dict["species"] = {
                "id": species_obj.id,
                "name": species_obj.name,
                "scientificName": getattr(species_obj, 'scientificName', None),
                "category": {
                    "id": category_obj.id,
                    "name": category_obj.name
                } if category_obj else None
            }
            
        user_obj = db.query(User).filter(User.id == obs.userId).first()
        if user_obj:
            obs_dict["user"] = {
                "id": user_obj.id,
                "username": user_obj.username,
                "avatarUrl": user_obj.avatarUrl
            }
            
        formatted.append(obs_dict)
        
    return formatted

@router.post("/")
async def create_observation(
    request: Request,
    speciesId: str = Form(...),
    observationDate: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    altitude: Optional[float] = Form(None),
    municipio: Optional[str] = Form(None),
    estadoConservacion: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(request)
    
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    
    image_url = None
    if image and image.filename:
        ext = "".join(Path(image.filename).suffixes)
        if not ext:
            ext = ".jpg"
        file_name = f"{uuid.uuid4().hex}-{int(time.time() * 1000)}{ext}"
        file_path = UPLOADS_DIR / file_name
        
        contents = await image.read()
        with open(file_path, "wb") as f:
            f.write(contents)
            
        image_url = f"/uploads/observations/{file_name}"
        
    # parse datetime from iso string
    # handling 'Z' suffix if present
    if observationDate.endswith('Z'):
        observationDate = observationDate[:-1]
    parsed_date = datetime.fromisoformat(observationDate)
    
    observation = Observation(
        id=uuid.uuid4().hex,
        speciesId=speciesId,
        userId=user_id,
        observationDate=parsed_date,
        latitude=latitude,
        longitude=longitude,
        altitude=altitude,
        municipio=municipio,
        estadoConservacion=estadoConservacion,
        notes=notes,
        imageUrl=image_url,
        status="PENDING"
    )
    
    db.add(observation)
    db.commit()
    db.refresh(observation)
    
    species = db.query(Species).filter(Species.id == speciesId).first()
    asyncio.create_task(sync_observation_to_postgis(species, observation))
    
    return {
        "id": observation.id,
        "speciesId": observation.speciesId,
        "userId": observation.userId,
        "observationDate": observation.observationDate.isoformat() if observation.observationDate else None,
        "latitude": observation.latitude,
        "longitude": observation.longitude,
        "altitude": observation.altitude,
        "municipio": observation.municipio,
        "estadoConservacion": observation.estadoConservacion,
        "notes": observation.notes,
        "imageUrl": observation.imageUrl,
        "status": observation.status,
    }
