print('STARTING SERVER.PY')
from flask import Flask, request, jsonify, send_from_directory, render_template, session, redirect, url_for
from flask_cors import CORS
import sqlite3
from datetime import datetime, timezone
import hashlib
from flask_mail import Mail, Message
import os
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static', template_folder='templates')
# Enhance CORS configuration to support credentials
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}})
app.secret_key = 'your-very-secret-key-2025-04-16'  # Set a unique, secret value for session support

# Configure Flask-Mail (update with your SMTP settings)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'eric.brilliant@gmail.com'
app.config['MAIL_PASSWORD'] = 'opqx pfna kagb bznr'
mail = Mail(app)

def get_db():
    db_path = os.path.join(os.path.dirname(__file__), 'customers.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/customers', methods=['GET'])
def get_customers():
    try:
        logger.info(f"GET /customers request from {request.remote_addr}")
        conn = get_db()
        customers = conn.execute('SELECT * FROM customers').fetchall()
        result = []
        for cust in customers:
            cust_dict = dict(cust)
            key_people = conn.execute('SELECT name, position, email, tel, brand FROM key_people WHERE customer_id=?', (cust['id'],)).fetchall()
            cust_dict['keyPeople'] = [dict(kp) for kp in key_people]
            result.append(cust_dict)
        conn.close()
        logger.info(f"Returning {len(result)} customers")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in get_customers: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/customers', methods=['POST'])
def add_customer():
    try:
        data = request.json
        logger.info(f"POST /customers request from {request.remote_addr}: {data.get('company', 'Unknown company')}")
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
        # Send confirmation email to the first key person if present
        email_status = None
        email_message = None
        if 'keyPeople' in data and data['keyPeople'] and 'email' in data['keyPeople'][0]:
            user_email = '859543169@qq.com'  # Hardcoded for testing
            try:
                msg = Message('We received your request', sender=app.config['MAIL_USERNAME'], recipients=[user_email])
                msg.body = 'Thank you for your request. Our team has received it and will review it soon.'
                mail.send(msg)
                email_status = 'success'
                email_message = 'Confirmation email sent successfully.'
            except Exception as e:
                logger.error(f'Error sending confirmation email: {e}')
                email_status = 'error'
                email_message = f'Error sending confirmation email: {e}'
        logger.info(f"Customer added successfully: ID {customer_id}, {data.get('company')}")
        return jsonify({'email_status': email_status, 'email_message': email_message, 'customer_id': customer_id}), 201
    except Exception as e:
        logger.error(f"Error in add_customer: {str(e)}")
        return jsonify({"error": str(e)}), 500

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
    # Get the user's permission level from session
    permission_level = session.get('permission_level', 1)
    user_email = session.get('user', None)
    return render_template('index.html', permission_level=permission_level, user_email=user_email)

# --- User and Approval Tables ---
def init_user_db():
    conn = get_db()
    # Add approved_at and permission_level columns if they don't exist
    try:
        conn.execute('ALTER TABLE users ADD COLUMN approved_at TEXT')
    except Exception:
        pass  # Ignore if already exists
    try:
        conn.execute('ALTER TABLE users ADD COLUMN permission_level INTEGER DEFAULT 1')
    except Exception:
        pass
    try:
        conn.execute('ALTER TABLE users ADD COLUMN last_updated TEXT')
    except Exception:
        pass  # Ignore if already exists
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            is_approved INTEGER DEFAULT 0,
            last_login TEXT,
            approved_at TEXT,
            permission_level INTEGER DEFAULT 1,
            last_updated TEXT
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS pending_approvals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            requested_at TEXT
        )
    ''')
    # New table to track every approval request
    conn.execute('''
        CREATE TABLE IF NOT EXISTS approval_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            requested_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

