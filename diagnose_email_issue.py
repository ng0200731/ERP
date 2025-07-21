#!/usr/bin/env python3
"""
Diagnose specific email connection issues
Since internet is working (Augment works), let's find the real problem
"""

import smtplib
import socket
import ssl
from email.mime.text import MIMEText
import sys

def test_smtp_connection_detailed(server, port, service_name):
    """Detailed SMTP connection test with step-by-step diagnosis"""
    print(f"\n🔍 Detailed test for {service_name} ({server}:{port})")
    
    try:
        print(f"  Step 1: DNS resolution for {server}...")
        ip = socket.gethostbyname(server)
        print(f"  ✅ DNS resolved: {server} -> {ip}")
        
        print(f"  Step 2: TCP connection to {ip}:{port}...")
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((server, port))
        
        if result != 0:
            print(f"  ❌ TCP connection failed (error: {result})")
            sock.close()
            return False
        
        print(f"  ✅ TCP connection successful")
        sock.close()
        
        print(f"  Step 3: SMTP handshake...")
        smtp = smtplib.SMTP(timeout=10)
        smtp.set_debuglevel(1)  # Enable debug output
        smtp.connect(server, port)
        
        print(f"  Step 4: STARTTLS...")
        smtp.starttls()
        
        print(f"  ✅ {service_name} SMTP connection fully successful!")
        smtp.quit()
        return True
        
    except socket.gaierror as e:
        print(f"  ❌ DNS resolution failed: {e}")
        return False
    except socket.timeout:
        print(f"  ❌ Connection timeout")
        return False
    except smtplib.SMTPException as e:
        print(f"  ❌ SMTP error: {e}")
        return False
    except Exception as e:
        print(f"  ❌ Unexpected error: {e}")
        return False

def test_gmail_auth():
    """Test Gmail authentication specifically"""
    print(f"\n🔐 Testing Gmail Authentication...")
    
    try:
        smtp = smtplib.SMTP('smtp.gmail.com', 587, timeout=15)
        smtp.starttls()
        
        print("  Attempting login with credentials...")
        smtp.login('eric.brilliant@gmail.com', 'opqx pfna kagb bznr')
        
        print("  ✅ Gmail authentication successful!")
        smtp.quit()
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"  ❌ Gmail authentication failed: {e}")
        print("  💡 This might be due to:")
        print("     - Incorrect app password")
        print("     - 2FA not enabled")
        print("     - App passwords not enabled")
        return False
    except Exception as e:
        print(f"  ❌ Gmail auth test error: {e}")
        return False

def test_163_auth():
    """Test 163.com authentication specifically"""
    print(f"\n🔐 Testing 163.com Authentication...")
    
    try:
        smtp = smtplib.SMTP('smtp.163.com', 587, timeout=15)
        smtp.starttls()
        
        print("  Attempting login with credentials...")
        smtp.login('19902475292@163.com', 'JDy8MigeNmsESZRa')
        
        print("  ✅ 163.com authentication successful!")
        smtp.quit()
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"  ❌ 163.com authentication failed: {e}")
        print("  💡 This might be due to:")
        print("     - Incorrect authorization code")
        print("     - Authorization code expired")
        print("     - Account settings issue")
        return False
    except Exception as e:
        print(f"  ❌ 163.com auth test error: {e}")
        return False

def test_simple_send():
    """Try to send a simple test email"""
    print(f"\n📧 Attempting to send test email via 163.com...")
    
    try:
        smtp = smtplib.SMTP('smtp.163.com', 587, timeout=15)
        smtp.starttls()
        smtp.login('19902475292@163.com', 'JDy8MigeNmsESZRa')
        
        msg = MIMEText('Test email - diagnosing email system')
        msg['Subject'] = 'Email System Diagnosis Test'
        msg['From'] = '19902475292@163.com'
        msg['To'] = '859543169@qq.com'
        
        smtp.send_message(msg)
        smtp.quit()
        
        print("  ✅ Test email sent successfully!")
        return True
        
    except Exception as e:
        print(f"  ❌ Failed to send test email: {e}")
        return False

def main():
    print("🔍 Email System Diagnosis")
    print("=" * 40)
    print("Since Augment works, internet is available. Let's find the real email issue...")
    
    # Test connections
    gmail_conn = test_smtp_connection_detailed('smtp.gmail.com', 587, 'Gmail')
    netease_conn = test_smtp_connection_detailed('smtp.163.com', 587, '163.com')
    
    # Test authentication if connections work
    if gmail_conn:
        gmail_auth = test_gmail_auth()
    else:
        gmail_auth = False
        
    if netease_conn:
        netease_auth = test_163_auth()
        if netease_auth:
            send_success = test_simple_send()
        else:
            send_success = False
    else:
        netease_auth = False
        send_success = False
    
    print(f"\n📊 Diagnosis Results:")
    print(f"  Gmail Connection: {'✅' if gmail_conn else '❌'}")
    print(f"  Gmail Authentication: {'✅' if gmail_auth else '❌'}")
    print(f"  163.com Connection: {'✅' if netease_conn else '❌'}")
    print(f"  163.com Authentication: {'✅' if netease_auth else '❌'}")
    print(f"  Test Email Send: {'✅' if send_success else '❌'}")
    
    if send_success:
        print(f"\n🎯 Email system is working! The fallback implementation should work correctly.")
    else:
        print(f"\n⚠️  Email system needs attention. Check the specific errors above.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏹️  Diagnosis interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
