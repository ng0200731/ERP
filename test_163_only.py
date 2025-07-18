#!/usr/bin/env python3
"""
Test only 163.com email service since it's the one that's reachable
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys
import socket

# 163.com configuration
BACKUP_CONFIG = {
    'server': 'smtp.163.com',
    'port': 587,
    'username': '19902475292@163.com',
    'password': 'JDy8MigeNmsESZRa'
}

def test_163com_send():
    """Test sending actual email via 163.com"""
    print("📧 Testing 163.com Email Sending...")
    try:
        # Set socket timeout
        socket.setdefaulttimeout(15)
        
        print("  - Connecting to 163.com SMTP server...")
        server = smtplib.SMTP(BACKUP_CONFIG['server'], BACKUP_CONFIG['port'], timeout=15)
        
        print("  - Starting TLS encryption...")
        server.starttls()
        
        print("  - Authenticating with credentials...")
        server.login(BACKUP_CONFIG['username'], BACKUP_CONFIG['password'])
        
        print("  - Creating test email message...")
        msg = MIMEText('🎯 This is a test email from the 163.com fallback system!\n\nIf you receive this email, the fallback email system is working correctly.', 'plain', 'utf-8')
        msg['Subject'] = '✅ 163.com Fallback Test - SUCCESS'
        msg['From'] = BACKUP_CONFIG['username']
        msg['To'] = '859543169@qq.com'
        
        print("  - Sending email...")
        server.send_message(msg)
        
        print("  - Closing connection...")
        server.quit()
        
        print("✅ 163.com email sent successfully!")
        print(f"   📬 Email sent from: {BACKUP_CONFIG['username']}")
        print(f"   📨 Email sent to: 859543169@qq.com")
        print(f"   📧 Subject: ✅ 163.com Fallback Test - SUCCESS")
        
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Authentication failed: {e}")
        print("   Check username and authorization code")
        return False
    except smtplib.SMTPException as e:
        print(f"❌ SMTP error: {e}")
        return False
    except socket.timeout:
        print("❌ Connection timed out")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_163com_html():
    """Test sending HTML email via 163.com"""
    print("\n📧 Testing 163.com HTML Email...")
    try:
        socket.setdefaulttimeout(15)
        
        server = smtplib.SMTP(BACKUP_CONFIG['server'], BACKUP_CONFIG['port'], timeout=15)
        server.starttls()
        server.login(BACKUP_CONFIG['username'], BACKUP_CONFIG['password'])
        
        # Create HTML message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = '🎨 163.com HTML Test - Email Fallback System'
        msg['From'] = BACKUP_CONFIG['username']
        msg['To'] = '859543169@qq.com'
        
        html_body = """
        <html>
          <body>
            <h2 style="color: #2e7d32;">✅ 163.com HTML Email Test</h2>
            <p>This is a <strong>HTML email</strong> sent via the <em>163.com fallback system</em>!</p>
            <ul>
              <li>✅ HTML formatting works</li>
              <li>✅ Colors and styles work</li>
              <li>✅ Email fallback system is operational</li>
            </ul>
            <p style="color: #1976d2;">🎯 <strong>The email fallback system is working correctly!</strong></p>
          </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))
        
        server.send_message(msg)
        server.quit()
        
        print("✅ 163.com HTML email sent successfully!")
        return True
        
    except Exception as e:
        print(f"❌ HTML email test failed: {e}")
        return False

def main():
    print("🚀 163.com Email Service Test")
    print("=" * 40)
    print("Testing the fallback email service that's reachable...")
    
    # Test basic email
    basic_success = test_163com_send()
    
    # Test HTML email
    html_success = test_163com_html()
    
    print("\n📊 Test Results:")
    print(f"  Basic Email: {'✅ SUCCESS' if basic_success else '❌ FAILED'}")
    print(f"  HTML Email: {'✅ SUCCESS' if html_success else '❌ FAILED'}")
    
    if basic_success and html_success:
        print("\n🎯 163.com fallback email system is fully operational!")
        print("   Even if Gmail fails, emails will be sent via 163.com")
        return True
    elif basic_success:
        print("\n⚠️  Basic email works, but HTML email has issues")
        return False
    else:
        print("\n❌ 163.com email service is not working")
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
