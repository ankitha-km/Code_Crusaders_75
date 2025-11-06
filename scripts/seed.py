import csv, sqlite3, pathlib

# Define paths
ROOT = pathlib.Path(__file__).resolve().parents[1]
DB = ROOT / "backend" / "app.db"
SCHEMA = ROOT / "backend" / "schema.sql"
DATA = ROOT / "data"

# Connect to SQLite and create tables
con = sqlite3.connect(DB)
cur = con.cursor()

# Create tables from schema
with open(SCHEMA, "r", encoding="utf-8") as f:
    cur.executescript(f.read())

# Function to load CSVs
def load_csv(path, table, cols):
    with open(path, newline='', encoding='utf-8') as f:
        r = csv.DictReader(f)
        rows = [[row[c] for c in cols] for row in r]
        qm = ",".join(["?"] * len(cols))
        cur.executemany(
            f"INSERT INTO {table} ({','.join(cols)}) VALUES ({qm})", rows
        )

# Load all CSV files
load_csv(DATA / "medicines.csv", "medicines", ["brand_name", "generic_name", "strength", "form", "atc_code"])
load_csv(DATA / "stores.csv", "stores", ["name", "lat", "lon", "address", "opens", "closes"])
load_csv(DATA / "inventory.csv", "inventory", ["store_id", "medicine_id", "price", "stock_level"])

# Commit and close
con.commit()
con.close()

print("✅ Database seeded successfully! (app.db created inside backend folder)")
