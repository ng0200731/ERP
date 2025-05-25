# Version v1.2.68
from quotation_database import Base, Quotation, get_db
import sqlite3

def reset_quotations_table():
    """
    Drops and recreates the quotations table with the latest schema (including artwork_image and status).
    WARNING: This will delete all existing quotation records!
    """
    engine = get_db()
    print("Dropping quotations table (if exists)...")
    Base.metadata.drop_all(engine, tables=[Quotation.__table__])
    print("Creating quotations table with latest schema...")
    Base.metadata.create_all(engine, tables=[Quotation.__table__])
    print("Quotations table has been reset with the latest schema (including artwork_image and status).")

    conn = sqlite3.connect('database.db')
    conn.execute("ALTER TABLE quotations ADD COLUMN artwork_image VARCHAR(255)")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    reset_quotations_table() 