from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from .base import Base

class SpeciesPhoto(Base):
    __tablename__ = "SpeciesPhoto"

    id = Column(String, primary_key=True, index=True)
    speciesId = Column(String, ForeignKey("Species.id"), nullable=False)
    url = Column(String, nullable=False)
    thumbnailUrl = Column(String, nullable=True)
    license = Column(String, nullable=True)
    attribution = Column(String, nullable=True)
    source = Column(String, default="INATURALIST")
    rank = Column(Integer, default=0)
    createdAt = Column(DateTime, default=func.now())

    species = relationship("Species", back_populates="photos")
