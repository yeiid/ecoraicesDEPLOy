import os
import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from .users import get_current_user_id

router = APIRouter(
    prefix="/plantnet",
    tags=["plantnet"]
)

PLANTNET_API = 'https://my-api.plantnet.org/v2'

@router.post("/identify")
async def identify_plant(
    request: Request,
    image: UploadFile = File(...)
):
    # Protect with auth middleware equivalent
    user_id = get_current_user_id(request)
    
    api_key = os.getenv("PLANTNET_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Pl@ntNet no está configurado en este servidor")
        
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
        
    contents = await image.read()
    MAX_SIZE = 10 * 1024 * 1024
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="La imagen supera el tamaño máximo (10 MB)")
        
    filename = image.filename or f"observacion.{image.content_type.split('/')[1] if '/' in image.content_type else 'jpg'}"
    
    files = {
        'images': (filename, contents, image.content_type)
    }
    params = {
        'api-key': api_key,
        'nb-results': '5'
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(f"{PLANTNET_API}/identify/all", params=params, files=files)
            if res.status_code in (401, 403):
                raise HTTPException(status_code=401, detail="API key de Pl@ntNet inválida o sin permisos")
            if not res.is_success:
                body_text = res.text[:200]
                raise HTTPException(status_code=500, detail=f"Pl@ntNet HTTP {res.status_code}: {body_text}")
                
            data = res.json()
            results_raw = data.get("results", [])
            results = []
            
            for r in results_raw[:5]:
                species = r.get("species", {})
                scientificName = species.get("scientificNameWithoutAuthor") or species.get("scientificName")
                commonNames = species.get("commonNames", [])
                commonName = commonNames[0] if commonNames else None
                genus = species.get("genus", {}).get("scientificName")
                family = species.get("family", {}).get("scientificName")
                
                results.append({
                    "score": r.get("score"),
                    "scientificName": scientificName,
                    "commonName": commonName,
                    "genus": genus,
                    "family": family
                })
            
            return {"results": results}
            
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Error al identificar la especie: {str(e)}")
