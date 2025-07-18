#!/usr/bin/env python3
"""
Test network connectivity to email servers
"""

import socket
import sys

def test_connection(host, port, service_name):
    """Test if we can connect to a host:port"""
    print(f"🔍 Testing connection to {service_name} ({host}:{port})...")
    try:
        # Create socket with timeout
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        
        # Try to connect
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"✅ {service_name} connection successful!")
            return True
        else:
            print(f"❌ {service_name} connection failed (error code: {result})")
            return False
            
    except socket.gaierror as e:
        print(f"❌ {service_name} DNS resolution failed: {e}")
        return False
    except Exception as e:
        print(f"❌ {service_name} connection error: {e}")
        return False

def main():
    print("🌐 Network Connectivity Test for Email Services")
    print("=" * 50)
    
    # Test Gmail SMTP
    gmail_ok = test_connection('smtp.gmail.com', 587, 'Gmail SMTP')
    
    # Test 163.com SMTP  
    backup_ok = test_connection('smtp.163.com', 587, '163.com SMTP')
    
    # Test general internet connectivity
    print("\n🌍 Testing general internet connectivity...")
    google_ok = test_connection('google.com', 80, 'Google HTTP')
    
    print("\n📊 Results Summary:")
    print(f"  Gmail SMTP (smtp.gmail.com:587): {'✅ OK' if gmail_ok else '❌ FAILED'}")
    print(f"  163.com SMTP (smtp.163.com:587): {'✅ OK' if backup_ok else '❌ FAILED'}")
    print(f"  Internet connectivity: {'✅ OK' if google_ok else '❌ FAILED'}")
    
    if not google_ok:
        print("\n⚠️  No internet connectivity detected!")
        print("   Please check your network connection.")
    elif not gmail_ok and not backup_ok:
        print("\n⚠️  Both email servers are unreachable!")
        print("   This could be due to:")
        print("   - Firewall blocking SMTP ports (587)")
        print("   - Corporate network restrictions")
        print("   - ISP blocking email ports")
    elif gmail_ok and backup_ok:
        print("\n🎯 Both email servers are reachable!")
        print("   The email fallback system should work correctly.")
    else:
        working = "Gmail" if gmail_ok else "163.com"
        failing = "163.com" if gmail_ok else "Gmail"
        print(f"\n⚠️  {working} is reachable but {failing} is not.")
        print("   The fallback system will still provide backup capability.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
