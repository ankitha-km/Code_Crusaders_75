PRAGMA foreign_keys=ON;

DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS medicines;

CREATE TABLE medicines (
  id INTEGER PRIMARY KEY,
  brand_name TEXT,
  generic_name TEXT NOT NULL,
  strength TEXT,
  form TEXT,
  atc_code TEXT
);

CREATE TABLE stores (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  address TEXT,
  opens TEXT,
  closes TEXT
);

CREATE TABLE inventory (
  id INTEGER PRIMARY KEY,
  store_id INTEGER NOT NULL,
  medicine_id INTEGER NOT NULL,
  price REAL NOT NULL,
  stock_level INTEGER NOT NULL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(store_id) REFERENCES stores(id),
  FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

CREATE INDEX idx_inventory_medicine ON inventory(medicine_id);
CREATE INDEX idx_inventory_store ON inventory(store_id);
