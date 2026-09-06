import sys
import os
import uuid

# Asegurar que podemos importar desde app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def create_admin():
    db = SessionLocal()
    
    admin_email = "admin@ecoraices.com"
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    
    if existing_admin:
        print(f"[*] El usuario {admin_email} ya existe.")
        
        # Make sure it's admin
        if not existing_admin.isAdmin:
            existing_admin.isAdmin = True
            db.commit()
            print("[*] Privilegios de administrador actualizados (isAdmin = True).")
            
        return
        
    print(f"[*] Creando usuario administrador: {admin_email}")
    
    new_id = "c" + str(uuid.uuid4()).replace("-", "")[:24]
    admin_user = User(
        id=new_id,
        username="admin",
        email=admin_email,
        passwordHash=get_password_hash("password123"),
        name="Administrador EcoRaíces",
        role="COMMUNITY",
        isAdmin=True
    )
    
    db.add(admin_user)
    db.commit()
    print("[*] ¡Usuario administrador creado con éxito!")
    print(f"    - Correo: {admin_email}")
    print("    - Contraseña: password123")

if __name__ == "__main__":
    create_admin()
