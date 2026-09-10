from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Community, CommunityMember, User

router = APIRouter(
    prefix="/communities",
    tags=["communities"]
)

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
            "imageUrl": c.imageUrl,
            "createdAt": c.createdAt.isoformat() if c.createdAt else None,
            "owner": {
                "name": owner.name if owner else None,
                "username": owner.username if owner else None,
            },
            "_count": {
                "members": member_count
            }
        })
        
    return communities_list
