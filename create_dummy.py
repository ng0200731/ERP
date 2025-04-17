import sqlite3

conn = sqlite3.connect('customers.db')
c = conn.cursor()

# Insert dummy customer
c.execute("""
    INSERT INTO customers (company, address, website, domains, created, updated)
    VALUES ('Dummy Corp', '1 Test Ave', 'dummy.com', 'dummy.com', '2024-04-16 10:00', '2024-04-16 10:00')
""")
customer_id = c.lastrowid

# Create key_people table if not exists
c.execute("""
    CREATE TABLE IF NOT EXISTS key_people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        name TEXT,
        position TEXT,
        email TEXT,
        tel TEXT,
        brand TEXT
    )
""")

# Insert dummy key person
c.execute("""
    INSERT INTO key_people (customer_id, name, position, email, tel, brand)
    VALUES (?, 'John Doe', 'Manager', 'john@dummy.com', '123456789', 'DummyBrand')
""", (customer_id,))

conn.commit()
conn.close()
print('Dummy customer and key person inserted!') 