/**
 * VISCOPULSE | Smart Test Tool
 * Master Logic Script (Full Version)
 */

let socket = null;
let reconnectTimer = null;
const statusMap = ["IDLE", "HEATING", "READY", "TESTING", "FINISHED"];

// --- 1. CONNECTION & INDICATOR LOGIC ---

/**
 * Updates the UI connection badge
 * @param {boolean} isConnected 
 * @param {string} message 
 */
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

/**
 * Initializes the WebSocket connection to ESP32
 */
function initConnect() {
    const ipField = document.getElementById('espIp');
    const ip = ipField.value.trim();
    
    if (!ip) {
        alert("Please enter a valid ESP32 IP Address.");
        return;
    }

    // Clean up existing socket and listeners before creating a new one
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
        clearInterval(reconnectTimer); // Stop trying to reconnect
        reconnectTimer = null;
        setStatusIndicator(true, "DEVICE CONNECTED");
        logDebug("Connection established successfully.");
    };

    socket.onclose = () => {
        setStatusIndicator(false, "CONNECTION LOST - RETRYING...");
        
        // Start auto-reconnect if not already running
        if (!reconnectTimer) {
            reconnectTimer = setInterval(() => {
                logDebug("Attempting auto-reconnect...");
                initConnect();
            }, 2000);
        }
    };

    socket.onerror = (err) => {
        logDebug("WebSocket Error detected.");
        socket.close();
    };

    socket.onmessage = (event) => {
        // HEARTBEAT FIX: If data is arriving, force indicator to stay green.
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

/**
 * Updates all Viewports based on incoming ESP32 JSON
 * @param {Object} data 
 */
function updateUI(data) {
    // Update Global State Label
    const stateLabel = document.getElementById('mainState');
    const statusText = statusMap[data.status] || "UNKNOWN";
    stateLabel.innerText = statusText;

    // Visual feedback for states
    if (data.status === 2) {
        stateLabel.style.color = "#00e676"; // Highlight Green when READY
    } else if (data.status === 1) {
        stateLabel.style.color = "#ff9100"; // Amber for HEATING
    } else {
        stateLabel.style.color = "#ffffff";
    }

    // Update Live Sensor Viewports
    document.getElementById('ui-tempA').innerText = data.tempA.toFixed(1) + "°C";
    document.getElementById('ui-tempB').innerText = data.tempB.toFixed(1) + "°C";
    document.getElementById('ui-diel').innerText = data.diel;
    
    // Update Flow Results (Milliseconds)
    document.getElementById('ui-timeA').innerText = data.tA;
    document.getElementById('ui-timeB').innerText = data.tB;

    // Log the final result once per test
    if (data.status === 4) {
        logDebug("Test Result Captured: " + JSON.stringify(data));
    }
}

/**
 * Bridges the UI with the OIL_DATABASE object (from oil_db.js)
 */
function updateASTM() {
    const brand = document.getElementById('oilBrand').value;
    const grade = document.getElementById('oilGrade').value;
    
    // VISCOPULSE_CONFIG must be loaded from oil_db.js
    if (VISCOPULSE_CONFIG.brands[brand] && VISCOPULSE_CONFIG.brands[brand][grade]) {
        const d = VISCOPULSE_CONFIG.brands[brand][grade];
        
        // Update Target Labels
        document.getElementById('target40').innerText = d.v40.toFixed(1) + " cSt";
        document.getElementById('target100').innerText = d.v100.toFixed(1) + " cSt";
        document.getElementById('targetDiel').innerText = d.diel_fresh;
        
        // Load Hardware Constants
        document.getElementById('constA').innerText = VISCOPULSE_CONFIG.constants.chamber_A_K;
        document.getElementById('constB').innerText = VISCOPULSE_CONFIG.constants.chamber_B_K;
        
        logDebug(`Targets updated for ${brand.toUpperCase()} ${grade.toUpperCase()}`);
    } else {
        // Reset to placeholder
        document.getElementById('target40').innerText = "--";
        document.getElementById('target100').innerText = "--";
        document.getElementById('targetDiel').innerText = "--";
    }
}

// --- 3. TEST CONTROLS ---

/**
 * Sends a restart command to ESP32 and resets UI locally
 */
function restartTest() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send("restart");
        logDebug("RESTART command sent to ESP32.");
    } else {
        logDebug("Resetting local UI only (Hardware not connected).");
    }

    // Reset Viewports
    document.getElementById('ui-timeA').innerText = "0000";
    document.getElementById('ui-timeB').innerText = "0000";
    document.getElementById('mainState').innerText = "REBOOTING...";
    document.getElementById('mainState').style.color = "#ffffff";
    
    // Re-trigger the offline state during reboot
    setStatusIndicator(false, "HARDWARE REBOOTING...");
}

/**
 * Terminal-style logging for Debug Window
 * @param {string} msg 
 */
function logDebug(msg) {
    const log = document.getElementById('debugLog');
    const time = new Date().toLocaleTimeString();
    log.innerHTML += `<div><span style="color:#555">[${time}]</span> ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}