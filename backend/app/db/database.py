import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Format expected by SQLAlchemy: postgresql://user:password@host/dbname
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ecoraices:ecoraices_dev@db:5432/ecoraices")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
