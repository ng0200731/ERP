"""
Ultra-simple CSV to SQLite import script.
Uses csv and sqlite3 modules from the standard library.
No pandas or other external dependencies.
"""

import csv
import sqlite3
import os
import glob

def main():
    print("===== CSV to Heat Transfer Database Importer =====")
    
    # Find the latest CSV file
    csv_files = glob.glob('uploads/*.csv')
    if not csv_files:
        print("Error: No CSV files found in 'uploads' directory")
        input("Press Enter to exit...")
        return
    
    # Get latest file
    latest_csv = max(csv_files, key=os.path.getmtime)
    print(f"Found CSV file: {latest_csv}")
    
    # Create table and import data
    try:
        # Connect to database
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Create table if not exists
        print("Creating table structure...")
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
        print("Clearing existing data...")
        cursor.execute('DELETE FROM ht_database')
        
        # Read and import CSV
        print(f"Importing data from {latest_csv}...")
        
        with open(latest_csv, 'r') as f:
            reader = csv.reader(f)
            headers = next(reader)  # Get column headers
            
            print(f"Found columns: {', '.join(headers)}")
            
            # Check if we have all required columns
            required_columns = [
                'Quality', 'Flat or Raised', 'Direct or Reverse', 
                'Thickness', '# of Colors', 'Length', 'Width', 'Price'
            ]
            
            # Print warning for any missing columns 
            missing = [col for col in required_columns if col not in headers]
            if missing:
                print(f"Warning: Missing columns: {', '.join(missing)}")
                proceed = input("Continue anyway? (y/n): ")
                if proceed.lower() != 'y':
                    conn.close()
                    return
            
            # Create query with correct number of parameters
            cols = ', '.join([f'"{h}"' for h in headers])
            params = ', '.join(['?'] * len(headers))
            query = f'INSERT INTO ht_database ({cols}) VALUES ({params})'
            
            # Insert data
            row_count = 0
            for row in reader:
                cursor.execute(query, row)
                row_count += 1
            
            print(f"Imported {row_count} rows of data")
        
        # Commit and verify
        conn.commit()
        
        # View sample data
        print("\nSample data:")
        cursor.execute('SELECT * FROM ht_database LIMIT 5')
        rows = cursor.fetchall()
        for row in rows:
            print(row)
        
        conn.close()
        print("\nImport completed successfully!")
        
    except Exception as e:
        print(f"Error during import: {str(e)}")
    
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main() 