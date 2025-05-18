import sys
import traceback

print('Starting minimal test...')

try:
    from flask import Flask
    print('Flask imported successfully')
    
    app = Flask(__name__)
    print('Flask app created')
    
    @app.route('/')
    def hello():
        return 'Hello, World!'
    
    if __name__ == '__main__':
        print('Starting server...')
        app.run(debug=True)
except Exception as e:
    print('Error:', e)
    traceback.print_exc()
    sys.exit(1) 