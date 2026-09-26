import asyncio
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models import Observation, Species, Community, User, CommunityMember
from .users import get_current_user_id

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)

class ObservationStatusUpdate(BaseModel):
    status: str
    verificationNotes: Optional[str] = None

class UserUpdateSchema(BaseModel):
    isAdmin: Optional[bool] = None
    role: Optional[str] = None

def get_current_admin(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = get_current_user_id(request)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.isAdmin:
        raise HTTPException(status_code=403, detail="Acceso denegado: se requieren permisos de administrador")
    return user

@router.get("/dashboard")
def get_admin_dashboard(db: Session = Depends(get_db)):
    # Stats
    obs_count = db.query(Observation).count()
    obs_pending = db.query(Observation).filter(Observation.status == "PENDING").count()
    obs_approved = db.query(Observation).filter(Observation.status == "APPROVED").count()
    obs_rejected = db.query(Observation).filter(Observation.status == "REJECTED").count()
    community_count = db.query(Community).count()
    species_count = db.query(Species).count()
    user_count = db.query(User).count()
    
    # Communities with owner and member count
    communities = db.query(Community).order_by(Community.createdAt.desc()).all()
    communities_list = []
    for c in communities:
        member_count = db.query(CommunityMember).filter(CommunityMember.communityId == c.id).count()
        owner = db.query(User).filter(User.id == c.ownerId).first()
        communities_list.append({
            "id": c.id,
            "name": c.name,
            "location": c.location,
            "createdAt": c.createdAt.isoformat() if c.createdAt else None,
            "owner": {
                "id": owner.id if owner else None,
                "username": owner.username if owner else None,
                "name": owner.name if owner else None,
            },
            "_count": {
                "members": member_count
            }
        })
        
    # Recent Observations
    observations = db.query(Observation).order_by(Observation.createdAt.desc()).limit(100).all()
    observations_list = []
    for o in observations:
        species = db.query(Species).filter(Species.id == o.speciesId).first()
        user = db.query(User).filter(User.id == o.userId).first()
        observations_list.append({
            "id": o.id,
            "status": o.status,
            "createdAt": o.createdAt.isoformat() if o.createdAt else None,
            "species": {
                "id": species.id if species else None,
                "name": species.name if species else None,
                "scientificName": getattr(species, 'scientificName', None) if species else None,
            },
            "user": {
                "id": user.id if user else None,
                "username": user.username if user else None,
            }
        })
        
    # Registered Users
    users = db.query(User).order_by(User.createdAt.desc()).all()
    users_list = []
    for u in users:
        obs_cnt = db.query(Observation).filter(Observation.userId == u.id).count()
        users_list.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "name": u.name,
            "avatarUrl": u.avatarUrl,
            "role": u.role,
            "isAdmin": u.isAdmin,
            "createdAt": u.createdAt.isoformat() if u.createdAt else None,
            "observationsCount": obs_cnt
        })
        
    return {
        "stats": {
            "obsCount": obs_count,
            "obsPending": obs_pending,
            "obsApproved": obs_approved,
            "obsRejected": obs_rejected,
            "communityCount": community_count,
            "speciesCount": species_count,
            "userCount": user_count
        },
        "communities": communities_list,
        "observations": observations_list,
        "users": users_list
    }

@router.get("/users")
def get_admin_users(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.createdAt.desc()).all()
    users_list = []
    for u in users:
        obs_cnt = db.query(Observation).filter(Observation.userId == u.id).count()
        users_list.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "name": u.name,
            "avatarUrl": u.avatarUrl,
            "role": u.role,
            "isAdmin": u.isAdmin,
            "createdAt": u.createdAt.isoformat() if u.createdAt else None,
            "observationsCount": obs_cnt
        })
    return users_list

@router.patch("/users/{id}")
def update_user_status(id: str, data: UserUpdateSchema, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if data.isAdmin is not None:
        if data.isAdmin is False and target.id == admin.id:
            raise HTTPException(status_code=400, detail="No puedes revocar tus propios permisos de administrador")
        target.isAdmin = data.isAdmin
        
    if data.role is not None:
        if data.role.upper() in ["COLLECTOR", "COMMUNITY"]:
            target.role = data.role.upper()
            
    db.commit()
    db.refresh(target)
    
    return {
        "message": "Usuario actualizado exitosamente",
        "user": {
            "id": target.id,
            "username": target.username,
            "role": target.role,
            "isAdmin": target.isAdmin
        }
    }

@router.delete("/users/{id}")
def delete_user(id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    if id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta de administrador")
        
    target = db.query(User).filter(User.id == id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    db.delete(target)
    db.commit()
    
    return {"message": "Usuario eliminado exitosamente"}

@router.patch("/observations/{id}")
def update_observation_status(
    id: str,
    data: ObservationStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    obs = db.query(Observation).filter(Observation.id == id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observación no encontrada")
        
    new_status = data.status.upper()
    if new_status not in ["APPROVED", "REJECTED", "PENDING"]:
        raise HTTPException(status_code=400, detail="Estado inválido. Debe ser APPROVED, REJECTED o PENDING")
        
    obs.status = new_status
    obs.verifiedById = admin.id
    obs.verifiedAt = datetime.utcnow()
    if data.verificationNotes is not None:
        obs.verificationNotes = data.verificationNotes
        
    db.commit()
    db.refresh(obs)
    
    # If approved, sync to PostGIS
    if new_status == "APPROVED":
        try:
            from .observations import sync_observation_to_postgis
            species = db.query(Species).filter(Species.id == obs.speciesId).first() if obs.speciesId else None
            asyncio.create_task(sync_observation_to_postgis(species, obs))
        except Exception as e:
            print(f"[Admin Verification] Error al disparar PostGIS sync: {e}")
            
    return {
        "message": f"Observación {new_status.lower()} exitosamente",
        "status": obs.status,
        "id": obs.id
    }

@router.delete("/observations/{id}")
def delete_observation_admin(
    id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    obs = db.query(Observation).filter(Observation.id == id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observación no encontrada")
        
    db.delete(obs)
    db.commit()
    
    return {"message": "Observación eliminada exitosamente"}

