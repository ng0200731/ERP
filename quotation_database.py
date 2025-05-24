from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
import pandas as pd
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

quotation_bp = Blueprint('quotation', __name__)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

Base = declarative_base()

class Quotation(Base):
    __tablename__ = 'quotations'
    
    id = Column(Integer, primary_key=True)
    quality = Column(String(50))
    flat_or_raised = Column(String(20))
    direct_or_reverse = Column(String(20))
    thickness = Column(Float)
    num_colors = Column(Integer)
    length = Column(Float)
    width = Column(Float)
    price = Column(Float)
    last_updated = Column(DateTime, default=datetime.utcnow)

def get_db():
    try:
        engine = create_engine('sqlite:///database.db')
        Base.metadata.create_all(engine)  # Create tables if they don't exist
        logger.info('Database initialized and tables created successfully')
        return engine
    except Exception as e:
        logger.error(f'Error initializing database: {e}')
        raise

# Initialize database on module load
try:
    engine = get_db()
    Base.metadata.create_all(engine)
    logger.info('Database initialized successfully')
except Exception as e:
    logger.error(f'Error initializing database: {e}')

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