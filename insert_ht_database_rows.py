import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

rows = [
    ('PU', 'Flat', 'Direct', 1, 0.2, 10),
    ('PU', 'Flat', 'Direct', 2, 0.2, 12),
    ('PU', 'Flat', 'Direct', 3, 0.2, 14),
    ('PU', 'Flat', 'Direct', 4, 0.2, 16),
    ('PU', 'Flat', 'Direct', 5, 0.2, 18),
    ('PU', 'Flat', 'Direct', 6, 0.2, 20),
]

for row in rows:
    cursor.execute('''
        INSERT INTO ht_database (quality, flat_or_raised, direct_or_reverse, num_colors, thickness, length, width, price)
        VALUES (?, ?, ?, ?, ?, 390, 540, ?)
    ''', row)

conn.commit()
print('Rows inserted.')
conn.close() 