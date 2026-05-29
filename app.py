from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sqlite3
import os
import requests  # Ab hum direct requests se live price nikalenge

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

@app.route('/')
def home():
    try:
        return send_from_directory('.', 'index.html')
    except Exception as e:
        return f"Error: index.html nahi mili bhai! {str(e)}"

# ================= 100% FIXED GET PRICE ROUTE =================
@app.route('/get_price', methods=['GET'])
def get_price():
    ticker = request.args.get('ticker', '').strip().upper()
    if not ticker:
        return jsonify({"ticker": "UNKNOWN", "price": 0.0, "status": "error"}), 200
    
    if "GOLD" in ticker:
        ticker = "GC=F"
    elif "SILVER" in ticker:
        ticker = "SI=F"

    print(f"[FETCHING] Direct Web Stream calling for: {ticker}...")

    try:
        # 🔥 NEW METHOD: Direct Yahoo Query API (Yeh Render par kabhi block nahi hota)
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1d"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        data = response.json()
        
        # Yahoo API se live price nikalne ka tareeqa
        meta = data['chart']['result'][0]['meta']
        live_price = meta.get('regularMarketPrice')
        
        if live_price is None:
            # Agar market closed hai toh previous close utha lo
            live_price = meta.get('chartPreviousClose')

        if live_price:
            live_price = round(float(live_price), 2)
            print(f"✅ [DIRECT SUCCESS] {ticker} Price: {live_price}")
            return jsonify({
                "ticker": ticker, 
                "price": live_price,
                "status": "success"
            }), 200
        else:
            print(f"⚠️ Price khali aaya, 100 fallback.")
            return jsonify({"ticker": ticker, "price": 100.00, "status": "fallback"}), 200
            
    except Exception as e:
        print(f"❌ [API ERROR] Alternative URL try kar rahe hain... {str(e)}")
        # BACKUP API METHOD (Agar pehla fail ho jaye)
        try:
            url_backup = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}?modules=price"
            res = requests.get(url_backup, headers=headers, timeout=10)
            js = res.json()
            live_price = js['quoteSummary']['result'][0]['price']['regularMarketPrice']['raw']
            return jsonify({"ticker": ticker, "price": round(float(live_price), 2), "status": "backup_success"}), 200
        except:
            return jsonify({"ticker": ticker, "price": 100.00, "status": "error_fallback"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
