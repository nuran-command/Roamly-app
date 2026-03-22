import os
import requests

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

def get_emergency_alerts(lat, lon):
    """
    Fetch real-time disaster alerts from GDACS API.
    """
    url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/json"
    
    try:
        response = requests.get(url)
        data = response.json()
        events = data.get("features", [])
        
        nearby_alerts = []
        for event in events:
            props = event.get("properties", {})
            dist = props.get("distance", 1000)
            if dist < 500:
                nearby_alerts.append({
                    "name": props.get("eventname"),
                    "severity": props.get("severity"),
                    "type": props.get("eventtype")
                })
        return nearby_alerts
    except Exception as e:
        return {"error": str(e)}
