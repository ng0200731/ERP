print('STARTING SERVER.PY')
from flask import Flask, request, jsonify, send_from_directory, render_template, session, redirect, url_for
from flask_cors import CORS
import sqlite3
from datetime import datetime, timezone
import hashlib
from flask_mail import Mail, Message

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure Flask-Mail (update with your SMTP settings)
app.config['MAIL_SERVER'] = 'smtp.example.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your_email@example.com'
app.config['MAIL_PASSWORD'] = 'your_password'
mail = Mail(app)

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

# --- User and Approval Tables ---
def init_user_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            is_approved INTEGER DEFAULT 0,
            last_login TEXT
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS pending_approvals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            requested_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

# --- Login Page Route ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        prefix = request.form['prefix'].strip()
        email = f"{prefix}@eastrims.com"
        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
        if user and user['is_approved']:
            # Generate and send code
            code = hashlib.sha256((email + str(datetime.now())).encode()).hexdigest()[:5]
            session['pending_code'] = code
            session['pending_email'] = email
            msg = Message('Your Access Code', sender=app.config['MAIL_USERNAME'], recipients=[email])
            msg.body = f'Your access code is: {code}'
            mail.send(msg)
            return render_template('enter_code.html', email=email)
        elif user:
            return 'Authorization in progress. Please wait for admin approval.'
        else:
            # Add to pending approvals
            conn.execute('INSERT OR IGNORE INTO pending_approvals (email, requested_at) VALUES (?, ?)', (email, datetime.now(timezone.utc).isoformat()))
            conn.commit()
            conn.close()
            return 'Request submitted. Waiting for admin approval.'
    return render_template('login.html')

# --- Code Verification Route ---
@app.route('/verify_code', methods=['POST'])
def verify_code():
    code = request.form['code'].strip()
    if code == session.get('pending_code'):
        session['user'] = session['pending_email']
        return redirect(url_for('serve_index'))
    return 'Invalid code. Try again.'

# --- Admin Approval Route (simple, for demo) ---
@app.route('/admin/approve', methods=['POST'])
def admin_approve():
    email = request.form['email']
    conn = get_db()
    # Move from pending_approvals to users
    conn.execute('INSERT OR IGNORE INTO users (email, is_approved) VALUES (?, 1)', (email,))
    conn.execute('DELETE FROM pending_approvals WHERE email=?', (email,))
    conn.commit()
    conn.close()
    # Send approval email
    msg = Message('Account Approved', sender=app.config['MAIL_USERNAME'], recipients=[email])
    msg.body = 'Your account has been approved. You can now log in.'
    mail.send(msg)
    return 'User approved.'

# --- Protect Main Page ---
@app.before_request
def require_login():
    if request.endpoint not in ('login', 'verify_code', 'static', 'admin_page') and 'user' not in session:
        return redirect(url_for('login'))

@app.route('/admin')
def admin_page():
    print('ADMIN PAGE ACCESSED')
    conn = get_db()
    pending = conn.execute('SELECT email, requested_at FROM pending_approvals').fetchall()
    print('PENDING APPROVALS:', pending)
    conn.close()
    return render_template('admin_approval.html', pending=pending)

# Call all initializers
if __name__ == '__main__':
    print('INSIDE MAIN BLOCK')
    print('About to start Flask app')
    try:
        init_db()
        init_option_db()
        init_user_db()
        app.run(debug=True)
    except Exception as e:
        print('ERROR STARTING SERVER:', e) 