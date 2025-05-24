import sqlite3
import os
import json
from datetime import datetime

def get_db():
    db_path = os.path.join(os.path.dirname(__file__), 'customers.db')
    return sqlite3.connect(db_path)

def insert_test_record():
    conn = get_db()
    cursor = conn.cursor()
    
    # First, make sure the table exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quotations2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER,
            key_person_id INTEGER,
            quality TEXT,
            flat_or_raised TEXT,
            direct_or_reverse TEXT,
            thickness REAL,
            num_colors INTEGER,
            color_names TEXT,
            length REAL,
            width REAL,
            created_by INTEGER,
            created_date TEXT,
            last_updated TEXT
        )
    ''')
    
    # Insert a test record
    test_data = {
        'company_id': 1,  # Assuming company ID 1 exists
        'key_person_id': 1,
        'quality': 'PU',
        'flat_or_raised': 'Flat',
        'direct_or_reverse': 'Direct',
        'thickness': 0.5,
        'num_colors': 2,
        'color_names': json.dumps(['Red', 'Blue']),
        'length': 100,
        'width': 50,
        'created_by': 1,  # Assuming user ID 1 exists
        'created_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    cursor.execute('''
        INSERT INTO quotations2 (
            company_id, key_person_id, quality, flat_or_raised, direct_or_reverse,
            thickness, num_colors, color_names, length, width, created_by,
            created_date, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        test_data['company_id'],
        test_data['key_person_id'],
        test_data['quality'],
        test_data['flat_or_raised'],
        test_data['direct_or_reverse'],
        test_data['thickness'],
        test_data['num_colors'],
        test_data['color_names'],
        test_data['length'],
        test_data['width'],
        test_data['created_by'],
        test_data['created_date'],
        test_data['last_updated']
    ))
    
    conn.commit()
    print("Test record inserted successfully")
    
    # Verify the record was inserted
    cursor.execute("SELECT * FROM quotations2 ORDER BY id DESC LIMIT 1")
    record = cursor.fetchone()
    print("\nInserted record:", record)
    
    conn.close()

if __name__ == "__main__":
    insert_test_record() 