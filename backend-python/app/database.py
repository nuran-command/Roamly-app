import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

def get_vector_db():
    """
    Initialize connection to Pinecone Vector Database.
    Loads credentials from .env and connects using pinecone-client.
    """
    api_key = os.getenv("PINECONE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX_NAME", "roamly-culture")
    
    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)
    
    return index
