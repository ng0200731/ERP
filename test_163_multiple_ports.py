#!/usr/bin/env python3
"""
Test 163.com email with multiple ports (25, 465, 587, 994)
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys
import socket

# 163.com configurations with different ports
CONFIGS = [
    {
        'server': 'smtp.163.com',
        'port': 465,
        'use_ssl': True,
        'use_tls': False,
        'name': '163.com SSL (465)',
        'username': '19902475292@163.com',
        'password': 'JDy8MigeNmsESZRa'
    },
    {
        'server': 'smtp.163.com',
        'port': 994,
        'use_ssl': True,
        'use_tls': False,
        'name': '163.com SSL (994)',
        'username': '19902475292@163.com',
        'password': 'JDy8MigeNmsESZRa'
    },
    {
        'server': 'smtp.163.com',
        'port': 587,
        'use_ssl': False,
        'use_tls': True,
        'name': '163.com TLS (587)',
        'username': '19902475292@163.com',
        'password': 'JDy8MigeNmsESZRa'
    },
    {
        'server': 'smtp.163.com',
        'port': 25,
        'use_ssl': False,
        'use_tls': True,
        'name': '163.com Standard (25)',
        'username': '19902475292@163.com',
        'password': 'JDy8MigeNmsESZRa'
    }
]

def test_port_connectivity(server, port, name):
    """Test if we can connect to a specific port"""
    print(f"  🔍 Testing connectivity to {name} ({server}:{port})...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((server, port))
        sock.close()
        
        if result == 0:
            print(f"    ✅ Port {port} is reachable")
            return True
        else:
            print(f"    ❌ Port {port} is blocked (error: {result})")
            return False
    except Exception as e:
        print(f"    ❌ Port {port} test failed: {e}")
        return False

def test_smtp_config(config):
    """Test a specific SMTP configuration"""
    print(f"\n📧 Testing {config['name']}...")
    
    # First test port connectivity
    if not test_port_connectivity(config['server'], config['port'], config['name']):
        return False, "Port not reachable"
    
    try:
        print(f"  🔐 Attempting SMTP connection and authentication...")
        
        # Create connection based on SSL/TLS settings
        if config['use_ssl']:
            print(f"    - Using SSL connection...")
            server = smtplib.SMTP_SSL(config['server'], config['port'], timeout=10)
        else:
            print(f"    - Using regular SMTP connection...")
            server = smtplib.SMTP(config['server'], config['port'], timeout=10)
            if config['use_tls']:
                print(f"    - Starting TLS...")
                server.starttls()
        
        print(f"    - Logging in...")
        server.login(config['username'], config['password'])
        
        print(f"    - Creating test message...")
        msg = MIMEText(f'Test email from {config["name"]} - Multiple Port Test')
        msg['Subject'] = f'✅ {config["name"]} Test - SUCCESS'
        msg['From'] = config['username']
        msg['To'] = '859543169@qq.com'
        
        print(f"    - Sending email...")
        server.send_message(msg)
        server.quit()
        
        print(f"  ✅ {config['name']} - SUCCESS!")
        return True, "Email sent successfully"
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"  ❌ {config['name']} - Authentication failed: {e}")
        return False, f"Authentication failed: {e}"
    except smtplib.SMTPException as e:
        print(f"  ❌ {config['name']} - SMTP error: {e}")
        return False, f"SMTP error: {e}"
    except socket.timeout:
        print(f"  ❌ {config['name']} - Connection timeout")
        return False, "Connection timeout"
    except Exception as e:
        print(f"  ❌ {config['name']} - Unexpected error: {e}")
        return False, f"Unexpected error: {e}"

def main():
    print("🚀 163.com Multiple Port Test")
    print("=" * 40)
    print("Testing ports: 465 (SSL), 994 (SSL), 587 (TLS), 25 (Standard)")
    
    successful_configs = []
    failed_configs = []
    
    for config in CONFIGS:
        success, message = test_smtp_config(config)
        if success:
            successful_configs.append(config['name'])
        else:
            failed_configs.append((config['name'], message))
    
    print(f"\n📊 Test Results Summary:")
    print(f"=" * 40)
    
    if successful_configs:
        print(f"✅ Working configurations:")
        for config_name in successful_configs:
            print(f"   • {config_name}")
    
    if failed_configs:
        print(f"\n❌ Failed configurations:")
        for config_name, error in failed_configs:
            print(f"   • {config_name}: {error}")
    
    if successful_configs:
        print(f"\n🎯 SUCCESS: Found {len(successful_configs)} working configuration(s)!")
        print(f"   The email fallback system will use the first working configuration.")
        print(f"   📧 Test emails have been sent to 859543169@qq.com")
        return True
    else:
        print(f"\n💥 FAILURE: No working configurations found.")
        print(f"   All 163.com ports are blocked or have configuration issues.")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
