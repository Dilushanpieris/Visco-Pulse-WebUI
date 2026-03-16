/**
 * VISCOPULSE MAIN CONTROL SCRIPT | V6.2
 * FIXED: Report Generation Logic
 */
let socket = null;
let reconnectTimer = null;
const statusMap = ["IDLE", "HEATING", "READY", "TESTING", "FINISHED", "FLUSHING", "ERROR"];
let lockedDiel = 0; 

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
    socket.onopen = () => { setStatusIndicator(true); logDebug("System Ready."); };
    socket.onclose = () => { setStatusIndicator(false); if (!reconnectTimer) reconnectTimer = setInterval(initConnect, 3000); };
    
    socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        document.getElementById('mainState').innerText = statusMap[data.status];
        document.getElementById('ui-tempA').innerText = data.tempA.toFixed(1) + "°C";
        document.getElementById('ui-diel').innerText = data.diel;
        document.getElementById('ui-timeA').innerText = data.tA;

        // Capture Dielectric when testing starts (Status 3)
        if (data.status === 3 && lockedDiel === 0) {
            lockedDiel = data.diel;
            logDebug("Sample Captured: " + lockedDiel);
        }

        // Only update bars when test is FINISHED (Status 4)
        if (data.status === 4) {
            analyzeData(data);
        }
    };
}

function analyzeData(data) {
    const brand = document.getElementById('oilBrand').value;
    const grade = document.getElementById('oilGrade').value;
    if (brand === "none" || grade === "none") return;

    const ref = VISCOPULSE_CONFIG.brands[brand][grade];
    const kA = VISCOPULSE_CONFIG.constants.chamber_A_K;
    const airBase = VISCOPULSE_CONFIG.constants.diel_air_raw;

    const currentVisc = kA * (data.tA / 1000);
    const viscShift = ((currentVisc - ref.v40) / ref.v40) * 100;

    const activeDiel = (lockedDiel > 0) ? lockedDiel : data.diel;
    const currentRelDiel = (activeDiel / airBase).toFixed(4);
    const dielShift = ((activeDiel - ref.diel_fresh_raw) / ref.diel_fresh_raw) * 100;

    document.getElementById('calc-visc').innerText = currentVisc.toFixed(2) + " cSt";
    document.getElementById('calc-rel-diel').innerText = currentRelDiel;

    updateScale('visc', viscShift, `${viscShift.toFixed(1)}% Shift`);
    updateScale('diel', dielShift, `${dielShift.toFixed(1)}% Shift`);
}

function updateScale(prefix, shift, labelText) {
    const bar = document.getElementById(prefix + 'Bar');
    const status = document.getElementById(prefix + 'Status');
    const label = document.getElementById(prefix + 'Label');
    const absShift = Math.abs(shift);

    let color = "#00e676"; // GREEN
    let desc = "GOOD";

    if (absShift > 10 && absShift <= 20) {
        color = "#ffeb3b"; // YELLOW
        desc = "NEED CHECKING";
    } else if (absShift > 20) {
        color = "#ff5252"; // RED
        desc = "CRITICAL / BAD";
    }

    bar.style.width = Math.min(100, absShift * 4) + "%";
    bar.style.backgroundColor = color;
    status.innerText = desc;
    status.style.color = color;
    label.innerText = labelText;
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
    const brand = document.getElementById('oilBrand').value;
    const grade = document.getElementById('oilGrade').value;

    if (!plate || brand === "none") {
        alert("Please enter Vehicle Plate and select Oil Brand/Grade.");
        return;
    }

    // Get values directly from the display elements
    const vM = document.getElementById('calc-visc').innerText;
    const dM = document.getElementById('calc-rel-diel').innerText;

    document.getElementById('rep-date').innerText = new Date().toLocaleString();
    document.getElementById('rep-plate').innerText = plate;
    document.getElementById('rep-grade').innerText = brand.toUpperCase() + " " + grade.toUpperCase();
    document.getElementById('rep-ref').innerText = document.getElementById('target40').innerText;
    document.getElementById('rep-diel-m').innerText = "Relative (Er): " + (dM === "--" ? "N/A" : dM);
    document.getElementById('rep-v40-cst').innerText = (vM === "-- cSt" ? "Pending" : vM);
    
    document.getElementById('reportSection').classList.remove('d-none');
    window.scrollTo(0, document.body.scrollHeight);
}

function restartTest() {
    sendCommand('restart');
    lockedDiel = 0;
    document.getElementById('reportSection').classList.add('d-none');
    ['visc', 'diel'].forEach(p => {
        document.getElementById(p + 'Bar').style.width = "0%";
        document.getElementById(p + 'Status').innerText = "WAITING";
        document.getElementById(p + 'Label').innerText = "0% Shift";
    });
    document.getElementById('calc-visc').innerText = "-- cSt";
    document.getElementById('calc-rel-diel').innerText = "--";
}

function logDebug(msg) {
    const log = document.getElementById('debugLog');
    log.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}