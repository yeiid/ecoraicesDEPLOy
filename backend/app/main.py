from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ecoraices")

# IMPORTANT: variable name must NOT be "app" to avoid conflict with the "app" package
application = FastAPI(
    title="EcoRaíces API",
    description="API for EcoRaíces migrated from Astro",
    version="1.0.0"
)

import os

cors_origins_raw = os.getenv("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:48080",
        "http://localhost:8080",
        "http://127.0.0.1:48080",
        "http://127.0.0.1:8080",
        "http://frontend:8080",
    ]

application.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Health check — always available
@application.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "FastAPI backend is running"}

# Import and register routers
try:
    from app import models  # noqa: Trigger SQLAlchemy registry
    from app.api.routers import species, auth, stats, admin, users, communities, observations, plantnet

    application.include_router(species.router, prefix="/api")
    application.include_router(auth.router, prefix="/api")
    application.include_router(stats.router, prefix="/api")
    application.include_router(admin.router, prefix="/api")
    application.include_router(users.router, prefix="/api")
    application.include_router(users.perfil_router, prefix="/api")
    application.include_router(communities.router, prefix="/api")
    application.include_router(observations.router, prefix="/api")
    application.include_router(plantnet.router, prefix="/api")
    logger.info("✅ All routers loaded successfully")
except Exception as e:
    logger.error(f"❌ Error loading routers: {e}")
    import traceback
    traceback.print_exc()

@application.on_event("startup")
def bootstrap_admin_user():
    """Auto-promote or create admin user on startup if ADMIN_EMAIL is set."""
    import os
    import uuid
    admin_email = os.getenv("ADMIN_EMAIL", "yeifran67@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if not admin_email:
        return
        
    try:
        from app.db.database import SessionLocal
        from app.models.user import User
        from app.core.security import get_password_hash
        
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == admin_email).first()
            if user:
                if not user.isAdmin:
                    user.isAdmin = True
                    user.role = "COMMUNITY"
                    db.commit()
                    logger.info(f"👑 Usuario {admin_email} promovido a Administrador exitosamente")
                else:
                    logger.info(f"👑 Administrador {admin_email} ya activo")
                if admin_password:
                    user.passwordHash = get_password_hash(admin_password)
                    db.commit()
                    logger.info(f"🔑 Contraseña de administrador actualizada")
            elif admin_password:
                new_id = "c" + str(uuid.uuid4()).replace("-", "")[:24]
                new_user = User(
                    id=new_id,
                    username=admin_email.split("@")[0],
                    email=admin_email,
                    passwordHash=get_password_hash(admin_password),
                    name="Administrador EcoRaíces",
                    role="COMMUNITY",
                    isAdmin=True,
                    provider="local"
                )
                db.add(new_user)
                db.commit()
                logger.info(f"👑 Nuevo usuario Administrador creado: {admin_email}")
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"⚠️ No se pudo inicializar usuario admin en startup: {e}")

# Uvicorn looks for this name
app = application

logger.info("🚀 EcoRaíces FastAPI backend initialized")
