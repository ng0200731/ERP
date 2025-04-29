import sqlite3
import os
import sys

# Write output to both console and file
def log(message):
    print(message)
    with open('remove_ice_log.txt', 'a', encoding='utf-8') as f:
        f.write(message + '\n')

def main():
    log("=== Starting script to remove ice@eastrims.com ===")
    
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), 'customers.db')
    log(f"Database path: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    log("Connected to database")
    
    cursor = conn.cursor()
    
    # Check if user exists
    email = "ice@eastrims.com"
    cursor.execute("SELECT id, email, is_approved FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if user:
        user_id = user['id']
        log(f"Found user: ID={user_id}, Email={email}, Status={user['is_approved']}")
        
        # Delete user
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        rows_affected = cursor.rowcount
        log(f"Rows affected: {rows_affected}")
        
        # Verify deletion
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE email = ?", (email,))
        count = cursor.fetchone()['count']
        
        if count == 0:
            log(f"SUCCESS: User {email} has been deleted")
        else:
            log(f"ERROR: Failed to delete user {email}")
    else:
        log(f"User {email} not found in database")
    
    # List remaining users
    log("\nRemaining users in database:")
    cursor.execute("SELECT id, email, is_approved FROM users")
    users = cursor.fetchall()
    
    for user in users:
        log(f"ID={user['id']}, Email={user['email']}, Status={user['is_approved']}")
    
    conn.close()
    log("Database connection closed")
    log("=== Script completed ===")

if __name__ == "__main__":
    main()