from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from .base import Base

class Species(Base):
    __tablename__ = "Species"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    scientificName = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    habitat = Column(String, nullable=True)
    imageUrl = Column(String, nullable=True)
    status = Column(String, nullable=True)
    categoryId = Column(String, ForeignKey("Category.id"), nullable=False)
    
    gbifKey = Column(Integer, nullable=True)
    inaturalistTaxonId = Column(Integer, nullable=True)
    family = Column(String, nullable=True)
    synonyms = Column(JSON, nullable=True)
    
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="species")
