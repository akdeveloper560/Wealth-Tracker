from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import sqlite3
import os

app = Flask(__name__)
# CORS fully allow kiya hai taaki browser aapki index.html ko block na kare
CORS(app)

DB_NAME = "wealth_tracker.db"

# --- DATABASE INITIALIZATION (Bina functions ko chhede backend layer) ---
def init_db():
    """Server start hote hi table check karega aur data secure rakhega"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Tumhare standard asset types ke liye ek safe grid structure table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_type TEXT NOT NULL, /* STOCKS, SAVINGS, MF */
            name TEXT NOT NULL UNIQUE,
            qty REAL,
            buy_price REAL,
            invested_amount REAL
        )
    ''')
    conn.commit()
    conn.close()
    print("💾 [DATABASE] SQLite initialization complete and secure.")

# Initializing database before handling routes
init_db()

@app.route('/get_price', methods=['GET'])
def get_price():
    ticker = request.args.get('ticker', '').strip().upper()
    if not ticker:
        return jsonify({"ticker": "UNKNOWN", "price": 0.0, "status": "error"}), 200
    
    # Gold aur Silver mapping logic
    if "GOLD" in ticker:
        ticker = "GC=F"
    elif "SILVER" in ticker:
        ticker = "SI=F"

    print(f"[FETCHING] Market data calling for: {ticker}...")

    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period="1d")
        
        if not df.empty:
            live_price = round(float(df['Close'].iloc[-1]), 2)
            print(f"✅ [SUCCESS] {ticker} Price: {live_price}")
            return jsonify({
                "ticker": ticker, 
                "price": live_price,
                "status": "success"
            }), 200
        else:
            # Agar stock nahi mila toh default 100 dega taaki frontend na udde
            print(f"⚠️ [NOT FOUND] '{ticker}' nahi mila, default 100.00 fallback active.")
            return jsonify({"ticker": ticker, "price": 100.00, "status": "fallback"}), 200
            
    except Exception as e:
        print(f"❌ [ERROR] Something went wrong: {str(e)}")
        return jsonify({"ticker": ticker, "price": 100.00, "status": "error_fallback"}), 200

if __name__ == '__main__':
    print("=============================================")
    print("      PYTHON FLASK LOCAL SERVER ACTIVE       ")
    print("=============================================")
    # Production deployment friendly settings (Render handles port dynamically)
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)