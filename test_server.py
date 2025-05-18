from flask import Flask
from flask_cors import CORS
from flask_mail import Mail

app = Flask(__name__)
CORS(app)

@app.route('/')
def hello():
    return 'Hello, World!'

if __name__ == '__main__':
    print('Starting test server...')
    app.run(debug=True) 