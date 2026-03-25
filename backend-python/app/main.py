from fastapi import FastAPI
from pydantic import BaseModel
from app.engine import (
    get_cultural_tip, 
    get_nearby_rules, 
    scan_image_with_gemini, 
    search_nearby_places, 
    get_vibe_score,
    get_welcome_alert,
    get_daily_safety_tip,
    load_culture_data,
    get_scam_alerts
)
from app.utilities import get_exchange_rate, get_emergency_alerts
from app.osm_service import get_restricted_polygons
from fastapi.middleware.cors import CORSMiddleware
import time

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
    speed: float = 0.0
    activity: str = "general"
    country: str = "Kazakhstan"

@app.get("/")
def read_root():
    return {"status": "AI Backend is running", "timestamp": time.time()}

@app.post("/cultural-tip")
def cultural_tip(request: dict):
    return {"tip": get_cultural_tip(request.get("query"), request.get("language"), request.get("profile"))}

@app.get("/sync-all-rules")
def sync_all_rules(country: str = "Kazakhstan"):
    # Method: Offline Sync - Provides all 100+ rules for local storage
    data = load_culture_data(country)
    return {"rules": data}

@app.post("/scams")
def scams(request: dict):
    # Method B: Scam awareness for specific country
    return {"scams": get_scam_alerts(request.get("country", "Kazakhstan"))}

@app.post("/safety-check")
def safety_check(request: LocationRequest):
    # Method B: Speed/Activity based filters
    rules = get_nearby_rules(request.lat, request.lon, request.speed, request.activity)
    scams = get_scam_alerts(request.country)
    
    # Mix one random scam for awareness
    if scams:
        import random
        rules.append(random.choice(scams))

    polygons = get_restricted_polygons(request.lat, request.lon)
    disasters = get_emergency_alerts(request.lat, request.lon)
    vibe = get_vibe_score(request.lat, request.lon)
    
    return {
        "alerts": rules if rules else [],
        "vibe": vibe,
        "osm_restricted_polygons": polygons,
        "emergency_disasters": disasters,
        "context": {
            "speed": request.speed,
            "activity": request.activity,
            "mode": "Driving/Transit" if request.speed > 20 else "Pedestrian"
        }
    }

@app.get("/welcome")
def welcome(country: str = "Kazakhstan"):
    # Method A: Urgency 1 rule on arrival
    rule = get_welcome_alert(country)
    return {"welcome_rule": rule}

@app.get("/daily-tip")
def daily_tip(country: str = "Kazakhstan"):
    # Method A: Periodic safety tip
    rule = get_daily_safety_tip(country)
    return {"daily_tip": rule}

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
