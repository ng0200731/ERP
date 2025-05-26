# Version v1.2.68
import sqlite3

DB_PATH = 'database.db'
COLUMN_NAME = 'status'
COLUMN_DEF = "VARCHAR(50) DEFAULT '-'"

def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())

def add_column_if_missing():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if not column_exists(cursor, 'quotations', COLUMN_NAME):
        print(f"Adding column '{COLUMN_NAME}' to 'quotations' table...")
        cursor.execute(f"ALTER TABLE quotations ADD COLUMN {COLUMN_NAME} {COLUMN_DEF}")
        conn.commit()
        print(f"Column '{COLUMN_NAME}' added.")
    else:
        print(f"Column '{COLUMN_NAME}' already exists. No changes made.")
    conn.close()

if __name__ == "__main__":
    add_column_if_missing() 