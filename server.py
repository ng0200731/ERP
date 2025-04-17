print('Starting server.py')
from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

def get_db():
    conn = sqlite3.connect('customers.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/customers', methods=['GET'])
def get_customers():
    conn = get_db()
    customers = conn.execute('SELECT * FROM customers').fetchall()
    result = []
    for cust in customers:
        cust_dict = dict(cust)
        key_people = conn.execute('SELECT name, position, email, tel, brand FROM key_people WHERE customer_id=?', (cust['id'],)).fetchall()
        cust_dict['keyPeople'] = [dict(kp) for kp in key_people]
        result.append(cust_dict)
    conn.close()
    return jsonify(result)

@app.route('/customers', methods=['POST'])
def add_customer():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    # Always use UTC ISO format for created/updated
    now_utc = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        'INSERT INTO customers (company, address, website, domains, created, updated) VALUES (?, ?, ?, ?, ?, ?)',
        (data['company'], data['address'], data['website'], ','.join(data['domains']), now_utc, now_utc)
    )
    customer_id = cursor.lastrowid
    # Insert all key people if present
    if 'keyPeople' in data and data['keyPeople']:
        for kp in data['keyPeople']:
            cursor.execute(
                'INSERT INTO key_people (customer_id, name, position, email, tel, brand) VALUES (?, ?, ?, ?, ?, ?)',
                (customer_id, kp['name'], kp['position'], kp['email'], kp['tel'], kp['brand'])
            )
    conn.commit()
    conn.close()
    return '', 201

@app.route('/customers/<int:id>', methods=['PUT'])
def update_customer(id):
    data = request.json
    conn = get_db()
    # Always use UTC ISO format for updated
    now_utc = datetime.now(timezone.utc).isoformat()
    # Update customer info
    conn.execute(
        'UPDATE customers SET company=?, address=?, website=?, domains=?, updated=? WHERE id=?',
        (data['company'], data['address'], data['website'], ','.join(data['domains']), now_utc, id)
    )
    # Delete old key people and insert new ones
    conn.execute('DELETE FROM key_people WHERE customer_id=?', (id,))
    if 'keyPeople' in data and data['keyPeople']:
        for kp in data['keyPeople']:
            conn.execute(
                'INSERT INTO key_people (customer_id, name, position, email, tel, brand) VALUES (?, ?, ?, ?, ?, ?)',
                (id, kp['name'], kp['position'], kp['email'], kp['tel'], kp['brand'])
            )
    conn.commit()
    conn.close()
    return '', 204

def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT,
            address TEXT,
            website TEXT,
            domains TEXT,
            created TEXT,
            updated TEXT
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS key_people (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            name TEXT,
            position TEXT,
            email TEXT,
            tel TEXT,
            brand TEXT
        )
    ''')
    conn.commit()
    conn.close()

if __name__ == '__main__':
    print('About to start Flask app')
    init_db()
    app.run(debug=True) 