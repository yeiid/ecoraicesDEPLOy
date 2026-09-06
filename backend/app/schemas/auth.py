from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember: bool = False

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    name: Optional[str] = None

class AuthResponse(BaseModel):
    success: bool
    user: dict
    message: Optional[str] = None
    token: Optional[str] = None
    expiresIn: Optional[int] = None
