from sqlalchemy import create_engine, text
import json
from datetime import datetime
from flask import Flask, render_template_string

app = Flask(__name__)

def datetime_handler(x):
    if isinstance(x, datetime):
        return x.isoformat()
    raise TypeError(f"Object of type {type(x)} is not JSON serializable")

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Quotation Records</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .version {
            font-size: 1rem;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Quotation Records <span class="version">v1.2.21</span></h1>
        <pre>{{ data }}</pre>
    </div>
</body>
</html>
"""

@app.route('/')
def show_records():
    try:
        # Create engine
        engine = create_engine('sqlite:///database.db')
        
        # Query the data
        with engine.connect() as connection:
            result = connection.execute(text('SELECT * FROM quotations'))
            rows = [dict(row) for row in result]
            
        # Convert to JSON
        json_data = json.dumps(rows, indent=2, default=datetime_handler)
        
        return render_template_string(HTML_TEMPLATE, data=json_data)
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == '__main__':
    app.run(port=5001) 