import sqlite3

print("Starting update script...")

# Connect to the database
try:
    conn = sqlite3.connect('customers.db')
    cursor = conn.cursor()
    print("Connected to database")

    # Update eric.brilliant@gmail.com to active with permission level 3
    cursor.execute('''
        UPDATE users 
        SET is_approved = 1, permission_level = 3 
        WHERE email = 'eric.brilliant@gmail.com'
    ''')
    print(f"Update query executed, rows affected: {conn.total_changes}")

    # Commit the changes
    conn.commit()
    print("Changes committed")

    # Verify the update
    cursor.execute('''
        SELECT id, email, is_approved, permission_level 
        FROM users 
        WHERE email = 'eric.brilliant@gmail.com'
    ''')
    user = cursor.fetchone()
    if user:
        print(f"Updated user: id={user[0]}, email={user[1]}, is_approved={user[2]}, permission_level={user[3]}")
    else:
        print("User eric.brilliant@gmail.com not found")

    # Close the connection
    conn.close()
    print("Connection closed")
    
except Exception as e:
    print(f"Error occurred: {e}")

print("Script completed.") 