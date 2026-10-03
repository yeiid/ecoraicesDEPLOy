from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional
import uuid

from ...db.database import get_db
from ...models.species import Species
from ...models.category import Category
from ...models.observation import Observation
from ...schemas.species import SpeciesResponse, SpeciesDetailResponse, SpeciesCreate
from ...schemas.category import CategoryResponse

router = APIRouter(
    prefix="",
    tags=["species", "categories"]
)

@router.post("/species", response_model=SpeciesResponse, status_code=status.HTTP_201_CREATED)
def create_species(species: SpeciesCreate, db: Session = Depends(get_db)):
    scientific_name = (species.scientificName or "").strip()
    if not scientific_name or scientific_name.lower() in ["especie por identificar", "pendiente de validación", "pendiente de validacion"]:
        scientific_name = f"Pendiente ({species.name.strip()[:18]} - {uuid.uuid4().hex[:6]})"

    # Check if scientific name exists
    existing = db.query(Species).filter(Species.scientificName == scientific_name).first()
    if existing:
        return db.query(Species).options(joinedload(Species.category)).filter(Species.id == existing.id).first()
    
    # Check if categoryId is provided or fallback to first available category
    category_id = species.categoryId
    if not category_id:
        first_cat = db.query(Category).first()
        category_id = first_cat.id if first_cat else None

    # Generate CUID-like ID
    new_id = "c" + str(uuid.uuid4()).replace("-", "")[:24]
    
    db_species = Species(
        id=new_id,
        name=species.name.strip(),
        scientificName=scientific_name,
        categoryId=category_id,
        description=species.description,
        habitat=species.habitat,
        imageUrl=species.imageUrl,
        status=species.status or "PENDIENTE_VALIDACION",
    )
    db.add(db_species)
    db.commit()
    db.refresh(db_species)
    
    # Eager load category for response
    return db.query(Species).options(joinedload(Species.category)).filter(Species.id == new_id).first()


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
    query = db.query(Species).options(joinedload(Species.category))
    
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

@router.get("/species/{species_id}", response_model=SpeciesDetailResponse)
def get_species_by_id(species_id: str, db: Session = Depends(get_db)):
    species = db.query(Species).options(
        joinedload(Species.category),
        joinedload(Species.photos),
        joinedload(Species.observations).joinedload(Observation.user)
    ).filter(Species.id == species_id).first()
    
    if species is None:
        raise HTTPException(status_code=404, detail="Species not found")
    return species

@router.get("/species/{species_id}/related", response_model=List[SpeciesResponse])
def get_related_species(species_id: str, db: Session = Depends(get_db)):
    species = db.query(Species).filter(Species.id == species_id).first()
    if species is None:
        raise HTTPException(status_code=404, detail="Species not found")
        
    related = db.query(Species).options(joinedload(Species.category)).filter(
        Species.categoryId == species.categoryId,
        Species.id != species_id
    ).limit(4).all()
    
    return related
