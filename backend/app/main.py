from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routers import species, auth
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

app.include_router(species.router)
app.include_router(auth.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "FastAPI backend is running"}
