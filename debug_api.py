import sqlite3
import os
import json
from datetime import datetime
import requests
import time
import hashlib

def test_api():
    # First check database directly
    db_path = os.path.join(os.path.dirname(__file__), 'customers.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Checking database directly:")
    cursor.execute("""
        SELECT q.*, c.company as company_name, u.email as created_by_name
        FROM quotations2 q
        LEFT JOIN customers c ON q.company_id = c.id
        LEFT JOIN users u ON q.created_by = u.id
    """)
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    
    print("\nDatabase records:")
    for row in rows:
        row_dict = dict(zip(columns, row))
        print(json.dumps(row_dict, indent=2))
    
    conn.close()
    
    # Now test the API endpoint
    print("\nTesting API endpoint:")
    try:
        session = requests.Session()
        
        # First check if the user exists and is approved
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, is_approved, permission_level FROM users WHERE email=?", ("eric.brilliant@gmail.com",))
        user = cursor.fetchone()
        
        if not user or not user[2]:  # user[2] is is_approved
            print("User not found or not approved. Creating and approving user...")
            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT OR REPLACE INTO users (email, is_approved, permission_level, approved_at, last_updated)
                VALUES (?, 1, 3, ?, ?)
            """, ("eric.brilliant@gmail.com", now, now))
            conn.commit()
        
        conn.close()
        
        # Now try to log in
        login_data = {'email': 'eric.brilliant@gmail.com'}
        login_response = session.post('http://localhost:5000/login', data=login_data)
        print("\nLogin Response Status:", login_response.status_code)
        
        # Check if we got redirected to enter_code.html
        if 'enter_code' in login_response.text:
            print("Redirected to enter code page")
            # Get the code from the session (in a real scenario, you'd get this from email)
            # For testing, we'll use the code that was generated (first 5 chars of sha256 hash)
            code = hashlib.sha256(("eric.brilliant@gmail.com" + str(datetime.now())).encode()).hexdigest()[:5]
            print("Using code:", code)
            
            # Submit the code
            code_response = session.post('http://localhost:5000/verify_code', data={'code': code})
            print("\nCode Verification Response Status:", code_response.status_code)
            
            if code_response.status_code == 200:
                print("Successfully verified code")
                
                # Now try the API with the session cookie
                response = session.get('http://localhost:5000/api/quotations2')
                print("\nAPI Response Status:", response.status_code)
                print("API Response Headers:", response.headers)
                try:
                    print("API Response Body:", json.dumps(response.json(), indent=2))
                except:
                    print("Raw Response:", response.text[:500])
            else:
                print("Failed to verify code")
        else:
            print("Unexpected login response")
            print("Response text:", login_response.text[:500])
    except Exception as e:
        print("Error:", str(e))

if __name__ == '__main__':
    test_api() 