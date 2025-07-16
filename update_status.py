import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# Update all quotations with null/empty status to 'quotation complete'
cursor.execute("UPDATE quotations SET status = 'quotation complete' WHERE status IS NULL OR status = '' OR status = '-'")

print(f"Updated {cursor.rowcount} quotations to have 'quotation complete' status")

conn.commit()
conn.close()
