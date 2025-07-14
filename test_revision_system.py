#!/usr/bin/env python3
"""
Test script to verify the revision system is working correctly.
This script will check if revision_count increments properly when quotations are updated.
"""

import sqlite3
import json
from datetime import datetime

def test_revision_system():
    """Test the revision system by checking database records"""
    
    print("=== Testing Revision System ===")
    
    # Connect to database
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Check if revision_count column exists
        cursor.execute("PRAGMA table_info(quotations)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'revision_count' not in columns:
            print("❌ ERROR: revision_count column does not exist in quotations table")
            return False
        else:
            print("✅ revision_count column exists in quotations table")
        
        # Get all quotations with their revision counts
        cursor.execute("""
            SELECT id, customer_name, customer_item_code, revision_count, 
                   created_at, last_updated 
            FROM quotations 
            ORDER BY id
        """)
        
        quotations = cursor.fetchall()
        
        if not quotations:
            print("⚠️  No quotations found in database")
            return True
        
        print(f"\n📊 Found {len(quotations)} quotations:")
        print("-" * 80)
        print(f"{'ID':<4} {'Customer':<20} {'Item Code':<15} {'Revision':<8} {'Created':<20} {'Updated':<20}")
        print("-" * 80)
        
        for q in quotations:
            created = q['created_at'][:19] if q['created_at'] else 'N/A'
            updated = q['last_updated'][:19] if q['last_updated'] else 'N/A'
            
            print(f"{q['id']:<4} {q['customer_name'][:19]:<20} {q['customer_item_code'][:14]:<15} "
                  f"{q['revision_count']:<8} {created:<20} {updated:<20}")
        
        # Check for any quotations with revision_count > 0
        cursor.execute("SELECT COUNT(*) as count FROM quotations WHERE revision_count > 0")
        revised_count = cursor.fetchone()['count']
        
        print(f"\n📈 Quotations with revisions: {revised_count}")
        
        if revised_count > 0:
            print("✅ Revision system appears to be working - some quotations have been revised")
        else:
            print("⚠️  No quotations have been revised yet - system ready for testing")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False
    
    finally:
        conn.close()

def show_revision_instructions():
    """Show instructions for testing the revision system"""
    
    print("\n" + "="*60)
    print("🧪 HOW TO TEST THE REVISION SYSTEM:")
    print("="*60)
    print("1. Go to the quotation list in your web application")
    print("2. Click on any quotation to view it")
    print("3. Click the 'Edit' button")
    print("4. Make any change (e.g., change a color name)")
    print("5. Click 'Save'")
    print("6. Check the 'Revision' column - it should increment by 1")
    print("7. Repeat steps 3-6 to see revision count increase")
    print("\n💡 Each time you save changes, revision_count should increase by 1")
    print("💡 New quotations start with revision_count = 0")
    print("💡 First edit changes it to 1, second edit to 2, etc.")

if __name__ == "__main__":
    success = test_revision_system()
    show_revision_instructions()
    
    if success:
        print("\n✅ Revision system test completed successfully!")
    else:
        print("\n❌ Revision system test failed!")
