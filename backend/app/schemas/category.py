from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    imageUrl: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