# --- Login Page Route ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email'].strip()
        now = datetime.now(timezone.utc).isoformat()
        conn = get_db()
        # Always record the request
        conn.execute('INSERT INTO approval_requests (email, requested_at) VALUES (?, ?)', (email, now))
        conn.commit()
        user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
        if user and user['is_approved']:
            # Generate and send code
            code = hashlib.sha256((email + str(datetime.now())).encode()).hexdigest()[:5]
            session['pending_code'] = code
            session['pending_email'] = email
            session['permission_level'] = user['permission_level'] if 'permission_level' in user.keys() else 1
            msg = Message('Your Access Code', sender=app.config['MAIL_USERNAME'], recipients=[email])
            msg.body = f'Your access code is: {code}'
            mail.send(msg)
            conn.close()
            return render_template('enter_code.html', email=email)
        elif user:
            # Send 'await authorization' email
            try:
                msg = Message('Authorization in progress', sender=app.config['MAIL_USERNAME'], recipients=[email])
                msg.body = 'Authorization in progress. Please wait for admin approval.'
                mail.send(msg)
            except Exception as e:
                print(f'Error sending authorization in progress email: {e}')
            conn.close()
            return 'Authorization in progress. Please wait for admin approval.'
        else:
            # Insert new user with is_approved=0, permission_level=NULL, approved_at=NULL
            # Rule 1: New accounts start as "pending" with blank permission
            try:
                conn.execute('INSERT INTO users (email, is_approved, permission_level, approved_at, last_updated) VALUES (?, 0, NULL, NULL, ?)', 
                            (email, now))
                conn.commit()
                print(f"[INFO] New pending user created: {email}")
            except Exception as e:
                print(f'Error inserting new user: {e}')
            
            # Send acknowledgment email to the real user
            try:
                msg = Message('We received your login request', sender=app.config['MAIL_USERNAME'], recipients=[email])
                msg.body = 'Thank you for your login request. Our team has received it and will review it soon.'
                mail.send(msg)
            except Exception as e:
                print(f'Error sending login acknowledgment email: {e}')
            conn.close()
            return 'Request submitted. Waiting for admin approval.'
    return render_template('login.html')

# --- Code Verification Route ---
@app.route('/verify_code', methods=['POST'])
def verify_code():
    if request.is_json:
        # Handle AJAX request
        data = request.get_json()
        code = data.get('code', '').strip()
    else:
        # Handle form submission
        code = request.form.get('code', '').strip()
    
    if code == session.get('pending_code'):
        # Set user in session
        user_email = session['pending_email']
        session['user'] = user_email
        
        # Update last_login timestamp in database
        now = datetime.now(timezone.utc).isoformat()
        conn = get_db()
        conn.execute('UPDATE users SET last_login=? WHERE email=?', (now, user_email))
        conn.commit()
        conn.close()
        
        # Check if this is an AJAX request
        if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': True,
                'redirect_url': url_for('serve_index')
            })
        else:
            # Traditional form submission - do a redirect
            return redirect(url_for('serve_index'))
    
    # Code is invalid
    if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'success': False,
            'message': 'The code is incorrect. Please try again.'
        })
    else:
        # Traditional form submission - return error page
        return 'Invalid code. Try again.'

# --- Admin Approval Route (simple, for demo) ---
@app.route('/admin/approve', methods=['POST'])
def admin_approve():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({'success': False, 'error': 'No email provided'}), 400
    conn = get_db()
    try:
        now = datetime.now(timezone.utc).isoformat()
        # Approve user in users table
        conn.execute('UPDATE users SET is_approved=1, approved_at=? WHERE email=?', (now, email))
        conn.commit()
        # Optionally, send approval email
        try:
            msg = Message('Your account is approved', sender=app.config['MAIL_USERNAME'], recipients=[email])
            msg.body = 'Your account has been approved. You may now log in.'
            mail.send(msg)
        except Exception as e:
            print(f'[ERROR] Error sending approval email: {e}')
        return jsonify({'success': True})
    except Exception as e:
        print(f'[ERROR] Error approving user: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

# --- Protect Main Page ---
@app.before_request
def before_request_func():
    # Allow CORS preflight requests to pass through
    if request.method == 'OPTIONS':
        return '', 200
    allowed = (
        'login', 'verify_code', 'static', 'admin_page', 'admin_approve',
        'get_option_databases', 'get_customers', 'add_customer', 'update_customer',
        'list_users', 'add_user', 'edit_user', 'delete_user'
    )
    # Only allow admin page for level 3
    if request.endpoint == 'admin_page' and session.get('permission_level', 1) < 3:
        return redirect(url_for('login'))
    if request.endpoint not in allowed and 'user' not in session:
        return redirect(url_for('login'))

@app.route('/admin')
def admin_page():
    print('ADMIN PAGE ACCESSED')
    conn = get_db()
    # Get all emails in pending_approvals
    pending_emails = conn.execute('SELECT email FROM pending_approvals').fetchall()
    pending = []
    for row in pending_emails:
        email = row['email']
        # Aggregate approval_requests for this email
        stats = conn.execute('''
            SELECT 
                MIN(requested_at) as first_request,
                MAX(requested_at) as last_request,
                COUNT(*) as num_requests
            FROM approval_requests WHERE email=?
        ''', (email,)).fetchone()
        pending.append({
            'email': email,
            'first_request': stats['first_request'],
            'last_request': stats['last_request'],
            'num_requests': stats['num_requests'],
        })
    # Get all approved users with approved_at
    approved_rows = conn.execute('SELECT email, last_login, approved_at FROM users WHERE is_approved=1').fetchall()
    approved = []
    for row in approved_rows:
        approved.append({
            'email': row['email'],
            'last_login': row['last_login'],
            'approved_at': row['approved_at']
        })
    conn.close()
    return render_template('admin.html', pending=pending, approved=approved)

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/admin/users', methods=['GET'])
def list_users():
    conn = get_db()
    users = conn.execute('SELECT id, email, permission_level, approved_at, is_approved, last_updated FROM users').fetchall()
    conn.close()
    result = []
    for u in users:
        if u['is_approved'] == 1:
            status = 'Active'
        elif u['is_approved'] == 0:
            status = 'Inactive'
        else:
            status = 'Pending'
        user_dict = dict(u)
        user_dict['status'] = status
        result.append(user_dict)
    return jsonify(result)

@app.route('/admin/users', methods=['POST'])
def add_user():
    data = request.json
    email = data.get('email')
    level = int(data.get('permission_level', 1))
    now = datetime.now(timezone.utc).isoformat()
    
    conn = get_db()
    try:
        conn.execute(
            'INSERT INTO users (email, is_approved, permission_level, approved_at, last_updated) VALUES (?, 1, ?, ?, ?)', 
            (email, level, now, now)
        )
        conn.commit()
        return '', 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'User already exists'}), 400
    finally:
        conn.close()

