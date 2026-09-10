from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Observation, Species, Community, User

router = APIRouter(
    prefix="/stats",
    tags=["stats"]
)

@router.get("/")
def get_stats(db: Session = Depends(get_db)):
    total_observations = db.query(Observation).count()
    total_species = db.query(Species).count()
    total_communities = db.query(Community).count()
    total_users = db.query(User).count()
    
    pending_observations = db.query(Observation).filter(Observation.status == "PENDING").count()
    approved_observations = db.query(Observation).filter(Observation.status == "APPROVED").count()
    rejected_observations = db.query(Observation).filter(Observation.status == "REJECTED").count()
    
    return {
        "observations": total_observations,
        "species": total_species,
        "communities": total_communities,
        "users": total_users,
        "observationsByStatus": {
            "pending": pending_observations,
            "approved": approved_observations,
            "rejected": rejected_observations
        }
    }
