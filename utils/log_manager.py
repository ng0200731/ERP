import sqlite3
from datetime import datetime
import json
from typing import List, Dict

class LogManager:
    def __init__(self, db_path: str = 'database.db'):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize the log table if it doesn't exist"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS activity_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    username TEXT NOT NULL,
                    action TEXT NOT NULL,
                    details TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
    
    def add_log(self, username: str, action: str, details: Dict = None):
        """Add a new log entry"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                'INSERT INTO activity_log (timestamp, username, action, details) VALUES (?, ?, ?, ?)',
                (datetime.now().isoformat(), username, action, json.dumps(details) if details else None)
            )
    
    def get_recent_logs(self, limit: int = 100) -> List[Dict]:
        """Get recent log entries"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                'SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?',
                (limit,)
            )
            logs = []
            for row in cursor:
                log = dict(row)
                if log['details']:
                    log['details'] = json.loads(log['details'])
                logs.append(log)
            return logs
    
    def get_logs_by_date(self, start_date: str, end_date: str = None) -> List[Dict]:
        """Get log entries within a date range"""
        if not end_date:
            end_date = datetime.now().isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                'SELECT * FROM activity_log WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC',
                (start_date, end_date)
            )
            logs = []
            for row in cursor:
                log = dict(row)
                if log['details']:
                    log['details'] = json.loads(log['details'])
                logs.append(log)
            return logs 