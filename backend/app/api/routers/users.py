from typing import Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import User, Observation, Species, Community, CommunityMember
from jose import jwt, JWTError
from app.core.security import JWT_SECRET, ALGORITHM, verify_password, get_password_hash

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

perfil_router = APIRouter(
    prefix="/perfil",
    tags=["perfil"]
)

class ProfileUpdateSchema(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None

class PasswordChangeSchema(BaseModel):
    currentPassword: str
    newPassword: str

def get_current_user_id(request: Request):
    # 1. From request.cookies
    token = request.cookies.get("ecoraices_token")
    
    # 2. From Authorization header
    if not token:
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            
    # 3. From Cookie header string
    if not token:
        cookie_str = request.headers.get("cookie") or request.headers.get("Cookie")
        if cookie_str:
            import re
            match = re.search(r'(?:^|;\s*)ecoraices_token=([^;]+)', cookie_str)
            if match:
                token = match.group(1).strip()

    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("userId")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

def get_profile_data(user_id: str, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    observations = db.query(Observation).filter(Observation.userId == user_id).order_by(Observation.createdAt.desc()).limit(20).all()
    observations_list = []
    for o in observations:
        species = db.query(Species).filter(Species.id == o.speciesId).first()
        observations_list.append({
            "id": o.id,
            "status": o.status,
            "latitude": o.latitude,
            "longitude": o.longitude,
            "createdAt": o.createdAt.isoformat() if o.createdAt else None,
            "species": {
                "id": species.id if species else None,
                "name": species.name if species else None,
                "scientificName": species.scientificName if species else None,
                "imageUrl": species.imageUrl if species else None
            }
        })
        
    memberships = db.query(CommunityMember).filter(CommunityMember.userId == user_id).all()
    community_ids = [m.communityId for m in memberships]
    
    communities = db.query(Community).filter(Community.id.in_(community_ids)).all() if community_ids else []
    communities_list = []
    
    for c in communities:
        member = next((m for m in memberships if m.communityId == c.id), None)
        communities_list.append({
            "id": c.id,
            "name": c.name,
            "location": c.location,
            "role": member.role.value if hasattr(member.role, 'value') else str(member.role) if member else "MEMBER"
        })
        
    return {
        "profile": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "name": user.name,
            "avatarUrl": user.avatarUrl,
            "bio": user.bio,
            "role": user.role,
            "isAdmin": user.isAdmin,
            "createdAt": user.createdAt.isoformat() if user.createdAt else None
        },
        "observations": observations_list,
        "communities": communities_list
    }

def update_user_profile(user_id: str, data: ProfileUpdateSchema, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if data.username and data.username != user.username:
        existing = db.query(User).filter(User.username == data.username, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
        user.username = data.username.strip()

    if data.email and data.email != user.email:
        existing = db.query(User).filter(User.email == data.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="El correo electrónico ya está en uso")
        user.email = data.email.strip().lower()

    if data.name is not None:
        user.name = data.name.strip() if data.name else None

    if data.avatarUrl is not None:
        user.avatarUrl = data.avatarUrl.strip() if data.avatarUrl else None

    if data.bio is not None:
        user.bio = data.bio.strip() if data.bio else None

    db.commit()
    db.refresh(user)

    return {
        "message": "Perfil actualizado correctamente",
        "profile": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "name": user.name,
            "avatarUrl": user.avatarUrl,
            "bio": user.bio,
            "role": user.role,
            "isAdmin": user.isAdmin
        }
    }

def change_user_password(user_id: str, data: PasswordChangeSchema, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not verify_password(data.currentPassword, user.passwordHash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")

    if len(data.newPassword) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres")

    user.passwordHash = get_password_hash(data.newPassword)
    db.commit()

    return {"message": "Contraseña actualizada exitosamente"}

# Routes on /api/users
@router.get("/me/profile")
def get_my_profile(request: Request, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    return get_profile_data(user_id, db)

@router.patch("/me/profile")
@router.patch("/me")
def patch_my_profile(request: Request, data: ProfileUpdateSchema, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    return update_user_profile(user_id, data, db)

@router.put("/me/password")
@router.put("/me/change-password")
def put_my_password(request: Request, data: PasswordChangeSchema, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    return change_user_password(user_id, data, db)

# Routes on /api/perfil
@perfil_router.get("")
@perfil_router.get("/")
def get_perfil(request: Request, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    return get_profile_data(user_id, db)

@perfil_router.patch("")
@perfil_router.patch("/")
def patch_perfil(request: Request, data: ProfileUpdateSchema, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    return update_user_profile(user_id, data, db)

@perfil_router.put("/password")
def put_perfil_password(request: Request, data: PasswordChangeSchema, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    return change_user_password(user_id, data, db)
