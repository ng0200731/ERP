import sys
import traceback

print("Python version:", sys.version)
print("Path:", sys.path)

try:
    print("Trying to import ht_database module...")
    import ht_database
    print("Successfully imported ht_database module")
    print("ht_database module attributes:", dir(ht_database))
    
    print("Trying to access ht_database_bp...")
    bp = ht_database.ht_database_bp
    print("Successfully accessed ht_database_bp")
except Exception as e:
    print(f"Error: {str(e)}")
    traceback.print_exc()
    
print("Debug completed")

# Redirect stdout and stderr to a file
with open('debug_output.log', 'w') as f:
    sys.stdout = f
    sys.stderr = f
    
    try:
        print("Importing ht_database...")
        from ht_database import ht_database_bp
        print("Successfully imported ht_database_bp")
    except Exception as e:
        print(f"Error importing ht_database_bp: {str(e)}")
        traceback.print_exc()
        print("\nChecking if file exists...")
        import os
        print(f"ht_database.py exists: {os.path.exists('ht_database.py')}")
        
        # Try to read file content
        if os.path.exists('ht_database.py'):
            try:
                with open('ht_database.py', 'r') as f_ht:
                    content = f_ht.read(100)  # Read first 100 chars
                    print(f"File starts with: {repr(content)}")
            except Exception as read_e:
                print(f"Error reading file: {read_e}")
        
        # Check dependencies
        try:
            import flask
            print("Flask imported successfully")
        except ImportError:
            print("Failed to import Flask")
            
        try:
            import flask_login
            print("Flask-Login imported successfully")
        except ImportError:
            print("Failed to import Flask-Login") 