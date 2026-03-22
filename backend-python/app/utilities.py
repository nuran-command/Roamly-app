import os
import requests
from elevenlabs import generate, save, set_api_key

def get_exchange_rate(from_currency="AED", to_currency="KZT"):
    """
    Fetch live exchange rates using Abstract Currency API.
    """
    api_key = os.getenv("ABSTRACT_CURRENCY_API_KEY")
    if not api_key:
        return {"error": "Abstract Currency API Key missing"}
        
    url = f"https://exchange-rates.abstractapi.com/v1/live/?base={from_currency}&target={to_currency}&api_key={api_key}"
    
    try:
        response = requests.get(url)
        data = response.json()
        return data.get("exchange_rates", {})
    except Exception as e:
        return {"error": str(e)}

def text_to_speech(text, filename="alert_voice.mp3"):
    """
    Generate high-quality AI voice using ElevenLabs.
    """
    api_key = os.getenv("ELEVEN_LABS_API_KEY")
    if not api_key:
        return {"error": "ElevenLabs API Key missing"}
        
    set_api_key(api_key)
    
    try:
        audio = generate(
            text=text,
            voice="Bella", # You can change the voice ID here
            model="eleven_multilingual_v2"
        )
        
        # Save to a public-accessible folder or return as bytes
        save_path = f"static/{filename}"
        os.makedirs("static", exist_ok=True)
        save(audio, save_path)
        return {"url": f"http://localhost:8000/static/{filename}"}
    except Exception as e:
        return {"error": str(e)}

def get_emergency_alerts(lat, lon):
    """
    Fetch real-time disaster alerts from GDACS API.
    """
    # GDACS provides a public RSS/JSON feed. We'll search for events within 500km.
    url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/json"
    
    try:
        response = requests.get(url)
        data = response.json()
        events = data.get("features", [])
        
        nearby_alerts = []
        for event in events:
            props = event.get("properties", {})
            # Simplified proximity check
            dist = props.get("distance", 1000) # Default if not found
            if dist < 500: # Within 500km
                nearby_alerts.append({
                    "name": props.get("eventname"),
                    "severity": props.get("severity"),
                    "type": props.get("eventtype")
                })
        return nearby_alerts
    except Exception as e:
        return {"error": str(e)}
