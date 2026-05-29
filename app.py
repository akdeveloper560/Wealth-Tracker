from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import yfinance as yf
import sqlite3
import os
import requests

# Flask ko bataya ki sab kuch main directory mein hi hai
app = Flask(__name__, template_folder='.', static_folder='.')
CORS(app)

DB_NAME = "wealth_tracker.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_type TEXT NOT NULL,
            name TEXT NOT NULL UNIQUE,
            qty REAL,
            buy_price REAL,
            invested_amount REAL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# ================= HOME ROUTE (SINGLE FILE HANDLER) =================
@app.route('/')
def home():
    """URL kholte hi tumhari all-in-one index.html browser par bhej dega"""
    try:
        return send_from_directory('.', 'index.html')
    except Exception as e:
        return f"Error: index.html nahi mili bhai! {str(e)}"

# ================= GET PRICE ROUTE (YAHOO BYPASS) =================
@app.route('/get_price', methods=['GET'])
def get_price():
    ticker = request.args.get('ticker', '').strip().upper()
    if not ticker:
        return jsonify({"ticker": "UNKNOWN", "price": 0.0, "status": "error"}), 200
    
    if "GOLD" in ticker:
        ticker = "GC=F"
    elif "SILVER" in ticker:
        ticker = "SI=F"

    try:
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        
        stock = yf.Ticker(ticker, session=session)
        df = stock.history(period="1d")
        
        if not df.empty:
            live_price = round(float(df['Close'].iloc[-1]), 2)
            return jsonify({"ticker": ticker, "price": live_price, "status": "success"}), 200
        else:
            fast_info = stock.fast_info
            if 'last_price' in fast_info and fast_info['last_price'] is not None:
                live_price = round(float(fast_info['last_price']), 2)
                return jsonify({"ticker": ticker, "price": live_price, "status": "success_backup"}), 200

            return jsonify({"ticker": ticker, "price": 100.00, "status": "fallback"}), 200
            
    except Exception as e:
        return jsonify({"ticker": ticker, "price": 100.00, "status": "error_fallback"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
