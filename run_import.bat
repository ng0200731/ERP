@echo off
echo ===== CSV to Heat Transfer Database Import Tool =====
echo.

REM Use the full path to Python to execute our script
D:\python-env\venv\Scripts\python.exe -c "
import sqlite3
import csv
import os

print('Looking for CSV files in uploads directory...')
csv_files = [f for f in os.listdir('uploads') if f.endswith('.csv')]

if not csv_files:
    print('Error: No CSV files found in uploads directory')
    exit(1)

# Get the latest CSV file
latest_csv = sorted(csv_files, key=lambda f: os.path.getmtime(os.path.join('uploads', f)), reverse=True)[0]
csv_path = os.path.join('uploads', latest_csv)
print(f'Found CSV file: {csv_path}')

# Create/connect to database
conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# Create table if not exists
print('Creating table structure...')
cursor.execute('''
CREATE TABLE IF NOT EXISTS ht_database (
    \"Quality\" TEXT,
    \"Flat or Raised\" TEXT,
    \"Direct or Reverse\" TEXT,
    \"Thickness\" REAL,
    \"# of Colors\" INTEGER,
    \"Length\" REAL,
    \"Width\" REAL,
    \"Price\" REAL
)
''')

# Clear existing data
print('Clearing existing data...')
cursor.execute('DELETE FROM ht_database')

# Read headers
print('Reading CSV headers...')
with open(csv_path, 'r') as f:
    reader = csv.reader(f)
    headers = next(reader)
    print(f'Found columns: {headers}')
    
    # Create insert query
    cols = ', '.join([f'\"{h}\"' for h in headers])
    placeholders = ', '.join(['?'] * len(headers))
    query = f'INSERT INTO ht_database ({cols}) VALUES ({placeholders})'
    
    # Insert data
    print('Importing data...')
    row_count = 0
    for row in reader:
        cursor.execute(query, row)
        row_count += 1
    
    print(f'Imported {row_count} rows of data')

# Commit changes
conn.commit()

# Verify
print('\nVerifying import...')
cursor.execute('SELECT COUNT(*) FROM ht_database')
count = cursor.fetchone()[0]
print(f'Successfully imported {count} rows!')

# Show sample data
print('\nSample data:')
cursor.execute('SELECT * FROM ht_database LIMIT 5')
sample = cursor.fetchall()
for row in sample:
    print(row)

conn.close()
print('\nImport completed successfully!')
"

echo.
echo If the import completed successfully, your data is now in the database!
pause 