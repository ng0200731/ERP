import os
print('!!! TEST MARKER 123 !!!')
print('server.py absolute path:', os.path.abspath(__file__))
print('STARTING SERVER.PY')
from flask import Flask, request, jsonify, send_from_directory, render_template, session, redirect, url_for, make_response
from flask_cors import CORS
import sqlite3
from datetime import datetime, timezone, timedelta
import hashlib
from flask_mail import Mail, Message
import os
import logging
from ht_database import ht_database_bp
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from quotation_database import quotation_bp, Base, Quotation, get_db, Attachment
from sqlalchemy import create_engine
import pandas as pd
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.units import mm
    REPORTLAB_AVAILABLE = True
except ImportError:
    print("Warning: reportlab not installed. PDF generation will not work.")
    REPORTLAB_AVAILABLE = False
import io
from sqlalchemy import event, text

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static', template_folder='templates')
import os
try:
    with open('template_debug.txt', 'w') as f:
        f.write('TEMPLATE FOLDER: ' + str(app.template_folder) + '\n')
        f.write('TEMPLATES DIR EXISTS: ' + str(os.path.exists(app.template_folder)) + '\n')
        f.write('quotation2_view_select.html EXISTS: ' + str(os.path.exists(os.path.join(app.template_folder, 'quotation2_view_select.html'))) + '\n')
except Exception as e:
    with open('template_debug_error.txt', 'w') as ef:
        ef.write('ERROR: ' + str(e) + '\n')
# Enhance CORS configuration to support credentials
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}})
app.secret_key = 'your-very-secret-key-2025-04-16'  # Set a unique, secret value for session support

# Configure Flask-Mail (Gmail as primary)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'eric.brilliant@gmail.com'
app.config['MAIL_PASSWORD'] = 'opqx pfna kagb bznr'
mail = Mail(app)

# 163.com backup email configuration with multiple ports (prioritized by reliability)
BACKUP_MAIL_CONFIGS = [
    {
        'MAIL_SERVER': 'smtp.163.com',
        'MAIL_PORT': 465,
        'MAIL_USE_SSL': True,
        'MAIL_USE_TLS': False,
        'MAIL_USERNAME': '19902475292@163.com',
        'MAIL_PASSWORD': 'JDy8MigeNmsESZRa',
        'NAME': '163.com SSL (465) - TESTED WORKING'
    },
    {
        'MAIL_SERVER': 'smtp.163.com',
        'MAIL_PORT': 994,
        'MAIL_USE_SSL': True,
        'MAIL_USE_TLS': False,
        'MAIL_USERNAME': '19902475292@163.com',
        'MAIL_PASSWORD': 'JDy8MigeNmsESZRa',
        'NAME': '163.com SSL (994)'
    },
    {
        'MAIL_SERVER': 'smtp.163.com',
        'MAIL_PORT': 25,
        'MAIL_USE_TLS': True,
        'MAIL_USE_SSL': False,
        'MAIL_USERNAME': '19902475292@163.com',
        'MAIL_PASSWORD': 'JDy8MigeNmsESZRa',
        'NAME': '163.com Standard (25)'
    }
]

