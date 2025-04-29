import sqlite3
import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/check/<email>')
def check_user(email):
    """Check if a user exists in the database"""
    conn = sqlite3.connect('customers.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id, email, is_approved FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if user:
        result = {'exists': True, 'user': dict(user)}
    else:
        result = {'exists': False}
    
    conn.close()
    return jsonify(result)

@app.route('/delete/<email>')
def delete_user(email):
    """Delete a user from the database"""
    conn = sqlite3.connect('customers.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id, email, is_approved FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if user:
        user_id = user['id']
        user_data = dict(user)
        
        # Delete the user
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        rows_affected = cursor.rowcount
        
        result = {
            'success': rows_affected > 0,
            'user_deleted': user_data,
            'rows_affected': rows_affected
        }
    else:
        result = {'success': False, 'error': 'User not found'}
    
    conn.close()
    return jsonify(result)

@app.route('/users')
def list_users():
    """List all users in the database"""
    conn = sqlite3.connect('customers.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, email, is_approved FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return jsonify(users)

if __name__ == '__main__':
    print("Starting simple user management app on port 5001")
    app.run(host='0.0.0.0', port=5001, debug=True) 