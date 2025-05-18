from flask import Flask, request, redirect, flash
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'minimal-app-secret-key'

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def index():
    """Serve a minimal HTML page with upload form"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Minimal CSV Upload</title>
        <style>
            body { font-family: Arial; padding: 20px; }
            .form-container { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
            .success { color: green; }
            .error { color: red; }
        </style>
    </head>
    <body>
        <h1>Minimal CSV Upload</h1>
        
        <div class="form-container">
            <form action="/upload" method="POST" enctype="multipart/form-data">
                <p>Select a CSV file to upload:</p>
                <input type="file" name="file" accept=".csv">
                <button type="submit">Upload File</button>
            </form>
        </div>
        
        <div id="status">
        </div>
    </body>
    </html>
    """

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload"""
    if 'file' not in request.files:
        return '<div class="error">No file part</div>'
    
    file = request.files['file']
    if file.filename == '':
        return '<div class="error">No file selected</div>'
    
    if not file.filename.endswith('.csv'):
        return '<div class="error">File must be a CSV file</div>'
    
    try:
        # Save file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        temp_path = os.path.join(UPLOAD_FOLDER, f'minimal_{timestamp}.csv')
        file.save(temp_path)
        
        return f"""
        <html>
        <head>
            <title>Upload Success</title>
            <style>
                body {{ font-family: Arial; padding: 20px; }}
                .success {{ color: green; padding: 10px; border: 1px solid green; }}
            </style>
        </head>
        <body>
            <h1>Upload Successful</h1>
            <div class="success">
                <p>File "{file.filename}" was uploaded successfully.</p>
                <p>Saved to: {temp_path}</p>
            </div>
            <p><a href="/">Back to upload form</a></p>
        </body>
        </html>
        """
    except Exception as e:
        return f'<div class="error">Error: {str(e)}</div>'

if __name__ == '__main__':
    print("Starting minimal server on http://localhost:5001")
    app.run(debug=True, host='0.0.0.0', port=5001) 