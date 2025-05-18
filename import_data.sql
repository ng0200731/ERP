-- Create the Heat Transfer Database table if it doesn't exist
CREATE TABLE IF NOT EXISTS ht_database (
    "Quality" TEXT,
    "Flat or Raised" TEXT,
    "Direct or Reverse" TEXT,
    "Thickness" REAL,
    "# of Colors" INTEGER,
    "Length" REAL,
    "Width" REAL,
    "Price" REAL
);

-- Clear existing data
DELETE FROM ht_database;

-- To import the CSV data, run the following command in SQLite CLI:
-- .mode csv
-- .import uploads/upload_20250518_143005_datatbase_final_1.csv ht_database

-- Display the table structure
PRAGMA table_info(ht_database);

-- Count the number of rows
SELECT COUNT(*) FROM ht_database; 