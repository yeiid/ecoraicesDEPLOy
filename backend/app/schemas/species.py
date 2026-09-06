from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from .category import CategoryResponse
from .species_photo import SpeciesPhotoResponse
from .observation import ObservationResponse

class SpeciesBase(BaseModel):
    name: str
    scientificName: str
    description: Optional[str] = None
    habitat: Optional[str] = None
    imageUrl: Optional[str] = None
    status: Optional[str] = None
    categoryId: str
    gbifKey: Optional[int] = None
    inaturalistTaxonId: Optional[int] = None
    family: Optional[str] = None
    synonyms: Optional[Any] = None

class SpeciesResponse(SpeciesBase):
    id: str
    createdAt: datetime
    updatedAt: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True

class SpeciesDetailResponse(SpeciesResponse):
    photos: List[SpeciesPhotoResponse] = []
    observations: List[ObservationResponse] = []
