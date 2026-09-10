from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base

class User(Base):
    __tablename__ = "User"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    passwordHash = Column(String, nullable=False)
    name = Column(String, nullable=True)
    avatarUrl = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    role = Column(String, default="COLLECTOR")
    isAdmin = Column(Boolean, default=False)
    provider = Column(String, default="local")
    providerId = Column(String, unique=True, nullable=True)
    
    resetTokenHash = Column(String, nullable=True)
    resetTokenExpiresAt = Column(DateTime, nullable=True)
    
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())

    observations = relationship("Observation", back_populates="user", foreign_keys="Observation.userId")
    communityMembers = relationship("CommunityMember", back_populates="user")
    ownedCommunities = relationship("Community", back_populates="owner", foreign_keys="Community.ownerId")
    comments = relationship("Comment", back_populates="user")
