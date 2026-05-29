const colorPalette = [
    '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#f1c40f',
    '#e74c3c', '#1abc9c', '#e84393', '#6c5ce7', '#ffeaa7'
];

// --- Responsive Chart Options Adjuster ---
// Mobile screen (width < 768px) par legend ko 'bottom' kar dega taaki chart dabey nahi
const isMobile = window.innerWidth < 768;

const commonOptions = { 
    responsive: true, 
    maintainAspectRatio: false, 
    plugins: { 
        legend: { 
            display: true, 
            position: isMobile ? 'bottom' : 'right', 
            labels: { 
                color: 'white', 
                boxWidth: 12,
                font: {
                    size: isMobile ? 11 : 12 // Mobile par text thoda chota kiya readability ke liye
                }
            } 
        } 
    }, 
    cutout: '65%' 
};

// --- CHART INITIALIZATION ---
const myChart1 = new Chart(document.getElementById('dynamicChart1'), { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 2, borderColor: '#111827' }] }, options: commonOptions });
const myChart2 = new Chart(document.getElementById('dynamicChart2'), { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 2, borderColor: '#111827' }] }, options: commonOptions });

const savingsChart1 = new Chart(document.getElementById('savingsChart1'), { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 2, borderColor: '#111827' }] }, options: commonOptions });
const savingsChart2 = new Chart(document.getElementById('savingsChart2'), { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 2, borderColor: '#111827' }] }, options: commonOptions });

const mfChart1 = new Chart(document.getElementById('mfChart1'), { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 2, borderColor: '#111827' }] }, options: commonOptions });
const mfChart2 = new Chart(document.getElementById('mfChart2'), { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 2, borderColor: '#111827' }] }, options: commonOptions });

let globalStocks = {};
let globalSavings = {};
let globalMFs = {};

// --- TAB SWITCHER ---
function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active-content'));
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active-content');
    btnElement.classList.add('active');
    
    // Mobile optimization: Tab badalne par smooth scrolling top par le jayegi
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- FORM DISPLAY HANDLERS ---
function toggleForm(formId, btnId) {
    const form = document.getElementById(formId);
    const mainBtn = document.getElementById(btnId);
    if (form.style.display === 'none' || form.style.display === '') { 
        form.style.display = 'flex'; 
        mainBtn.style.display = 'none'; 
    }
}

function resetFormToggle(formId, btnId) {
    document.getElementById(formId).reset();
    document.getElementById(formId).style.display = 'none';
    // Fix: Responsive layouts ke standard ko maintain rakhne ke liye 'block' use kiya
    document.getElementById(btnId).style.display = 'block'; 
}

