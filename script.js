/**
 * VISCOPULSE MASTER SCRIPT | B.Eng (Hons) Integrated
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
        document.getElementById('mainState').style.color = (data.status === 2) ? "#00e676" : "#fff";
        document.getElementById('ui-tempA').innerText = data.tempA.toFixed(1) + "°C";
        document.getElementById('ui-diel').innerText = data.diel;
        document.getElementById('ui-timeA').innerText = data.tA;
    };
}

function sendCommand(cmd) { if (socket && socket.readyState === 1) socket.send(cmd); }

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

function generateReport() {
    const plate = document.getElementById('plateNumber').value.trim();
    const brand = document.getElementById('oilBrand').value;
    const grade = document.getElementById('oilGrade').value;
    if (!plate || brand === "none") return alert("Missing Vehicle/Oil Info.");

    // 1. Viscosity Calculation
    const tA_ms = parseFloat(document.getElementById('ui-timeA').innerText);
    const tA_sec = tA_ms / 1000;
    const kA = VISCOPULSE_CONFIG.constants.chamber_A_K;
    const viscMeasured = kA * tA_sec;

    // 2. Relative Dielectric Calculation (Er = C_oil / C_air)
    const rawDielOil = parseFloat(document.getElementById('ui-diel').innerText);
    const rawDielAir = VISCOPULSE_CONFIG.constants.diel_air_raw;
    const relativeDiel = (rawDielOil / rawDielAir).toFixed(3);

    // 3. Update Report UI
    document.getElementById('rep-date').innerText = new Date().toLocaleString();
    document.getElementById('rep-plate').innerText = plate;
    document.getElementById('rep-grade').innerText = brand.toUpperCase() + " " + grade.toUpperCase();
    document.getElementById('rep-ref').innerText = document.getElementById('target40').innerText;
    
    // Displaying Relative Dielectric in the report
    document.getElementById('rep-diel-m').innerHTML = `Raw: ${rawDielOil} | <b>&epsilon;<sub>r</sub>: ${relativeDiel}</b>`;
    
    document.getElementById('rep-v40-cst').innerText = viscMeasured.toFixed(3) + " cSt";

    document.getElementById('reportSection').classList.remove('d-none');
}

function restartTest() { sendCommand('restart'); document.getElementById('reportSection').classList.add('d-none'); }

function logDebug(msg) {
    const log = document.getElementById('debugLog');
    log.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}