/**
 * VISCOPULSE | Smart Test Tool
 * Master Logic Script - Reporting Edition
 */

let socket = null;
let reconnectTimer = null;
const statusMap = ["IDLE", "HEATING", "READY", "TESTING", "FINISHED"];

// --- 1. CONNECTION & INDICATOR LOGIC ---

function setStatusIndicator(isConnected, message = "") {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (isConnected) {
        dot.className = "dot dot-online";
        text.innerText = message || "DEVICE CONNECTED";
    } else {
        dot.className = "dot dot-offline";
        text.innerText = message || "DEVICE DISCONNECTED";
    }
}

function initConnect() {
    const ipField = document.getElementById('espIp');
    const ip = ipField.value.trim();
    if (!ip) return alert("Enter ESP32 IP");

    if (socket) {
        socket.onopen = null; socket.onclose = null;
        socket.onmessage = null; socket.close();
    }
    
    socket = new WebSocket(`ws://${ip}/ws`);

    socket.onopen = () => {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
        setStatusIndicator(true);
        logDebug("Hardware Link Established.");
    };

    socket.onclose = () => {
        setStatusIndicator(false, "LINK LOST - RETRYING...");
        if (!reconnectTimer) {
            reconnectTimer = setInterval(() => initConnect(), 2000);
        }
    };

    socket.onmessage = (event) => {
        const dot = document.getElementById('statusDot');
        if (dot.classList.contains('dot-offline')) setStatusIndicator(true);
        try {
            const data = JSON.parse(event.data);
            updateUI(data);
        } catch (e) { console.error("JSON Error"); }
    };
}

// --- 2. DATA PROCESSING ---

function updateUI(data) {
    const stateLabel = document.getElementById('mainState');
    stateLabel.innerText = statusMap[data.status] || "UNKNOWN";
    stateLabel.style.color = (data.status === 2) ? "#00e676" : (data.status === 1) ? "#ff9100" : "#ffffff";

    document.getElementById('ui-tempA').innerText = data.tempA.toFixed(1) + "°C";
    document.getElementById('ui-tempB').innerText = data.tempB.toFixed(1) + "°C";
    document.getElementById('ui-diel').innerText = data.diel;
    document.getElementById('ui-timeA').innerText = data.tA;
    document.getElementById('ui-timeB').innerText = data.tB;
}

function updateASTM() {
    const brand = document.getElementById('oilBrand').value;
    const grade = document.getElementById('oilGrade').value;
    if (VISCOPULSE_CONFIG.brands[brand] && VISCOPULSE_CONFIG.brands[brand][grade]) {
        const d = VISCOPULSE_CONFIG.brands[brand][grade];
        document.getElementById('target40').innerText = d.v40.toFixed(1) + " cSt";
        document.getElementById('target100').innerText = d.v100.toFixed(1) + " cSt";
        document.getElementById('targetDiel').innerText = d.diel_fresh;
        document.getElementById('constA').innerText = VISCOPULSE_CONFIG.constants.chamber_A_K;
        document.getElementById('constB').innerText = VISCOPULSE_CONFIG.constants.chamber_B_K;
    }
}

// --- 3. MATH & REPORTING ---

function generateReport() {
    const plate = document.getElementById('plateNumber').value.trim();
    const brand = document.getElementById('oilBrand').value;
    const grade = document.getElementById('oilGrade').value;

    if (!plate || brand === "none" || grade === "none") {
        alert("Complete Vehicle Info and Test Selection first.");
        return;
    }

    // Capture Data
    const tA = parseFloat(document.getElementById('ui-timeA').innerText) / 1000; // Convert ms to s
    const tB = parseFloat(document.getElementById('ui-timeB').innerText) / 1000;
    const kA = VISCOPULSE_CONFIG.constants.chamber_A_K;
    const kB = VISCOPULSE_CONFIG.constants.chamber_B_K;

    // Kinematic Viscosity Calculation: V = K * t
    const viscA_cst = kA * tA; 
    const viscB_cst = kB * tB;
    const viscA_si = viscA_cst * 1e-6; // cSt to m^2/s
    const viscB_si = viscB_cst * 1e-6;

    // Update Report UI
    document.getElementById('rep-date').innerText = new Date().toLocaleString();
    document.getElementById('rep-plate').innerText = plate;
    document.getElementById('rep-grade').innerText = brand.toUpperCase() + " " + grade.toUpperCase();
    document.getElementById('rep-ref').innerText = document.getElementById('target40').innerText + " / " + document.getElementById('target100').innerText + " (ASTM D445)";
    document.getElementById('rep-diel-ref').innerText = document.getElementById('targetDiel').innerText;
    document.getElementById('rep-ka').innerText = kA;
    document.getElementById('rep-kb').innerText = kB;
    
    document.getElementById('rep-ta').innerText = document.getElementById('ui-timeA').innerText + " ms";
    document.getElementById('rep-tb').innerText = document.getElementById('ui-timeB').innerText + " ms";
    document.getElementById('rep-diel-m').innerText = document.getElementById('ui-diel').innerText;

    document.getElementById('rep-v40-cst').innerText = viscA_cst.toFixed(3) + " cSt (mm²/s)";
    document.getElementById('rep-v40-si').innerText = viscA_si.toExponential(4) + " m²/s";
    document.getElementById('rep-v100-cst').innerText = viscB_cst.toFixed(3) + " cSt (mm²/s)";
    document.getElementById('rep-v100-si').innerText = viscB_si.toExponential(4) + " m²/s";

    document.getElementById('reportSection').classList.remove('d-none');
    window.scrollTo(0, document.body.scrollHeight);
    logDebug("Report Generated for " + plate);
}

function printReport() {
    window.print();
}

function restartTest() {
    if (socket && socket.readyState === WebSocket.OPEN) socket.send("restart");
    document.getElementById('reportSection').classList.add('d-none');
    document.getElementById('ui-timeA').innerText = "0000";
    document.getElementById('ui-timeB').innerText = "0000";
    document.getElementById('plateNumber').value = "";
    document.getElementById('mainState').innerText = "IDLE";
    logDebug("System Reset.");
}

function logDebug(msg) {
    const log = document.getElementById('debugLog');
    log.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}