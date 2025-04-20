import smtplib
from email.mime.text import MIMEText

# Replace with your real Gmail address and app password
GMAIL_USER = 'eric.brilliant@gmail.com'
GMAIL_PASS = 'opqx pfna kagb bznr'
TO_EMAIL = '859543169@qq.com'

msg = MIMEText('Test email from Python (Gmail SMTP)')
msg['Subject'] = 'Test from Python'
msg['From'] = GMAIL_USER
msg['To'] = TO_EMAIL

with smtplib.SMTP('smtp.gmail.com', 587) as server:
    server.starttls()
    server.login(GMAIL_USER, GMAIL_PASS)
    server.send_message(msg)
print('Sent!') 