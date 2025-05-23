print("=== ht_database.py loaded ===")
from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for, session
from flask_login import login_required, current_user
import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime
import os
import traceback

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
        print("=== DEBUG: Starting File Upload ===")
        # Save file temporarily
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        temp_path = os.path.join(UPLOAD_FOLDER, f'ht_database_{timestamp}.xlsx')
        file.save(temp_path)
        print(f"File saved to: {temp_path}")

        # Read Excel file
        print("Reading Excel file...")
        df = pd.read_excel(temp_path)
        print(f"Excel file read: {len(df)} rows")
        
        # Clean up column names
        df.columns = [str(col).strip().lower().replace(' ', '_') for col in df.columns]
        print("Columns after cleanup:", df.columns.tolist())
        
        # Save to database
        print("Saving to database...")
        engine = get_db()
        df.to_sql('ht_database', engine, if_exists='replace', index=False)
        
        # Clean up temporary file
        os.remove(temp_path)
        print("Temporary file removed")
        
        # Verify the data was saved
        print("Verifying saved data...")
        verification_df = pd.read_sql_table('ht_database', engine)
        row_count = len(verification_df)
        print(f"Verified {row_count} rows in database")
        
        print("=== DEBUG: Upload Complete ===")
        return jsonify({
            'message': 'Database updated successfully',
            'row_count': row_count
        })
    except Exception as e:
        print(f"Error in upload_ht_database: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@ht_database_bp.route('/ht_database/data')
def get_ht_database():
    try:
        print("=== DEBUG: Getting HT Database Data ===")
        engine = get_db()
        df = pd.read_sql_table('ht_database', engine)
        print(f"Data loaded from database: {len(df)} rows")
        
        # Map columns to frontend keys
        column_mapping = {
            'Quality': 'quality',
            'Flat or Raised': 'flat_or_raised',
            'Direct or Reverse': 'direct_or_reverse',
            'Thickness': 'thickness',
            '# of Colors': 'num_colors',
            'Length': 'length',
            'Width': 'width',
            'Price': 'price'
        }
        
        # Rename columns
        df = df.rename(columns=column_mapping)
        print("Columns after mapping:", df.columns.tolist())
        
        # Convert to records and ensure all required fields exist
        records = df.to_dict('records')
        print(f"Converted to {len(records)} records")
        
        # Ensure all required fields exist
        required_fields = ['quality', 'flat_or_raised', 'direct_or_reverse', 'thickness', 'num_colors', 'length', 'width', 'price']
        for record in records:
            for field in required_fields:
                if field not in record:
                    record[field] = None

        # Add a timestamp
        return jsonify({
            'timestamp': datetime.now().isoformat(),
            'records': records
        })
    except Exception as e:
        print(f"Error in get_ht_database: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@ht_database_bp.route('/ht_database/update', methods=['POST'])
def update_ht_database():
    # No login or permission check: anyone can update
    try:
        print("=== DEBUG SESSION INFO ===")
        print("session keys:", list(session.keys()))
        print("current_user.is_authenticated:", getattr(current_user, 'is_authenticated', None))
        print("current_user:", getattr(current_user, 'email', None), getattr(current_user, 'permission_level', None))
        data = request.json
        print('=== DATA RECEIVED FOR UPDATE ===')
        print('Raw data:', data)
        print('Type of data:', type(data))
        df = pd.DataFrame(data)
        print('DataFrame created:')
        print(df.head())
        print('DataFrame columns:', df.columns.tolist())
        if df.empty or len(df.columns) == 0:
            return jsonify({'error': 'No valid data to save. Please check your pasted data.'}), 400
        engine = get_db()
        mode = request.args.get('mode', 'overwrite')
        print('Mode:', mode)
        if mode == 'append':
            # Load existing data, append, and save
            try:
                existing = pd.read_sql_table('ht_database', engine)
                print('Existing data loaded for append. Existing shape:', existing.shape)
                df = pd.concat([existing, df], ignore_index=True)
                print('Concatenated DataFrame shape:', df.shape)
            except Exception as e:
                print('No existing table or error loading existing data:', e)
                pass  # If table doesn't exist, just use new data
            print('Saving (append mode) DataFrame to database...')
            df.to_sql('ht_database', engine, if_exists='replace', index=False)
        else:
            print('Saving (overwrite mode) DataFrame to database...')
            df.to_sql('ht_database', engine, if_exists='replace', index=False)
        print('Database update complete.')
        return jsonify({'message': 'Database updated successfully'})
    except Exception as e:
        print("=== ERROR in /ht_database/update ===")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

    expected_columns = ['quality', 'flat_or_raised', 'direct_or_reverse', 'thickness', 'num_colors', 'length', 'width', 'price']
    if list(df.columns) != expected_columns:
        return jsonify({'error': f'Column headers do not match expected format. Required: {expected_columns}, got: {list(df.columns)}'}), 400 