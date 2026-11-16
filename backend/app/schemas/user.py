from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    avatarUrl: Optional[str] = None
    location: Optional[str] = None
    # We only expose public fields for now

class UserResponse(UserBase):
    id: str

    class Config:
        from_attributes = True
