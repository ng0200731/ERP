#!/usr/bin/env python3
"""
Test script to verify the new Sample Card layout is working correctly
"""

import requests
import re
from datetime import datetime

def test_sample_card_layout():
    """Test the new sample card layout"""
    print("🔍 Testing New Sample Card Layout v1.4.13...")
    print("=" * 60)
    
    # Test URL - assuming quotation ID 15 exists
    test_url = "http://127.0.0.1:5000/quotation/sample-card/15"
    
    try:
        # Make request to sample card endpoint
        response = requests.get(test_url)
        
        if response.status_code == 200:
            print("✅ Sample Card endpoint accessible")
            
            # Check if it's HTML content (fallback mode)
            if 'text/html' in response.headers.get('content-type', ''):
                html_content = response.text
                print("📄 HTML fallback mode detected")
                
                # Test for new layout elements
                layout_tests = [
                    ("Header Section", "SAMPLE CARD"),
                    ("Company Name", "Fu Chang Hong Kong"),
                    ("Customer Information", "CUSTOMER INFORMATION"),
                    ("Product Specifications", "PRODUCT SPECIFICATIONS"),
                    ("Production Details", "PRODUCTION DETAILS"),
                    ("Notes Section", "NOTES & INSTRUCTIONS"),
                    ("Version Tracking", "v1.4.13"),
                    ("System Footer", "Fu Chang Hong Kong - Sample Card System")
                ]
                
                print("\n🎯 Layout Element Tests:")
                print("-" * 40)
                
                for test_name, search_text in layout_tests:
                    if search_text in html_content:
                        print(f"✅ {test_name}: Found")
                    else:
                        print(f"❌ {test_name}: Missing")
                
                # Test for removed elements (should NOT be present)
                removed_tests = [
                    ("STATUS & TRACKING", "STATUS & TRACKING"),
                    ("Old Table Format", '<th>SUBMISSION DETAILS</th>')
                ]
                
                print("\n🚫 Removed Element Tests:")
                print("-" * 40)
                
                for test_name, search_text in removed_tests:
                    if search_text not in html_content:
                        print(f"✅ {test_name}: Correctly removed")
                    else:
                        print(f"❌ {test_name}: Still present (ERROR)")
                
                # Test for new layout structure
                structure_tests = [
                    ("Flexbox Layout", "display: flex"),
                    ("Header Height", "height: 20%"),
                    ("Main Content Height", "height: 70%"),
                    ("Footer Height", "height: 10%"),
                    ("Two Column Layout", "left-column"),
                    ("Right Column", "right-column"),
                    ("Production Details Vertical", "production-details"),
                    ("Compact Product Specs", "product-specs")
                ]
                
                print("\n📐 Layout Structure Tests:")
                print("-" * 40)
                
                for test_name, search_text in structure_tests:
                    if search_text in html_content:
                        print(f"✅ {test_name}: Implemented")
                    else:
                        print(f"❌ {test_name}: Missing")
                
                # Check version consistency
                version_pattern = r'v1\.4\.13'
                version_matches = re.findall(version_pattern, html_content)
                
                print(f"\n📊 Version Tracking:")
                print("-" * 40)
                print(f"✅ Version v1.4.13 found {len(version_matches)} times")
                
                if len(version_matches) >= 1:
                    print("✅ Version tracking working correctly")
                else:
                    print("❌ Version tracking missing")
                
            elif 'application/pdf' in response.headers.get('content-type', ''):
                print("📄 PDF mode detected")
                print("✅ PDF generation working")
                print(f"📊 PDF size: {len(response.content)} bytes")
                
            else:
                print(f"❓ Unknown content type: {response.headers.get('content-type')}")
                
        else:
            print(f"❌ Request failed with status: {response.status_code}")
            print(f"Response: {response.text[:200]}...")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is it running on http://127.0.0.1:5000?")
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")

def test_html_pages_version():
    """Test version consistency in HTML pages"""
    print("\n🌐 Testing HTML Pages Version...")
    print("=" * 60)
    
    pages_to_test = [
        ("Dashboard", "http://127.0.0.1:5000/"),
        ("Quotation Records", "http://127.0.0.1:5000/view_quotations_simple")
    ]
    
    for page_name, url in pages_to_test:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                if 'v1.4.13' in response.text:
                    print(f"✅ {page_name}: Version v1.4.13 found")
                else:
                    print(f"❌ {page_name}: Version v1.4.13 missing")
            else:
                print(f"❌ {page_name}: HTTP {response.status_code}")
        except Exception as e:
            print(f"❌ {page_name}: Error - {str(e)}")

def main():
    """Main test function"""
    print("🚀 Sample Card Layout Verification Test")
    print("=" * 60)
    print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎯 Target Version: v1.4.13")
    print(f"📋 Testing: New 20%-70%-10% layout structure")
    print()
    
    # Test sample card layout
    test_sample_card_layout()
    
    # Test HTML pages version
    test_html_pages_version()
    
    print("\n" + "=" * 60)
    print("🎉 Layout Verification Test Complete!")
    print()
    print("📋 Expected Results:")
    print("✅ All layout elements should be found")
    print("✅ STATUS & TRACKING should be removed")
    print("✅ Version v1.4.13 should be present")
    print("✅ New flexbox structure should be implemented")
    print()
    print("🔄 If tests fail:")
    print("1. Refresh browser cache (Ctrl+F5)")
    print("2. Restart server if needed")
    print("3. Check server logs for errors")

if __name__ == "__main__":
    main()
