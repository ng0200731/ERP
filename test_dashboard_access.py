#!/usr/bin/env python3
"""
Test script to verify dashboard access control implementation
Version: v1.4.03
"""

import sqlite3
import json

def test_dashboard_access():
    """Test the dashboard access control logic"""
    
    print("=== Dashboard Access Control Test v1.4.03 ===\n")
    
    # Connect to database
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Test data for different users
    test_users = [
        {'email': 'weiwu@fuchanghk.com', 'level': 1},
        {'email': 'eric.brilliant@gmail.com', 'level': 3}
    ]
    
    for user in test_users:
        print(f"=== Testing User: {user['email']} (Level {user['level']}) ===")
        
        if user['level'] == 1:
            # Level 1: Only own quotations (case-insensitive)
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'submitted to customer' THEN 1 END) as submitted,
                    COUNT(CASE WHEN status = 'price approved' THEN 1 END) as approved,
                    COUNT(CASE WHEN status = 'sampling' THEN 1 END) as sampling
                FROM quotations
                WHERE LOWER(creator_email) = LOWER(?)
            """, (user['email'],))
        else:
            # Level 3: All quotations
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'submitted to customer' THEN 1 END) as submitted,
                    COUNT(CASE WHEN status = 'price approved' THEN 1 END) as approved,
                    COUNT(CASE WHEN status = 'sampling' THEN 1 END) as sampling
                FROM quotations
            """)
        
        result = cursor.fetchone()
        
        print(f"  📋 Total Quotations: {result['total']}")
        print(f"  📤 Quoted to Customer: {result['submitted']}")
        print(f"  ✅ Price Approved: {result['approved']}")
        print(f"  🔬 Sampling: {result['sampling']}")
        
        access_type = "Own records only" if user['level'] == 1 else "All records"
        print(f"  🔐 Access Type: {access_type}")
        print()
    
    # Show creator breakdown
    print("=== Creator Breakdown ===")
    cursor.execute("""
        SELECT creator_email, COUNT(*) as count
        FROM quotations 
        GROUP BY creator_email
        ORDER BY count DESC
    """)
    
    creators = cursor.fetchall()
    for creator in creators:
        email = creator['creator_email'] or 'Unknown'
        print(f"  {email}: {creator['count']} quotations")
    
    conn.close()
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_dashboard_access()
