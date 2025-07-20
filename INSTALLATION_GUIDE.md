# ERP System Installation Guide for Windows

## Version 1.4.52

### Prerequisites
- Windows 10/11
- Python 3.11 or higher
- Internet connection for package installation

### Installation Steps

#### 1. Verify Python Installation
Open Command Prompt or PowerShell and run:
```bash
python --version
```
You should see Python 3.11.9 or higher.

#### 2. Clone or Download the Project
- Extract the ERP project to a folder (e.g., `C:\python_virtual\venv\ERP`)
- Open Command Prompt/PowerShell in the project directory

#### 3. Create Virtual Environment
```bash
python -m venv venv
```

#### 4. Activate Virtual Environment
```bash
venv\Scripts\activate
```
You should see `(venv)` at the beginning of your command prompt.

#### 5. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 6. Start the Server
**Option A: Using the batch file (Recommended)**
```bash
start_server.bat
```

**Option B: Manual start**
```bash
venv\Scripts\activate
python server.py
```

#### 7. Access the Application
Open your web browser and go to:
```
http://localhost:5000
```

### Default Login Credentials
- **Admin Email**: eric.brilliant@gmail.com
- **Password**: (Check with system administrator)

### Features Available
- Customer Management
- Quotation System
- Heat Transfer Database
- User Management
- Email Notifications
- PDF Generation
- File Upload System

### Troubleshooting

#### Port Already in Use
If port 5000 is busy, the server will show an error. You can:
1. Stop other applications using port 5000
2. Or modify the port in `server.py` line 2971

#### Database Issues
If you encounter database errors:
1. Delete `database.db` and `customers.db`
2. Restart the server (databases will be recreated)

#### Email Configuration
The system uses Gmail as primary email service with 163.com as backup.
Email credentials are configured in `server.py`.

### File Structure
```
ERP/
├── server.py              # Main Flask application
├── requirements.txt       # Python dependencies
├── start_server.bat      # Windows startup script
├── templates/            # HTML templates
├── static/              # CSS, JS, and static files
├── uploads/             # File uploads directory
├── backups/             # Database backups
└── utils/               # Utility modules
```

### Support
For technical support, contact the system administrator.

---
**Version 1.4.52** - Installation completed successfully! 