from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from ...db.database import get_db
from ...models.species import Species
from ...models.category import Category
from ...schemas.species import SpeciesResponse
from ...schemas.category import CategoryResponse

router = APIRouter(
    prefix="/api",
    tags=["species", "categories"]
)

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name.asc()).all()

@router.get("/species", response_model=List[SpeciesResponse])
def get_species(
    skip: int = 0, 
    limit: int = 100,
    categoria: Optional[str] = Query(None),
    habitat: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    ordenar: Optional[str] = Query("nombre-asc"),
    db: Session = Depends(get_db)
):
    query = db.query(Species)
    
    if categoria:
        query = query.filter(Species.categoryId == categoria)
    if habitat:
        query = query.filter(Species.habitat.ilike(f"%{habitat}%"))
    if estado:
        query = query.filter(Species.status == estado)
        
    if ordenar == "nombre-desc":
        query = query.order_by(Species.name.desc())
    elif ordenar == "fecha-reciente":
        query = query.order_by(Species.createdAt.desc())
    elif ordenar == "fecha-antigua":
        query = query.order_by(Species.createdAt.asc())
    else:
        query = query.order_by(Species.name.asc())
        
    species = query.offset(skip).limit(limit).all()
    return species

@router.get("/species/habitats")
def get_habitats(db: Session = Depends(get_db)):
    habitats = db.query(Species.habitat).filter(Species.habitat.isnot(None)).distinct().all()
    return [{"habitat": h[0]} for h in habitats]

@router.get("/species/{species_id}", response_model=SpeciesResponse)
def get_species_by_id(species_id: str, db: Session = Depends(get_db)):
    species = db.query(Species).filter(Species.id == species_id).first()
    if species is None:
        raise HTTPException(status_code=404, detail="Species not found")
    return species
