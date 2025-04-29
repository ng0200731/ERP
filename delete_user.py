import sqlite3
import os
import sys

def main():
    print("Starting user deletion script...")
    
    # Target email
    email_to_delete = "weiwu@fuchanghk.com"
    print(f"Attempting to delete user: {email_to_delete}")
    
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), 'customers.db')
    print(f"Database path: {db_path}")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if the user exists
        cursor.execute("SELECT id, email, is_approved FROM users WHERE email = ?", (email_to_delete,))
        user = cursor.fetchone()
        
        if user:
            user_id = user['id']
            user_status = user['is_approved']
            print(f"Found user: ID={user_id}, Email={email_to_delete}, Status={user_status}")
            
            # Delete the user
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
            print(f"User {email_to_delete} has been deleted.")
            
            # Verify deletion
            cursor.execute("SELECT COUNT(*) as count FROM users WHERE email = ?", (email_to_delete,))
            if cursor.fetchone()['count'] == 0:
                print("Success: User has been removed from the database")
            else:
                print("Error: Failed to delete user")
        else:
            print(f"User {email_to_delete} not found in the database")
        
        # List remaining users
        print("\nRemaining users in database:")
        cursor.execute("SELECT id, email, is_approved FROM users")
        for row in cursor.fetchall():
            print(f"ID={row['id']}, Email={row['email']}, Status={row['is_approved']}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
    print("Script completed") 