import sqlite3
conn = sqlite3.connect('customers.db')
row = conn.execute("SELECT email, is_approved FROM users WHERE email='ice@eastrims.com'").fetchone()
print(row)
conn.close() 