import sqlite3
import csv
import os
import glob

print('=== CSV to Heat Transfer Database Importer (With BOM Fix) ===')

# Find CSV files
print('Looking for CSV files in uploads directory...')
csv_files = glob.glob('uploads/*.csv')

if not csv_files:
    print('Error: No CSV files found in uploads directory')
    exit(1)

# Get the latest CSV file
latest_csv = max(csv_files, key=os.path.getmtime)
print(f'Found CSV file: {latest_csv}')

# Create/connect to database
conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# Create table if not exists
print('Creating table structure...')
cursor.execute('''
CREATE TABLE IF NOT EXISTS ht_database (
    "Quality" TEXT,
    "Flat or Raised" TEXT,
    "Direct or Reverse" TEXT,
    "Thickness" REAL,
    "# of Colors" INTEGER,
    "Length" REAL,
    "Width" REAL,
    "Price" REAL
)
''')

# Clear existing data
print('Clearing existing data...')
cursor.execute('DELETE FROM ht_database')

# Read file with UTF-8-BOM encoding
print('Reading CSV with UTF-8-BOM encoding...')
try:
    # First try UTF-8 with BOM
    with open(latest_csv, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        headers = next(reader)
        print(f'Found columns: {headers}')
        
        # Verify headers
        expected_headers = ["Quality", "Flat or Raised", "Direct or Reverse", "Thickness", 
                            "# of Colors", "Length", "Width", "Price"]
        
        # Fix any encoding issues in headers
        fixed_headers = []
        for i, header in enumerate(headers):
            if i < len(expected_headers):
                # Use the expected header name if position matches
                fixed_headers.append(expected_headers[i])
            else:
                # Keep the original if it's an extra column
                fixed_headers.append(header)
        
        print(f'Using fixed headers: {fixed_headers}')
        
        # Use the fixed headers for insertion
        cols = ', '.join([f'"{h}"' for h in expected_headers[:len(headers)]])
        placeholders = ', '.join(['?'] * len(headers))
        query = f'INSERT INTO ht_database ({cols}) VALUES ({placeholders})'
        
        # Insert data
        print('Importing data...')
        row_count = 0
        for row in reader:
            try:
                # Only process rows with the right number of columns
                if len(row) == len(headers):
                    cursor.execute(query, row)
                    row_count += 1
            except Exception as e:
                print(f'Error on row: {row}')
                print(f'Error: {str(e)}')
                continue
        
        print(f'Imported {row_count} rows of data')
except Exception as e:
    print(f'Error reading file: {str(e)}')
    exit(1)

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

print('\nPress Enter to exit...')
input() 