let bleDevice = null;
let bleChar = null;
let isRecording = false;
let dataBuffer = [];
let lastUIUpdate = 0;

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHAR_UUID    = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

async function connectBLE() {
    try {
        log("Requesting ViscoPulse Device...");
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'ViscoPulse' }],
            optionalServices: [SERVICE_UUID]
        });

        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
        const server = await bleDevice.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        bleChar = await service.getCharacteristic(CHAR_UUID);

        await bleChar.startNotifications();
        bleChar.addEventListener('characteristicvaluechanged', handleData);

        updateStatus(true);
        log("Connected! Receiving 8-point stream.");
    } catch (err) {
        log("Error: " + err);
    }
}

function handleData(event) {
    const raw = new TextDecoder().decode(event.target.value);
    const v = raw.split(',');

    if (v.length >= 8) {
        // UI Throttling (Update screen every 100ms)
        const now = Date.now();
        if (now - lastUIUpdate > 100) {
            document.getElementById('valInstX').innerText = v[1];
            document.getElementById('valInstY').innerText = v[2];
            document.getElementById('valInstZ').innerText = v[3];
            document.getElementById('valGyroX').innerText = v[4];
            document.getElementById('valGyroY').innerText = v[5];
            document.getElementById('valGyroZ').innerText = v[6];
            document.getElementById('valTemp').innerText  = v[7];
            lastUIUpdate = now;
        }
        
        log(raw);

        if (isRecording) {
            dataBuffer.push(v);
        }
    }
}

function updateStatus(connected) {
    document.getElementById('statusDot').className = connected ? "dot dot-online" : "dot";
    document.getElementById('statusText').innerText = connected ? "CONNECTED" : "DISCONNECTED";
    document.getElementById('btnConnect').disabled = connected;
    document.getElementById('btnDisconnect').disabled = !connected;
    document.getElementById('recordBtn').disabled = !connected;
}

function onDisconnected() {
    updateStatus(false);
    log("Disconnected from Hardware.");
}

function disconnectBLE() {
    if (bleDevice) bleDevice.gatt.disconnect();
}

function log(msg) {
    const term = document.getElementById('terminal');
    const line = document.createElement('div');
    line.innerText = `> ${msg}`;
    term.appendChild(line);
    if (term.childNodes.length > 12) term.removeChild(term.firstChild);
    term.scrollTop = term.scrollHeight;
}

function toggleRecording() {
    const btn = document.getElementById('recordBtn');
    const saveSec = document.getElementById('saveSection');

    if (!isRecording) {
        isRecording = true;
        dataBuffer = [["Time_s", "Ax", "Ay", "Az", "Gx", "Gy", "Gz", "Temp_C"]];
        btn.innerText = "STOP & COMPILE";
        btn.classList.replace("btn-outline-success", "btn-danger");
        saveSec.style.display = "none";
    } else {
        isRecording = false;
        btn.innerText = "START NEW LOG";
        btn.classList.replace("btn-danger", "btn-outline-success");
        saveSec.style.display = "block";
    }
}

function downloadCSV() {
    const name = document.getElementById('vehNum').value || "LOG";
    const content = dataBuffer.map(e => e.join(",")).join("\n");
    const blob = new Blob([content], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ViscoPulse_${name}.csv`;
    a.click();
}