@app.route('/admin/users/<int:user_id>', methods=['PUT'])
def edit_user(user_id):
    data = request.json
    updates = []
    params = []
    
    # Always add a last_updated timestamp for any change
    now = datetime.now(timezone.utc).isoformat()
    updates.append('last_updated=?')
    params.append(now)
    
    # Rule 2: When activating, set permission to level 1 if it's null/blank
    if 'is_approved' in data:
        # Get the current status before changing
        conn = get_db()
        current_user = conn.execute('SELECT email, is_approved, permission_level FROM users WHERE id=?', (user_id,)).fetchone()
        conn.close()
        
        was_inactive = current_user and current_user['is_approved'] == 0
        new_status = int(data['is_approved'])
        
        updates.append('is_approved=?')
        params.append(new_status)
        
        # When activating a user, update approved_at timestamp and set permission to level 1 if blank
        if new_status == 1 and was_inactive:
            updates.append('approved_at=?')
            params.append(now)
            
            # If permission is NULL or '', set it to level 1
            if current_user and (current_user['permission_level'] is None or current_user['permission_level'] == ''):
                updates.append('permission_level=?')
                params.append(1)
                print(f"[INFO] Setting default permission level 1 for newly activated user (ID: {user_id})")
            
            # Send activation email
            if current_user:
                try:
                    # Determine permission level to include in email
                    permission_level = 1
                    if 'permission_level' in data:
                        permission_level = int(data['permission_level'])
                    elif current_user['permission_level'] is not None:
                        permission_level = current_user['permission_level']
                    
                    # Send detailed activation email
                    msg = Message('Your account has been activated', 
                                sender=app.config['MAIL_USERNAME'], 
                                recipients=[current_user['email']])
                    msg.body = f'''Hello,

Your account has been activated with Level {permission_level} permissions.

You may now log in to the Customer Management System.
Thank you for your patience.

Best regards,
Customer Management Team
'''
                    mail.send(msg)
                    print(f"[INFO] Activation email sent to {current_user['email']}")
                except Exception as e:
                    print(f"[ERROR] Failed to send activation email: {e}")
    
    if 'permission_level' in data:
        updates.append('permission_level=?')
        params.append(int(data['permission_level']) if data['permission_level'] is not None else None)
    
    if not updates:
        return '', 204
        
    query = f'UPDATE users SET {", ".join(updates)} WHERE id=?'
    params.append(user_id)
    
    conn = get_db()
    conn.execute(query, params)
    conn.commit()
    
    # Debug print to confirm update
    updated = conn.execute('SELECT id, email, is_approved, permission_level, last_updated FROM users WHERE id=?', (user_id,)).fetchone()
    print(f'[DEBUG] Updated user: id={updated[0]}, email={updated[1]}, is_approved={updated[2]}, ' +
          f'permission_level={updated[3]}, last_updated={updated["last_updated"]}')
    
    conn.close()
    return '', 204

