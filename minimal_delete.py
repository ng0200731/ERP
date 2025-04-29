import sqlite3
import os

# Connect to database
conn = sqlite3.connect('customers.db')
cursor = conn.cursor()

# Delete user with email weiwu@fuchanghk.com
cursor.execute("DELETE FROM users WHERE email = 'weiwu@fuchanghk.com'")
conn.commit()

# Close connection
conn.close()

# Write result to file for confirmation
with open('delete_confirmation.txt', 'w') as f:
    f.write('User weiwu@fuchanghk.com has been deleted from the database.') 