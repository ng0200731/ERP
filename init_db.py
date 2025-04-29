import sqlite3
import os
from datetime import datetime, timezone

def init_db():
    db_path = 'customers.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create users table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        is_approved INTEGER DEFAULT 0,
        permission_level INTEGER,
        approved_at TEXT,
        last_login TEXT,
        last_updated TEXT
    )
    ''')

    # Create option_databases table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS option_databases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        is_multiselect INTEGER DEFAULT 0
    )
    ''')

    # Create option_fields table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS option_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        database_id INTEGER NOT NULL,
        value TEXT NOT NULL,
        FOREIGN KEY (database_id) REFERENCES option_databases (id),
        UNIQUE (database_id, value)
    )
    ''')

    # Add default admin user if not exists
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute('''
    INSERT OR IGNORE INTO users (email, is_approved, permission_level, approved_at, last_updated)
    VALUES (?, 1, 3, ?, ?)
    ''', ('admin@example.com', now, now))

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully") 