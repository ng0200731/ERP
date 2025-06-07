from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
import pandas as pd
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import os
import logging
import random
import string

logger = logging.getLogger(__name__)

quotation_bp = Blueprint('quotation', __name__)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

Base = declarative_base()

def generate_item_code():
    """Generate a random alphanumeric code in format: ABC-12345"""
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    numbers = ''.join(random.choices(string.digits, k=5))
    return f"{letters}-{numbers}"

class Quotation(Base):
    __tablename__ = 'quotations'
    
    id = Column(Integer, primary_key=True)
    customer_name = Column(String(100), nullable=False)
    key_person_name = Column(String(100), nullable=False)
    customer_item_code = Column(String(20), nullable=False)
    creator_email = Column(String(100))
    quality = Column(String(50))
    flat_or_raised = Column(String(20))
    direct_or_reverse = Column(String(20))
    thickness = Column(Float, nullable=False, default=0.0)
    num_colors = Column(Integer, nullable=False, default=0)
    length = Column(Float, nullable=False, default=0.0)
    width = Column(Float, nullable=False, default=0.0)
    price = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    artwork_image = Column(String(255))
    status = Column(String(50), nullable=True, default='-')  # Quotation status
    quotation_block = Column(String, nullable=True)  # Stores the full quotation block as text
    action = Column(String(50), nullable=True, default='-')  # Action column v1.3.09

def get_db():
    try:
        engine = create_engine('sqlite:///database.db')
        Base.metadata.create_all(engine)  # Create tables if they don't exist
        logger.info('Database initialized and tables created successfully')
        return engine
    except Exception as e:
        logger.error(f'Error initializing database: {e}')
        raise

# Add some dummy data function
def add_dummy_data():
    try:
        engine = get_db()
        from sqlalchemy.orm import sessionmaker
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Check if table is empty
        existing_count = session.query(Quotation).count()
        if existing_count > 0:
            session.close()
            print(f"Found {existing_count} existing records, skipping dummy data")
            return
        
        # Add dummy records only if table is empty
        dummy_data = [
            {
                'customer_name': 'ABC Company',
                'key_person_name': 'John Smith (Sales Manager)',
                'customer_item_code': generate_item_code(),
                'creator_email': 'eric.brilliant@gmail.com',
                'quality': 'PU',
                'flat_or_raised': 'Flat',
                'direct_or_reverse': 'Direct',
                'thickness': 0.8,
                'num_colors': 2,
                'length': 360,
                'width': 58,
                'price': 150.00,
                'created_at': datetime(2024, 1, 15, 9, 30),
                'last_updated': datetime(2024, 1, 15, 14, 45)
            },
            {
                'customer_name': 'XYZ Industries',
                'key_person_name': 'Mary Johnson (Production)',
                'customer_item_code': generate_item_code(),
                'creator_email': 'david.smith@company.com',
                'quality': 'Silicon',
                'flat_or_raised': 'Raised',
                'direct_or_reverse': 'Reverse',
                'thickness': 1.2,
                'num_colors': 3,
                'length': 390,
                'width': 160,
                'price': 280.50,
                'created_at': datetime(2024, 2, 1, 11, 15),
                'last_updated': datetime(2024, 2, 3, 16, 20)
            },
            {
                'customer_name': 'Global Tech',
                'key_person_name': 'Robert Chen (Purchasing)',
                'customer_item_code': generate_item_code(),
                'creator_email': 'sarah.jones@company.com',
                'quality': 'PU',
                'flat_or_raised': 'Flat',
                'direct_or_reverse': 'Direct',
                'thickness': 0.5,
                'num_colors': 1,
                'length': 244,
                'width': 156,
                'price': 95.75,
                'created_at': datetime(2024, 3, 10, 8, 0),
                'last_updated': datetime(2024, 3, 10, 8, 0)
            }
        ]
        
        for data in dummy_data:
            quotation = Quotation(**data)
            session.add(quotation)
        
        session.commit()
        session.close()
        print("Dummy data added successfully")
    except Exception as e:
        print(f"Error adding dummy data: {e}")