def send_email_with_fallback(subject, recipients, body=None, html=None, attachments=None):
    """
    Send email with automatic fallback from Gmail to 163.com
    Returns: (success: bool, message: str, service_used: str)
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.mime.base import MIMEBase
    from email import encoders
    import os

    # Ensure recipients is a list
    if isinstance(recipients, str):
        recipients = [recipients]

    def try_gmail():
        """Try sending via Gmail"""
        try:
            msg = Message(subject, sender=app.config['MAIL_USERNAME'], recipients=recipients)
            if body:
                msg.body = body
            if html:
                msg.html = html
            if attachments:
                for attachment in attachments:
                    if isinstance(attachment, dict):
                        msg.attach(
                            filename=attachment.get('filename'),
                            content_type=attachment.get('content_type'),
                            data=attachment.get('data'),
                            disposition=attachment.get('disposition', 'attachment'),
                            headers=attachment.get('headers', {})
                        )
            mail.send(msg)
            return True, "Email sent successfully via Gmail", "Gmail"
        except Exception as e:
            return False, f"Gmail failed: {str(e)}", "Gmail"

    def try_163com():
        """Try sending via 163.com with multiple port configurations"""
        last_error = None

        for config in BACKUP_MAIL_CONFIGS:
            try:
                # Create message
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = config['MAIL_USERNAME']
                msg['To'] = ', '.join(recipients)

                # Add body
                if body:
                    msg.attach(MIMEText(body, 'plain', 'utf-8'))
                if html:
                    msg.attach(MIMEText(html, 'html', 'utf-8'))

                # Add attachments
                if attachments:
                    for attachment in attachments:
                        if isinstance(attachment, dict):
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(attachment.get('data', b''))
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f"{attachment.get('disposition', 'attachment')}; filename= {attachment.get('filename', 'attachment')}"
                            )
                            msg.attach(part)

                # Try different connection methods based on config
                if config.get('MAIL_USE_SSL', False):
                    # Use SSL connection (ports 465, 994)
                    server = smtplib.SMTP_SSL(config['MAIL_SERVER'], config['MAIL_PORT'], timeout=10)
                else:
                    # Use regular SMTP with optional TLS (ports 587, 25)
                    server = smtplib.SMTP(config['MAIL_SERVER'], config['MAIL_PORT'], timeout=10)
                    if config.get('MAIL_USE_TLS', False):
                        server.starttls()

                # Login and send
                server.login(config['MAIL_USERNAME'], config['MAIL_PASSWORD'])
                server.send_message(msg)
                server.quit()

                return True, f"Email sent successfully via {config['NAME']}", config['NAME']

            except Exception as e:
                last_error = f"{config['NAME']}: {str(e)}"
                logger.warning(f"163.com attempt failed with {config['NAME']}: {e}")
                continue

        # All 163.com configurations failed
        return False, f"All 163.com configurations failed. Last error: {last_error}", "163.com"

    # Try Gmail first
    success, message, service = try_gmail()
    if success:
        logger.info(f"Email sent via Gmail to {recipients}: {subject}")
        return success, message, service

    # If Gmail fails, try 163.com
    logger.warning(f"Gmail failed, trying 163.com fallback: {message}")
    success, message, service = try_163com()
    if success:
        logger.info(f"Email sent via 163.com fallback to {recipients}: {subject}")
        return success, message, service

    # Both failed
    error_msg = f"Both email services failed. Gmail: {message}"
    logger.error(f"Email sending failed completely to {recipients}: {error_msg}")
    return False, error_msg, "Both failed"

# --- Flask-Login Setup ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Dummy User class for demonstration (replace with your real user model)
class User(UserMixin):
    def __init__(self, id, email, permission_level=1, is_approved=0):
        self.id = id
        self.email = email
        self.permission_level = permission_level
        self.is_approved = is_approved
    def get_id(self):
        return str(self.id)

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    conn = get_db()
    user = conn.execute('SELECT id, email, permission_level, is_approved FROM users WHERE id=?', (user_id,)).fetchone()
    conn.close()
    if user:
        return User(user['id'], user['email'], user['permission_level'], user['is_approved'])
    return None

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
            key_people = conn.execute('SELECT id, name, position, email, tel, brand FROM key_people WHERE customer_id=?', (cust['id'],)).fetchall()
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
            success, message, service = send_email_with_fallback(
                subject='We received your request',
                recipients=[user_email],
                body='Thank you for your request. Our team has received it and will review it soon.'
            )
            if success:
                email_status = 'success'
                email_message = f'Confirmation email sent successfully via {service}.'
            else:
                email_status = 'error'
                email_message = f'Error sending confirmation email: {message}'
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
    return 'Record updated successfully', 204

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

@app.route('/dashboard')
def dashboard():
    """Dashboard page that serves the dashboard template"""
    # Check if this is an AJAX request for metrics data
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.args.get('format') == 'json':
        try:
            # Get user permission level and email from session
            permission_level = session.get('permission_level', 1)
            user_email = session.get('user', None)

            from sqlalchemy.orm import sessionmaker
            engine = create_engine('sqlite:///database.db', connect_args={'timeout': 30})
            Session = sessionmaker(bind=engine)
            db_session = Session()

            # Apply access control based on permission level
            if permission_level == 1:
                # Level 1: Only show metrics for own created quotations
                if user_email:
                    # Case-insensitive email comparison using ilike
                    base_query = db_session.query(Quotation).filter(Quotation.creator_email.ilike(user_email))
                else:
                    # No user email, return zero counts
                    db_session.close()
                    return jsonify({
                        'total_quotations': 0,
                        'submitted_to_customer': 0,
                        'price_approved': 0,
                        'sampling': 0,
                        'access_level': permission_level,
                        'filtered_for': 'No user email'
                    })
            elif permission_level >= 3:
                # Level 3: Show metrics for all quotations
                base_query = db_session.query(Quotation)
            else:
                # Level 2 or other: No access
                db_session.close()
                return jsonify({
                    'total_quotations': 0,
                    'submitted_to_customer': 0,
                    'price_approved': 0,
                    'sampling': 0,
                    'access_level': permission_level,
                    'filtered_for': 'No access'
                })

            # Count total quotations (with access control applied)
            total_quotations = base_query.count()

            # Count submitted to customer quotations (quoted to customer)
            submitted_to_customer = base_query.filter(Quotation.status == 'submitted to customer').count()

            # Count price approved quotations
            price_approved = base_query.filter(Quotation.status == 'price approved').count()

            # Count sampling quotations
            sampling = base_query.filter(Quotation.status == 'sampling').count()

            # Count sample card quotations
            sample_card = base_query.filter(Quotation.status == 'sample card').count()

            db_session.close()

            return jsonify({
                'total_quotations': total_quotations,
                'submitted_to_customer': submitted_to_customer,
                'price_approved': price_approved,
                'sampling': sampling,
                'sample_card': sample_card,
                'access_level': permission_level,
                'filtered_for': user_email if permission_level == 1 else 'All users' if permission_level >= 3 else 'No access'
            })

        except Exception as e:
            logger.error(f"Error fetching dashboard metrics: {str(e)}")
            return jsonify({
                'total_quotations': 0,
                'submitted_to_customer': 0,
                'price_approved': 0,
                'sampling': 0,
                'sample_card': 0,
                'access_level': session.get('permission_level', 1),
                'filtered_for': session.get('user', 'Unknown'),
                'error': str(e)
            })
    else:
        # Serve the dashboard template for regular page loads
        return render_template('dashboard.html')

@app.route('/check_permission')
def check_permission():
    # Return the user's permission level as JSON
    permission_level = session.get('permission_level', 1)
    return jsonify({'level': permission_level})

@app.route('/ht_database')
def ht_database():
    # Check if user has level 3 permission
    permission_level = session.get('permission_level', 1)
    if permission_level < 3:
        return "Access Denied: You need level 3 permission to access this page", 403
    return render_template('ht_database.html')

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
            success, message, service = send_email_with_fallback(
                subject='Your Access Code',
                recipients=[email],
                body=f'Your access code is: {code}'
            )
            if not success:
                logger.error(f'Failed to send access code email: {message}')
            conn.close()
            return render_template('enter_code.html', email=email)
        elif user:
            # Send 'await authorization' email
            success, message, service = send_email_with_fallback(
                subject='Authorization in progress',
                recipients=[email],
                body='Authorization in progress. Please wait for admin approval.'
            )
            if not success:
                print(f'Error sending authorization in progress email: {message}')
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
            success, message, service = send_email_with_fallback(
                subject='We received your login request',
                recipients=[email],
                body='Thank you for your login request. Our team has received it and will review it soon.'
            )
            if not success:
                print(f'Error sending login acknowledgment email: {message}')
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
        success, message, service = send_email_with_fallback(
            subject='Your account is approved',
            recipients=[email],
            body='Your account has been approved. You may now log in.'
        )
        if not success:
            print(f'[ERROR] Error sending approval email: {message}')
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
        'list_users', 'add_user', 'edit_user', 'delete_user',
        'serve_quotation2_view_select'  # Allow unauthenticated access to this endpoint
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
                    activation_body = f'''Hello,

Your account has been activated with Level {permission_level} permissions.

You may now log in to the Customer Management System.
Thank you for your patience.

Best regards,
Customer Management Team
'''
                    success, message, service = send_email_with_fallback(
                        subject='Your account has been activated',
                        recipients=[current_user['email']],
                        body=activation_body
                    )
                    if success:
                        print(f"[INFO] Activation email sent to {current_user['email']} via {service}")
                    else:
                        print(f"[ERROR] Failed to send activation email: {message}")
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

@app.route('/quotation/save', methods=['POST'])
def save_quotation():
    try:
        data = request.form.to_dict() if request.form else request.json
        jpg_file = request.files.get('artwork_image') if 'artwork_image' in request.files else None
        artwork_image_path = None
        print('[DEBUG] /quotation/save called')
        if jpg_file:
            print(f'[DEBUG] Received file: {jpg_file.filename}')
        else:
            print('[DEBUG] No file received in request.files')
        if jpg_file and jpg_file.filename:
            # Only accept .jpg/.jpeg
            if not jpg_file.filename.lower().endswith(('.jpg', '.jpeg')):
                print('[DEBUG] File is not a JPG')
                return jsonify({'error': 'Only JPG files are allowed'}), 400
            # Save file
            uploads_dir = os.path.join('uploads', 'artwork_images')
            os.makedirs(uploads_dir, exist_ok=True)
            print(f'[DEBUG] Ensured folder exists: {uploads_dir}')
            timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
            safe_name = f"{timestamp}_{jpg_file.filename.replace(' ', '_')}"
            file_path = os.path.join(uploads_dir, safe_name)
            jpg_file.save(file_path)
            print(f'[DEBUG] Saved file to: {file_path}')
            artwork_image_path = file_path
        
        engine = create_engine('sqlite:///database.db', connect_args={'timeout': 30})
        Base.metadata.create_all(engine)
        
        # Get user email from session if available, otherwise use a default
        user_email = session.get('user', 'unknown@example.com') if 'user' in session else 'unknown@example.com'
        
        # Helper function to safely convert numeric values
        def safe_float(value, default=0.0):
            try:
                if value is None or value == '' or value == '-':
                    return default
                return float(value)
            except (ValueError, TypeError):
                return default

        def safe_int(value, default=0):
            try:
                if value is None or value == '' or value == '-':
                    return default
                return int(value)
            except (ValueError, TypeError):
                return default

        # --- PRICE LOOKUP LOGIC ---
        conn = engine.raw_connection()
        cursor = conn.cursor()
        # Print all rows for debugging
        cursor.execute("SELECT * FROM ht_database")
        all_rows = cursor.fetchall()
        print(f"[DEBUG] All rows in ht_database: {all_rows}")
        quality = data.get('quality', '')
        flat_or_raised = data.get('flat_or_raised', '')
        direct_or_reverse = data.get('direct_or_reverse', '')
        num_colors = safe_int(data.get('num_colors'))
        thickness = safe_float(data.get('thickness'))
        price = '-'
        db_length = None
        db_width = None
        print(f'[DEBUG] Price lookup input: quality={quality}, flat_or_raised={flat_or_raised}, direct_or_reverse={direct_or_reverse}, num_colors={num_colors}, thickness={thickness}')
        if flat_or_raised.lower() == 'flat':
            sql = '''
                SELECT length, width, price FROM ht_database
                WHERE trim(lower(quality))=trim(lower(?))
                  AND trim(lower(flat_or_raised))=trim(lower(?))
                  AND trim(lower(direct_or_reverse))=trim(lower(?))
                  AND num_colors=?
            '''
            params = (quality, flat_or_raised, direct_or_reverse, num_colors)
            print(f'[DEBUG] SQL: {sql}')
            print(f'[DEBUG] Params: {params}')
            cursor.execute(sql, params)
            row = cursor.fetchone()
            print(f'[DEBUG] Result row: {row}')
            if row:
                db_length, db_width, price = row
        elif flat_or_raised.lower() == 'raised':
            sql = '''
                SELECT length, width, price FROM ht_database
                WHERE trim(lower(quality))=trim(lower(?))
                  AND trim(lower(flat_or_raised))=trim(lower(?))
                  AND trim(lower(direct_or_reverse))=trim(lower(?))
                  AND num_colors=? AND thickness <= ?
                ORDER BY thickness DESC
                LIMIT 1
            '''
            params = (quality, flat_or_raised, direct_or_reverse, num_colors, thickness)
            print(f'[DEBUG] SQL: {sql.strip()}')
            print(f'[DEBUG] Params: {params}')
            cursor.execute(sql, params)
            row = cursor.fetchone()
            print(f'[DEBUG] Result row: {row}')
            if row:
                db_length, db_width, price = row
            else:
                # Fallback: pick the minimum thickness for this combo
                sql2 = '''
                    SELECT length, width, price FROM ht_database
                    WHERE trim(lower(quality))=trim(lower(?))
                      AND trim(lower(flat_or_raised))=trim(lower(?))
                      AND trim(lower(direct_or_reverse))=trim(lower(?))
                      AND num_colors=?
                    ORDER BY thickness ASC
                    LIMIT 1
                '''
                params2 = (quality, flat_or_raised, direct_or_reverse, num_colors)
                cursor.execute(sql2, params2)
                row2 = cursor.fetchone()
                if row2:
                    db_length, db_width, price = row2
        conn.close()
        # --- END PRICE LOOKUP ---

        # Create a session
        Session = sessionmaker(bind=engine)
        db_session = Session()
        
        try:
            # Begin transaction
            db_session.begin()
            current_time = datetime.utcnow()
            # --- Build Quotation Block (with PET sheet size from database) ---
            version = 'v1.3.14'  # Incremented version
            def fmt(val, decimals=2):
                if val == '-' or val is None:
                    return '-'
                return f"{float(val):.{decimals}f}"
            xVal = fmt(db_length, 2) if db_length is not None else '-'
            yVal = fmt(db_width, 2) if db_width is not None else '-'
            inputSummary = f"({quality}, {flat_or_raised}, {direct_or_reverse}, {thickness if thickness else '-'}, {num_colors})"
            # Combination calculations
            user_length = safe_float(data.get('length'))
            user_width = safe_float(data.get('width'))
            mPlus6 = user_length + 6 if user_length else None
            nPlus6 = user_width + 6 if user_width else None
            combA = combB = combAeq = combBeq = '-'
            combA_more = combB_more = ''
            if db_length and db_width and user_length and user_width:
                xDivM = int(db_length // mPlus6)
                yDivN = int(db_width // nPlus6)
                yDivM = int(db_width // mPlus6)
                xDivN = int(db_length // nPlus6)
                combA = xDivM * yDivN
                combB = yDivM * xDivN
                # Mark which combination has more labels
                if combA > combB:
                    combA_more = ' (more # of label)'
                elif combB > combA:
                    combB_more = ' (more # of label)'
                # Build calculation details with line breaks for readability
                combAeq = f"Combination A: ({fmt(db_length,2)} / ({fmt(user_length,2)}+6))\n              × ({fmt(db_width,2)} / ({fmt(user_width,2)}+6))\n              = {xDivM} × {yDivN} = {combA} (# per 1 pet){combA_more}"
                combBeq = f"Combination B: ({fmt(db_width,2)} / ({fmt(user_length,2)}+6))\n              × ({fmt(db_length,2)} / ({fmt(user_width,2)}+6))\n              = {yDivM} × {xDivN} = {combB} (# per 1 pet){combB_more}"
            # Cost per label
            costPerLabel = '-'
            costPerLabelDetail = ''
            if price != '-' and isinstance(combA, int) and isinstance(combB, int):
                maxComb = max(combA, combB)
                if maxComb > 0:
                    costPerLabel = float(price) / maxComb
                    costPerLabelDetail = f"{fmt(price)} / {maxComb} = {fmt(costPerLabel)}"
            # Tier quotation
            tiers = [
                (1000, 1.10), (3000, 1.05), (5000, 1.03), (10000, 1.00),
                (30000, 0.95), (50000, 0.90), (100000, 0.85)
            ]
            tier_lines = []
            for qty, factor in tiers:
                tprice = '-'
                if costPerLabel != '-' and isinstance(costPerLabel, float):
                    tprice = f"{costPerLabel * factor * 1000:.2f}"
                tier_lines.append(f"{qty:,}\t{tprice}")
            # Build block as plain text, using [dim] to mark dimmed lines
            def wrap_line(line, width=60):
                # Split a line into chunks of at most 'width' characters
                return '\n'.join([line[i:i+width] for i in range(0, len(line), width)])
            if db_length is None or db_width is None:
                block = f"Quotation\n[WARNING: PET sheet size not found in database for the selected combination. Please check your input or database.]\n"
                block += wrap_line(f"1) Cost of PET (- × -): {inputSummary} = -") + "\n"
                block += wrap_line(f"2) Combination A: -") + "\n" + wrap_line(f"   Combination B: -") + "\n"
                block += wrap_line(f"3) Cost per 1 label: -") + "\n"
                block += wrap_line(f"4) Tier quotation") + "\nQty\tPrice\n-\n"
                block += f"\n\n[System Version: {version}]"
            else:
                block = "Quotation\n"
                block += wrap_line(f"1) Cost of PET ({xVal} × {yVal}): {inputSummary} = {fmt(price)}") + "\n"
                for line in (combAeq + "\n" + combBeq).split("\n"):
                    block += wrap_line(line) + "\n"
                block += wrap_line(f"3) Cost per 1 label: {costPerLabelDetail}") + "\n"
                block += wrap_line(f"4) Tier quotation") + "\nQty\tPrice\n"
                for tline in tier_lines:
                    block += wrap_line(tline) + "\n"
                block += f"\n[System Version: {version}]"
            # --- END Quotation Block ---
            color_names_json = data.get('color_names')
            if isinstance(color_names_json, list):
                color_names_json = json.dumps(color_names_json)
            quotation = Quotation(
                customer_name=data.get('customer_name', ''),
                key_person_name=data.get('key_person_name', ''),
                customer_item_code=data.get('customer_item_code', ''),
                creator_email=user_email,
                quality=quality,
                flat_or_raised=flat_or_raised,
                direct_or_reverse=direct_or_reverse,
                thickness=thickness,
                num_colors=num_colors,
                length=user_length,  # <-- Save user input
                width=user_width,    # <-- Save user input
                price=price if price != '-' else None,
                created_at=current_time,
                last_updated=current_time,
                artwork_image=artwork_image_path,
                quotation_block=block,
                action='created',
                color_names=color_names_json,
                status='quotation complete'  # Set initial status
            )
            db_session.add(quotation)
            db_session.commit()
            # Save attachments
            if 'attachments' in request.files:
                files = request.files.getlist('attachments')
                uploads_dir = os.path.join('uploads', 'attachments')
                os.makedirs(uploads_dir, exist_ok=True)
                for file in files:
                    if file and file.filename:
                        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
                        safe_name = f"{timestamp}_{file.filename.replace(' ', '_')}"
                        file_path = os.path.join(uploads_dir, safe_name)
                        file.save(file_path)
                        attachment = Attachment(
                            quotation_id=quotation.id,
                            filename=safe_name,
                            original_filename=file.filename
                        )
                        db_session.add(attachment)
                db_session.commit()
            # --- Send HTML email to user ---
            try:
                # Prepare data for email
                company = data.get('customer_name', '-')
                key_person_name = data.get('key_person_name', '-')
                key_person_position = data.get('key_person_position', '-')
                key_person_email = user_email
                item_code = data.get('customer_item_code', '-')
                product_name = data.get('product_name', '-')
                quality = quality or '-'
                flat_or_raised = flat_or_raised or '-'
                direct_or_reverse = direct_or_reverse or '-'
                thickness = thickness or '-'
                num_colors = num_colors or '-'
                color_names = []
                try:
                    color_names = json.loads(data.get('color_names', '[]')) if isinstance(data.get('color_names'), str) else data.get('color_names', [])
                except Exception:
                    color_names = []
                width = data.get('width', '-')
                length = data.get('length', '-')
                artwork_image_url = ''
                if artwork_image_path:
                    # Make a relative URL for the image
                    artwork_image_url = request.url_root.rstrip('/') + '/uploads/artwork_images/' + os.path.basename(artwork_image_path)
                quotation_block = block
                # Prepare for inline image embedding
                img_cid = 'artwork_image'
                html_body = f'''
<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 15px; background: #f6f8fa; padding: 32px;">
  <tr>
    <td align="center">
      <table width="700" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #e0e0e0; padding: 32px; font-family: Arial, sans-serif; font-size: 15px;">
        <tr>
          <td colspan="2" align="center" style="padding-bottom: 24px; font-family: Arial, sans-serif; font-size: 15px;">
            <h2 style="color: #2c3e50; margin: 0; font-family: Arial, sans-serif; font-size: 15px;">Quotation Submitted Successfully</h2>
            <p style="color: #888; margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 15px;">Thank you for your submission. Here are your quotation details:</p>
          </td>
        </tr>
        <tr>
          <!-- Column 1 -->
          <td valign="top" width="50%" style="padding-right: 16px; font-family: Arial, sans-serif; font-size: 15px;">
            <h3 style="color: #007bff; border-bottom: 1px solid #e9ecef; padding-bottom: 4px; font-family: Arial, sans-serif; font-size: 15px;">Customer Details</h3>
            <table width="100%" cellpadding="4" cellspacing="0" style="color: #333; font-family: Arial, sans-serif; font-size: 15px;">
              <tr><td width="120" style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Company:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{company}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Key Person:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{key_person_name} ({key_person_position})</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Email:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{key_person_email}</td></tr>
            </table>
            <h3 style="color: #007bff; border-bottom: 1px solid #e9ecef; padding-bottom: 4px; margin-top: 24px; font-family: Arial, sans-serif; font-size: 15px;">Item Information</h3>
            <table width="100%" cellpadding="4" cellspacing="0" style="color: #333; font-family: Arial, sans-serif; font-size: 15px;">
              <tr><td width="120" style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Item Code:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{item_code}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Product:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{product_name}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Quality:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{quality}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Style:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{flat_or_raised}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Print Type:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{direct_or_reverse}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Thickness:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{thickness} mm</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;"># of Colors:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{num_colors} ({', '.join(color_names)})</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Dimensions:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{width} mm × {length} mm</td></tr>
            </table>
          </td>
          <!-- Column 2 -->
          <td valign="top" width="50%" style="padding-left: 16px; font-family: Arial, sans-serif; font-size: 15px;">
            <h3 style="color: #007bff; border-bottom: 1px solid #e9ecef; padding-bottom: 4px; font-family: Arial, sans-serif; font-size: 15px;">Artwork Image</h3>
            <div style="padding: 12px 0; font-family: Arial, sans-serif; font-size: 15px;">
              {f'<img src="cid:{img_cid}" alt="Artwork Image" style="max-width: 320px; border-radius: 6px; border: 1px solid #e9ecef; font-family: Arial, sans-serif; font-size: 15px;">' if artwork_image_path else '<span style="color:#888; font-family: Arial, sans-serif; font-size: 15px;">(No image uploaded)</span>'}
            </div>
            <h3 style="color: #007bff; border-bottom: 1px solid #e9ecef; padding-bottom: 4px; margin-top: 24px; font-family: Arial, sans-serif; font-size: 15px;">Quotation</h3>
            <pre style="background: #f8f9fa; color: #333; padding: 16px; border-radius: 6px; font-size: 15px; white-space: pre-wrap; font-family: Arial, sans-serif;">{quotation_block}</pre>
          </td>
        </tr>
        <tr>
          <td colspan="2" align="center" style="padding-top: 32px; color: #888; font-size: 15px; font-family: Arial, sans-serif;">
            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 24px 0;">
            <div style="font-family: Arial, sans-serif; font-size: 15px;">
              <span>Thank you for choosing <b>Your Company Name</b>.</span><br>
              <span style="font-size: 13px;">This is an automated message. Please do not reply directly to this email.</span>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
'''
                # Change email subject to new format (item code)
                subject = f'FCL / HT Quotation / {item_code}'

                # Prepare attachments for fallback function
                attachments = []
                if artwork_image_path and os.path.exists(artwork_image_path):
                    with open(artwork_image_path, 'rb') as img_file:
                        attachments.append({
                            'filename': os.path.basename(artwork_image_path),
                            'content_type': 'image/jpeg',
                            'data': img_file.read(),
                            'disposition': 'inline',
                            'headers': {'Content-ID': f'<{img_cid}>'}
                        })

                success, message, service = send_email_with_fallback(
                    subject=subject,
                    recipients=[user_email],
                    html=html_body,
                    attachments=attachments if attachments else None
                )
                if success:
                    print(f"[INFO] Quotation email sent to {user_email} via {service}")
                else:
                    print(f"[ERROR] Failed to send quotation email: {message}")
            except Exception as e:
                print(f"[ERROR] Failed to send quotation email: {e}")
            # --- End email logic ---
            return jsonify({'message': 'Quotation saved successfully', 'action': 'created', 'price': price, 'length': db_length, 'width': db_width, 'quotation_block': block, 'version': version}), 200
        except Exception as e:
            db_session.rollback()
            logger.error(f"Database error while saving quotation: {str(e)}")
            return jsonify({'error': str(e)}), 409
        finally:
            db_session.close()
        
    except Exception as e:
        logger.error(f"Error saving quotation: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/quotation/list', methods=['GET'])
def list_quotations():
    try:
        # Get user permission level and email from session
        permission_level = session.get('permission_level', 1)
        user_email = session.get('user', None)

        engine = create_engine('sqlite:///database.db', connect_args={'timeout': 30})
        Session = sessionmaker(bind=engine)
        db_session = Session()

        # Apply access control based on permission level
        if permission_level == 1:
            # Level 1: Can only view own created quotations
            if user_email:
                quotations = db_session.query(Quotation).filter(
                    Quotation.creator_email.ilike(user_email)
                ).order_by(Quotation.last_updated.desc()).all()
            else:
                quotations = []  # Empty list if no user email
        elif permission_level >= 3:
            # Level 3: Can view all quotations
            quotations = db_session.query(Quotation).order_by(Quotation.last_updated.desc()).all()
        else:
            # Level 2 or other: No access
            quotations = []  # Empty list
        
        # Convert to dictionary format
        records = []
        for q in quotations:
            def to_iso_z(dt):
                if not dt:
                    return None
                if dt.tzinfo is not None:
                    return dt.astimezone(timezone.utc).replace(tzinfo=None).isoformat(timespec='seconds') + 'Z'
                return dt.isoformat(timespec='seconds') + 'Z'
            record = {
                'id': q.id,
                'customer_name': q.customer_name,
                'key_person_name': q.key_person_name,
                'customer_item_code': q.customer_item_code,
                'creator_email': q.creator_email,
                'quality': q.quality,
                'flat_or_raised': q.flat_or_raised,
                'direct_or_reverse': q.direct_or_reverse,
                'thickness': float(q.thickness) if q.thickness else None,
                'num_colors': q.num_colors,
                'length': float(q.length) if q.length else None,
                'width': float(q.width) if q.width else None,
                'price': float(q.price) if q.price else None,
                'created_at': to_iso_z(q.created_at) if q.created_at else None,
                'last_updated': to_iso_z(q.last_updated) if q.last_updated else None,
                'artwork_image': q.artwork_image if q.artwork_image else None,
                'action': q.action if hasattr(q, 'action') else '-',
                'status': q.status if q.status else '-',
                'revision_count': getattr(q, 'revision_count', 0)
            }
            records.append(record)
        
        db_session.close()
        return jsonify(records)
    except Exception as e:
        logger.error(f"Error listing quotations: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/view_quotations')
@login_required
def view_quotations():
    # Get the user's permission level from session
    permission_level = session.get('permission_level', 1)
    user_email = session.get('user', None)
    return render_template('view_quotations.html', permission_level=permission_level, user_email=user_email)

@app.route('/view_quotations_simple')
def view_quotations_simple():
    try:
        # Get user permission level and email from session
        permission_level = session.get('permission_level', 1)
        user_email = session.get('user', None)

        engine = create_engine('sqlite:///database.db', connect_args={'timeout': 30})
        df = pd.read_sql_table('quotations', engine)

        # Apply access control based on permission level
        if permission_level == 1:
            # Level 1: Can only view own created quotations
            if user_email:
                # Case-insensitive email comparison
                df = df[df['creator_email'].str.lower() == user_email.lower()]
            else:
                df = df.iloc[0:0]  # Empty dataframe if no user email
        elif permission_level >= 3:
            # Level 3: Can view all quotations
            pass  # No filtering needed
        else:
            # Level 2 or other: No access (empty result)
            df = df.iloc[0:0]  # Empty dataframe

        records = df.to_dict('records')
        # Format the last_updated datetime
        for record in records:
            if record['last_updated']:
                dt = pd.to_datetime(record['last_updated'])
                record['last_updated'] = dt.strftime('%m/%d/%Y, %I:%M:%S %p')

        return render_template('view_quotations_simple.html', records=records,
                             permission_level=permission_level, user_email=user_email)
    except Exception as e:
        logger.error(f"Error in view_quotations_simple: {str(e)}")
        return render_template('view_quotations_simple.html', records=[], error=str(e),
                             permission_level=session.get('permission_level', 1),
                             user_email=session.get('user', None))

@app.route('/uploads/artwork_images/<filename>')
def uploaded_artwork_image(filename):
    return send_from_directory('uploads/artwork_images', filename)

@app.route('/uploads/attachments/<filename>')
def uploaded_attachment(filename):
    return send_from_directory('uploads/attachments', filename)

@app.route('/quotation/api/<int:quotation_id>', methods=['GET', 'PUT'])
def api_get_quotation(quotation_id):
    from sqlalchemy.orm import sessionmaker
    engine = create_engine('sqlite:///database.db', connect_args={'timeout': 30})
    Session = sessionmaker(bind=engine)
    session = Session()

    if request.method == 'PUT':
        # Helper functions (must be defined before use)
        def safe_float(value, default=0.0):
            try:
                if value is None or value == '' or value == '-':
                    return default
                return float(value)
            except (ValueError, TypeError):
                return default
        def safe_int(value, default=0):
            try:
                if value is None or value == '' or value == '-':
                    return default
                return int(value)
            except (ValueError, TypeError):
                return default
        # Accept both JSON and multipart/form-data
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            data = request.form.to_dict()
            jpg_file = request.files.get('artwork_image') if 'artwork_image' in request.files else None
            # Parse removed_attachments if present
            removed_attachments = []
            if 'removed_attachments' in data:
                try:
                    removed_attachments = json.loads(data['removed_attachments'])
                except Exception as e:
                    print(f'[DEBUG][PUT] Failed to parse removed_attachments: {e}')
        else:
            data = request.get_json(force=True)
            jpg_file = None
            removed_attachments = data.get('removed_attachments', [])
        # 1. Save file to disk BEFORE opening DB session
        artwork_path = None
        if jpg_file and jpg_file.filename:
            print(f'[DEBUG][PUT] Received new file: {jpg_file.filename}')
            if not jpg_file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                print('[DEBUG][PUT] File is not a JPG or PNG')
                return jsonify({'error': 'Only JPG or PNG files are allowed'}), 400
            uploads_dir = os.path.join('uploads', 'artwork_images')
            os.makedirs(uploads_dir, exist_ok=True)
            timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
            safe_name = f"{timestamp}_{jpg_file.filename.replace(' ', '_')}"
            file_path = os.path.join(uploads_dir, safe_name)
            jpg_file.save(file_path)
            print(f'[DEBUG][PUT] Saved file to: {file_path}')
            artwork_path = f"uploads/artwork_images/{safe_name}".replace('\\', '/')
        # 2. Open DB session ONCE
        session = Session()
        try:
            quotation = session.query(Quotation).filter_by(id=quotation_id).first()
            if not quotation:
                return jsonify({'error': 'Quotation not found'}), 404
            # Only update artwork_image if a new file was uploaded
            if artwork_path:
                print(f'[DEBUG][PUT] Setting artwork_image to: {artwork_path}')
                quotation.artwork_image = artwork_path
            else:
                print(f'[DEBUG][PUT] No new artwork image uploaded. Current value: {quotation.artwork_image}')
            # --- Remove selected attachments (not artwork image) ---
            if removed_attachments:
                for filename in removed_attachments:
                    att = session.query(Attachment).filter_by(quotation_id=quotation_id, filename=filename).first()
                    if att:
                        # Delete file from disk
                        file_path = os.path.join('uploads', 'attachments', os.path.basename(att.filename))
                        if os.path.exists(file_path):
                            try:
                                os.remove(file_path)
                                print(f'[DEBUG][PUT] Deleted attachment file: {file_path}')
                            except Exception as e:
                                print(f'[DEBUG][PUT] Failed to delete file: {file_path}, {e}')
                        session.delete(att)
                        print(f'[DEBUG][PUT] Deleted attachment record: {filename}')
                session.commit()
            # --- RECALCULATION LOGIC (use session.execute for price lookup) ---
            quality = data.get('quality', quotation.quality)
            flat_or_raised = data.get('flat_or_raised', quotation.flat_or_raised)
            direct_or_reverse = data.get('direct_or_reverse', quotation.direct_or_reverse)
            num_colors = safe_int(data.get('num_colors', quotation.num_colors))
            thickness = safe_float(data.get('thickness', quotation.thickness))
            price = '-'
            db_length = None
            db_width = None
            if flat_or_raised and flat_or_raised.lower() == 'flat':
                sql = '''SELECT length, width, price FROM ht_database WHERE trim(lower(quality))=trim(lower(:q)) AND trim(lower(flat_or_raised))=trim(lower(:f)) AND trim(lower(direct_or_reverse))=trim(lower(:d)) AND num_colors=:n'''
                params = {'q': quality, 'f': flat_or_raised, 'd': direct_or_reverse, 'n': num_colors}
                row = session.execute(text(sql), params).fetchone()
                if row:
                    db_length, db_width, price = row
            elif flat_or_raised and flat_or_raised.lower() == 'raised':
                sql = '''SELECT length, width, price FROM ht_database WHERE trim(lower(quality))=trim(lower(:q)) AND trim(lower(flat_or_raised))=trim(lower(:f)) AND trim(lower(direct_or_reverse))=trim(lower(:d)) AND num_colors=:n AND thickness <= :t ORDER BY thickness DESC LIMIT 1'''
                params = {'q': quality, 'f': flat_or_raised, 'd': direct_or_reverse, 'n': num_colors, 't': thickness}
                row = session.execute(text(sql), params).fetchone()
                if row:
                    db_length, db_width, price = row
                else:
                    sql2 = '''SELECT length, width, price FROM ht_database WHERE trim(lower(quality))=trim(lower(:q)) AND trim(lower(flat_or_raised))=trim(lower(:f)) AND trim(lower(direct_or_reverse))=trim(lower(:d)) AND num_colors=:n ORDER BY thickness ASC LIMIT 1'''
                    params2 = {'q': quality, 'f': flat_or_raised, 'd': direct_or_reverse, 'n': num_colors}
                    row2 = session.execute(text(sql2), params2).fetchone()
                    if row2:
                        db_length, db_width, price = row2
            def fmt(val, decimals=2):
                if val == '-' or val is None:
                    return '-'
                return f"{float(val):.{decimals}f}"
            user_length = safe_float(data.get('length', quotation.length))
            user_width = safe_float(data.get('width', quotation.width))
            mPlus6 = user_length + 6 if user_length else None
            nPlus6 = user_width + 6 if user_width else None
            combA = combB = combAeq = combBeq = '-'
            combA_more = combB_more = ''
            if db_length and db_width and user_length and user_width:
                xDivM = int(db_length // mPlus6)
                yDivN = int(db_width // nPlus6)
                yDivM = int(db_width // mPlus6)
                xDivN = int(db_length // nPlus6)
                combA = xDivM * yDivN
                combB = yDivM * xDivN
                if combA > combB:
                    combA_more = ' (more # of label)'
                elif combB > combA:
                    combB_more = ' (more # of label)'
                combAeq = f"Combination A: ({fmt(db_length,2)} / ({fmt(user_length,2)}+6))\n              × ({fmt(db_width,2)} / ({fmt(user_width,2)}+6))\n              = {xDivM} × {yDivN} = {combA} (# per 1 pet){combA_more}"
                combBeq = f"Combination B: ({fmt(db_width,2)} / ({fmt(user_length,2)}+6))\n              × ({fmt(db_length,2)} / ({fmt(user_width,2)}+6))\n              = {yDivM} × {xDivN} = {combB} (# per 1 pet){combB_more}"
            costPerLabel = '-'
            costPerLabelDetail = ''
            if price != '-' and isinstance(combA, int) and isinstance(combB, int):
                maxComb = max(combA, combB)
                if maxComb > 0:
                    costPerLabel = float(price) / maxComb
                    costPerLabelDetail = f"{fmt(price)} / {maxComb} = {fmt(costPerLabel)}"
            tiers = [
                (1000, 1.10), (3000, 1.05), (5000, 1.03), (10000, 1.00),
                (30000, 0.95), (50000, 0.90), (100000, 0.85)
            ]
            tier_lines = []
            for qty, factor in tiers:
                tprice = '-'
                if costPerLabel != '-' and isinstance(costPerLabel, float):
                    tprice = f"{costPerLabel * factor * 1000:.2f}"
                tier_lines.append(f"{qty:,}\t{tprice}")
            def wrap_line(line, width=60):
                return '\n'.join([line[i:i+width] for i in range(0, len(line), width)])
            version = 'v1.3.23'  # Updated version
            print(f'[DEBUG][PUT] request.files: {dict(request.files)}')
            print(f'[DEBUG][PUT] request.form: {dict(request.form)}')
            inputSummary = f"({quality}, {flat_or_raised}, {direct_or_reverse}, {thickness if thickness else '-'}, {num_colors})"
            xVal = fmt(db_length, 2) if db_length is not None else '-'
            yVal = fmt(db_width, 2) if db_width is not None else '-'
            if db_length is None or db_width is None:
                block = f"Quotation\n[WARNING: PET sheet size not found in database for the selected combination. Please check your input or database.]\n"
                block += wrap_line(f"1) Cost of PET (- × -): {inputSummary} = -") + "\n"
                block += wrap_line(f"2) Combination A: -") + "\n" + wrap_line(f"   Combination B: -") + "\n"
                block += wrap_line(f"3) Cost per 1 label: -") + "\n"
                block += wrap_line(f"4) Tier quotation") + "\nQty\tPrice\n-\n"
                block += f"\n\n[System Version: {version}]"
            else:
                block = "Quotation\n"
                block += wrap_line(f"1) Cost of PET ({xVal} × {yVal}): {inputSummary} = {fmt(price)}") + "\n"
                for line in (combAeq + "\n" + combBeq).split("\n"):
                    block += wrap_line(line) + "\n"
                block += wrap_line(f"3) Cost per 1 label: {costPerLabelDetail}") + "\n"
                block += wrap_line(f"4) Tier quotation") + "\nQty\tPrice\n"
                for tline in tier_lines:
                    block += wrap_line(tline) + "\n"
                block += f"\n[System Version: {version}]"
            # --- END Quotation Block ---
            # Update quotation fields
            quotation.quality = quality
            quotation.flat_or_raised = flat_or_raised
            quotation.direct_or_reverse = direct_or_reverse
            quotation.thickness = thickness
            quotation.num_colors = num_colors
            quotation.length = user_length
            quotation.width = user_width
            quotation.price = price if price != '-' else None
            quotation.quotation_block = block
            quotation.last_updated = datetime.utcnow()
            # Increment revision count
            quotation.revision_count = (quotation.revision_count or 0) + 1

            # Update status to show revision number
            if quotation.revision_count > 1:
                quotation.status = f'quotation complete (#{quotation.revision_count})'
            else:
                quotation.status = 'quotation complete'
            # Update color_names if present
            color_names_json = data.get('color_names')
            if color_names_json is not None:
                if isinstance(color_names_json, list):
                    color_names_json = json.dumps(color_names_json)
                quotation.color_names = color_names_json
            # Update customer_name, key_person_name, customer_item_code if present
            for field in ['customer_name', 'key_person_name', 'customer_item_code']:
                if data.get(field):
                    setattr(quotation, field, data.get(field))

            # --- Handle Attachment Updates ---
            warnings = []
            try:
                # Handle removed attachments
                if 'removed_attachments' in data:
                    removed_attachments_json = data.get('removed_attachments', '[]')
                    if isinstance(removed_attachments_json, str):
                        removed_filenames = json.loads(removed_attachments_json)
                    else:
                        removed_filenames = removed_attachments_json

                    for filename in removed_filenames:
                        # Find and delete attachment record
                        attachment = session.query(Attachment).filter_by(
                            quotation_id=quotation_id,
                            filename=filename
                        ).first()
                        if attachment:
                            # Delete physical file
                            file_path = os.path.join('uploads', 'attachments', filename)
                            if os.path.exists(file_path):
                                try:
                                    os.remove(file_path)
                                    print(f'[DEBUG] Deleted attachment file: {file_path}')
                                except Exception as e:
                                    print(f'[WARNING] Could not delete file {file_path}: {e}')

                            # Delete database record
                            session.delete(attachment)
                            print(f'[DEBUG] Removed attachment: {filename}')

                # Handle new attachments
                if 'attachments' in request.files:
                    attachment_files = request.files.getlist('attachments')
                    uploads_dir = os.path.join('uploads', 'attachments')
                    os.makedirs(uploads_dir, exist_ok=True)

                    for file in attachment_files:
                        if file and file.filename:
                            try:
                                timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
                                safe_name = f"{timestamp}_{file.filename.replace(' ', '_')}"
                                file_path = os.path.join(uploads_dir, safe_name)
                                file.save(file_path)

                                # Create attachment record
                                attachment = Attachment(
                                    quotation_id=quotation_id,
                                    filename=safe_name,
                                    original_filename=file.filename
                                )
                                session.add(attachment)
                                print(f'[DEBUG] Added new attachment: {safe_name}')
                            except Exception as e:
                                warnings.append(f'Failed to upload attachment {file.filename}: {str(e)}')
                                print(f'[ERROR] Attachment upload failed: {e}')

            except Exception as e:
                warnings.append(f'Error processing attachments: {str(e)}')
                print(f'[ERROR] Attachment processing failed: {e}')

            session.commit()
            # --- Send HTML email to user ---
            try:
                user_email = quotation.creator_email or 'unknown@example.com'
                company = quotation.customer_name or '-'
                key_person_name = quotation.key_person_name or '-'
                key_person_position = data.get('key_person_position', '-')
                key_person_email = user_email
                item_code = quotation.customer_item_code or '-'
                product_name = data.get('product_name', '-')
                quality = quotation.quality or '-'
                flat_or_raised = quotation.flat_or_raised or '-'
                direct_or_reverse = quotation.direct_or_reverse or '-'
                thickness = quotation.thickness or '-'
                num_colors = quotation.num_colors or '-'
                color_names = []
                try:
                    color_names = json.loads(quotation.color_names) if quotation.color_names else []
                except Exception:
                    color_names = []
                width = quotation.width or '-'
                length = quotation.length or '-'
                artwork_image_path = quotation.artwork_image
                artwork_image_url = ''
                if artwork_image_path:
                    artwork_image_url = request.url_root.rstrip('/') + '/uploads/artwork_images/' + os.path.basename(artwork_image_path)
                quotation_block = quotation.quotation_block
                img_cid = 'artwork_image'
                html_body = f'''
<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 15px; background: #f6f8fa; padding: 32px;">
  <tr>
    <td align="center">
      <table width="700" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #e0e0e0; padding: 32px; font-family: Arial, sans-serif; font-size: 15px;">
        <tr>
          <td colspan="2" align="center" style="padding-bottom: 24px; font-family: Arial, sans-serif; font-size: 15px;">
            <h2 style="color: #2c3e50; margin: 0; font-family: Arial, sans-serif; font-size: 15px;">Quotation Updated Successfully</h2>
            <p style="color: #888; margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 15px;">Your quotation has been updated. Here are the details:</p>
          </td>
        </tr>
        <tr>
          <!-- Column 1 -->
          <td valign="top" width="50%" style="padding-right: 16px; font-family: Arial, sans-serif; font-size: 15px;">
            <h3 style="color: #007bff; border-bottom: 1px solid #e9ecef; padding-bottom: 4px; font-family: Arial, sans-serif; font-size: 15px;">Customer Details</h3>
            <table width="100%" cellpadding="4" cellspacing="0" style="color: #333; font-family: Arial, sans-serif; font-size: 15px;">
              <tr><td width="120" style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Company:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{company}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Key Person:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{key_person_name} ({key_person_position})</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Email:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{key_person_email}</td></tr>
            </table>
            <h3 style="color: #007bff; border-bottom: 1px solid #e9ecef; padding-bottom: 4px; margin-top: 24px; font-family: Arial, sans-serif; font-size: 15px;">Item Information</h3>
            <table width="100%" cellpadding="4" cellspacing="0" style="color: #333; font-family: Arial, sans-serif; font-size: 15px;">
              <tr><td width="120" style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Item Code:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{item_code}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Product:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{product_name}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Quality:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{quality}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Style:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{flat_or_raised}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Print Type:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{direct_or_reverse}</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Thickness:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{thickness} mm</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;"># of Colors:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{num_colors} ({', '.join(color_names)})</td></tr>
              <tr><td style="font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Dimensions:</td><td style="font-family: Arial, sans-serif; font-size: 15px;">{width} mm × {length} mm</td></tr>
            </table>
          </td>
          <!-- Column 2 -->
          <td valign="top" width="50%" style="padding-left: 16px; font-family: Arial, sans-serif; font-size: 15px;">
            <h3 style="color: #007bff; border-bottom: 1px solid #e9ecef; padding-bottom: 4px; font-family: Arial, sans-serif; font-size: 15px;">Artwork Image</h3>
            <div style="padding: 12px 0; font-family: Arial, sans-serif; font-size: 15px;">
              {f'<img src="cid:{img_cid}" alt="Artwork Image" style="max-width: 320px; border-radius: 6px; border: 1px solid #e9ecef; font-family: Arial, sans-serif; font-size: 15px;">' if artwork_image_path else '<span style="color:#888; font-family: Arial, sans-serif; font-size: 15px;">(No image uploaded)</span>'}
            </div>
            <h3 style="color: #007bff; border-bottom: 1px solid #e9ecef; padding-bottom: 4px; margin-top: 24px; font-family: Arial, sans-serif; font-size: 15px;">Quotation</h3>
            <pre style="background: #f8f9fa; color: #333; padding: 16px; border-radius: 6px; font-size: 15px; white-space: pre-wrap; font-family: Arial, sans-serif;">{quotation_block}</pre>
          </td>
        </tr>
        <tr>
          <td colspan="2" align="center" style="padding-top: 32px; color: #888; font-size: 15px; font-family: Arial, sans-serif;">
            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 24px 0;">
            <div style="font-family: Arial, sans-serif; font-size: 15px;">
              <span>Thank you for choosing <b>Your Company Name</b>.</span><br>
              <span style="font-size: 13px;">This is an automated message. Please do not reply directly to this email.</span>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
'''
                revision_count = quotation.revision_count or 0
                subject = f'FCL / HT Quotation / {item_code} (#{revision_count} revision)'

                # Prepare attachments for fallback function
                attachments = []
                if artwork_image_path and os.path.exists(artwork_image_path):
                    with open(artwork_image_path, 'rb') as img_file:
                        attachments.append({
                            'filename': os.path.basename(artwork_image_path),
                            'content_type': 'image/jpeg',
                            'data': img_file.read(),
                            'disposition': 'inline',
                            'headers': {'Content-ID': f'<{img_cid}>'}
                        })

                success, message, service = send_email_with_fallback(
                    subject=subject,
                    recipients=[user_email],
                    html=html_body,
                    attachments=attachments if attachments else None
                )
                if success:
                    print(f"[INFO] Quotation update email sent to {user_email} via {service}")
                else:
                    print(f"[ERROR] Failed to send quotation update email: {message}")
            except Exception as e:
                print(f"[ERROR] Failed to send quotation update email: {e}")
            # --- End email logic ---
            # Prepare response with warnings if any
            response_data = {
                'message': 'Quotation updated successfully',
                'quotation_block': block,
                'artwork_image': quotation.artwork_image.replace('\\', '/') if quotation.artwork_image else None
            }
            if warnings:
                response_data['warnings'] = warnings

            return jsonify(response_data), 200
        except Exception as e:
            session.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            session.close()

    # --- Original GET method ---
    quotation = session.query(Quotation).filter_by(id=quotation_id).first()
    # Fetch attachments
    attachments = session.query(Attachment).filter_by(quotation_id=quotation_id).all()
    session.close()
    if not quotation:
        return jsonify({'error': 'Quotation not found'}), 404
    q = quotation
    color_names = getattr(q, 'color_names', None)
    color_names_list = []
    if color_names:
        try:
            color_names_list = json.loads(color_names) if isinstance(color_names, str) else color_names
        except Exception:
            color_names_list = []
    quotation_data = {
        'id': q.id,
        'company': getattr(q, 'customer_name', ''),
        'key_person_name': getattr(q, 'key_person_name', ''),
        'customer_item_code': getattr(q, 'customer_item_code', ''),
        'quality': getattr(q, 'quality', ''),
        'flat_or_raised': getattr(q, 'flat_or_raised', ''),
        'direct_or_reverse': getattr(q, 'direct_or_reverse', ''),
        'thickness': q.thickness,
        'num_colors': q.num_colors,
        'length': q.length,
        'width': q.width,
        'price': q.price,
        'status': getattr(q, 'status', ''),
        'created_at': q.created_at.strftime('%Y-%m-%d %H:%M:%S') if q.created_at else '',
        'updated_at': q.last_updated.strftime('%Y-%m-%d %H:%M:%S') if q.last_updated else '',
        'artwork_image': getattr(q, 'artwork_image', '').replace('\\', '/'),
        'quotation_block': getattr(q, 'quotation_block', ''),
        'action': getattr(q, 'action', '-'),
        'revision_count': getattr(q, 'revision_count', 0),
        'attachments': [
            {
                'filename': a.filename.replace('\\', '/'),
                'original_filename': a.original_filename,
                'uploaded_at': a.uploaded_at.strftime('%Y-%m-%d %H:%M:%S') if a.uploaded_at else ''
            } for a in attachments
        ],
        'color_names': color_names_list
    }
    return jsonify(quotation_data)

@app.route('/quotation2_create2')
def serve_quotation2_create2():
    return render_template('quotation2_create2.html')

@app.route('/quotation2_view_select')
def serve_quotation2_view_select():
    print('=== /quotation2_view_select ROUTE ACCESSED ===')
    v = '1.3.2'
    return render_template('quotation2_view_select.html', version=v)

def generate_sample_card_pdf(quotation):
    """Generate Sample Card PDF for a quotation"""
    if not REPORTLAB_AVAILABLE:
        logger.error("ReportLab not available for PDF generation")
        return None

    try:
        # Create PDF buffer
        buffer = io.BytesIO()

        # Create PDF document
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                              rightMargin=15*mm, leftMargin=15*mm,
                              topMargin=15*mm, bottomMargin=15*mm)

        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'],
                                   fontSize=16, spaceAfter=5, alignment=0, fontName='Helvetica-Bold')
        header_style = ParagraphStyle('Header', parent=styles['Heading2'],
                                    fontSize=11, spaceAfter=5, fontName='Helvetica-Bold')
        normal_style = ParagraphStyle('Normal', parent=styles['Normal'],
                                    fontSize=10, spaceAfter=3)
        small_style = ParagraphStyle('Small', parent=styles['Normal'],
                                   fontSize=9, spaceAfter=2)

        # Build PDF content
        story = []

        # Add coordinate rulers for easy positioning reference
        # Top ruler (X-axis) - every 10mm from 0 to 210mm
        top_ruler_data = []
        x_numbers = []
        for i in range(0, 220, 10):  # 0, 10, 20, 30... up to 210
            x_numbers.append(str(i))
        top_ruler_data.append(x_numbers)

        top_ruler = Table(top_ruler_data, colWidths=[10*mm] * 22)
        top_ruler.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 6),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.red),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ]))
        story.append(top_ruler)
        story.append(Spacer(1, 2*mm))

        # Header with Y-coordinate and title
        header_data = [
            ['20', 'FCL', 'Sample Submission Card :']
        ]
        header_table = Table(header_data, colWidths=[10*mm, 30*mm, 150*mm])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),  # Y-coordinate centered
            ('ALIGN', (1, 0), (-1, -1), 'LEFT'),  # Header text left
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 6),  # Y-coordinate small
            ('FONTSIZE', (1, 0), (-1, -1), 12),  # Header text normal
            ('TEXTCOLOR', (0, 0), (0, 0), colors.red),  # Y-coordinate red
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 5*mm))

        # Parse color names from JSON
        color_names = "N/A"
        if quotation.color_names:
            try:
                colors_data = json.loads(quotation.color_names) if isinstance(quotation.color_names, str) else quotation.color_names
                if isinstance(colors_data, list):
                    color_names = ", ".join(colors_data)
                else:
                    color_names = str(colors_data)
            except:
                color_names = str(quotation.color_names)

        # Get current datetime
        now = datetime.now()
        current_date = now.strftime("%d %b, %Y")

        # Get user email from session
        user_email = session.get('user', 'system@fuchanghk.com')

        # Main form table - EXACT 6-column layout as per image
        # Row 1: Type | For Approval | # Revision | 1 | Date | 5th Sept, 2024
        # Row 2: Customer Name | teacny | Key person | PVR | | |
        # Row 3: Item Code | UFG-49354 | Size | 223 X 325 | | |
        # Row 4: Internal Code | (empty) | login email | eric.brilliant | | |

        # Extract email prefix (before @)
        email_prefix = 'N/A'
        if user_email:
            email_prefix = user_email.split('@')[0] if '@' in user_email else user_email

        # Wrap customer name if too long to fit within X=130mm limit
        customer_name = quotation.customer_name or 'N/A'
        if len(customer_name) > 35:  # Approximate character limit for 80mm width
            customer_name = customer_name[:35] + '...'

        main_data = [
            ['40', 'Type', 'For Approval', '# Revision', '', 'Date', current_date],
            ['50', 'Customer Name', customer_name, '1', '', 'Key person', quotation.key_person_name or 'N/A'],
            ['60', 'Item Code', quotation.customer_item_code or 'N/A', '', '', 'Size', f'{quotation.width or "N/A"} X {quotation.length or "N/A"}'],
            ['70', 'Internal Code', '', '', '', 'sender', email_prefix]
        ]

        # Create main table with adjusted column widths:
        # Y-coord(10mm) + Col1(30mm) + Col2(50mm) + Col3(20mm) + Spacer(20mm) + Col4(25mm) + Col5(25mm)
        # X positions: 0-10mm, 10-40mm, 40-90mm, 90-110mm, 110-130mm, 130-155mm, 155-180mm
        # # Revision starts at X=90mm (close to 100mm), 2nd grey column starts at X=130mm (close to 140mm)
        main_table = Table(main_data, colWidths=[10*mm, 30*mm, 50*mm, 20*mm, 20*mm, 25*mm, 25*mm])
        # Apply styling with horizontal lines only and background colors
        main_table.setStyle(TableStyle([
            # Y-coordinate column styling
            ('FONTSIZE', (0, 0), (0, -1), 6),  # Y-coordinate small
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),  # Y-coordinate bold
            ('TEXTCOLOR', (0, 0), (0, -1), colors.red),  # Y-coordinate red
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),  # Y-coordinate centered

            # Background colors for label columns (light grey) - columns 2 and 6 (moved to X=130mm)
            ('BACKGROUND', (1, 0), (1, -1), colors.lightgrey),  # Column 2: Type, Customer Name, Item Code, Internal Code
            ('BACKGROUND', (5, 0), (5, -1), colors.lightgrey),  # Column 6: Date, Key person, Size, sender (moved to X=130mm)

            # Horizontal lines only - no vertical lines, no outer borders
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.black),  # Below header
            ('LINEBELOW', (0, 1), (-1, 1), 0.5, colors.black),  # Below row 2
            ('LINEBELOW', (0, 2), (-1, 2), 0.5, colors.black),  # Below row 3
            ('LINEBELOW', (0, 3), (-1, 3), 2, colors.black),    # Bottom border (thick)

            # Font and alignment for main content
            ('FONTSIZE', (1, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

            # Label columns (bold) - columns 2, 4, and 6 (adjusted for new layout)
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),    # # Revision still bold but no grey background
            ('FONTNAME', (5, 0), (5, -1), 'Helvetica-Bold'),    # Column 6 bold for ALL rows (Date, Key person, etc.)

            # Text wrapping for customer name column (column 2)
            ('WORDWRAP', (2, 1), (2, 1), 'LTR'),  # Enable word wrap for customer name

            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        story.append(main_table)
        story.append(Spacer(1, 115*mm))  # Large spacer to move Internal inspection to Y=200mm

        # Internal inspection section - moved to Y=200mm, width X=10-200mm
        inspection_header_data = [['200', 'Internal inspection :']]
        inspection_header_table = Table(inspection_header_data, colWidths=[10*mm, 190*mm])  # Total width 200mm (10+190)
        inspection_header_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (0, 0), 6),  # Y-coordinate small
            ('FONTSIZE', (1, 0), (1, 0), 12),  # Header text normal
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, 0), colors.red),  # Y-coordinate red
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),  # Y-coordinate centered
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),  # Header text left
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(inspection_header_table)
        story.append(Spacer(1, 3*mm))

        # Inspection table - adjusted for Y=200mm+ and width X=10-200mm
        inspection_data = [
            ['210', 'Size', ':', 'OK □', 'NG □', '|', 'Color', ':', 'OK □', 'NG □', '|', 'Material', ':', 'OK □', 'NG □'],
            ['220', 'Others', ':', '', '', '', '', '', '', '', '', '', '', '', '']
        ]

        # Adjusted column widths to fit X=10-200mm (total 190mm content width)
        inspection_table = Table(inspection_data, colWidths=[10*mm, 18*mm, 5*mm, 18*mm, 18*mm, 10*mm, 18*mm, 5*mm, 18*mm, 18*mm, 10*mm, 18*mm, 5*mm, 18*mm, 18*mm])
        inspection_table.setStyle(TableStyle([
            # Y-coordinate column styling
            ('FONTSIZE', (0, 0), (0, -1), 6),  # Y-coordinate small
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),  # Y-coordinate bold
            ('TEXTCOLOR', (0, 0), (0, -1), colors.red),  # Y-coordinate red
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),  # Y-coordinate centered

            # Background for label cells only (adjusted for Y-coord column)
            ('BACKGROUND', (1, 0), (1, -1), colors.lightgrey),  # Size
            ('BACKGROUND', (6, 0), (6, 0), colors.lightgrey),   # Color
            ('BACKGROUND', (11, 0), (11, 0), colors.lightgrey), # Material

            # Vertical lines between sections (adjusted for Y-coord column)
            ('LINEAFTER', (5, 0), (5, 0), 1, colors.black),
            ('LINEAFTER', (10, 0), (10, 0), 1, colors.black),

            # Horizontal lines only - no vertical lines, no outer borders
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.black),  # Below header
            ('LINEBELOW', (0, 1), (-1, 1), 2, colors.black),    # Bottom border (thick)

            # Font and alignment for main content
            ('FONTSIZE', (1, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

            # Bold for labels (adjusted for Y-coord column)
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTNAME', (6, 0), (6, 0), 'Helvetica-Bold'),
            ('FONTNAME', (11, 0), (11, 0), 'Helvetica-Bold'),

            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))

        story.append(inspection_table)
        story.append(Spacer(1, 10*mm))

        # Customer Comments section - positioned under Internal inspection, width X=10-200mm
        comments_header_data = [['240', 'Customer Comments :']]
        comments_header_table = Table(comments_header_data, colWidths=[10*mm, 190*mm])  # Total width 200mm (10+190)
        comments_header_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (0, 0), 6),  # Y-coordinate small
            ('FONTSIZE', (1, 0), (1, 0), 12),  # Header text normal
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, 0), colors.red),  # Y-coordinate red
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),  # Y-coordinate centered
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),  # Header text left
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(comments_header_table)
        story.append(Spacer(1, 3*mm))

        # Comments table - new layout matching the required format
        comments_data = [
            ['250', 'Comments', ':', ''],
            ['280', 'PIC', ':', 'Date', ':']
        ]

        comments_table = Table(comments_data, colWidths=[10*mm, 30*mm, 5*mm, 75*mm, 5*mm, 30*mm, 45*mm])  # Total width 200mm
        comments_table.setStyle(TableStyle([
            # Y-coordinate column styling
            ('FONTSIZE', (0, 0), (0, -1), 6),  # Y-coordinate small
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),  # Y-coordinate bold
            ('TEXTCOLOR', (0, 0), (0, -1), colors.red),  # Y-coordinate red
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),  # Y-coordinate centered

            # Background for label columns (Comments, PIC, Date)
            ('BACKGROUND', (1, 0), (1, 0), colors.lightgrey),  # Comments label
            ('BACKGROUND', (1, 1), (1, 1), colors.lightgrey),  # PIC label
            ('BACKGROUND', (4, 1), (4, 1), colors.lightgrey),  # Date label

            # Lines under Comments section and PIC/Date section
            ('LINEBELOW', (3, 0), (3, 0), 1, colors.black),    # Line under Comments
            ('LINEBELOW', (2, 1), (2, 1), 1, colors.black),    # Line under PIC
            ('LINEBELOW', (5, 1), (-1, 1), 1, colors.black),   # Line under Date

            # Font and alignment for main content
            ('FONTSIZE', (1, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

            # Bold for labels
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),  # Comments
            ('FONTNAME', (1, 1), (1, 1), 'Helvetica-Bold'),  # PIC
            ('FONTNAME', (4, 1), (4, 1), 'Helvetica-Bold'),  # Date

            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),

            # Make comment rows taller
            ('ROWBACKGROUNDS', (0, 1), (-1, 2), [colors.white, colors.white]),
        ]))

        story.append(comments_table)
        story.append(Spacer(1, 10*mm))

        # Footer disclaimer - using smaller font
        disclaimer_text = """The content and objective this opinion, can confirm that you have reviewed and approved the design and quality of the product as requested. Should clients have any issue the internal due to negligence in the signing or printing process, individual involved, findings and demonstrated factors. Final sample application requires signing on the schedule form and under the intended conditions to ensure proper submission and quality."""

        # Create small disclaimer style
        disclaimer_style = ParagraphStyle('Disclaimer', parent=styles['Normal'],
                                         fontSize=8, spaceAfter=2)

        story.append(Paragraph(disclaimer_text, disclaimer_style))
        story.append(Spacer(1, 5*mm))

        # System footer
        footer_text = f"Generated: {now.strftime('%Y-%m-%d %H:%M:%S')} | System: v1.4.28<br/>Fu Chang Hong Kong - Sample Submission Card System"
        # Create extra small style for footer
        extra_small_style = ParagraphStyle('ExtraSmall', parent=styles['Normal'],
                                         fontSize=7, spaceAfter=1)

        story.append(Paragraph(footer_text, extra_small_style))

        # Build PDF
        doc.build(story)
        buffer.seek(0)

        return buffer

    except Exception as e:
        logger.error(f"Error generating sample card PDF: {str(e)}")
        return None

def generate_sample_card_html(quotation):
    """Generate Sample Card as HTML (fallback when ReportLab not available)"""
    try:
        # Parse color names from JSON
        color_names = "N/A"
        if quotation.color_names:
            try:
                colors_data = json.loads(quotation.color_names) if isinstance(quotation.color_names, str) else quotation.color_names
                if isinstance(colors_data, list):
                    color_names = ", ".join(colors_data)
                else:
                    color_names = str(colors_data)
            except:
                color_names = str(quotation.color_names)

        # Get current datetime
        now = datetime.now()
        current_date = now.strftime("%Y-%m-%d")
        current_time = now.strftime("%H:%M:%S")

        # Get user email from session
        user_email = session.get('user', 'system@fuchanghk.com')

        # Prepare date values
        created_date = quotation.created_at.strftime('%Y-%m-%d') if quotation.created_at else 'N/A'
        revision_number = quotation.revision_count or 0

        # Create HTML content
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Sample Card - {quotation.customer_item_code or quotation.id}</title>
    <style>
        @page {{ size: A4; margin: 15mm; }}
        body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; height: 100vh; display: flex; flex-direction: column; }}

        /* Header - 20% of space */
        .header {{
            height: 20%;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            border-bottom: 2px solid #000;
            margin-bottom: 10px;
        }}
        .title {{ font-size: 28px; font-weight: bold; margin-bottom: 8px; }}
        .company {{ font-size: 20px; color: #333; }}

        /* Main Content - 70% of space */
        .main-content {{
            height: 70%;
            display: flex;
            flex-direction: column;
        }}

        /* Two-column layout for main content */
        .content-row {{
            display: flex;
            flex: 1;
            gap: 15px;
            margin-bottom: 15px;
        }}

        /* Left column - Customer & Product info */
        .left-column {{
            flex: 3;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }}

        /* Right column - Production details - reduced to half width */
        .right-column {{
            flex: 1;
            display: flex;
            flex-direction: column;
        }}

        /* Table styles */
        .info-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }}
        .info-table th, .info-table td {{
            border: 1px solid #000;
            padding: 6px;
            text-align: left;
            font-size: 12px;
        }}
        .info-table th {{
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 11px;
        }}

        /* Compact product specifications - 1 line format */
        .product-specs {{
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            padding: 8px;
            border: 1px solid #000;
            background-color: #f9f9f9;
            font-size: 11px;
        }}
        .spec-item {{
            white-space: nowrap;
        }}
        .spec-label {{
            font-weight: bold;
        }}

        /* Production details - vertical layout - removed outer border */
        .production-details {{
            padding: 8px;
            height: 100%;
        }}
        .production-title {{
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 11px;
            padding: 4px;
            margin: -8px -8px 8px -8px;
            text-align: center;
        }}
        .production-item {{
            margin-bottom: 8px;
            font-size: 11px;
            padding: 3px 0;
            border-bottom: 1px dotted #ccc;
        }}
        .production-label {{
            font-weight: bold;
            display: block;
        }}
        .production-value {{
            color: #333;
        }}

        /* Notes section - moved to bottom of page */
        .notes-section {{
            position: fixed;
            bottom: 60px;
            left: 15mm;
            right: 15mm;
            margin-top: auto;
        }}
        .notes-table {{
            width: 100%;
            border-collapse: collapse;
        }}
        .notes-table th, .notes-table td {{
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 12px;
        }}
        .notes-table th {{
            background-color: #f0f0f0;
            font-weight: bold;
        }}
        .checkbox {{
            font-size: 14px;
            margin-right: 8px;
        }}

        /* Footer removed as requested */
    </style>
</head>
<body>
    <!-- Header Section removed as requested -->

    <!-- Main Content Section - 70% of space -->
    <div class="main-content">
        <div class="content-row">
            <!-- Left Column - Customer & Product Info -->
            <div class="left-column">
                <!-- Customer Information -->
                <table class="info-table">
                    <tr>
                        <th colspan="2">CUSTOMER INFORMATION</th>
                    </tr>
                    <tr>
                        <td><strong>Customer:</strong></td>
                        <td>{quotation.customer_name or 'N/A'}</td>
                    </tr>
                    <tr>
                        <td><strong>Contact:</strong></td>
                        <td>{quotation.key_person_name or 'N/A'}</td>
                    </tr>
                    <tr>
                        <td><strong>Item Code:</strong></td>
                        <td>{quotation.customer_item_code or 'N/A'}</td>
                    </tr>
                    <!-- Date row removed as requested -->
                    <tr>
                        <td><strong>By:</strong></td>
                        <td>{user_email}</td>
                    </tr>
                </table>

                <!-- Product Specifications - Compact 1 line format -->
                <div style="margin-bottom: 10px;">
                    <div style="background-color: #f0f0f0; font-weight: bold; font-size: 11px; padding: 4px; border: 1px solid #000; margin-bottom: 2px;">
                        PRODUCT SPECIFICATIONS
                    </div>
                    <div class="product-specs">
                        <span class="spec-item"><span class="spec-label">Dimensions:</span> {quotation.width or 'N/A'} X {quotation.length or 'N/A'} mm</span>
                        <span class="spec-item"><span class="spec-label">Quality:</span> {quotation.quality or 'N/A'}</span>
                        <span class="spec-item"><span class="spec-label">Surface:</span> {quotation.flat_or_raised or 'N/A'}</span>
                        <span class="spec-item"><span class="spec-label">Print:</span> {quotation.direct_or_reverse or 'N/A'}</span>
                        <span class="spec-item"><span class="spec-label">Thickness:</span> {quotation.thickness or 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Right Column - Production Details (Vertical) -->
            <div class="right-column">
                <div class="production-details">
                    <div class="production-title">PRODUCTION DETAILS</div>

                    <div class="production-item">
                        <span class="production-label">Colors:</span>
                        <span class="production-value">{quotation.num_colors or 0} colors</span>
                    </div>

                    <div class="production-item">
                        <span class="production-label">Color Names:</span>
                        <div class="production-value">"""

        # Process color names - 1 row 1 name with smaller font
        if color_names and color_names != "N/A":
            color_list = color_names.split(", ") if ", " in color_names else [color_names]
            for color in color_list:
                html_content += f'<div style="font-size: 8px; margin-bottom: 1px;">{color.strip()}</div>'
        else:
            html_content += '<div style="font-size: 8px;">N/A</div>'

        html_content += """                        </div>
                    </div>

                    <!-- Thickness moved to Product Specifications -->

                    <!-- Quotation ID removed as requested -->

                    <div class="production-item">
                        <span class="production-label">Created:</span>
                        <span class="production-value">""" + created_date + """</span>
                    </div>

                    <div class="production-item">
                        <span class="production-label">Revision:</span>
                        <span class="production-value">#""" + str(revision_number) + """</span>
                    </div>

                    <!-- Additional Files removed as requested -->
                </div>
            </div>
        </div>

        <!-- Notes Section -->
        <div class="notes-section">
            <table class="notes-table">
                <tr>
                    <th>NOTES & INSTRUCTIONS</th>
                </tr>
                <tr>
                    <td>
                        <span class="checkbox">[ ]</span> Sample approved &nbsp;&nbsp;&nbsp;&nbsp;
                        <span class="checkbox">[ ]</span> Modifications required &nbsp;&nbsp;&nbsp;&nbsp;
                        <span class="checkbox">[ ]</span> Proceed to production
                    </td>
                </tr>
                <tr>
                    <td>
                        <span class="checkbox">[ ]</span> Additional samples needed
                    </td>
                </tr>
                <tr>
                    <td>
                        <strong>Comments:</strong>
                    </td>
                </tr>
                <!-- Second underline removed as requested -->
            </table>
        </div>
    </div>

    <!-- Footer - Version number only -->
    <div style="position: fixed; bottom: 5px; right: 15mm; font-size: 8px; color: #666;">
        v1.4.42
    </div>

    <script>
        // Auto-print when page loads
        window.onload = function() {{
            // Small delay to ensure page is fully loaded
            setTimeout(function() {{
                window.print();
            }}, 500);
        }};

        // Add print button for manual printing
        document.addEventListener('DOMContentLoaded', function() {{
            const printBtn = document.createElement('button');
            printBtn.innerHTML = '🖨️ Print Sample Card';
            printBtn.style.cssText = 'position:fixed;top:10px;right:10px;padding:10px 15px;background:#007bff;color:white;border:none;border-radius:5px;cursor:pointer;z-index:1000;';
            printBtn.onclick = function() {{ window.print(); }};
            document.body.appendChild(printBtn);

            // Hide print button when printing
            window.addEventListener('beforeprint', function() {{
                printBtn.style.display = 'none';
            }});
            window.addEventListener('afterprint', function() {{
                printBtn.style.display = 'block';
            }});
        }});
    </script>
</body>
</html>
        """

        return html_content

    except Exception as e:
        logger.error(f"Error generating sample card HTML: {str(e)}")
        return None

