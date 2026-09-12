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

application.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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
    application.include_router(communities.router, prefix="/api")
    application.include_router(observations.router, prefix="/api")
    application.include_router(plantnet.router, prefix="/api")
    logger.info("✅ All routers loaded successfully")
except Exception as e:
    logger.error(f"❌ Error loading routers: {e}")
    import traceback
    traceback.print_exc()

# Uvicorn looks for this name
app = application

logger.info("🚀 EcoRaíces FastAPI backend initialized")
