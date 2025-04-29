import sqlite3
import os
import sys

# Write to stderr to ensure output is visible
def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)
    sys.stderr.flush()

eprint("Script started")

try:
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), 'customers.db')
    eprint(f"Database path: {db_path}")
    
    # Check if database exists
    if not os.path.exists(db_path):
        eprint(f"Database file not found at {db_path}")
        sys.exit(1)
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    eprint("Connected to database")
    
    # List all tables
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    eprint("Tables in database:")
    for table in tables:
        eprint(f" - {table['name']}")
    
    # Check if users table exists
    if not any(table['name'] == 'users' for table in tables):
        eprint("No 'users' table found in database")
        sys.exit(1)
    
    # List all users
    eprint("\nListing all users:")
    cursor.execute("SELECT id, email, is_approved FROM users")
    users = cursor.fetchall()
    for user in users:
        eprint(f"ID={user['id']}, Email={user['email']}, Status={user['is_approved']}")
    
    # Find the specific user
    email_to_remove = "weiwu@fuchanghk.com"
    eprint(f"\nLooking for user with email: {email_to_remove}")
    cursor.execute("SELECT id FROM users WHERE email = ?", (email_to_remove,))
    user = cursor.fetchone()
    
    if user:
        user_id = user['id']
        eprint(f"Found user with ID: {user_id}")
        
        # Delete the user
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        eprint(f"User {email_to_remove} deleted")
        
        # Verify deletion
        cursor.execute("SELECT COUNT(*) FROM users WHERE email = ?", (email_to_remove,))
        count = cursor.fetchone()[0]
        if count == 0:
            eprint("Deletion verified - user no longer in database")
        else:
            eprint("Error: User still exists in database after deletion attempt")
    else:
        eprint(f"User {email_to_remove} not found in database")
    
    # List users after deletion
    eprint("\nUsers after deletion:")
    cursor.execute("SELECT id, email, is_approved FROM users")
    users = cursor.fetchall()
    for user in users:
        eprint(f"ID={user['id']}, Email={user['email']}, Status={user['is_approved']}")
    
    conn.close()
    eprint("Database connection closed")

except Exception as e:
    eprint(f"Error: {str(e)}")
    import traceback
    traceback.print_exc(file=sys.stderr)

eprint("Script completed") 