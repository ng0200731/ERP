import sqlite3
import os
import sys

def remove_user(email):
    try:
        # Get database path
        db_path = os.path.join(os.path.dirname(__file__), 'customers.db')
        print(f"Attempting to connect to database at: {db_path}")
        
        # Check if database exists
        if not os.path.exists(db_path):
            print(f"Error: Database file not found at {db_path}")
            return
        
        # Connect to database
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print(f"Connected to database. Looking for user with email: {email}")
        
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("Error: 'users' table does not exist in the database")
            conn.close()
            return
        
        # First check if the user exists
        cursor.execute('SELECT id, email, is_approved FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
        if user:
            user_id = user['id']
            print(f"Found user: ID={user_id}, Email={user['email']}, Status={user['is_approved']}")
            
            # Delete the user
            cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
            conn.commit()
            
            # Verify deletion
            cursor.execute('SELECT COUNT(*) FROM users WHERE id = ?', (user_id,))
            count = cursor.fetchone()[0]
            
            if count == 0:
                print(f"Successfully removed user {email} from the database.")
            else:
                print(f"Failed to remove user {email}.")
        else:
            print(f"User {email} not found in the database.")
        
        # List all users for verification
        print("\nCurrent users in database:")
        cursor.execute('SELECT id, email, is_approved FROM users')
        users = cursor.fetchall()
        for user in users:
            print(f"ID={user['id']}, Email={user['email']}, Status={user['is_approved']}")
        
        conn.close()
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Starting user removal script...")
    email_to_remove = "weiwu@fuchanghk.com"
    remove_user(email_to_remove)
    print("Script execution completed.") 