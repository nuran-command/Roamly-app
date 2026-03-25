import json
import os

def audit_json(file_path):
    if not os.path.exists(file_path):
        print(f"File {file_path} not found.")
        return

    with open(file_path, 'r') as f:
        data = json.load(f)
        rules = data if isinstance(data, list) else data.get("rules", [])
    
    print(f"📊 Audit Report for {file_path}")
    print(f"--------------------------------")
    print(f"Total Rules: {len(rules)}")
    
    categories = {}
    urgency_counts = {1: 0, 2: 0, 3: 0}
    geo_tagged = 0
    general_rules = 0

    for rule in rules:
        cat = rule.get("category", "Uncategorized")
        categories[cat] = categories.get(cat, 0) + 1
        
        urgency = rule.get("urgency", 3)
        urgency_counts[urgency] = urgency_counts.get(urgency, 0) + 1
        
        if rule.get("location"):
            geo_tagged += 1
        else:
            general_rules += 1

    print(f"\n⚡ Urgency Breakdown:")
    for u, count in urgency_counts.items():
        label = {1: "🔴 CRITICAL / LEGAL", 2: "🟠 WARNING", 3: "🟢 CULTURAL"}[u]
        print(f"  - {label}: {count}")

    print(f"\n📂 Top Categories:")
    sorted_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)
    for cat, count in sorted_cats[:5]:
        print(f"  - {cat}: {count}")

    print(f"\n📍 Geofencing Status:")
    print(f"  - Rules with Coordinates: {geo_tagged}")
    print(f"  - General Rules (Daily Tip/Welcome): {general_rules}")
    print(f"--------------------------------")

if __name__ == "__main__":
    audit_json("backend-python/data/kazakhstan_culture.json")
    audit_json("backend-python/data/uae_culture.json")