def clean_duplicate_quotations():
    """Clean up duplicate quotations keeping only the most recently updated record from each set of duplicates"""
    try:
        engine = get_db()
        from sqlalchemy.orm import sessionmaker
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Find all quotations
        all_quotations = session.query(Quotation).order_by(Quotation.last_updated.desc()).all()
        seen_keys = set()
        duplicates_to_delete = []
        
        for quotation in all_quotations:
            # Create a tuple of key fields that should be unique (only customer and key person)
            key = (
                quotation.customer_name,
                quotation.key_person_name
            )
            
            if key in seen_keys:
                duplicates_to_delete.append(quotation.id)
            else:
                seen_keys.add(key)
        
        # Delete duplicates if any found
        if duplicates_to_delete:
            delete_count = session.query(Quotation).filter(Quotation.id.in_(duplicates_to_delete)).delete(synchronize_session=False)
            session.commit()
            print(f"Cleaned up {delete_count} duplicate records")
        else:
            print("No duplicates found")
            
        session.close()
        return True
    except Exception as e:
        print(f"Error cleaning duplicates: {e}")
        if 'session' in locals():
            session.close()
        return False

def recreate_quotations_table():
    """Drop and recreate the quotations table with the new schema (no unique constraint)"""
    try:
        engine = get_db()
        # Drop existing table
        Base.metadata.drop_all(engine, tables=[Quotation.__table__])
        # Create table with new schema (no unique constraint)
        Base.metadata.create_all(engine, tables=[Quotation.__table__])
        print("Successfully recreated quotations table with new schema (no unique constraint)")
        return True
    except Exception as e:
        print(f"Error recreating table: {e}")
        return False

# Initialize database connection
try:
    engine = get_db()
    logger.info('Database connection initialized successfully')
except Exception as e:
    logger.error(f'Error initializing database connection: {e}')

@quotation_bp.route('/quotation')
@login_required
def quotation_database():
    if not current_user.permission_level >= 3:
        flash('You do not have permission to access this page.', 'error')
        return redirect(url_for('index'))
    return render_template('quotation_database.html')

@quotation_bp.route('/quotation/upload', methods=['POST'])
@login_required
def upload_quotation():
    if not current_user.permission_level >= 3:
        return jsonify({'error': 'Permission denied'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Only CSV files are allowed'}), 400

    try:
        # Save file temporarily
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        temp_path = os.path.join(UPLOAD_FOLDER, f'quotation_{timestamp}.csv')
        file.save(temp_path)

        # Read CSV file
        df = pd.read_csv(temp_path)
        
        # Clean up column names
        df.columns = [str(col).strip().lower().replace(' ', '_') for col in df.columns]
        
        # Ensure required columns exist
        required_columns = ['quality', 'flat_or_raised', 'direct_or_reverse', 'thickness', 
                          'num_colors', 'length', 'width', 'price']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
        
        # Convert numeric columns
        numeric_columns = ['thickness', 'num_colors', 'length', 'width', 'price']
        for col in numeric_columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Save to database
        engine = get_db()
        df.to_sql('quotations', engine, if_exists='replace', index=False)
        
        # Clean up temporary file
        os.remove(temp_path)
        
        return jsonify({'message': 'Heat transfer database updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quotation_bp.route('/quotation/data')
@login_required
def get_quotation_data():
    if not current_user.permission_level >= 3:
        return jsonify({'error': 'Permission denied'}), 403

    try:
        engine = get_db()
        df = pd.read_sql_table('quotations', engine)
        return jsonify(df.to_dict('records'))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quotation_bp.route('/quotation/search')
@login_required
def search_quotation():
    if not current_user.permission_level >= 3:
        return jsonify({'error': 'Permission denied'}), 403

    query = request.args.get('query', '')
    try:
        engine = get_db()
        df = pd.read_sql_table('quotations', engine)
        
        # Search in quality and type fields
        mask = (df['quality'].str.contains(query, case=False, na=False) |
                df['flat_or_raised'].str.contains(query, case=False, na=False) |
                df['direct_or_reverse'].str.contains(query, case=False, na=False))
        
        results = df[mask].to_dict('records')
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quotation_bp.route('/quotation/generate_code')
def generate_new_code():
    """API endpoint to generate a new item code"""
    return jsonify({'code': generate_item_code()}) 