// === SAFE PYTHON FETCH UTILITY ===
async function getLivePriceFromPython(ticker) {
    try {
        const res = await fetch(`http://127.0.0.1:5000/get_price?ticker=${ticker}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.price;
    } catch (error) {
        console.log("Python server offline hai ya error hai.");
        return null;
    }
}

// ================= STOCKS OPERATIONS =================
async function submitStockData() {
    let name = document.getElementById('stockName').value.trim().toUpperCase();
    let qty = parseFloat(document.getElementById('stockQty').value);
    let price = parseFloat(document.getElementById('stockPrice').value);

    if (name === "" || isNaN(qty) || isNaN(price)) { alert("Details sahi dalo bhai!"); return; }
    if (globalStocks[name]) { alert("Stock already added!"); return; }

    let liveMarketPrice = await getLivePriceFromPython(name);
    if (!liveMarketPrice) {
        liveMarketPrice = price; 
    }

    globalStocks[name] = { qty: qty, buyPrice: price, curPrice: liveMarketPrice };

    myChart1.data.labels.push(name);
    myChart1.data.datasets[0].data.push(qty * liveMarketPrice);
    myChart1.data.datasets[0].backgroundColor.push(colorPalette[(myChart1.data.labels.length - 1) % colorPalette.length]);

    myChart2.data.labels.push(name);
    myChart2.data.datasets[0].data.push(qty);
    myChart2.data.datasets[0].backgroundColor.push(colorPalette[(myChart2.data.labels.length - 1) % colorPalette.length]);

    myChart1.update(); myChart2.update();

    let totalInvested = qty * price;
    let totalCurrent = qty * liveMarketPrice;
    let pnl = totalCurrent - totalInvested;
    let pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

    const tableBody = document.querySelector('#stockTable tbody');
    const row = document.createElement('tr');
    row.id = `stock-row-${name}`;
    
    row.innerHTML = `
        <td><b>${name}</b></td>
        <td>₹${price.toFixed(2)}</td>
        <td class="live-qty">${qty}</td>
        <td class="live-buy-val">₹${totalInvested.toFixed(2)}</td>
        <td class="live-cur-price">₹${liveMarketPrice.toFixed(2)}</td>
        <td class="live-pnl ${pnl >= 0 ? 'text-profit' : 'text-loss'}">₹${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)</td>
        <td>
            <div class="action-btns">
                <button class="btn-buy" onclick="openModal('${name}', 'BUY')">Buy</button>
                <button class="btn-sell" onclick="openModal('${name}', 'SELL')">Sell</button>
            </div>
        </td>
    `;
    tableBody.appendChild(row);
    resetFormToggle('stockForm', 'toggleFormBtn');
}

// ================= SAVINGS OPERATIONS =================
async function submitSavingsData() {
    let name = document.getElementById('savingsName').value.trim().toUpperCase();
    let amount = parseFloat(document.getElementById('savingsAmount').value);

    if (name === "" || isNaN(amount)) { alert("Data enter karo!"); return; }

    let selectedColor = '#3498db';
    let isMetal = false;
    
    if (name.includes('GOLD')) { selectedColor = '#d4af37'; isMetal = true; }
    else if (name.includes('SILVER')) { selectedColor = '#c0c0c0'; isMetal = true; }
    else { selectedColor = '#ff6b81'; }

    if (isMetal && amount < 0.1) {
        alert("Bhai Gold aur Silver ki entry kam se kam 0.1g honi chahiye!");
        return;
    }

    let baseInvestedValue = amount;
    let curValue = amount;

    if (isMetal) {
        let livePrice = await getLivePriceFromPython(name);
        if (livePrice) {
            baseInvestedValue = amount * (livePrice / 100); 
            curValue = baseInvestedValue;
        } else {
            baseInvestedValue = amount * (name.includes('GOLD') ? 6500 : 75);
            curValue = baseInvestedValue;
        }
    }

    globalSavings[name] = { amount: amount, invested: baseInvestedValue, curValue: curValue, isMetal: isMetal, color: selectedColor };

    savingsChart1.data.labels.push(name);
    savingsChart1.data.datasets[0].data.push(curValue);
    savingsChart1.data.datasets[0].backgroundColor.push(selectedColor);
    
    savingsChart2.data.labels.push(name);
    savingsChart2.data.datasets[0].data.push(curValue);
    savingsChart2.data.datasets[0].backgroundColor.push(selectedColor);

    savingsChart1.update(); savingsChart2.update();

    let pnl = curValue - baseInvestedValue;

    const tableBody = document.querySelector('#savingsTable tbody');
    const row = document.createElement('tr');
    row.id = `savings-row-${name}`;
    
    row.innerHTML = `
        <td><b>${name}</b></td>
        <td>${isMetal ? amount + ' g' : '₹' + amount.toLocaleString('en-IN')}</td>
        <td>₹${baseInvestedValue.toFixed(2)}</td>
        <td class="save-cur-val">₹${curValue.toFixed(2)}</td>
        <td class="save-pnl ${pnl >= 0 ? 'text-profit' : 'text-loss'}">₹${pnl.toFixed(2)}</td>
        <td style="color: ${selectedColor}; font-weight: bold;">● Active</td>
    `;
    tableBody.appendChild(row);
    resetFormToggle('savingsForm', 'toggleSavingsBtn');
}

// ================= MUTUAL FUNDS OPERATIONS =================
async function submitMfData() {
    let name = document.getElementById('mfName').value.trim().toUpperCase();
    let amount = parseFloat(document.getElementById('mfAmount').value);

    if (name === "" || isNaN(amount)) { alert("Data fill karein!"); return; }

    let curValue = amount;

    globalMFs[name] = { invested: amount, current: curValue, ticker: name };

    mfChart1.data.labels.push(name);
    mfChart1.data.datasets[0].data.push(curValue);
    mfChart1.data.datasets[0].backgroundColor.push(colorPalette[(mfChart1.data.labels.length - 1) % colorPalette.length]);

    mfChart2.data.labels.push(name);
    mfChart2.data.datasets[0].data.push(curValue);
    mfChart2.data.datasets[0].backgroundColor.push(colorPalette[(mfChart2.data.labels.length - 1) % colorPalette.length]);

    mfChart1.update(); mfChart2.update();

    let pnl = curValue - amount;

    const tableBody = document.querySelector('#mfTable tbody');
    const row = document.createElement('tr');
    row.id = `mf-row-${name}`;
    
    row.innerHTML = `
        <td><b>${name}</b></td>
        <td>₹${amount.toLocaleString('en-IN')}</td>
        <td class="mf-cur-val">₹${curValue.toFixed(2)}</td>
        <td class="mf-pnl ${pnl >= 0 ? 'text-profit' : 'text-loss'}">₹${pnl.toFixed(2)}</td>
        <td style="color: #3b82f6; font-weight: bold;">● Live</td>
    `;
    tableBody.appendChild(row);
    resetFormToggle('mfForm', 'toggleMfBtn');
}

// ================= AUTOMATIC LIVE REFRESH LOOP =================
setInterval(async () => {
    console.log("🔄 [REFRESHING...] Background automatic tick active.");

    // 1. Stocks updater
    for (let symbol in globalStocks) {
        let stock = globalStocks[symbol];
        let freshPrice = await getLivePriceFromPython(symbol);
        
        if (freshPrice && freshPrice > 0) {
            stock.curPrice = freshPrice;
            let totalInvested = stock.qty * stock.buyPrice;
            let totalCurrent = stock.qty * stock.curPrice;
            let pnl = totalCurrent - totalInvested;
            let pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

            let row = document.getElementById(`stock-row-${symbol}`);
            if (row) {
                row.querySelector('.live-cur-price').innerText = `₹${stock.curPrice.toFixed(2)}`;
                let pnlCell = row.querySelector('.live-pnl');
                pnlCell.innerText = `${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`;
                pnlCell.className = `live-pnl ${pnl >= 0 ? 'text-profit' : 'text-loss'}`;
            }

            let index = myChart1.data.labels.indexOf(symbol);
            if (index !== -1) {
                myChart1.data.datasets[0].data[index] = totalCurrent;
            }
        }
    }
    if (myChart1.data.labels.length > 0) myChart1.update();

    // 2. Metals updater
    for (let asset in globalSavings) {
        let save = globalSavings[asset];
        if (save.isMetal) {
            let freshMetalPrice = await getLivePriceFromPython(asset);
            if (freshMetalPrice && freshMetalPrice > 0) {
                save.curValue = save.amount * (freshMetalPrice / 100);
                let pnl = save.curValue - save.invested;

                let row = document.getElementById(`savings-row-${asset}`);
                if (row) {
                    row.querySelector('.save-cur-val').innerText = `₹${save.curValue.toFixed(2)}`;
                    let pnlCell = row.querySelector('.save-pnl');
                    pnlCell.innerText = `${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)}`;
                    pnlCell.className = `save-pnl ${pnl >= 0 ? 'text-profit' : 'text-loss'}`;
                }
                let indexS = savingsChart1.data.labels.indexOf(asset);
                if (indexS !== -1) {
                    savingsChart1.data.datasets[0].data[indexS] = save.curValue;
                }
            }
        }
    }
    if (savingsChart1.data.labels.length > 0) savingsChart1.update();

}, 5000); 

// ================= MODALS & TRANSACTIONS =================
function openModal(name, action) {
    document.getElementById('modalStockName').value = name;
    document.getElementById('modalActionType').value = action;
    document.getElementById('modalTitle').innerText = `${action} - ${name}`;
    document.getElementById('modalPriceLabel').innerText = action === 'BUY' ? 'Buying Price:' : 'Selling Price:';
    document.getElementById('modalPrice').value = ""; document.getElementById('modalQty').value = "";
    document.getElementById('actionModal').style.display = 'flex';
}
function closeModal() { document.getElementById('actionModal').style.display = 'none'; }

function processTransaction() {
    let name = document.getElementById('modalStockName').value;
    let action = document.getElementById('modalActionType').value;
    let modalPrice = parseFloat(document.getElementById('modalPrice').value);
    let modalQty = parseFloat(document.getElementById('modalQty').value);

    if (isNaN(modalPrice) || isNaN(modalQty) || modalQty <= 0 || modalPrice <= 0) { alert("Details check karo!"); return; }

    let stock = globalStocks[name];
    if (action === 'SELL' && modalQty > stock.qty) { alert("Itni quantity nahi hai!"); return; }
    let index1 = myChart1.data.labels.indexOf(name);

    if (action === 'BUY') {
        let updatedBuyPrice = ((stock.qty * stock.buyPrice) + (modalQty * modalPrice)) / (stock.qty + modalQty);
        stock.qty += modalQty;
        stock.buyPrice = updatedBuyPrice;
    } else if (action === 'SELL') {
        stock.qty -= modalQty;
        if (stock.qty === 0) {
            document.getElementById(`stock-row-${name}`).remove();
            delete globalStocks[name];
            myChart1.data.labels.splice(index1, 1); myChart1.data.datasets[0].data.splice(index1, 1);
            myChart2.data.labels.splice(index1, 1); myChart2.data.datasets[0].data.splice(index1, 1);
            myChart1.update(); myChart2.update();
            closeModal(); return;
        }
    }

    let row = document.getElementById(`stock-row-${name}`);
    if(row) {
        row.querySelector('.live-qty').innerText = stock.qty;
        let totalInvested = stock.qty * stock.buyPrice;
        row.querySelector('.live-buy-val').innerText = `₹${totalInvested.toFixed(2)}`;
    }
    
    myChart1.data.datasets[0].data[index1] = stock.qty * stock.curPrice;
    myChart2.data.datasets[0].data[index1] = stock.qty;
    myChart1.update(); myChart2.update();
    closeModal();
}