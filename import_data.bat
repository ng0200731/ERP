@echo off
echo ===== Heat Transfer Database Import Tool =====
echo.

echo Creating or updating database structure...
sqlite3 database.db < import_data.sql

echo.
echo Importing CSV data...
sqlite3 database.db ".mode csv" ".import uploads/upload_20250518_143005_datatbase_final_1.csv ht_database"

echo.
echo Verifying import...
sqlite3 database.db "SELECT COUNT(*) AS 'Rows Imported' FROM ht_database;"

echo.
echo Displaying sample data...
sqlite3 database.db ".mode column" ".headers on" "SELECT * FROM ht_database LIMIT 5;"

echo.
echo Import completed!
pause 