from fastapi import FastAPI
from pydantic import BaseModel
from app.engine import get_cultural_tip, get_nearby_rules, scan_image_with_gemini, search_nearby_places
from app.utilities import get_exchange_rate, get_emergency_alerts
from app.osm_service import get_restricted_polygons
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Roamly AI Backend")

# ENABLE CORS for Mobile Access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TipRequest(BaseModel):
    query: str
    language: str = "English"
    profile: str = "General Traveler"
    session_id: str = "default"

class LocationRequest(BaseModel):
    lat: float
    lon: float

@app.get("/")
def read_root():
    return {"status": "AI Backend is running", "service": "Python"}

@app.post("/cultural-tip")
def cultural_tip(request: TipRequest):
    tip = get_cultural_tip(request.query, request.language, request.profile, request.session_id)
    return {"tip": tip}

@app.post("/safety-check")
def safety_check(request: LocationRequest):
    rules = get_nearby_rules(request.lat, request.lon)
    polygons = get_restricted_polygons(request.lat, request.lon)
    disasters = get_emergency_alerts(request.lat, request.lon)
    
    return {
        "alerts": rules if rules else "You are in a safe zone.",
        "osm_restricted_polygons": polygons,
        "emergency_disasters": disasters
    }

class ImageQuery(BaseModel):
    image_base64: str
    language: str = "English"

@app.post("/scan-menu")
def scan_menu(query: ImageQuery):
    try:
        tip = scan_image_with_gemini(query.image_base64, query.language)
        return {"tip": tip}
    except Exception as e:
        return {"tip": f"Error parsing image: {str(e)}"}

@app.post("/nearby-places")
def get_nearby_places(request: LocationRequest, category: str = "tourist_attraction"):
    return {"places": search_nearby_places(request.lat, request.lon, category)}

# CHANGE TO GET FOR EASIER FETCHING
@app.get("/currency-swap")
def currency_swap(base: str = "USD", target: str = "KZT"):
    return {"rate": get_exchange_rate(base, target)}
