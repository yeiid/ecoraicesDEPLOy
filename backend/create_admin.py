import os
import sys
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure app package is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db.database import DATABASE_URL
from app.models.user import User
from app.core.security import get_password_hash, verify_password

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_or_update_admin(email: str, password: str, username: str = None, name: str = None):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            print(f"[*] Usuario existente encontrado: {user.email} (ID: {user.id})")
            user.isAdmin = True
            user.role = "COMMUNITY"
            if password:
                user.passwordHash = get_password_hash(password)
                print(f"[+] Contraseña actualizada exitosamente.")
            if name:
                user.name = name
            if username:
                user.username = username
            db.commit()
            db.refresh(user)
            print(f"✅ Usuario {user.email} actualizado como Administrador (isAdmin=True).")
        else:
            if not username:
                username = email.split("@")[0]
            if not name:
                name = "Administrador EcoRaíces"
            
            # Check if username is taken
            existing_username = db.query(User).filter(User.username == username).first()
            if existing_username:
                username = f"{username}_{uuid.uuid4().hex[:4]}"

            new_id = "c" + str(uuid.uuid4()).replace("-", "")[:24]
            new_user = User(
                id=new_id,
                username=username,
                email=email,
                passwordHash=get_password_hash(password),
                name=name,
                role="COMMUNITY",
                isAdmin=True,
                provider="local"
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            print(f"✅ Nuevo usuario Administrador creado exitosamente:")
            print(f"   - ID: {new_user.id}")
            print(f"   - Email: {new_user.email}")
            print(f"   - Username: {new_user.username}")
            print(f"   - Nombre: {new_user.name}")
            print(f"   - isAdmin: {new_user.isAdmin}")
            print(f"   - role: {new_user.role}")

        # Verification test
        test_user = db.query(User).filter(User.email == email).first()
        valid = verify_password(password, test_user.passwordHash)
        print(f"[*] Verificación de contraseña: {'VALIDADA ✅' if valid else 'FALLÓ ❌'}")

    finally:
        db.close()

def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"\n--- Lista de Usuarios en Base de Datos ({len(users)}) ---")
        for u in users:
            admin_flag = "👑 [ADMIN]" if u.isAdmin else "  [USER]"
            print(f"{admin_flag} {u.email} | user: {u.username} | rol: {u.role} | nombre: {u.name}")
        print("--------------------------------------------------\n")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        if len(sys.argv) == 2 and sys.argv[1] == "--list":
            list_users()
            sys.exit(0)
        print("Uso: python create_admin.py <email> <password> [username] [name]")
        print("     python create_admin.py --list")
        sys.exit(0)

    admin_email = sys.argv[1]
    admin_pass = sys.argv[2]
    admin_user = sys.argv[3] if len(sys.argv) > 3 else None
    admin_name = sys.argv[4] if len(sys.argv) > 4 else None

    create_or_update_admin(admin_email, admin_pass, admin_user, admin_name)
    list_users()
