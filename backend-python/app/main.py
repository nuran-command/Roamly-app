from fastapi import FastAPI
from pydantic import BaseModel
from app.engine import get_cultural_tip, get_nearby_rules, scan_image_with_gemini, search_nearby_places, get_vibe_score
from app.utilities import get_exchange_rate, get_emergency_alerts
from app.osm_service import get_restricted_polygons
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Roamly AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class LocationRequest(BaseModel):
    lat: float
    lon: float

@app.get("/")
def read_root():
    return {"status": "AI Backend is running"}

@app.post("/cultural-tip")
def cultural_tip(request: dict):
    return {"tip": get_cultural_tip(request.get("query"), request.get("language"), request.get("profile"))}

@app.post("/safety-check")
def safety_check(request: LocationRequest):
    rules = get_nearby_rules(request.lat, request.lon)
    polygons = get_restricted_polygons(request.lat, request.lon)
    disasters = get_emergency_alerts(request.lat, request.lon)
    vibe = get_vibe_score(request.lat, request.lon)
    
    return {
        "alerts": rules if rules else "Safe zone baseline.",
        "vibe": vibe,
        "osm_restricted_polygons": polygons,
        "emergency_disasters": disasters
    }

@app.post("/scan-menu")
def scan_menu(request: dict):
    return {"tip": scan_image_with_gemini(request.get("image_base64"), request.get("language"))}

@app.post("/safe-havens")
def get_safe_havens(request: LocationRequest):
    hospitals = search_nearby_places(request.lat, request.lon, "hospital")
    police = search_nearby_places(request.lat, request.lon, "police")
    return {"hospitals": hospitals, "police": police}

@app.get("/currency-swap")
def currency_swap(base: str = "USD", target: str = "KZT"):
    return {"rate": get_exchange_rate(base, target)}
