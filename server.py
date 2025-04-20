print('Starting server.py')
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import sqlite3
from datetime import datetime, timezone

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, resources={r"/*": {"origins": "*"}})

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
    # Ensure customerType is a string
    customer_type = data.get('customerType', '')
    if isinstance(customer_type, list):
        customer_type = ','.join(customer_type)
    cursor.execute(
        'INSERT INTO customers (company, address, website, domains, customerType, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)',
        (data['company'], data['address'], data['website'], ','.join(data['domains']), customer_type, now_utc, now_utc)
    )
    customer_id = cursor.lastrowid
    # Insert all key people if present
    if 'keyPeople' in data and data['keyPeople']:
        for kp in data['keyPeople']:
            # Ensure brand is a string
            brand = kp.get('brand', '')
            if isinstance(brand, list):
                brand = ','.join(brand)
            cursor.execute(
                'INSERT INTO key_people (customer_id, name, position, email, tel, brand) VALUES (?, ?, ?, ?, ?, ?)',
                (customer_id, kp['name'], kp['position'], kp['email'], kp['tel'], brand)
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
    # Ensure customerType is a string
    customer_type = data.get('customerType', '')
    if isinstance(customer_type, list):
        customer_type = ','.join(customer_type)
    # Update customer info
    conn.execute(
        'UPDATE customers SET company=?, address=?, website=?, domains=?, customerType=?, updated=? WHERE id=?',
        (data['company'], data['address'], data['website'], ','.join(data['domains']), customer_type, now_utc, id)
    )
    # Delete old key people and insert new ones
    conn.execute('DELETE FROM key_people WHERE customer_id=?', (id,))
    if 'keyPeople' in data and data['keyPeople']:
        for kp in data['keyPeople']:
            # Ensure brand is a string
            brand = kp.get('brand', '')
            if isinstance(brand, list):
                brand = ','.join(brand)
            conn.execute(
                'INSERT INTO key_people (customer_id, name, position, email, tel, brand) VALUES (?, ?, ?, ?, ?, ?)',
                (id, kp['name'], kp['position'], kp['email'], kp['tel'], brand)
            )
    conn.commit()
    conn.close()
    return '', 204

def init_db():
    conn = get_db()
    # Add customerType column if it doesn't exist
    try:
        conn.execute('ALTER TABLE customers ADD COLUMN customerType TEXT')
    except Exception:
        pass  # Ignore if already exists
    conn.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT,
            address TEXT,
            website TEXT,
            domains TEXT,
            customerType TEXT,
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

# --- Option Database Backend ---

# Create tables for option databases and their fields

def init_option_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS option_databases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            is_multiselect INTEGER DEFAULT 0
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS option_fields (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            database_id INTEGER,
            value TEXT,
            UNIQUE(database_id, value),
            FOREIGN KEY(database_id) REFERENCES option_databases(id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/option_databases', methods=['GET'])
def get_option_databases():
    conn = get_db()
    dbs = conn.execute('SELECT * FROM option_databases').fetchall()
    result = []
    for db in dbs:
        db_dict = dict(db)
        fields = conn.execute('SELECT id, value FROM option_fields WHERE database_id=?', (db['id'],)).fetchall()
        db_dict['fields'] = [dict(f) for f in fields]
        result.append(db_dict)
    conn.close()
    return jsonify(result)

@app.route('/option_databases', methods=['POST'])
def add_option_database():
    data = request.json
    name = data.get('name')
    is_multiselect = int(data.get('is_multiselect', 0))
    conn = get_db()
    try:
        conn.execute('INSERT INTO option_databases (name, is_multiselect) VALUES (?, ?)', (name, is_multiselect))
        conn.commit()
        return '', 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Database name already exists'}), 400
    finally:
        conn.close()

@app.route('/option_fields', methods=['POST'])
def add_option_field():
    data = request.json
    database_id = data.get('database_id')
    value = data.get('value')
    conn = get_db()
    try:
        conn.execute('INSERT INTO option_fields (database_id, value) VALUES (?, ?)', (database_id, value))
        conn.commit()
        return '', 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Option already exists'}), 400
    finally:
        conn.close()

@app.route('/option_fields/<int:field_id>', methods=['DELETE'])
def delete_option_field(field_id):
    conn = get_db()
    conn.execute('DELETE FROM option_fields WHERE id=?', (field_id,))
    conn.commit()
    conn.close()
    return '', 204

@app.route('/option_fields/check', methods=['GET'])
def check_option_field():
    database_id = request.args.get('database_id')
    value = request.args.get('value')
    conn = get_db()
    row = conn.execute('SELECT 1 FROM option_fields WHERE database_id=? AND value=?', (database_id, value)).fetchone()
    conn.close()
    exists = bool(row)
    return jsonify({'exists': exists})

@app.route('/')
def serve_index():
    return render_template('index.html')

# Call both initializers
if __name__ == '__main__':
    print('About to start Flask app')
    init_db()
    init_option_db()
    app.run(debug=True) 