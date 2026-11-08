import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Format expected by SQLAlchemy: postgresql://user:password@host/dbname
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ecoraices:ecoraices_dev@db:5432/ecoraices")

# Use pool_pre_ping to handle intermittent DB connectivity.
# Configurable via env; defaults sized to avoid exhausting Postgres
# max_connections=100 when combined with frontend pg.Pool(max=10).
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
    max_overflow=int(os.getenv("DB_POOL_MAX_OVERFLOW", "10")),
    pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
    pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "300")),
    pool_reset_on_return="rollback",
    connect_args={"connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "10"))}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
