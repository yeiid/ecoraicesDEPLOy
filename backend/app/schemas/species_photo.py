from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SpeciesPhotoBase(BaseModel):
    url: str
    thumbnailUrl: Optional[str] = None
    license: Optional[str] = None
    attribution: Optional[str] = None
    source: str
    rank: int

class SpeciesPhotoResponse(SpeciesPhotoBase):
    id: str
    createdAt: datetime

    class Config:
        from_attributes = True
