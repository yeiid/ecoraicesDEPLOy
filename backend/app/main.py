from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routers import species, auth, stats, admin, users, communities, observations, plantnet
import app.models  # Trigger SQLAlchemy registry for all models

app = FastAPI(
    title="EcoRaíces API",
    description="API for EcoRaíces migrated from Astro",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(species.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(communities.router, prefix="/api")
app.include_router(observations.router, prefix="/api")
app.include_router(plantnet.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "FastAPI backend is running"}
