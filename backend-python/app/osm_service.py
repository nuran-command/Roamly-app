import os
import requests

def get_restricted_polygons(lat, lon, radius=2000):
    """
    Fetch exact building shapes (polygons) from OpenStreetMap.
    """
    overpass_url = "http://overpass-api.de/api/interpreter"
    
    # Search for Place of Worship or Government Buildings or Military within radius
    overpass_query = f"""
    [out:json];
    (
      node["amenity"="place_of_worship"](around:{radius},{lat},{lon});
      way["amenity"="place_of_worship"](around:{radius},{lat},{lon});
      relation["amenity"="place_of_worship"](around:{radius},{lat},{lon});
      node["office"="government"](around:{radius},{lat},{lon});
      way["office"="government"](around:{radius},{lat},{lon});
      node["military"="yes"](around:{radius},{lat},{lon});
      way["military"="yes"](around:{radius},{lat},{lon});
    );
    out body;
    >;
    out skel qt;
    """
    
    try:
        response = requests.post(overpass_url, data={'data': overpass_query})
        data = response.json()
        elements = data.get("elements", [])
        
        polygons = []
        for element in elements:
            if element.get("type") == "way" and "nodes" in element:
                # We identify it as a polygon
                name = element.get("tags", {}).get("name", "Restricted Area")
                polygons.append({
                    "id": element.get("id"),
                    "name": name,
                    "type": element.get("tags", {}).get("amenity") or "restricted"
                })
        return polygons
    except Exception as e:
        return {"error": str(e)}
