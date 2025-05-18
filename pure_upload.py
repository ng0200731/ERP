"""
Pure Python CSV upload server - no Flask required.
Uses only standard library modules for maximum compatibility.
"""

import http.server
import socketserver
import cgi
import os
import sys
import time
from urllib.parse import parse_qs

# Configuration
PORT = 7000
UPLOAD_DIR = 'uploads'
os.makedirs(UPLOAD_DIR, exist_ok=True)

# HTML templates
UPLOAD_FORM = """
<!DOCTYPE html>
<html>
<head>
    <title>Pure Python CSV Upload</title>
    <style>
        body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
        .form-area { border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .success { color: green; border: 1px solid green; padding: 10px; background: #e8f5e9; }
        .error { color: red; border: 1px solid red; padding: 10px; background: #ffebee; }
        button { background: #4CAF50; color: white; padding: 10px 15px; border: none; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Pure Python CSV Upload</h1>
    <p>This is a basic CSV upload form that works without Flask.</p>
    
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

class UploadHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve the upload form
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(UPLOAD_FORM.encode())
        else:
            # Handle other GET requests normally
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/upload':
            content_type, params = cgi.parse_header(self.headers.get('Content-Type', ''))
            
            # Check if we have a multipart form
            if content_type == 'multipart/form-data':
                form = cgi.FieldStorage(
                    fp=self.rfile,
                    headers=self.headers,
                    environ={'REQUEST_METHOD': 'POST',
                             'CONTENT_TYPE': self.headers['Content-Type']}
                )
                
                # Check if the file field exists
                if 'file' not in form:
                    self.send_error_page('No file part in the upload')
                    return
                
                file_item = form['file']
                
                # Check if a file was selected
                if file_item.filename == '':
                    self.send_error_page('No file selected')
                    return
                
                # Check if it's a CSV file
                if not file_item.filename.lower().endswith('.csv'):
                    self.send_error_page('Only CSV files are allowed')
                    return
                
                try:
                    # Save the file
                    timestamp = time.strftime("%Y%m%d_%H%M%S")
                    filename = f'upload_{timestamp}_{file_item.filename}'
                    filepath = os.path.join(UPLOAD_DIR, filename)
                    
                    with open(filepath, 'wb') as f:
                        f.write(file_item.file.read())
                    
                    # Send success page
                    self.send_success_page(file_item.filename, filepath)
                    
                except Exception as e:
                    self.send_error_page(f"Error processing upload: {str(e)}")
            else:
                self.send_error_page('Invalid content type')
        else:
            self.send_error(404, "Not Found")
    
    def send_success_page(self, filename, filepath):
        """Send a success page"""
        html = f"""
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
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode())
    
    def send_error_page(self, message):
        """Send an error page"""
        html = f"""
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
        self.send_response(400)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode())

def run_server():
    handler = UploadHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"==== Pure Python CSV Upload Server ====")
        print(f"Server running at http://localhost:{PORT}")
        print(f"Press Ctrl+C to stop the server")
        httpd.serve_forever()

if __name__ == "__main__":
    run_server() 