# Status update endpoints
@app.route('/quotation/status/<int:quotation_id>', methods=['PUT'])
def update_quotation_status(quotation_id):
    """Update quotation status for workflow actions"""
    try:
        print(f"[DEBUG] API called for quotation {quotation_id}")
        data = request.json
        action = data.get('action')
        print(f"[DEBUG] Action received: {action}")

        # Map actions to status values
        status_map = {
            'submitted-to-customer': 'submitted to customer',
            'price-approved': 'price approved',
            'start-sampling': 'sampling',
            'sample-card': 'sample card'
        }

        if action not in status_map:
            return jsonify({'error': 'Invalid action'}), 400

        new_status = status_map[action]

        # Update database
        from sqlalchemy.orm import sessionmaker
        engine = create_engine('sqlite:///database.db', connect_args={'timeout': 30})
        Session = sessionmaker(bind=engine)
        session = Session()

        try:
            quotation = session.query(Quotation).filter_by(id=quotation_id).first()
            if not quotation:
                return jsonify({'error': 'Quotation not found'}), 404

            # Update status and timestamp
            quotation.status = new_status
            quotation.last_updated = datetime.utcnow()

            session.commit()
            return jsonify({'message': 'Status updated successfully', 'status': new_status}), 200

        except Exception as e:
            session.rollback()
            logger.error(f"Error updating quotation status: {str(e)}")
            return jsonify({'error': str(e)}), 500
        finally:
            session.close()

    except Exception as e:
        logger.error(f"Error in update_quotation_status: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/quotation/sample-card/<int:quotation_id>', methods=['GET'])
def download_sample_card(quotation_id):
    """Generate and download Sample Card PDF"""
    print(f"[DEBUG] Sample Card PDF requested for quotation {quotation_id}")

    print(f"[DEBUG] REPORTLAB_AVAILABLE: {REPORTLAB_AVAILABLE}")

    # Don't return error immediately - try WeasyPrint fallback
    if not REPORTLAB_AVAILABLE:
        print("[WARNING] ReportLab not available, will try WeasyPrint fallback")

    try:
        # Get quotation from database
        from sqlalchemy.orm import sessionmaker
        engine = create_engine('sqlite:///database.db', connect_args={'timeout': 30})
        Session = sessionmaker(bind=engine)
        session = Session()

        quotation = session.query(Quotation).filter_by(id=quotation_id).first()
        if not quotation:
            session.close()
            return jsonify({'error': 'Quotation not found'}), 404

        # Create a simple HTML file that can be printed to PDF
        print("[INFO] Creating HTML Sample Card")
        try:
            # Create HTML content
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sample Card - {quotation.customer_item_code or f'ID-{quotation_id}'}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .header {{ text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; }}
                    .section {{ margin-bottom: 20px; }}
                    .section-title {{ font-size: 16px; font-weight: bold; margin-bottom: 10px; }}
                    .row {{ display: flex; margin-bottom: 5px; }}
                    .label {{ width: 120px; font-weight: bold; }}
                    .value {{ flex: 1; }}
                    .checkbox {{ margin-right: 20px; }}
                    .comments {{ margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }}
                    .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
                    @media print {{
                        body {{ margin: 0; }}
                        button {{ display: none; }}
                    }}
                </style>
            </head>
            <body>
                <div class="header">SAMPLE CARD - {quotation.customer_item_code or f'ID-{quotation_id}'}</div>

                <div class="section">
                    <div class="section-title">CUSTOMER INFORMATION</div>
                    <div class="row">
                        <div class="label">Customer:</div>
                        <div class="value">{quotation.customer_name or 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="label">Contact:</div>
                        <div class="value">{quotation.contact_person or 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="label">Item Code:</div>
                        <div class="value">{quotation.customer_item_code or 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="label">By:</div>
                        <div class="value">{quotation.email or 'N/A'}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">PRODUCT SPECIFICATIONS</div>
                    <div class="row">
                        <div class="label">Dimensions:</div>
                        <div class="value">{quotation.dimensions or 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="label">Quality:</div>
                        <div class="value">{quotation.quality or 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="label">Surface:</div>
                        <div class="value">{quotation.surface or 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="label">Print:</div>
                        <div class="value">{quotation.print_method or 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="label">Thickness:</div>
                        <div class="value">{quotation.thickness or 'N/A'}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">PRODUCTION DETAILS</div>
                    <div class="row">
                        <div class="label">Colors:</div>
                        <div class="value">{quotation.num_colors or 0} colors</div>
                    </div>
                    <div class="row">
                        <div class="label">Created:</div>
                        <div class="value">{quotation.created_at.strftime('%Y-%m-%d') if quotation.created_at else 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="label">Revision:</div>
                        <div class="value">#{quotation.revision_count or 0}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">NOTES & INSTRUCTIONS</div>
                    <div class="row">
                        <div class="checkbox">☐ Sample approved</div>
                        <div class="checkbox">☐ Modifications required</div>
                        <div class="checkbox">☐ Proceed to production</div>
                    </div>
                    <div class="row">
                        <div class="checkbox">☐ Additional samples needed</div>
                    </div>
                    <div class="comments">
                        Comments: _______________________________________________
                    </div>
                </div>

                <div class="footer">
                    Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Version: v1.4.52
                </div>

                <button onclick="window.print()" style="margin-top: 20px; padding: 10px;">Print as PDF</button>
            </body>
            </html>
            """

            session.close()
            response = make_response(html_content)
            response.headers['Content-Type'] = 'text/html'
            print(f"[SUCCESS] HTML Sample Card generated for quotation {quotation_id}")
            return response

        except Exception as e:
            print(f"[ERROR] HTML Sample Card generation failed: {e}")
            import traceback
            traceback.print_exc()

        # Alternative: Create a simple text-based PDF using basic libraries
        print("[INFO] Creating simple PDF using basic approach")
        try:
            from io import BytesIO

            # Create a simple PDF-like content (we'll use a basic approach)
            # Generate HTML content first
            html_content = generate_sample_card_html(quotation)

            if html_content:
                # For now, let's create a simple text file that browsers will download as PDF
                # This is a temporary solution until we get proper PDF libraries working

                # Extract key information from quotation for simple PDF
                pdf_content = f"""SAMPLE CARD - {quotation.customer_item_code or f'ID-{quotation_id}'}

CUSTOMER INFORMATION
Customer: {quotation.customer_name or 'N/A'}
Contact: {quotation.contact_person or 'N/A'}
Item Code: {quotation.customer_item_code or 'N/A'}
By: {quotation.email or 'N/A'}

PRODUCT SPECIFICATIONS
Dimensions: {quotation.dimensions or 'N/A'}
Quality: {quotation.quality or 'N/A'}
Surface: {quotation.surface or 'N/A'}
Print: {quotation.print_method or 'N/A'}
Thickness: {quotation.thickness or 'N/A'}

PRODUCTION DETAILS
Colors: {quotation.num_colors or 0} colors
Created: {quotation.created_at.strftime('%Y-%m-%d') if quotation.created_at else 'N/A'}
Revision: #{quotation.revision_count or 0}

NOTES & INSTRUCTIONS
[ ] Sample approved    [ ] Modifications required    [ ] Proceed to production
[ ] Additional samples needed

Comments: _______________________________________________

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Version: v1.4.48
"""

                # Convert to bytes and return as text file (since we don't have proper PDF libraries)
                pdf_bytes = pdf_content.encode('utf-8')
                session.close()

                response = make_response(pdf_bytes)
                response.headers['Content-Type'] = 'application/octet-stream'
                response.headers['Content-Disposition'] = f'attachment; filename="Sample_Card_{quotation.customer_item_code or quotation_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf"'
                print(f"[SUCCESS] Simple Sample Card text file generated for quotation {quotation_id}")
                return response

        except Exception as e:
            print(f"[ERROR] Simple PDF generation failed: {e}")
            import traceback
            traceback.print_exc()

        # Final fallback: Return HTML with auto-print and close
        print("[INFO] Using HTML with auto-print fallback")
        html_content = generate_sample_card_html(quotation)
        session.close()

        if not html_content:
            return jsonify({'error': 'Failed to generate sample card'}), 500

        # Modify HTML to auto-print and close window
        html_content = html_content.replace(
            'window.onload = function() {',
            '''window.onload = function() {
                // Auto-print immediately
                setTimeout(function() {
                    window.print();
                    // Close window after printing (if opened in new tab)
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                }, 100);'''
        )

        response = make_response(html_content)
        response.headers['Content-Type'] = 'text/html'
        print(f"[INFO] Sample Card HTML with auto-print generated for quotation {quotation_id}")
        return response

    except Exception as e:
        logger.error(f"Error generating sample card PDF: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/test-sample-card')
def test_sample_card():
    """Test endpoint to check sample card generation"""
    try:
        return jsonify({
            'reportlab_available': REPORTLAB_AVAILABLE,
            'message': 'Sample card system ready',
            'fallback': 'HTML version available' if not REPORTLAB_AVAILABLE else 'PDF version available'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Register blueprints
app.register_blueprint(ht_database_bp)
app.register_blueprint(quotation_bp)

# Call all initializers
if __name__ == '__main__':
    print('INSIDE MAIN BLOCK')
    print('About to start Flask app')
    try:
        init_db()
        init_option_db()
        init_user_db()
        set_admin_level()
        # Remove duplicate blueprint registrations
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        app.config['SESSION_COOKIE_SECURE'] = False  # Only True if using HTTPS
        print("=== TEST ROUTE PRINT ===")
        print("=== ROUTES ===")
        for rule in app.url_map.iter_rules():
            print(rule)
        print("==============")
        # Debug print for template folder and file existence
        print('TEMPLATE FOLDER:', app.template_folder)
        print('TEMPLATES DIR EXISTS:', os.path.exists(app.template_folder))
        print('quotation2_view_select.html EXISTS:', os.path.exists(os.path.join(app.template_folder, 'quotation2_view_select.html')))
        app.run(host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        print('ERROR STARTING SERVER:', e) 

# SQLite pragma setup will be handled per connection