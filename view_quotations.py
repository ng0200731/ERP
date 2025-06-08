import sqlite3
import json
from datetime import datetime

def convert_datetime(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value

try:
    # Connect to database.db
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get table info
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("\nTables in database.db:", [table[0] for table in tables])
    
    # Try to get quotations data
    try:
        cursor.execute('SELECT * FROM quotations')
        rows = cursor.fetchall()
        print("\nQuotations data:")
        for row in rows:
            # Convert row to dict
            row_dict = {key: convert_datetime(row[key]) for key in row.keys()}
            print(json.dumps(row_dict, indent=2))
    except sqlite3.OperationalError as e:
        print(f"\nError reading quotations table: {e}")
    
    # Print attachments for quotation_id = 4
    try:
        cursor.execute('SELECT * FROM attachments WHERE quotation_id = 4')
        rows = cursor.fetchall()
        print('\nAttachments for quotation_id = 4:')
        for row in rows:
            row_dict = {key: row[key] for key in row.keys()}
            print(row_dict)
    except sqlite3.OperationalError as e:
        print(f"\nError reading attachments table: {e}")
    
    conn.close()
    print("\nDatabase connection closed")
except Exception as e:
    print(f"Error: {e}") 