@echo off
echo Installing ReportLab for PDF generation...
echo.

REM Try different Python commands
python -m pip install reportlab
if %errorlevel% neq 0 (
    echo Trying with python3...
    python3 -m pip install reportlab
)
if %errorlevel% neq 0 (
    echo Trying with py...
    py -m pip install reportlab
)

echo.
echo Installation complete!
echo Restart the server to enable PDF generation.
pause
