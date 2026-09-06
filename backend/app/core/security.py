import os
from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-key-only")
ALGORITHM = "HS256"
# 30 days in minutes (matching frontend remember me MAX_AGE_LONG)
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30 

import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except ValueError:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

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
