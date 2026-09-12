from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
import uuid
from datetime import timedelta

from ...db.database import get_db
from ...models.user import User
from ...schemas.auth import LoginRequest, RegisterRequest, AuthResponse, GoogleLoginRequest
from ...core.security import verify_password, get_password_hash, create_access_token
import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

TOKEN_NAME = "ecoraices_token"
MAX_AGE_DEFAULT = 60 * 60 * 24 * 7 # 7 days
MAX_AGE_LONG = 60 * 60 * 24 * 30 # 30 days

@router.post("/login", response_model=AuthResponse)
@router.post("/mobile/login", response_model=AuthResponse)
def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.passwordHash):
        # We return a JSON error since the frontend expects JSON
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")
        
    max_age = MAX_AGE_LONG if request.remember else MAX_AGE_DEFAULT
    
    # Payload matching the frontend expectations
    token_payload = {
        "userId": user.id,
        "email": user.email,
        "role": user.role,
        "isAdmin": user.isAdmin
    }
    
    token = create_access_token(
        subject=token_payload, 
        expires_delta=timedelta(seconds=max_age)
    )
    
    # Set the cookie. Path=/ and httponly=True are required.
    response.set_cookie(
        key=TOKEN_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        path="/",
        secure=False  # Typically set based on ENV, we leave False for local dev
    )
    
    return {
        "success": True,
        "token": token,
        "expiresIn": max_age,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "name": user.name,
            "avatarUrl": user.avatarUrl,
            "role": user.role,
            "isAdmin": user.isAdmin
        }
    }

@router.post("/register", response_model=AuthResponse)
@router.post("/mobile/register", response_model=AuthResponse)
def register(request: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.email == request.email) | (User.username == request.username)
    ).first()
    
    if existing_user:
        if existing_user.email == request.email:
            raise HTTPException(status_code=400, detail="El correo electrónico ya está en uso.")
        else:
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso.")
            
    new_id = "c" + str(uuid.uuid4()).replace("-", "")[:24]
    
    new_user = User(
        id=new_id,
        username=request.username,
        email=request.email,
        passwordHash=get_password_hash(request.password),
        name=request.name
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Auto login after register
    token_payload = {
        "userId": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "isAdmin": new_user.isAdmin
    }
    
    token = create_access_token(
        subject=token_payload, 
        expires_delta=timedelta(seconds=MAX_AGE_DEFAULT)
    )
    
    response.set_cookie(
        key=TOKEN_NAME,
        value=token,
        max_age=MAX_AGE_DEFAULT,
        httponly=True,
        samesite="lax",
        path="/"
    )
    
    return {
        "success": True,
        "token": token,
        "expiresIn": MAX_AGE_DEFAULT,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "name": new_user.name,
            "avatarUrl": new_user.avatarUrl,
            "role": new_user.role,
            "isAdmin": new_user.isAdmin
        }
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=TOKEN_NAME, path="/")
    return {"success": True, "message": "Sesión cerrada"}

@router.get("/session")
def get_session(request: Request, db: Session = Depends(get_db)):
    from jose import jwt, JWTError
    token = request.cookies.get(TOKEN_NAME)
    
    if not token:
        return {"user": None}
        
    try:
        from ...core.security import JWT_SECRET, ALGORITHM
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("userId")
        
        if not user_id:
            return {"user": None}
            
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"user": None}
            
        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "name": user.name,
                "avatarUrl": user.avatarUrl,
                "role": user.role,
                "isAdmin": user.isAdmin
            }
        }
    except JWTError:
        return {"user": None}

@router.post("/google", response_model=AuthResponse)
@router.post("/mobile/google", response_model=AuthResponse)
def google_login(request: GoogleLoginRequest, response: Response, db: Session = Depends(get_db)):
    try:
        # Use a placeholder client ID for now if client_id is not provided
        # In a real app, you should strictly verify the client ID.
        client_id = request.client_id or os.getenv("GOOGLE_CLIENT_ID", "YOUR_PLACEHOLDER_CLIENT_ID")
        
        idinfo = id_token.verify_oauth2_token(
            request.credential, 
            google_requests.Request(), 
            client_id
        )

        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")

        if not email:
            raise HTTPException(status_code=400, detail="El token de Google no contiene email.")

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Register new user
            new_id = "c" + str(uuid.uuid4()).replace("-", "")[:24]
            # Generate a random password since they use Google
            random_pass = str(uuid.uuid4())
            
            user = User(
                id=new_id,
                username=email.split("@")[0] + str(uuid.uuid4())[:4],
                email=email,
                name=name,
                avatarUrl=picture,
                passwordHash=get_password_hash(random_pass)
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Log them in
        max_age = MAX_AGE_LONG
        
        token_payload = {
            "userId": user.id,
            "email": user.email,
            "role": user.role,
            "isAdmin": user.isAdmin
        }
        
        token = create_access_token(
            subject=token_payload, 
            expires_delta=timedelta(seconds=max_age)
        )
        
        response.set_cookie(
            key=TOKEN_NAME,
            value=token,
            max_age=max_age,
            httponly=True,
            samesite="lax",
            path="/",
            secure=False
        )
        
        return {
            "success": True,
            "token": token,
            "expiresIn": max_age,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "name": user.name,
                "avatarUrl": user.avatarUrl,
                "role": user.role,
                "isAdmin": user.isAdmin
            }
        }

    except ValueError as e:
        # Invalid token
        raise HTTPException(status_code=401, detail=f"Token de Google inválido: {str(e)}")
