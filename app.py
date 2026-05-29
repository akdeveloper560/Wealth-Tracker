from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import sqlite3
import os
import requests

app = Flask(__name__)
# CORS ko fully open rakha hai taaki local computer se request block na ho
CORS(app, resources={r"/*": {"origins": "*"}})

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

@app.route('/get_price', methods=['GET'])
def get_price():
    # 1. Ticker ko aate hi sabse pehle bade aksharon (UPPERCASE) mein badla
    raw_ticker = request.args.get('ticker', '').strip().upper()
    
    if not raw_ticker:
        return jsonify({"ticker": "UNKNOWN", "price": 0.0, "status": "error"}), 200
    
    # 2. Sahi matching taaki gold/GOLD dono par sahi chale
    if "GOLD" in raw_ticker:
        ticker = "GC=F"
    elif "SILVER" in raw_ticker:
        ticker = "SI=F"
    else:
        ticker = raw_ticker

    print(f"[FETCHING] Market data calling for: {ticker}...")

    try:
        # 3. Yahoo Finance Block Bypass karne ke liye Fake Browser Header
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        
        stock = yf.Ticker(ticker, session=session)
        df = stock.history(period="1d")
        
        if not df.empty:
            live_price = round(float(df['Close'].iloc[-1]), 2)
            print(f"✅ [SUCCESS] {ticker} Price: {live_price}")
            return jsonify({
                "ticker": raw_ticker, 
                "price": live_price,
                "status": "success"
            }), 200
        else:
            # Alternate backup method agar history khali aaye
            fast_info = stock.fast_info
            if 'last_price' in fast_info and fast_info['last_price'] is not None:
                live_price = round(float(fast_info['last_price']), 2)
                return jsonify({"ticker": raw_ticker, "price": live_price, "status": "success_backup"}), 200
                
            print(f"⚠️ [FALLBACK] '{ticker}' empty data, returning 100.00")
            return jsonify({"ticker": raw_ticker, "price": 100.00, "status": "fallback"}), 200
            
    except Exception as e:
        print(f"❌ [ERROR] Crash averted: {str(e)}")
        return jsonify({"ticker": raw_ticker, "price": 100.00, "status": "error_fallback"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
