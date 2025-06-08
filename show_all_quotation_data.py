import sqlite3
import csv
import os

DB_PATH = 'database.db'

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Export quotations
print('=== All Quotations ===')
cursor.execute('SELECT * FROM quotations ORDER BY id')
quotations = cursor.fetchall()
for row in quotations:
    print(dict(row))
with open('quotations.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=quotations[0].keys() if quotations else [])
    writer.writeheader()
    for row in quotations:
        writer.writerow(dict(row))

# Export attachments
print('\n=== All Attachments ===')
cursor.execute('SELECT * FROM attachments ORDER BY id')
attachments = cursor.fetchall()
for row in attachments:
    print(dict(row))
with open('attachments.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=attachments[0].keys() if attachments else [])
    writer.writeheader()
    for row in attachments:
        writer.writerow(dict(row))

conn.close() 