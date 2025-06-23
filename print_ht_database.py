import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

query = '''
SELECT quality, flat_or_raised, direct_or_reverse, num_colors, thickness, price
FROM ht_database
WHERE trim(lower(quality))='pu'
  AND trim(lower(flat_or_raised))='flat'
  AND trim(lower(direct_or_reverse))='direct'
ORDER BY num_colors, thickness;
'''

print(f"{'Quality':<8} {'Flat/Raised':<12} {'Direct/Reverse':<15} {'#Colors':<8} {'Thickness':<9} {'Price':<6}")
print('-'*60)
for row in cursor.execute(query):
    print(f"{row[0]:<8} {row[1]:<12} {row[2]:<15} {row[3]:<8} {row[4]:<9} {row[5]:<6}")

conn.close() 