@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    # Only allow if current user is level 2
    if session.get('permission_level', 1) < 2:
        return jsonify({'error': 'Not authorized'}), 403
    conn = get_db()
    conn.execute('DELETE FROM users WHERE id=?', (user_id,))
    conn.commit()
    conn.close()
    return '', 204

@app.route('/admin/users/filter', methods=['POST'])
def filter_users():
    data = request.get_json()
    rules = data.get('rules', [])
    query = 'SELECT id, email, is_approved, last_login, approved_at, permission_level, last_updated FROM users'
    where_clauses = []
    params = []
    for rule in rules:
        name = rule.get('name')
        cond = rule.get('condition')
        content = rule.get('content')
        if name == 'email':
            if cond == 'contains':
                where_clauses.append('email LIKE ?')
                params.append(f'%{content}%')
            elif cond == 'not_contains':
                where_clauses.append('email NOT LIKE ?')
                params.append(f'%{content}%')
            elif cond == 'starts_with':
                where_clauses.append('email LIKE ?')
                params.append(f'{content}%')
            elif cond == 'ends_with':
                where_clauses.append('email LIKE ?')
                params.append(f'%{content}')
            elif cond == 'equal':
                where_clauses.append('email = ?')
                params.append(content)
            elif cond == 'not_equal':
                where_clauses.append('email != ?')
                params.append(content)
        elif name == 'status':
            # Map status to is_approved and permission_level
            if cond == 'equal':
                if content == 'Active':
                    where_clauses.append('is_approved = 1')
                elif content == 'Inactive':
                    where_clauses.append('is_approved = 0 AND permission_level IS NOT NULL')
                elif content == 'Pending':
                    where_clauses.append('is_approved = 0 AND (permission_level IS NULL OR permission_level = "")')
            elif cond == 'not_equal':
                if content == 'Active':
                    where_clauses.append('is_approved != 1')
                elif content == 'Inactive':
                    where_clauses.append('NOT (is_approved = 0 AND permission_level IS NOT NULL)')
                elif content == 'Pending':
                    where_clauses.append('NOT (is_approved = 0 AND (permission_level IS NULL OR permission_level = ""))')
        elif name == 'permission':
            if cond == 'equal':
                where_clauses.append('permission_level = ?')
                params.append(int(content))
            elif cond == 'not_equal':
                where_clauses.append('permission_level != ?')
                params.append(int(content))
    if where_clauses:
        query += ' WHERE ' + ' AND '.join(where_clauses)
    conn = get_db()
    users = conn.execute(query, params).fetchall()
    conn.close()
    result = []
    for u in users:
        if u['is_approved'] == 1:
            status = 'Active'
        elif u['is_approved'] == 0:
            status = 'Inactive'
        else:
            status = 'Pending'
        user_dict = dict(u)
        user_dict['status'] = status
        result.append(user_dict)
    return jsonify({'users': result})

# --- Set eric.brilliant@gmail.com to level 3 on startup ---
def set_admin_level():
    # Ensure eric.brilliant@gmail.com has admin access
    print("[INFO] Setting admin level for eric.brilliant@gmail.com...")
    conn = get_db()
    now = datetime.now(timezone.utc).isoformat()
    # Use INSERT OR REPLACE to ensure user exists and has admin privileges
    conn.execute('''
        INSERT OR REPLACE INTO users 
        (email, is_approved, permission_level, approved_at, last_updated) 
        VALUES (?, 1, 3, ?, ?)
    ''', ('eric.brilliant@gmail.com', now, now))
    conn.commit()
    
    # Verify the update
    result = conn.execute('SELECT id, email, permission_level, is_approved, last_updated FROM users WHERE email=?', 
                         ('eric.brilliant@gmail.com',)).fetchone()
    if result:
        print(f"[INFO] Admin user verified: id={result['id']}, email={result['email']}, " 
              f"level={result['permission_level']}, is_approved={result['is_approved']}, "
              f"last_updated={result['last_updated']}")
    else:
        print("[WARNING] Failed to find admin user after update")
    conn.close()

@app.route('/clear_session')
def clear_session():
    # Clear session on the server side
    session.clear()
    print("[INFO] Session cleared via /clear_session route")
    # Return the page that will clear client-side cookies
    return render_template('clear_session.html')

# Call all initializers
if __name__ == '__main__':
    print('INSIDE MAIN BLOCK')
    print('About to start Flask app')
    try:
        init_db()
        init_option_db()
        init_user_db()
        set_admin_level()
        app.run(host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        print('ERROR STARTING SERVER:', e) 