#!/usr/bin/env python3
"""
Test actual email sending on the working ports
"""

import smtplib
from email.mime.text import MIMEText
import sys

# Test configurations for working ports
CONFIGS = [
    {
        'name': '163.com SSL (465)',
        'server': 'smtp.163.com',
        'port': 465,
        'use_ssl': True,
        'username': '19902475292@163.com',
        'password': 'JDy8MigeNmsESZRa'
    },
    {
        'name': '163.com TLS (587)',
        'server': 'smtp.163.com',
        'port': 587,
        'use_ssl': False,
        'username': '19902475292@163.com',
        'password': 'JDy8MigeNmsESZRa'
    }
]

def test_email_send(config):
    """Test sending email with a specific configuration"""
    print(f"\n📧 Testing {config['name']}...")
    
    try:
        # Create connection
        if config['use_ssl']:
            print("  - Creating SSL connection...")
            server = smtplib.SMTP_SSL(config['server'], config['port'], timeout=10)
        else:
            print("  - Creating SMTP connection...")
            server = smtplib.SMTP(config['server'], config['port'], timeout=10)
            print("  - Starting TLS...")
            server.starttls()
        
        print("  - Authenticating...")
        server.login(config['username'], config['password'])
        
        print("  - Creating message...")
        msg = MIMEText(f'✅ Success! Email sent via {config["name"]}')
        msg['Subject'] = f'Email Test - {config["name"]} Working!'
        msg['From'] = config['username']
        msg['To'] = '859543169@qq.com'
        
        print("  - Sending email...")
        server.send_message(msg)
        server.quit()
        
        print(f"  ✅ SUCCESS: {config['name']} works!")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"  ❌ Authentication failed: {e}")
        return False
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        return False

def main():
    print("🚀 Testing Email Sending on Working Ports")
    print("=" * 45)
    
    working_configs = []
    
    for config in CONFIGS:
        if test_email_send(config):
            working_configs.append(config['name'])
    
    print(f"\n📊 Final Results:")
    print("=" * 20)
    
    if working_configs:
        print(f"✅ Working email configurations:")
        for name in working_configs:
            print(f"   • {name}")
        print(f"\n🎯 Email fallback system will work!")
        print(f"📧 Test emails sent to 859543169@qq.com")
        return True
    else:
        print(f"❌ No working email configurations found")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Error: {e}")
        sys.exit(1)
