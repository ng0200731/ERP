"""
Simple, self-contained Flask application for CSV uploads.
No dependencies on external templates or complex configuration.

Run with: python direct_upload.py
"""

from flask import Flask, request, redirect
import os
from datetime import datetime

app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    """Serve the upload form directly embedded in the code"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Direct CSV Upload</title>
        <style>
            body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
            .form-area { border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .success { color: green; border: 1px solid green; padding: 10px; background: #e8f5e9; }
            .error { color: red; border: 1px solid red; padding: 10px; background: #ffebee; }
            button { background: #4CAF50; color: white; padding: 10px 15px; border: none; cursor: pointer; }
        </style>
    </head>
    <body>
        <h1>Direct CSV Upload</h1>
        <p>This is a simple, reliable CSV upload form that works with any browser.</p>
        
        <div class="form-area">
            <form action="/upload" method="POST" enctype="multipart/form-data">
                <p><b>Select a CSV file to upload:</b></p>
                <p><input type="file" name="file" accept=".csv"></p>
                <p><button type="submit">Upload CSV File</button></p>
            </form>
        </div>
    </body>
    </html>
    """

@app.route('/upload', methods=['POST'])
def upload():
    """Process the uploaded file"""
    # Check if the post request has the file part
    if 'file' not in request.files:
        return error_page('No file part in the request')
    
    file = request.files['file']
    
    # If user submits an empty form
    if file.filename == '':
        return error_page('No file selected')
    
    # Check file extension
    if not file.filename.lower().endswith('.csv'):
        return error_page('Only CSV files are allowed')
    
    try:
        # Save the file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'upload_{timestamp}_{file.filename}'
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Success page
        return success_page(file.filename, filepath)
    
    except Exception as e:
        return error_page(f"Error: {str(e)}")

def success_page(filename, filepath):
    """Generate a success page"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Upload Successful</title>
        <style>
            body {{ font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }}
            .success {{ color: green; border: 1px solid green; padding: 10px; background: #e8f5e9; }}
            button {{ background: #4CAF50; color: white; padding: 10px 15px; border: none; cursor: pointer; }}
        </style>
    </head>
    <body>
        <h1>Upload Successful</h1>
        
        <div class="success">
            <p>File <b>{filename}</b> was uploaded successfully.</p>
            <p>Saved to: {filepath}</p>
        </div>
        
        <p><a href="/"><button>Upload Another File</button></a></p>
    </body>
    </html>
    """

def error_page(message):
    """Generate an error page"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Upload Error</title>
        <style>
            body {{ font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }}
            .error {{ color: red; border: 1px solid red; padding: 10px; background: #ffebee; }}
            button {{ background: #4CAF50; color: white; padding: 10px 15px; border: none; cursor: pointer; }}
        </style>
    </head>
    <body>
        <h1>Upload Error</h1>
        
        <div class="error">
            <p>{message}</p>
        </div>
        
        <p><a href="/"><button>Try Again</button></a></p>
    </body>
    </html>
    """

if __name__ == '__main__':
    print("==== Direct CSV Upload Server ====")
    print(f"Server running at http://localhost:5050")
    print(f"Press Ctrl+C to stop the server")
    app.run(host='0.0.0.0', port=5050, debug=True) 