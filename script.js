/**
 * VISCOPULSE | Smart Test Tool
 * Master Logic Script
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
    
    if (!ip) {
        alert("Please enter a valid ESP32 IP Address.");
        return;
    }

    if (socket) {
        socket.onopen = null;
        socket.onclose = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.close();
    }
    
    logDebug(`Initiating connection to ws://${ip}/ws ...`);
    socket = new WebSocket(`ws://${ip}/ws`);

    socket.onopen = () => {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
        setStatusIndicator(true, "DEVICE CONNECTED");
        logDebug("Connection established successfully.");
    };

    socket.onclose = () => {
        setStatusIndicator(false, "CONNECTION LOST - RETRYING...");
        if (!reconnectTimer) {
            reconnectTimer = setInterval(() => {
                logDebug("Attempting auto-reconnect...");
                initConnect();
            }, 2000);
        }
    };

    socket.onerror = () => {
        socket.close();
    };

    socket.onmessage = (event) => {
        const dot = document.getElementById('statusDot');
        if (dot.classList.contains('dot-offline')) {
            setStatusIndicator(true); 
        }

        try {
            const data = JSON.parse(event.data);
            updateUI(data);
        } catch (e) {
            console.error("Malformed JSON received", e);
        }
    };
}

// --- 2. DATA PROCESSING & UI UPDATES ---

function updateUI(data) {
    const stateLabel = document.getElementById('mainState');
    const statusText = statusMap[data.status] || "UNKNOWN";
    stateLabel.innerText = statusText;

    if (data.status === 2) {
        stateLabel.style.color = "#00e676"; 
    } else if (data.status === 1) {
        stateLabel.style.color = "#ff9100"; 
    } else {
        stateLabel.style.color = "#ffffff";
    }

    document.getElementById('ui-tempA').innerText = data.tempA.toFixed(1) + "°C";
    document.getElementById('ui-tempB').innerText = data.tempB.toFixed(1) + "°C";
    document.getElementById('ui-diel').innerText = data.diel;
    document.getElementById('ui-timeA').innerText = data.tA;
    document.getElementById('ui-timeB').innerText = data.tB;

    if (data.status === 4) {
        logDebug("Test Result Captured: " + JSON.stringify(data));
    }
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
        logDebug(`Targets updated for ${brand.toUpperCase()} ${grade.toUpperCase()}`);
    } else {
        document.getElementById('target40').innerText = "--";
        document.getElementById('target100').innerText = "--";
        document.getElementById('targetDiel').innerText = "--";
    }
}

// --- 3. TEST CONTROLS & REPORTING ---

function restartTest() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send("restart");
        logDebug("RESTART command sent to ESP32.");
    }

    document.getElementById('ui-timeA').innerText = "0000";
    document.getElementById('ui-timeB').innerText = "0000";
    document.getElementById('mainState').innerText = "REBOOTING...";
    document.getElementById('mainState').style.color = "#ffffff";
    setStatusIndicator(false, "HARDWARE REBOOTING...");
}

/**
 * Triggered by the Generate Report Button
 */
function generateReport() {
    const plate = document.getElementById('plateNumber').value.trim();
    if (!plate) {
        alert("Enter Plate Number first.");
        return;
    }
    logDebug("Report generation initiated for: " + plate);
    // Future logic goes here
}

function logDebug(msg) {
    const log = document.getElementById('debugLog');
    const time = new Date().toLocaleTimeString();
    log.innerHTML += `<div><span style="color:#555">[${time}]</span> ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}