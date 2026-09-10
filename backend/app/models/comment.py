from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from .base import Base

class Comment(Base):
    __tablename__ = "Comment"

    id = Column(String, primary_key=True, index=True)
    observationId = Column(String, ForeignKey("Observation.id"), nullable=False)
    userId = Column(String, ForeignKey("User.id"), nullable=False)
    content = Column(String, nullable=False)
    
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())

    observation = relationship("Observation", back_populates="comments")
    user = relationship("User", back_populates="comments")
