from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, func, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base
import enum

class MemberRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MODERATOR = "MODERATOR"
    MEMBER = "MEMBER"

class Community(Base):
    __tablename__ = "Community"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    location = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    imageUrl = Column(String, nullable=True)
    ownerId = Column(String, ForeignKey("User.id"), nullable=False)
    
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())

    owner = relationship("User", foreign_keys=[ownerId], back_populates="ownedCommunities")
    members = relationship("CommunityMember", back_populates="community", cascade="all, delete-orphan")
    observations = relationship("Observation", back_populates="community")

class CommunityMember(Base):
    __tablename__ = "CommunityMember"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, ForeignKey("User.id"), nullable=False)
    communityId = Column(String, ForeignKey("Community.id"), nullable=False)
    role = Column(Enum(MemberRole), default=MemberRole.MEMBER)
    
    joinedAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="communityMembers")
    community = relationship("Community", back_populates="members")

    __table_args__ = (
        UniqueConstraint('userId', 'communityId', name='uix_user_community'),
    )
