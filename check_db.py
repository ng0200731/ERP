import sqlite3
import os
import json
import sys
from datetime import datetime

def get_db():
    # Get absolute path to the database file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, 'customers.db')
    print(f"Checking database at: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"Error: Database file does not exist at {db_path}")
        sys.exit(1)
        
    if not os.access(db_path, os.R_OK):
        print(f"Error: Database file is not readable at {db_path}")
        sys.exit(1)
        
    print(f"Database file exists and is readable")
    return sqlite3.connect(db_path)

def check_tables():
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        print("\nChecking database structure...")
        
        # Get list of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        table_names = [table[0] for table in tables]
        print("\nTables in database:", table_names)
        
        # Check if quotations2 table exists
        if 'quotations2' not in table_names:
            print("\nError: quotations2 table not found!")
            return
            
        print("\nFound quotations2 table")
        
        # Check quotations2 table structure
        cursor.execute("PRAGMA table_info(quotations2);")
        columns = cursor.fetchall()
        print("\nQuotations2 table structure:")
        for col in columns:
            print(f"Column: {col[1]}, Type: {col[2]}, Nullable: {col[3]}, Default: {col[4]}")
        
        # Count records
        cursor.execute("SELECT COUNT(*) FROM quotations2;")
        count = cursor.fetchone()[0]
        print(f"\nNumber of records in quotations2: {count}")
        
        # Show all records
        if count > 0:
            try:
                cursor.execute("""
                    SELECT 
                        q.*,
                        c.company as company_name,
                        u.email as created_by_name
                    FROM quotations2 q
                    LEFT JOIN customers c ON q.company_id = c.id
                    LEFT JOIN users u ON q.created_by = u.id
                """)
                records = cursor.fetchall()
                print("\nAll records:")
                for record in records:
                    try:
                        record_dict = {
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
                            'last_updated': record[13]
                        }
                        if len(record) > 14:
                            record_dict.update({
                                'company_name': record[14],
                                'created_by_name': record[15]
                            })
                        print(json.dumps(record_dict, indent=2, ensure_ascii=False))
                    except Exception as e:
                        print(f"Error formatting record: {e}")
                        print("Raw record:", record)
            except sqlite3.OperationalError as e:
                print(f"\nError querying records with joins: {str(e)}")
                print("Trying simple query without joins...")
                
                cursor.execute("SELECT * FROM quotations2")
                records = cursor.fetchall()
                print("\nRecords (without joins):")
                for record in records:
                    try:
                        record_dict = {
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
                            'last_updated': record[13]
                        }
                        print(json.dumps(record_dict, indent=2, ensure_ascii=False))
                    except Exception as e:
                        print(f"Error formatting record: {e}")
                        print("Raw record:", record)
        
    except Exception as e:
        print(f"\nError checking database: {str(e)}")
        if isinstance(e, sqlite3.Error):
            print("SQLite error code:", e.sqlite_errorcode if hasattr(e, 'sqlite_errorcode') else 'Unknown')
            print("SQLite error name:", e.sqlite_errorname if hasattr(e, 'sqlite_errorname') else 'Unknown')
    finally:
        if conn:
            conn.close()
            print("\nDatabase connection closed")

def check_quotations():
    try:
        # Connect to the database
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all records ordered by ID
        cursor.execute("""
            SELECT id, customer_name, key_person_name, customer_item_code, 
                   quality, flat_or_raised, direct_or_reverse, thickness,
                   num_colors, length, width, price, created_at, last_updated
            FROM quotations 
            ORDER BY id DESC
        """)
        
        records = cursor.fetchall()
        print("\nFound", len(records), "total records")
        print("\nLatest 10 records:")
        print("-" * 100)
        
        # Print the latest 10 records
        for row in records[:10]:
            print(f"ID: {row['id']}")
            print(f"Customer: {row['customer_name']}")
            print(f"Key Person: {row['key_person_name']}")
            print(f"Item Code: {row['customer_item_code']}")
            print(f"Quality: {row['quality']}")
            print(f"Created: {row['created_at']}")
            print(f"Last Updated: {row['last_updated']}")
            print("-" * 100)
            
        # Check for duplicates
        cursor.execute("""
            SELECT customer_name, key_person_name, customer_item_code, 
                   quality, flat_or_raised, direct_or_reverse, thickness,
                   num_colors, length, width, price, created_at, last_updated,
                   COUNT(*) as count,
                   GROUP_CONCAT(id) as ids
            FROM quotations
            GROUP BY customer_name, key_person_name, customer_item_code, 
                     quality, flat_or_raised, direct_or_reverse, thickness,
                     num_colors, length, width, price, created_at, last_updated
            HAVING COUNT(*) > 1
        """)
        
        duplicates = cursor.fetchall()
        if duplicates:
            print("\nFound duplicate records:")
            for dup in duplicates:
                print(f"\nDuplicate set with IDs: {dup['ids']}")
                print(f"Customer: {dup['customer_name']}")
                print(f"Key Person: {dup['key_person_name']}")
                print(f"Item Code: {dup['customer_item_code']}")
                print(f"Created: {dup['created_at']}")
                print(f"Appears {dup['count']} times")
        else:
            print("\nNo duplicate records found in database")
            
        conn.close()
        
    except Exception as e:
        print(f"Error checking database: {e}")

if __name__ == "__main__":
    try:
        check_tables()
        print("\nDatabase check completed")
        check_quotations()
    except Exception as e:
        print(f"\nFailed to check database: {str(e)}")
        sys.exit(1) 