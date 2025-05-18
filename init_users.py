import sqlite3
from werkzeug.security import generate_password_hash

# Connect to the database
conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# Create users table
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    permission_level INTEGER NOT NULL
)
''')

# Add a default admin user (email: admin@example.com, password: admin123, permission_level: 3)
admin_email = 'admin@example.com'
admin_password = 'admin123'
admin_hash = generate_password_hash(admin_password)

try:
    cursor.execute('INSERT INTO users (email, password_hash, permission_level) VALUES (?, ?, ?)',
                   (admin_email, admin_hash, 3))
    print('Default admin user created.')
except sqlite3.IntegrityError:
    print('Admin user already exists.')

conn.commit()
conn.close()
print('User table initialized.') 