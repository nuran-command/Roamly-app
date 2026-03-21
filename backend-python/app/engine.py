import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
from .database import get_vector_db

load_dotenv()

# Initialize Gemini and Embeddings
# Initialize Google Generative AI (with Fallback support)
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

import math
import json

def get_nearby_rules(lat: float, lon: float):
    """
    Check if the user is near any culturally sensitive coordinates.
    Returns rules within 1km.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Simple location-based country detection
    if lat > 40: # Likely Kazakhstan
        json_path = os.path.join(current_dir, "..", "data", "kazakhstan_culture.json")
    else:
        json_path = os.path.join(current_dir, "..", "data", "uae_culture.json")
    
    nearby = []
    
    if not os.path.exists(json_path):
        return nearby

    with open(json_path, "r") as f:
        data = json.load(f)
        # Handle both list and object formats
        rules = data if isinstance(data, list) else data.get("rules", [])
        
        for rule in rules:
            if rule.get("location") and isinstance(rule["location"], dict):
                target_lat = rule["location"].get("latitude")
                target_lon = rule["location"].get("longitude")
                
                if target_lat and target_lon:
                    # Simple distance calculation (approximate)
                    dist = math.sqrt((lat - target_lat)**2 + (lon - target_lon)**2) * 111000 # Distance in meters
                    
                    if dist < 1000: # Within 1km
                        nearby.append(rule)
                        
    return nearby

# Simple Global Memory for Demo (In production, use Redis)
SESSIONS = {}

def get_cultural_tip(query: str, language: str = "English", profile: str = "General Traveler", session_id: str = "default") -> str:
    """
    Advanced RAG with Moderation, Memory, and Profiles.
    """
    
    # 0. MODERATION SHIELD
    moderation_prompt = f"Is this question offensive, disrespectful to UAE culture, or unsafe? Answer only YES or NO: '{query}'"
    try:
        mod_llm = ChatGoogleGenerativeAI(model="models/gemini-flash-lite-latest", google_api_key=os.getenv("GEMINI_API_KEY"))
        is_safe = mod_llm.invoke(moderation_prompt).content
        if "YES" in is_safe.upper():
            return "As your Roamly guide, I can only answer questions that are respectful to the local culture. Please rephrase."
    except: pass # Continue if moderation fails

    # 1. RETRIEVAL (Pinecone Search)
    try:
        index = get_vector_db()
        query_vector = embeddings.embed_query(query)
        search_results = index.query(vector=query_vector, top_k=3, include_metadata=True)
        
        context_parts = []
        for match in search_results['matches']:
            meta = match['metadata']
            context_parts.append(f"- RULE: {meta['rule']} (Zone: {meta['zone']}, Penalty: {meta['penalty']})")
        
        context = "\n".join(context_parts)
    except:
        context = "No specific rules found in local knowledge base."

    # 2. MEMORY AND HISTORY
    history = SESSIONS.get(session_id, "")
    SESSIONS[session_id] = query # Store last query

    # 3. GENERATION
    prompt = PromptTemplate.from_template("""
    You are Roamly, a smart cultural assistant for the UAE.
    
    TRAVELER PROFILE: {profile}
    RESPONSE LANGUAGE: {language}
    PREVIOUS CONTEXT: {history}
    
    GROUND TRUTH RULES:
    {context}
    
    TRAVELER QUESTION: 
    {query}
    
    Provide a concise, helpful tip tailored for a {profile}.
    If it involves a rule, ALWAYS mention the penalty.
    KEEP IT UNDER 3 SENTENCES.
    """)
    
    try:
        formatted_prompt = prompt.format(query=query, context=context, language=language, profile=profile, history=history)
        
        for model_name in MODEL_CANDIDATES:
            try:
                llm = ChatGoogleGenerativeAI(model=model_name, google_api_key=os.getenv("GEMINI_API_KEY"))
                return llm.invoke(formatted_prompt).content
            except: continue
        return "AI models are busy. Try again soon."
    except Exception as e:
        return f"Error: {str(e)}"

def scan_image_with_gemini(image_base64: str, language: str = "English") -> str:
    """
    Use Gemini Vision to analyze food menus or signs.
    """
    prompt = f"""
    Analyze this image of a menu or sign. 
    1. Translate it into {language}.
    2. Highlight any items that might be culturally or legally unsafe for a tourist in the current region (like alcohol, pork, or restricted imagery).
    3. Provide a friendly suggestion.
    Keep it concise.
    """
    
    try:
        llm = ChatGoogleGenerativeAI(model="models/gemini-2.0-flash", google_api_key=os.getenv("GEMINI_API_KEY"))
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                },
            ]
        )
        response = llm.invoke([message])
        return response.content
    except Exception as e:
        return f"Visual Analysis Error: {str(e)}"

import requests

def search_nearby_places(lat, lon, category="tourist_attraction"):
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        return {"error": "Google Places API Key missing"}
        
    url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lon}&radius=2000&type={category}&key={api_key}"
    
    try:
        response = requests.get(url)
        data = response.json()
        results = data.get("results", [])
        
        places = []
        for place in results[:10]: # Return top 10
            places.append({
                "name": place.get("name"),
                "rating": place.get("rating"),
                "address": place.get("vicinity"),
                "type": category
            })
        return places
    except Exception as e:
        return {"error": str(e)}
