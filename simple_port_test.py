#!/usr/bin/env python3
"""
Simple port connectivity test for 163.com
"""

import socket
import sys

def test_port(host, port):
    """Test if a port is reachable"""
    try:
        print(f"Testing {host}:{port}...", end=" ")
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print("✅ OPEN")
            return True
        else:
            print(f"❌ BLOCKED (error {result})")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    print("🔍 Simple Port Connectivity Test for 163.com")
    print("=" * 50)
    
    host = "smtp.163.com"
    ports = [25, 465, 587, 994]
    
    open_ports = []
    
    for port in ports:
        if test_port(host, port):
            open_ports.append(port)
    
    print(f"\n📊 Results:")
    if open_ports:
        print(f"✅ Open ports: {open_ports}")
        print(f"🎯 We can try these ports for email sending!")
    else:
        print(f"❌ All ports are blocked")
        print(f"🔒 Network/firewall is blocking all SMTP ports")
    
    return len(open_ports) > 0

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
