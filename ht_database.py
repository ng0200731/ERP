from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime
import os

ht_database_bp = Blueprint('ht_database', __name__)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def get_db():
    # Replace with your actual database connection string
    return create_engine('sqlite:///database.db')

@ht_database_bp.route('/ht_database')
@login_required
def ht_database():
    if not current_user.permission_level >= 3:
        flash('You do not have permission to access this page.', 'error')
        return redirect(url_for('index'))
    return render_template('ht_database.html')

@ht_database_bp.route('/ht_database/upload', methods=['POST'])
@login_required
def upload_ht_database():
    if not current_user.permission_level >= 3:
        return jsonify({'error': 'Permission denied'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not file.filename.endswith('.xlsx'):
        return jsonify({'error': 'Only Excel files (.xlsx) are allowed'}), 400

    try:
        # Save file temporarily
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        temp_path = os.path.join(UPLOAD_FOLDER, f'ht_database_{timestamp}.xlsx')
        file.save(temp_path)

        # Read Excel file
        df = pd.read_excel(temp_path)
        
        # Clean up column names
        df.columns = [str(col).strip().lower().replace(' ', '_') for col in df.columns]
        
        # Save to database
        engine = get_db()
        df.to_sql('ht_database', engine, if_exists='replace', index=False)
        
        # Clean up temporary file
        os.remove(temp_path)
        
        return jsonify({'message': 'Database updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ht_database_bp.route('/ht_database/data')
@login_required
def get_ht_database():
    if not current_user.permission_level >= 3:
        return jsonify({'error': 'Permission denied'}), 403

    try:
        engine = get_db()
        df = pd.read_sql_table('ht_database', engine)
        return jsonify(df.to_dict('records'))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ht_database_bp.route('/ht_database/update', methods=['POST'])
@login_required
def update_ht_database():
    if not current_user.permission_level >= 3:
        return jsonify({'error': 'Permission denied'}), 403

    try:
        data = request.json
        df = pd.DataFrame(data)
        engine = get_db()
        df.to_sql('ht_database', engine, if_exists='replace', index=False)
        return jsonify({'message': 'Database updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500 