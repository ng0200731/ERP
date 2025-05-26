import sqlite3
import os
import json
from datetime import datetime

def get_db():
    try:
        # Get absolute path to the database file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(current_dir, 'customers.db')
        print(f"Database path: {db_path}")
        
        # Check if database file exists
        if os.path.exists(db_path):
            print(f"Database file exists at {db_path}")
            # Check if file is writable
            if os.access(db_path, os.W_OK):
                print("Database file is writable")
            else:
                print("Warning: Database file is not writable")
        else:
            print(f"Warning: Database file does not exist at {db_path}")
            # Try to create an empty database
            try:
                conn = sqlite3.connect(db_path)
                conn.close()
                print("Created new database file")
            except Exception as e:
                print(f"Error creating database file: {e}")
                raise
        
        return sqlite3.connect(db_path)
    except Exception as e:
        print(f"Error in get_db: {e}")
        raise

def init_quotations_table():
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        print("\nInitializing quotations table...")
        
        # Drop existing table if it exists
        cursor.execute('DROP TABLE IF EXISTS quotations2')
        print("Dropped existing quotations2 table")
        
        # Create the table with foreign key constraints
        cursor.execute('''
            CREATE TABLE quotations2 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL,
                key_person_id INTEGER NOT NULL,
                quality TEXT NOT NULL,
                flat_or_raised TEXT NOT NULL,
                direct_or_reverse TEXT NOT NULL,
                thickness REAL,
                num_colors INTEGER NOT NULL,
                color_names TEXT NOT NULL,
                length REAL NOT NULL,
                width REAL NOT NULL,
                created_by INTEGER NOT NULL,
                created_date TEXT NOT NULL,
                last_updated TEXT NOT NULL,
                FOREIGN KEY (company_id) REFERENCES customers (id),
                FOREIGN KEY (key_person_id) REFERENCES key_people (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        ''')
        print("Created quotations2 table")
        
        # Get customer and key person IDs
        cursor.execute("SELECT id, company FROM customers")
        customers = cursor.fetchall()
        if not customers:
            raise Exception("No customers found in database")
            
        cursor.execute("SELECT id, customer_id, name FROM key_people")
        key_people = cursor.fetchall()
        if not key_people:
            raise Exception("No key people found in database")
            
        print(f"\nFound {len(customers)} customers and {len(key_people)} key people")
        
        # Insert test records using actual customer and key person IDs
        test_records = [
            {
                'company_id': customers[0][0],  # First customer
                'key_person_id': key_people[0][0],  # First key person
                'quality': 'PU',
                'flat_or_raised': 'Flat',
                'direct_or_reverse': 'Direct',
                'thickness': 0.5,
                'num_colors': 2,
                'color_names': json.dumps(['Red', 'Blue']),
                'length': 100,
                'width': 50,
                'created_by': 1,
                'created_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            },
            {
                'company_id': customers[1][0],  # Second customer
                'key_person_id': key_people[2][0],  # Third key person
                'quality': 'Silicon',
                'flat_or_raised': 'Raised',
                'direct_or_reverse': 'Reverse',
                'thickness': 1.0,
                'num_colors': 3,
                'color_names': json.dumps(['Green', 'Yellow', 'Black']),
                'length': 150,
                'width': 75,
                'created_by': 1,
                'created_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        ]
        
        for i, record in enumerate(test_records, 1):
            cursor.execute('''
                INSERT INTO quotations2 (
                    company_id, key_person_id, quality, flat_or_raised, direct_or_reverse,
                    thickness, num_colors, color_names, length, width, created_by,
                    created_date, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                record['company_id'],
                record['key_person_id'],
                record['quality'],
                record['flat_or_raised'],
                record['direct_or_reverse'],
                record['thickness'],
                record['num_colors'],
                record['color_names'],
                record['length'],
                record['width'],
                record['created_by'],
                record['created_date'],
                record['last_updated']
            ))
            print(f"Inserted test record {i}")
        
        conn.commit()
        print("\nAll changes committed successfully")
        
        # Verify the records with joins
        cursor.execute("""
            SELECT 
                q.*,
                c.company as company_name,
                kp.name as key_person_name,
                u.email as created_by_name
            FROM quotations2 q
            JOIN customers c ON q.company_id = c.id
            JOIN key_people kp ON q.key_person_id = kp.id
            JOIN users u ON q.created_by = u.id
        """)
        records = cursor.fetchall()
        print(f"\nVerified {len(records)} records with joins:")
        for record in records:
            print(json.dumps({
                'id': record[0],
                'company_id': record[1],
                'key_person_id': record[2],
                'quality': record[3],
                'flat_or_raised': record[4],
                'direct_or_reverse': record[5],
                'thickness': record[6],
                'num_colors': record[7],
                'color_names': record[8],
                'length': record[9],
                'width': record[10],
                'created_by': record[11],
                'created_date': record[12],
                'last_updated': record[13],
                'company_name': record[14],
                'key_person_name': record[15],
                'created_by_name': record[16]
            }, indent=2))
            
    except Exception as e:
        print(f"\nError initializing database: {str(e)}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()
            print("\nDatabase connection closed")

if __name__ == "__main__":
    try:
        init_quotations_table()
        print("\nDatabase initialization completed successfully")
    except Exception as e:
        print(f"\nFailed to initialize database: {str(e)}")
        exit(1) 