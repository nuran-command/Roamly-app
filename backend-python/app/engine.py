import os
import requests
import json
import math
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
from .database import get_vector_db

load_dotenv()

# Initialize Google Generative AI
MODEL_CANDIDATES = [
    "models/gemini-2.0-flash",
    "models/gemini-flash-lite-latest",
    "models/gemini-pro-latest"
]

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    task_type="retrieval_query",
    output_dimensionality=768
)

def get_nearby_rules(lat: float, lon: float):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    is_kazakhstan = lat > 40
    
    if is_kazakhstan:
        json_path = os.path.join(current_dir, "..", "data", "kazakhstan_culture.json")
        country = "Kazakhstan"
    else:
        json_path = os.path.join(current_dir, "..", "data", "uae_culture.json")
        country = "UAE"
    
    nearby = []
    if os.path.exists(json_path):
        with open(json_path, "r") as f:
            data = json.load(f)
            rules = data if isinstance(data, list) else data.get("rules", [])
            for rule in rules:
                if rule.get("location"):
                    t_lat = rule["location"].get("latitude")
                    t_lon = rule["location"].get("longitude")
                    if t_lat and t_lon:
                        dist = math.sqrt((lat - t_lat)**2 + (lon - t_lon)**2) * 111000
                        if dist < 1500: # Expanded range to 1.5km
                            nearby.append(rule)
    
    # ADD SCAM ALERTS
    scam_path = os.path.join(current_dir, "..", "data", "scams.json")
    if os.path.exists(scam_path):
        with open(scam_path, "r") as f:
            scam_data = json.load(f)
            scams = next((s["scams"] for s in scam_data if s["country"] == country), [])
            # Only include 1-2 random scams for variety
            import random
            random_scams = random.sample(scams, min(len(scams), 2))
            for s in random_scams:
                nearby.append({
                    "category": "⚠️ ALERT: Common Scam",
                    "rule": f"{s['name']}: {s['description']}",
                    "penalty": f"Defense: {s['defense']}",
                    "urgency": 2
                })

    return nearby

SESSIONS = {}

def get_cultural_tip(query: str, language: str = "English", profile: str = "General Traveler", session_id: str = "default") -> str:
    moderation_prompt = f"Is this question offensive or dangerous? Answer YES or NO: '{query}'"
    try:
        mod_llm = ChatGoogleGenerativeAI(model="models/gemini-flash-lite-latest", google_api_key=os.getenv("GEMINI_API_KEY"))
        is_safe = mod_llm.invoke(moderation_prompt).content
        if "YES" in is_safe.upper():
            return "As your Roamly guide, I can only provide respectful advice. Please rephrase."
    except: pass

    try:
        index = get_vector_db()
        query_vector = embeddings.embed_query(query)
        search_results = index.query(vector=query_vector, top_k=3, include_metadata=True)
        context = "\n".join([f"- {m['metadata']['rule']}" for m in search_results['matches']])
    except:
        context = "No specific rules found."

    history = SESSIONS.get(session_id, "")
    SESSIONS[session_id] = query

    prompt = PromptTemplate.from_template("""
    You are Roamly AI Guardian.
    PROFILE: {profile}
    LANGUAGE: {language}
    CONTEXT: {context}
    
    QUESTION: {query}
    
    Provide a concise (2-3 sentence) tip tailored to the profile. 
    Mention local laws or cultural norms if relevant.
    """)
    
    try:
        formatted = prompt.format(query=query, context=context, language=language, profile=profile, history=history)
        llm = ChatGoogleGenerativeAI(model="models/gemini-2.0-flash", google_api_key=os.getenv("GEMINI_API_KEY"))
        return llm.invoke(formatted).content
    except:
        return "System busy. Using local cache."

def scan_image_with_gemini(image_base64: str, language: str = "English") -> str:
    prompt = f"""
    You are the Roamly Gastro Guard. 
    1. Translate this menu/label into {language}.
    2. HEALTH FOCUS: Highlight high-sodium, high-sugar, or allergy-triggering (nuts, dairy) items.
    3. CULTURAL WARNING: Identify pork/alcohol in sensitive regions (Kazakhstan/UAE).
    4. Provide a 'Local Tip' (e.g., 'In Kazakhstan, tea is often served with rich cream - watch the fat content').
    Keep it very concise.
    """
    try:
        llm = ChatGoogleGenerativeAI(model="models/gemini-2.0-flash", google_api_key=os.getenv("GEMINI_API_KEY"))
        message = HumanMessage(content=[{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}])
        return llm.invoke([message]).content
    except Exception as e:
        return f"Gastro Guard Error: {str(e)}"

def get_vibe_score(lat, lon):
    overpass_url = "http://overpass-api.de/api/interpreter"
    query = f"""
    [out:json];
    (
      node["shop"](around:500,{lat},{lon});
      node["amenity"="cafe"](around:500,{lat},{lon});
      node["amenity"="restaurant"](around:500,{lat},{lon});
    );
    out count;
    """
    try:
        response = requests.get(overpass_url, params={'data': query}, timeout=5)
        count = response.json().get("elements", [{}])[0].get("tags", {}).get("total", 0)
        
        if count > 50: return "🔥 High Energy & Crowded"
        if count > 20: return "✨ Balanced & Active"
        return "🍃 Quiet & Relaxed"
    except:
        return "🛡️ Normal Safety Baseline"

def search_nearby_places(lat, lon, category="hospital"):
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lon}&radius=5000&type={category}&key={api_key}"
    try:
        res = requests.get(url).json().get("results", [])
        return [{"name": p.get("name"), "address": p.get("vicinity"), "lat": p.get("geometry", {}).get("location", {}).get("lat"), "lon": p.get("geometry", {}).get("location", {}).get("lon")} for p in res[:5]]
    except: return []
