import sqlite3
import os
import sys

# Email to delete
EMAIL_TO_DELETE = "weiwu@fuchanghk.com"

def log(message):
    """Log messages to both console and a file"""
    with open('delete_log.txt', 'a') as f:
        f.write(message + '\n')
    print(message)

def main():
    log(f"=== Starting script to delete user {EMAIL_TO_DELETE} ===")
    
    # Database path
    db_path = os.path.join(os.path.dirname(__file__), 'customers.db')
    log(f"Database path: {db_path}")
    
    # Check if file exists
    if not os.path.exists(db_path):
        log(f"ERROR: Database file not found: {db_path}")
        return
    
    log(f"Database file exists: {db_path}")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        log("Database connection established")
        
        # List all tables for debugging
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row['name'] for row in cursor.fetchall()]
        log(f"Tables in database: {', '.join(tables)}")
        
        # Check users table
        if 'users' not in tables:
            log("ERROR: 'users' table not found in database")
            conn.close()
            return
        
        # List all columns in users table
        cursor.execute("PRAGMA table_info(users)")
        columns = [row['name'] for row in cursor.fetchall()]
        log(f"Columns in users table: {', '.join(columns)}")
        
        # Check if the user exists
        cursor.execute("SELECT * FROM users WHERE email = ?", (EMAIL_TO_DELETE,))
        user = cursor.fetchone()
        
        if user:
            user_dict = dict(user)
            log(f"Found user: {user_dict}")
            
            # Delete the user
            cursor.execute("DELETE FROM users WHERE id = ?", (user['id'],))
            conn.commit()
            log(f"Executed DELETE statement for user ID {user['id']}")
            
            # Verify deletion
            cursor.execute("SELECT COUNT(*) as count FROM users WHERE email = ?", (EMAIL_TO_DELETE,))
            count = cursor.fetchone()['count']
            
            if count == 0:
                log(f"SUCCESS: User {EMAIL_TO_DELETE} has been deleted")
            else:
                log(f"ERROR: Failed to delete user {EMAIL_TO_DELETE}")
        else:
            log(f"User {EMAIL_TO_DELETE} not found in database")
        
        # List all remaining users
        cursor.execute("SELECT id, email, is_approved FROM users")
        users = cursor.fetchall()
        log(f"Number of users in database: {len(users)}")
        
        for user in users:
            log(f"User: ID={user['id']}, Email={user['email']}, Approved={user['is_approved']}")
        
        # Close the connection
        conn.close()
        log("Database connection closed")
        
    except Exception as e:
        log(f"ERROR: Exception occurred: {str(e)}")
        import traceback
        tb = traceback.format_exc()
        log(f"Traceback: {tb}")
    
    log("=== Script completed ===")

if __name__ == "__main__":
    main() 