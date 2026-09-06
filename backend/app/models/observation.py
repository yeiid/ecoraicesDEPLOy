from sqlalchemy import Column, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from .base import Base

class Observation(Base):
    __tablename__ = "Observation"

    id = Column(String, primary_key=True, index=True)
    speciesId = Column(String, ForeignKey("Species.id"), nullable=False)
    userId = Column(String, ForeignKey("User.id"), nullable=False)
    communityId = Column(String, nullable=True) # Will link to Community when migrated
    
    observationDate = Column(DateTime, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, nullable=True)
    municipio = Column(String, nullable=True)
    estadoConservacion = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    imageUrl = Column(String, nullable=True)
    
    status = Column(String, default="PENDING")
    verifiedById = Column(String, ForeignKey("User.id"), nullable=True)
    verifiedAt = Column(DateTime, nullable=True)
    verificationNotes = Column(String, nullable=True)
    
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())

    species = relationship("Species", back_populates="observations")
    user = relationship("User", back_populates="observations", foreign_keys=[userId])
