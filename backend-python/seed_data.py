import os
import json
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pinecone import Pinecone

load_dotenv()

# Setup
api_key = os.getenv("PINECONE_API_KEY")
index_name = "roamly-culture"
google_api_key = os.getenv("GEMINI_API_KEY")

def seed():
    # Load JSON
    with open("data/uae_culture.json", "r") as f:
        data = json.load(f)

    # Initialize Clients
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001", 
        google_api_key=google_api_key,
        task_type="retrieval_document",
        output_dimensionality=768
    )
    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)

    print(f"--- Seeding {len(data['rules'])} rules into Pinecone... ---")

    for i, item in enumerate(data['rules']):
        # Prepare text representation
        text_to_embed = f"{item['category']}: {item['rule']} ({item['penalty']}) in {item['trigger_zone']}"
        
        # Generate vector
        vector = embeddings.embed_query(text_to_embed)
        
        # Upload
        index.upsert(
            vectors=[{
                "id": f"rule_{i}",
                "values": vector,
                "metadata": {
                    "category": item['category'],
                    "rule": item['rule'],
                    "penalty": item['penalty'],
                    "zone": item['trigger_zone'],
                    "text": item['rule']
                }
            }]
        )
        print(f"Uploaded rule {i+1}/{len(data['rules'])}: {item['category']}")

    print("\n✅ All rules successfully seeded deep into your AI's memory!")

if __name__ == "__main__":
    seed()
