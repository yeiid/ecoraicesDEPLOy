from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base

class Category(Base):
    __tablename__ = "Category"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    imageUrl = Column(String, nullable=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())

    species = relationship("Species", back_populates="category")
