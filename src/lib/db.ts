import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export const SCHEMA = `
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  po_csv_format TEXT NOT NULL DEFAULT 'zepto'
);

CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,
  raw_del_location TEXT,
  UNIQUE(customer_id, name)
);

CREATE TABLE items (
  item_code TEXT PRIMARY KEY,
  tally_name TEXT NOT NULL,
  sticks_per_pack INTEGER NOT NULL,
  unit_base_cost REAL,
  pricing_source TEXT,
  pricing_date TEXT,
  tracked INTEGER NOT NULL DEFAULT 1
);

-- a given physical item can be sold to different customers under different SKU descriptions / brand codes
CREATE TABLE item_customer_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT NOT NULL REFERENCES items(item_code),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  sku_desc TEXT,
  brand_code TEXT
  -- intentionally no UNIQUE(customer_id, sku_desc): the source catalog has a couple of
  -- legitimate duplicates (e.g. an untracked legacy code sharing a tracked item's SKU text) --
  -- resolved at lookup time by preferring tracked items, see findItemByCustomerSkuDesc.
);

CREATE TABLE stock_on_hand (
  item_code TEXT PRIMARY KEY REFERENCES items(item_code),
  qty_packs REAL NOT NULL DEFAULT 0
);

CREATE TABLE stock_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  event_type TEXT NOT NULL,
  reference TEXT,
  item_code TEXT NOT NULL REFERENCES items(item_code),
  qty_signed REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE purchase_orders (
  po_no TEXT PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  po_date TEXT,
  del_location TEXT,
  location_id INTEGER REFERENCES locations(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  po_amount REAL,
  gpi_receipt_invoice TEXT,
  gpi_receipt_date TEXT,
  billing_invoice TEXT,
  billing_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE po_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_no TEXT NOT NULL REFERENCES purchase_orders(po_no),
  item_code TEXT NOT NULL REFERENCES items(item_code),
  sku_desc TEXT,
  qty_ordered REAL NOT NULL,
  unit_base_cost REAL,
  qty_billed REAL
);

CREATE TABLE gpi_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  total_m REAL,
  status TEXT NOT NULL DEFAULT 'PLACED',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE gpi_order_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gpi_order_id INTEGER NOT NULL REFERENCES gpi_orders(id),
  item_code TEXT NOT NULL REFERENCES items(item_code),
  qty_packs REAL NOT NULL,
  qty_m REAL NOT NULL,
  qty_received REAL NOT NULL DEFAULT 0
);

-- generic AR ledger, one per customer (was "zepto_ledger")
CREATE TABLE ar_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  date TEXT NOT NULL,
  invoice_no TEXT,
  narration TEXT NOT NULL,
  credit REAL,
  tds REAL,
  debit REAL,
  balance REAL NOT NULL,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE outstanding (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  invoice_number TEXT NOT NULL,
  invoice_amount REAL NOT NULL,
  date_of_invoice TEXT,
  town_name TEXT,
  store_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sales_tracker (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  sku_name TEXT NOT NULL,
  po_number TEXT,
  invoice_no TEXT,
  invoice_date TEXT,
  po_qty REAL,
  billed_qty REAL,
  fill_rate TEXT
);

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX idx_ledger_item ON stock_ledger(item_code);
CREATE INDEX idx_ledger_date ON stock_ledger(date);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_customer ON purchase_orders(customer_id);
CREATE INDEX idx_po_lines_po ON po_lines(po_no);
CREATE INDEX idx_ar_customer ON ar_ledger(customer_id);
CREATE INDEX idx_outstanding_customer ON outstanding(customer_id);
CREATE INDEX idx_item_codes_customer ON item_customer_codes(customer_id);
`;

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "qcom.db");
const isNew = !fs.existsSync(dbPath);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

if (isNew) {
  db.exec(SCHEMA);
}

export default db;
