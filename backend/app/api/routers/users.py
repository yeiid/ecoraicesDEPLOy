from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import User, Observation, Species, Community, CommunityMember
from jose import jwt, JWTError
from app.core.security import JWT_SECRET, ALGORITHM

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

def get_current_user_id(request: Request):
    token = request.cookies.get("ecoraices_token")
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

@router.get("/me/profile")
def get_my_profile(request: Request, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    
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
        
    # Get communities where user is a member
    memberships = db.query(CommunityMember).filter(CommunityMember.userId == user_id).all()
    community_ids = [m.communityId for m in memberships]
    
    communities = db.query(Community).filter(Community.id.in_(community_ids)).all()
    communities_list = []
    
    for c in communities:
        member = next((m for m in memberships if m.communityId == c.id), None)
        communities_list.append({
            "id": c.id,
            "name": c.name,
            "location": c.location,
            "role": member.role if member else "MEMBER"
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
