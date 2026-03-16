/**
 * VISCOPULSE MAIN CONTROL SCRIPT | V5.3
 */
let socket = null;
let reconnectTimer = null;
const statusMap = ["IDLE", "HEATING", "READY", "TESTING", "FINISHED", "FLUSHING", "ERROR"];

function setStatusIndicator(isConnected) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (isConnected) {
        dot.className = "dot dot-online";
        text.innerText = "DEVICE CONNECTED";
    } else {
        dot.className = "dot dot-offline";
        text.innerText = "DEVICE DISCONNECTED";
    }
}

function initConnect() {
    const ip = document.getElementById('espIp').value.trim();
    if (!ip) return;
    if (socket) socket.close();
    
    socket = new WebSocket(`ws://${ip}/ws`);
    socket.onopen = () => { setStatusIndicator(true); logDebug("Link Active."); };
    socket.onclose = () => { setStatusIndicator(false); if (!reconnectTimer) reconnectTimer = setInterval(initConnect, 3000); };
    
    socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        document.getElementById('mainState').innerText = statusMap[data.status];
        document.getElementById('ui-tempA').innerText = data.tempA.toFixed(1) + "°C";
        document.getElementById('ui-diel').innerText = data.diel;
        document.getElementById('ui-timeA').innerText = data.tA;

        if (data.status >= 3) analyzeData(data);
    };
}

function analyzeData(data) {
    const brand = document.getElementById('oilBrand').value;
    const grade = document.getElementById('oilGrade').value;
    if (brand === "none" || grade === "none") return;

    const ref = VISCOPULSE_CONFIG.brands[brand][grade];
    const kA = VISCOPULSE_CONFIG.constants.chamber_A_K;
    const airBase = VISCOPULSE_CONFIG.constants.diel_air_raw;

    const measuredVisc = kA * (data.tA / 1000);
    const deviation = ((measuredVisc - ref.v40) / ref.v40) * 100;
    const relDiel = (data.diel / airBase).toFixed(4);

    document.getElementById('calc-visc').innerText = measuredVisc.toFixed(2) + " cSt";
    document.getElementById('calc-rel-diel').innerText = relDiel;

    const bar = document.getElementById('healthBar');
    const label = document.getElementById('healthLabel');
    const absDev = Math.abs(deviation);
    
    let color = "#00e676"; 
    let statusText = "OPTIMAL";

    if (absDev > 10 && absDev <= 20) { color = "#ffeb3b"; statusText = "CAUTION"; }
    else if (absDev > 20) { color = "#ff5252"; statusText = "CRITICAL"; }

    bar.style.width = Math.max(5, 100 - absDev) + "%";
    bar.style.backgroundColor = color;
    label.innerText = `${statusText} (${deviation.toFixed(1)}% Shift)`;
    label.style.color = color;
}

function updateASTM() {
    const brand = document.getElementById('oilBrand').value;
    const grade = document.getElementById('oilGrade').value;
    if (VISCOPULSE_CONFIG.brands[brand] && VISCOPULSE_CONFIG.brands[brand][grade]) {
        const d = VISCOPULSE_CONFIG.brands[brand][grade];
        document.getElementById('target40').innerText = d.v40.toFixed(1) + " cSt";
        document.getElementById('targetDiel').innerText = d.diel_fresh_raw;
        document.getElementById('constA').innerText = VISCOPULSE_CONFIG.constants.chamber_A_K;
    }
}

function sendCommand(cmd) { if (socket && socket.readyState === 1) socket.send(cmd); }

function generateReport() {
    const plate = document.getElementById('plateNumber').value.trim();
    if (!plate) return alert("Enter Plate Number.");
    
    document.getElementById('rep-date').innerText = new Date().toLocaleString();
    document.getElementById('rep-plate').innerText = plate;
    document.getElementById('rep-grade').innerText = document.getElementById('oilBrand').value.toUpperCase() + " " + document.getElementById('oilGrade').value;
    document.getElementById('rep-ref').innerText = document.getElementById('target40').innerText;
    document.getElementById('rep-diel-m').innerText = "Relative (Er): " + document.getElementById('calc-rel-diel').innerText;
    document.getElementById('rep-v40-cst').innerText = document.getElementById('calc-visc').innerText;
    
    document.getElementById('reportSection').classList.remove('d-none');
}

function restartTest() {
    sendCommand('restart');
    document.getElementById('reportSection').classList.add('d-none');
    document.getElementById('healthBar').style.width = "0%";
    document.getElementById('healthLabel').innerText = "AWAITING TEST...";
}

function logDebug(msg) {
    const log = document.getElementById('debugLog');
    log.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}