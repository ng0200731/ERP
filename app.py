from flask import Flask
# ... existing imports ...
from ht_database import ht_database_bp

app = Flask(__name__)
# ... existing app configuration ...

# Register the HT Database blueprint
app.register_blueprint(ht_database_bp)

# ... rest of your existing code ... 