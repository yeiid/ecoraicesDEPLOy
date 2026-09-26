import uuid
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Community, CommunityMember, User, Observation, Species
from app.models.community import MemberRole
from .users import get_current_user_id

router = APIRouter(
    prefix="/communities",
    tags=["communities"]
)

class CommunityCreateSchema(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    imageUrl: Optional[str] = None

class CommunityUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    imageUrl: Optional[str] = None

class MemberActionSchema(BaseModel):
    self: Optional[bool] = True
    userId: Optional[str] = None
    role: Optional[str] = "MEMBER"

@router.get("")
@router.get("/")
def get_communities(db: Session = Depends(get_db)):
    communities = db.query(Community).order_by(Community.name.asc()).all()
    
    communities_list = []
    for c in communities:
        member_count = db.query(CommunityMember).filter(CommunityMember.communityId == c.id).count()
        owner = db.query(User).filter(User.id == c.ownerId).first()
        communities_list.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "location": c.location,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "imageUrl": c.imageUrl,
            "createdAt": c.createdAt.isoformat() if c.createdAt else None,
            "owner": {
                "id": owner.id if owner else None,
                "name": owner.name if owner else None,
                "username": owner.username if owner else None,
            },
            "_count": {
                "members": member_count
            }
        })
        
    return communities_list

@router.post("")
@router.post("/")
def create_community(request: Request, data: CommunityCreateSchema, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    
    if not data.name or not data.name.strip():
        raise HTTPException(status_code=400, detail="El nombre de la comunidad es obligatorio")
        
    comm_id = "c" + uuid.uuid4().hex[:24]
    
    community = Community(
        id=comm_id,
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        location=data.location.strip() if data.location else None,
        latitude=data.latitude,
        longitude=data.longitude,
        imageUrl=data.imageUrl.strip() if data.imageUrl else None,
        ownerId=user_id
    )
    db.add(community)
    
    # Add owner as admin member
    member = CommunityMember(
        id="cm" + uuid.uuid4().hex[:22],
        userId=user_id,
        communityId=comm_id,
        role=MemberRole.ADMIN
    )
    db.add(member)
    db.commit()
    db.refresh(community)
    
    return {
        "id": community.id,
        "name": community.name,
        "message": "Comunidad creada exitosamente"
    }

@router.get("/{id}")
def get_community_detail(id: str, db: Session = Depends(get_db)):
    community = db.query(Community).filter(Community.id == id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Comunidad no encontrada")
        
    owner = db.query(User).filter(User.id == community.ownerId).first()
    
    # Get members
    members = db.query(CommunityMember).filter(CommunityMember.communityId == id).all()
    members_list = []
    for m in members:
        u = db.query(User).filter(User.id == m.userId).first()
        members_list.append({
            "id": m.id,
            "userId": m.userId,
            "role": m.role.value if hasattr(m.role, 'value') else str(m.role),
            "joinedAt": m.joinedAt.isoformat() if m.joinedAt else None,
            "user": {
                "id": u.id if u else m.userId,
                "name": u.name if u else "Usuario",
                "username": u.username if u else "usuario",
                "avatarUrl": u.avatarUrl if u else None
            }
        })
        
    # Get community observations
    observations = db.query(Observation).filter(Observation.communityId == id).order_by(Observation.createdAt.desc()).all()
    observations_list = []
    for obs in observations:
        species = db.query(Species).filter(Species.id == obs.speciesId).first() if obs.speciesId else None
        observations_list.append({
            "id": obs.id,
            "observationDate": obs.observationDate.isoformat() if obs.observationDate else None,
            "status": obs.status,
            "imageUrl": obs.imageUrl,
            "species": {
                "id": species.id if species else None,
                "name": species.name if species else "Especie desconocida",
                "scientificName": getattr(species, 'scientificName', None) if species else None,
            } if species else None
        })
        
    return {
        "community": {
            "id": community.id,
            "name": community.name,
            "description": community.description,
            "location": community.location,
            "latitude": community.latitude,
            "longitude": community.longitude,
            "imageUrl": community.imageUrl,
            "createdAt": community.createdAt.isoformat() if community.createdAt else None,
            "ownerId": community.ownerId,
            "owner": {
                "id": owner.id if owner else community.ownerId,
                "name": owner.name if owner else None,
                "username": owner.username if owner else "Usuario",
            },
            "_count": {
                "members": len(members_list)
            },
            "members": members_list
        },
        "observations": observations_list
    }

@router.put("/{id}")
def update_community(id: str, request: Request, data: CommunityUpdateSchema, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    user = db.query(User).filter(User.id == user_id).first()
    
    community = db.query(Community).filter(Community.id == id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Comunidad no encontrada")
        
    if community.ownerId != user_id and not getattr(user, 'isAdmin', False):
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar esta comunidad")
        
    if data.name is not None and data.name.strip():
        community.name = data.name.strip()
    if data.description is not None:
        community.description = data.description.strip() if data.description else None
    if data.location is not None:
        community.location = data.location.strip() if data.location else None
    if data.latitude is not None:
        community.latitude = data.latitude
    if data.longitude is not None:
        community.longitude = data.longitude
    if data.imageUrl is not None:
        community.imageUrl = data.imageUrl.strip() if data.imageUrl else None
        
    db.commit()
    db.refresh(community)
    
    return {
        "id": community.id,
        "name": community.name,
        "message": "Comunidad actualizada exitosamente"
    }

@router.delete("/{id}")
def delete_community(id: str, request: Request, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    user = db.query(User).filter(User.id == user_id).first()
    
    community = db.query(Community).filter(Community.id == id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Comunidad no encontrada")
        
    if community.ownerId != user_id and not getattr(user, 'isAdmin', False):
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar esta comunidad")
        
    db.delete(community)
    db.commit()
    
    return {"message": "Comunidad eliminada exitosamente"}

@router.post("/{id}/members")
def join_or_add_member(id: str, request: Request, data: MemberActionSchema = MemberActionSchema(), db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    target_user_id = data.userId if (data.userId and not data.self) else user_id
    
    community = db.query(Community).filter(Community.id == id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Comunidad no encontrada")
        
    existing = db.query(CommunityMember).filter(
        CommunityMember.communityId == id,
        CommunityMember.userId == target_user_id
    ).first()
    
    if existing:
        return {"message": "Ya eres miembro de esta comunidad"}
        
    role_enum = MemberRole.MEMBER
    if data.role and data.role.upper() in ["ADMIN", "MODERATOR", "MEMBER"]:
        role_enum = MemberRole[data.role.upper()]
        
    new_member = CommunityMember(
        id="cm" + uuid.uuid4().hex[:22],
        userId=target_user_id,
        communityId=id,
        role=role_enum
    )
    db.add(new_member)
    db.commit()
    
    return {"message": "¡Te uniste a la comunidad exitosamente!"}

@router.delete("/{id}/members")
def leave_or_remove_member(id: str, request: Request, data: MemberActionSchema = MemberActionSchema(), db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    target_user_id = data.userId if (data.userId and not data.self) else user_id
    
    community = db.query(Community).filter(Community.id == id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Comunidad no encontrada")
        
    if target_user_id == community.ownerId:
        raise HTTPException(status_code=400, detail="El creador no puede abandonar la comunidad.")
        
    member = db.query(CommunityMember).filter(
        CommunityMember.communityId == id,
        CommunityMember.userId == target_user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="No eres miembro de esta comunidad")
        
    db.delete(member)
    db.commit()
    
    return {"message": "Has abandonado la comunidad"}
