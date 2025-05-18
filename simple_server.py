from flask import Flask, request, jsonify, render_template_string, redirect
import os
import sqlite3
import pandas as pd
import csv
from datetime import datetime

app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def index():
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Heat Transfer Database CSV Upload</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .form-container { border: 1px solid #ccc; padding: 20px; border-radius: 5px; }
            .btn { background-color: #4CAF50; color: white; padding: 10px 15px; border: none; cursor: pointer; }
        </style>
    </head>
    <body>
        <h1>Heat Transfer Database CSV Upload</h1>
        <div class="form-container">
            <form action="/upload_csv" method="post" enctype="multipart/form-data">
                <p>Select a CSV file to upload:</p>
                <input type="file" name="file" required accept=".csv">
                <br><br>
                <button type="submit" class="btn">Upload CSV</button>
            </form>
        </div>
    </body>
    </html>
    """
    return render_template_string(html)

@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Only CSV files (.csv) are allowed'}), 400

    try:
        # Save file with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'upload_{timestamp}_{os.path.basename(file.filename)}'
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Process the CSV file
        result = process_csv(filepath)
        
        return redirect('/success')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/success')
def success():
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Upload Success</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .success { background-color: #dff0d8; border: 1px solid #d6e9c6; padding: 15px; border-radius: 4px; }
        </style>
    </head>
    <body>
        <h1>Upload Successful!</h1>
        <div class="success">
            <p>Your CSV file has been uploaded successfully.</p>
            <p>To import this data into your database, run the fix_import.py script.</p>
            <p><a href="/">Upload another file</a></p>
        </div>
    </body>
    </html>
    """
    return render_template_string(html)

def process_csv(filepath):
    # Create/connect to database
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    # Create table if not exists
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ht_database (
        "Quality" TEXT,
        "Flat or Raised" TEXT,
        "Direct or Reverse" TEXT,
        "Thickness" REAL,
        "# of Colors" INTEGER,
        "Length" REAL,
        "Width" REAL,
        "Price" REAL
    )
    ''')
    
    # Return success
    return {'success': True, 'file_path': filepath}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 