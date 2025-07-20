@echo off
echo Starting ERP Server...
echo.
echo Activating virtual environment...
call venv\Scripts\activate
echo.
echo Starting Flask server...
python server.py
echo.
echo Server stopped. Press any key to exit.
pause 