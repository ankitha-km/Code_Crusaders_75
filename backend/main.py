from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3, math

DB_PATH = "backend/app.db"
app = FastAPI(title="Smart Medicine Locator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return 2 * R * math.asin(math.sqrt(a))

class RecommendReq(BaseModel):
    qtext: str
    lat: float
    lon: float
    w_p: float = 0.5
    w_d: float = 0.3
    w_a: float = 0.2

@app.post("/recommend")
def recommend(payload: RecommendReq):
    con = db()
    meds = con.execute("SELECT * FROM medicines").fetchall()
    med = next((m for m in meds if payload.qtext.lower() in (m['brand_name'] or '').lower() or payload.qtext.lower() in (m['generic_name'] or '').lower()), meds[0])
    rows = con.execute("""
        SELECT s.id AS store_id, s.name AS store_name, s.lat, s.lon, s.address,
               i.price, i.stock_level AS availability
        FROM inventory i JOIN stores s ON s.id = i.store_id
        WHERE i.medicine_id = ?
    """, (med['id'],)).fetchall()

    matches = []
    for r in rows:
        dist = round(haversine_km(payload.lat, payload.lon, r['lat'], r['lon']), 2)
        matches.append({**dict(r), "distance_km": dist})
    
    prices = [m["price"] for m in matches]
    minp, maxp = min(prices), max(prices)
    dists = [m["distance_km"] for m in matches]
    maxd = max(dists) if dists else 1

    for m in matches:
        price_norm = (m["price"] - minp) / ((maxp - minp) + 1e-9)
        dist_norm = (m["distance_km"]) / (maxd + 1e-9)
        avail_norm = max(0, min(1, m["availability"] / 100))
        m["score"] = round(payload.w_p * price_norm + payload.w_d * dist_norm + payload.w_a * (1 - avail_norm), 3)
    
    matches.sort(key=lambda x: x["score"])
    return {"medicine": dict(med), "matches": matches, "best": matches[0]}
