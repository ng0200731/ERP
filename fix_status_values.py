import sqlite3

print("Starting status value fix...")

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# Fix any existing records with old status values
cursor.execute("UPDATE quotations SET status = 'submitted to customer' WHERE status = 'quotation send to customer'")
updated_count = cursor.rowcount
print(f"Updated {updated_count} quotations from 'quotation send to customer' to 'submitted to customer'")

# Check current status values
cursor.execute("SELECT DISTINCT status FROM quotations WHERE status IS NOT NULL AND status != ''")
statuses = cursor.fetchall()
print(f"\nCurrent status values in database ({len(statuses)} unique values):")
for status in statuses:
    print(f"- '{status[0]}'")

conn.commit()
conn.close()
print("\nStatus fix completed!")
