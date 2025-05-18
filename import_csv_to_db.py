"""
Direct CSV to Database Import Script
This script imports CSV data directly into the SQLite database
without requiring Flask or any web framework.
"""

import os
import sys
import sqlite3
import pandas as pd
import glob

def main():
    # Find the latest uploaded CSV file
    csv_files = glob.glob('uploads/*.csv')
    if not csv_files:
        print("Error: No CSV files found in the uploads directory")
        return
    
    # Sort by modification time (newest first)
    latest_csv = max(csv_files, key=os.path.getmtime)
    print(f"Found CSV file: {latest_csv}")
    
    try:
        # Read CSV file
        print("Reading CSV data...")
        df = pd.read_csv(latest_csv)
        
        # Display preview
        print("\nData preview:")
        print(df.head())
        
        # Verify required columns
        required_columns = [
            'Quality', 
            'Flat or Raised', 
            'Direct or Reverse', 
            'Thickness', 
            '# of Colors', 
            'Length', 
            'Width', 
            'Price'
        ]
        
        # Check for missing columns
        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            print(f"Error: Missing required columns: {', '.join(missing)}")
            print(f"Found columns: {', '.join(df.columns)}")
            return
        
        # Connect to database
        print("\nConnecting to database...")
        conn = sqlite3.connect('database.db')
        
        # Import to database
        print("Importing data to database...")
        df.to_sql('ht_database', conn, if_exists='replace', index=False)
        
        # Verify import
        print("\nVerifying import...")
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM ht_database")
        count = cursor.fetchone()[0]
        print(f"Successfully imported {count} rows into the database!")
        
        # Show table info
        cursor.execute("PRAGMA table_info(ht_database)")
        columns = cursor.fetchall()
        print("\nTable structure:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
        conn.close()
        print("\nImport completed successfully!")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return

if __name__ == "__main__":
    print("===== CSV to Heat Transfer Database Import Tool =====")
    main() 