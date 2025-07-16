#!/usr/bin/env python3
"""
Test script to verify quotation access control implementation
Version: v1.4.02
"""

import sqlite3
import json

def test_access_control():
    """Test the access control logic for quotation records"""
    
    print("=== Quotation Access Control Test v1.4.02 ===\n")
    
    # Connect to database
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all quotations with creator info
    cursor.execute("""
        SELECT id, customer_name, creator_email, status, created_at 
        FROM quotations 
        ORDER BY id
    """)
    
    quotations = cursor.fetchall()
    
    print(f"Total quotations in database: {len(quotations)}")
    print("\nQuotation creators:")
    
    creators = {}
    for q in quotations:
        creator = q['creator_email'] or 'Unknown'
        if creator not in creators:
            creators[creator] = 0
        creators[creator] += 1
    
    for creator, count in creators.items():
        print(f"  - {creator}: {count} quotations")
    
    print("\n=== Access Control Simulation ===")
    
    # Test Level 1 access (eric.brilliant@gmail.com)
    test_user = 'eric.brilliant@gmail.com'
    level1_quotations = [q for q in quotations if q['creator_email'] == test_user]
    
    print(f"\nLevel 1 User ({test_user}):")
    print(f"  Can see: {len(level1_quotations)} quotations (only own)")
    
    # Test Level 3 access (admin)
    print(f"\nLevel 3 User (Admin):")
    print(f"  Can see: {len(quotations)} quotations (all)")
    
    # Show sample data
    print(f"\nSample quotations for {test_user}:")
    for q in level1_quotations[:3]:  # Show first 3
        print(f"  ID {q['id']}: {q['customer_name']} - {q['status']}")
    
    conn.close()
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_access_control()
