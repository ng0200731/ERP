import sqlite3

# Connect to the database
conn = sqlite3.connect('customers.db')
cursor = conn.cursor()

# Delete the user
email = 'ice@eastrims.com'
cursor.execute("DELETE FROM users WHERE email=?", (email,))

# Commit and close
conn.commit()
conn.close()

# Create confirmation file 
with open('deleted.txt', 'w') as f:
    f.write(f"User {email} deleted") 