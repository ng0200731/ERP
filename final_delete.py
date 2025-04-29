import sqlite3
import os
import sys

# Redirect output to a file
log_file = open('delete_ice.log', 'w')
sys.stdout = log_file
sys.stderr = log_file

print("Starting script to delete user")

try:
    # Connect to database
    print("Connecting to database")
    conn = sqlite3.connect('customers.db')
    cursor = conn.cursor()
    
    # Delete user
    email = 'ice@eastrims.com'
    print(f"Attempting to delete user: {email}")
    cursor.execute("DELETE FROM users WHERE email = ?", (email,))
    
    # Commit the changes
    conn.commit()
    rows_affected = cursor.rowcount
    print(f"Rows affected: {rows_affected}")
    
    # Close the connection
    conn.close()
    print("Database connection closed")
    
    if rows_affected > 0:
        print(f"SUCCESS: User {email} deleted")
    else:
        print(f"INFO: No user found with email {email}")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()

print("Script completed")
log_file.close() 