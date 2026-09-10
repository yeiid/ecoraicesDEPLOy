from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models import Observation, Species, Community, User, CommunityMember

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)

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
                "scientificName": species.scientificName if species else None,
            },
            "user": {
                "id": user.id if user else None,
                "username": user.username if user else None,
            }
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
        "observations": observations_list
    }
