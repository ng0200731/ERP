import os
import sqlite3

try:
    print('Current directory:', os.getcwd())
    db_path = os.path.join(os.getcwd(), 'customers.db')
    print('Attempting to create database at:', db_path)
    conn = sqlite3.connect(db_path)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT,
            address TEXT,
            website TEXT,
            domains TEXT,
            created TEXT,
            updated TEXT
        )
    ''')
    conn.commit()
    conn.close()
    print('customers.db created!')
except Exception as e:
    print('Error creating customers.db:', e) 