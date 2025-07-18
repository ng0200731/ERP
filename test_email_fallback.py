#!/usr/bin/env python3
"""
Test script for email fallback system
Tests both Gmail and 163.com email services
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys
import socket

# Gmail configuration
GMAIL_CONFIG = {
    'server': 'smtp.gmail.com',
    'port': 587,
    'username': 'eric.brilliant@gmail.com',
    'password': 'opqx pfna kagb bznr'
}

# 163.com configuration
BACKUP_CONFIG = {
    'server': 'smtp.163.com',
    'port': 587,
    'username': '19902475292@163.com',
    'password': 'JDy8MigeNmsESZRa'
}

def test_gmail():
    """Test Gmail SMTP connection"""
    print("🔍 Testing Gmail SMTP...")
    try:
        # Set socket timeout to prevent hanging
        socket.setdefaulttimeout(10)

        print("  - Connecting to Gmail SMTP server...")
        server = smtplib.SMTP(GMAIL_CONFIG['server'], GMAIL_CONFIG['port'], timeout=10)
        print("  - Starting TLS...")
        server.starttls()
        print("  - Logging in...")
        server.login(GMAIL_CONFIG['username'], GMAIL_CONFIG['password'])
        print("  - Creating test message...")

        msg = MIMEText('Test email from Gmail fallback system')
        msg['Subject'] = 'Gmail Test - Email Fallback System'
        msg['From'] = GMAIL_CONFIG['username']
        msg['To'] = '859543169@qq.com'

        print("  - Sending email...")
        server.send_message(msg)
        server.quit()

        print("✅ Gmail test successful!")
        return True
    except Exception as e:
        print(f"❌ Gmail test failed: {e}")
        return False

def test_163com():
    """Test 163.com SMTP connection"""
    print("🔍 Testing 163.com SMTP...")
    try:
        # Set socket timeout to prevent hanging
        socket.setdefaulttimeout(10)

        print("  - Connecting to 163.com SMTP server...")
        server = smtplib.SMTP(BACKUP_CONFIG['server'], BACKUP_CONFIG['port'], timeout=10)
        print("  - Starting TLS...")
        server.starttls()
        print("  - Logging in...")
        server.login(BACKUP_CONFIG['username'], BACKUP_CONFIG['password'])
        print("  - Creating test message...")

        msg = MIMEText('Test email from 163.com fallback system')
        msg['Subject'] = '163.com Test - Email Fallback System'
        msg['From'] = BACKUP_CONFIG['username']
        msg['To'] = '859543169@qq.com'

        print("  - Sending email...")
        server.send_message(msg)
        server.quit()

        print("✅ 163.com test successful!")
        return True
    except Exception as e:
        print(f"❌ 163.com test failed: {e}")
        return False

def test_fallback_logic():
    """Test the fallback logic"""
    print("\n🚀 Testing Email Fallback Logic...")
    
    # Try Gmail first
    gmail_success = test_gmail()
    
    if gmail_success:
        print("✅ Primary email service (Gmail) is working - no fallback needed")
        return True
    else:
        print("⚠️  Primary email service (Gmail) failed - trying fallback...")
        
        # Try 163.com fallback
        backup_success = test_163com()
        
        if backup_success:
            print("✅ Fallback email service (163.com) is working!")
            return True
        else:
            print("❌ Both email services failed!")
            return False

if __name__ == "__main__":
    print("📧 Email Fallback System Test")
    print("=" * 40)
    
    try:
        success = test_fallback_logic()
        
        if success:
            print("\n🎯 Email fallback system is working correctly!")
            sys.exit(0)
        else:
            print("\n💥 Email fallback system has issues!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
