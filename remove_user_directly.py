import sqlite3
import os

# Email of the user to delete
TARGET_EMAIL = "weiwu@fuchanghk.com"

def main():
    # Let's do very basic output
    print("Starting direct deletion script")
    
    # Connect to the database
    db_path = os.path.join(os.path.dirname(__file__), 'customers.db')
    print(f"Connecting to database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Delete the user with the specified email
    print(f"Deleting user with email: {TARGET_EMAIL}")
    cursor.execute("DELETE FROM users WHERE email = ?", (TARGET_EMAIL,))
    
    # Commit the changes
    conn.commit()
    
    # Check how many rows were affected
    rows_affected = cursor.rowcount
    print(f"Rows affected: {rows_affected}")
    
    # Close the connection
    conn.close()
    
    if rows_affected > 0:
        print(f"SUCCESS: User {TARGET_EMAIL} has been deleted")
    else:
        print(f"INFO: No user found with email {TARGET_EMAIL}")
    
    print("Script completed")

if __name__ == "__main__":
    main() 