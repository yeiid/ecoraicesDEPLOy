import os
from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-key-only")
ALGORITHM = "HS256"
# 30 days in minutes (matching frontend remember me MAX_AGE_LONG)
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30 

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # We embed the payload according to what frontend expects
    # The frontend expects a JWT containing userId, email, role, isAdmin.
    # The subject passed in will be a dictionary containing these fields.
    to_encode = {"exp": expire}
    if isinstance(subject, dict):
        to_encode.update(subject)
    else:
        to_encode.update({"sub": str(subject)})
        
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt
