import pandas as pd
from sqlalchemy import create_engine
import os
import traceback
import sys

class Logger(object):
    def __init__(self, filename):
        self.terminal = sys.stdout
        self.log = open(filename, "w", encoding="utf-8")
    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
    def flush(self):
        self.terminal.flush()
        self.log.flush()

sys.stdout = Logger("test_database.log")
sys.stderr = sys.stdout

def test_database_connection():
    print("Testing database connection...")
    try:
        engine = create_engine('sqlite:///database.db')
        # Test connection by creating a simple query
        pd.read_sql("SELECT 1", engine)
        print("✓ Database connection successful")
        return True
    except Exception as e:
        print(f"✗ Database connection failed: {str(e)}")
        print("Detailed error:")
        print(traceback.format_exc())
        return False

def test_csv_upload():
    print("\nTesting CSV upload functionality...")
    try:
        # Check if CSV file exists
        if not os.path.exists('sample_heat_transfer.csv'):
            print("✗ CSV file not found: sample_heat_transfer.csv")
            return False
            
        # Read the sample CSV
        df = pd.read_csv('sample_heat_transfer.csv')
        print("✓ CSV file read successfully")
        print(f"Found {len(df)} rows of data")
        
        # Verify required columns
        required_columns = ['quality', 'flat_or_raised', 'direct_or_reverse', 'thickness', 
                          'num_colors', 'length', 'width', 'price']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"✗ Missing required columns: {', '.join(missing_columns)}")
            print("Available columns:", df.columns.tolist())
            return False
        print("✓ All required columns present")
        
        # Test data types
        numeric_columns = ['thickness', 'num_colors', 'length', 'width', 'price']
        for col in numeric_columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            if df[col].isnull().any():
                print(f"✗ Invalid numeric data in column: {col}")
                print("Sample of invalid data:", df[df[col].isnull()][col].head())
                return False
        print("✓ All numeric columns validated")
        
        # Test database upload
        engine = create_engine('sqlite:///database.db')
        df.to_sql('quotations', engine, if_exists='replace', index=False)
        print("✓ Data successfully uploaded to database")
        
        # Verify data in database
        stored_data = pd.read_sql_table('quotations', engine)
        if len(stored_data) == len(df):
            print("✓ Data verification successful")
            print("\nSample of stored data:")
            print(stored_data.head())
        else:
            print("✗ Data verification failed: row count mismatch")
            print(f"Expected {len(df)} rows, got {len(stored_data)} rows")
            return False
            
        return True
    except Exception as e:
        print(f"✗ Test failed: {str(e)}")
        print("Detailed error:")
        print(traceback.format_exc())
        return False

def main():
    print("Starting database and CSV upload tests...\n")
    
    # Test database connection
    if not test_database_connection():
        print("\n❌ Database connection test failed. Please check your database configuration.")
        return
    
    # Test CSV upload
    if not test_csv_upload():
        print("\n❌ CSV upload test failed. Please check your CSV file and database schema.")
        return
    
    print("\n✅ All tests passed successfully!")
    print("\nYou can now proceed with uploading your actual CSV file through the web interface.")

if __name__ == "__main__":
    main() 