from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from .user import UserResponse

class ObservationBase(BaseModel):
    observationDate: datetime
    latitude: float
    longitude: float
    notes: Optional[str] = None
    imageUrl: Optional[str] = None
    status: str

class ObservationResponse(ObservationBase):
    id: str
    userId: str
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True
