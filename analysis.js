const SAMPLE_RATE = 200; 
const CUTOFF_FREQ = 20;      // Engine Noise Filter
const CUTOFF_FREQ_OFFSET = 0.5; // Gravity/Offset Filter
let charts = {};

async function processData() {
    const fileInput = document.getElementById('csvFile');
    if (!fileInput.files.length) return alert("Please select a file.");

    const text = await fileInput.files[0].text();
    const rows = text.split('\n').slice(1);

    let data = { t:[], ax:[], ay:[], az:[], gx:[], gy:[], a_v_raw:[], a_v_dyn:[], a_susp:[], road:[] };

    rows.forEach(row => {
        const cols = row.split(',');
        if (cols.length >= 8) {
            data.t.push(parseFloat(cols[0]));
            data.ax.push(parseFloat(cols[1])); 
            data.ay.push(parseFloat(cols[2]));
            data.az.push(parseFloat(cols[3]));
            data.gx.push(parseFloat(cols[4]) * (Math.PI / 180)); 
            data.gy.push(parseFloat(cols[5]) * (Math.PI / 180));
        }
    });

    const dt = 1 / SAMPLE_RATE;
    let lastP = 0, lastT = 0;
    const alphaComp = 0.98;

    // --- STAGE 1 & 2: TILT COMPENSATION ---
    for (let i = 0; i < data.az.length; i++) {
        let pAcc = Math.atan2(data.ay[i], data.az[i]);
        let tAcc = Math.atan2(-data.ax[i], Math.sqrt(data.ay[i]**2 + data.az[i]**2));

        lastP = alphaComp * (lastP + data.gx[i] * dt) + (1 - alphaComp) * pAcc;
        lastT = alphaComp * (lastT + data.gy[i] * dt) + (1 - alphaComp) * tAcc;

        let av = data.ax[i] * Math.sin(lastT) + 
                 data.ay[i] * Math.sin(lastP) * Math.cos(lastT) + 
                 data.az[i] * Math.cos(lastP) * Math.cos(lastT);
        
        data.a_v_raw.push(av);
    }

    // --- STAGE 3: REMOVE GRAVITY & OFFSET (High-Pass 0.5Hz) ---
    data.a_v_dyn = butterworthFilter(data.a_v_raw, SAMPLE_RATE, CUTOFF_FREQ_OFFSET, 'highpass');

    // --- STAGE 4: ENGINE NOISE FILTER (Low-Pass 20Hz) ---
    data.a_susp = butterworthFilter(data.a_v_dyn, SAMPLE_RATE, CUTOFF_FREQ, 'lowpass');

    // --- STAGE 5: DOUBLE INTEGRATION FOR ROAD PROFILE ---
    data.road = calculateRoadSurface(data.a_susp, dt);

    // --- ISO 2631 RMS CALCULATION ---
    const sumSq = data.a_susp.reduce((sum, val) => sum + (val * val), 0);
    const rms = Math.sqrt(sumSq / data.a_susp.length);

    renderResults(rms, data);
}

// Universal Butterworth Filter Function
function butterworthFilter(data, fs, fc, type) {
    const dt = 1 / fs;
    const rc = 1 / (2 * Math.PI * fc);
    const alpha = (type === 'highpass') ? rc / (rc + dt) : dt / (rc + dt);
    let output = new Array(data.length).fill(0);
    for (let i = 1; i < data.length; i++) {
        if (type === 'highpass') {
            output[i] = alpha * (output[i - 1] + data[i] - data[i - 1]);
        } else {
            output[i] = output[i - 1] + alpha * (data[i] - output[i - 1]);
        }
    }
    return output;
}

// Double Integration logic with Leakage for stability
function calculateRoadSurface(accel, dt) {
    let vel = 0, disp = 0, result = [];
    for (let i = 0; i < accel.length; i++) {
        vel += accel[i] * dt;
        vel *= 0.97; // Leakage to prevent velocity drift
        disp += vel * dt;
        disp *= 0.97; // Leakage to prevent displacement drift
        result.push(disp * 100); // Convert to cm
    }
    return result;
}

function renderResults(rms, data) {
    document.getElementById('rmsVal').innerHTML = `${rms.toFixed(4)} <span style="font-size: 1.2rem; color:#666">m/s²</span>`;
    const label = document.getElementById('statusLabel');
    const box = document.getElementById('diagContainer');
    
    let meta = { text: "GOOD", color: "#00e676" };
    if (rms > 1.6) meta = { text: "REPLACE SUSPENSION", color: "#b71c1c" };
    else if (rms > 1.0) meta = { text: "POOR", color: "#ff5252" };
    else if (rms > 0.63) meta = { text: "FAIRLY UNCOMFORTABLE", color: "#ffab40" };
    else if (rms > 0.315) meta = { text: "SERVICEABLE", color: "#ccff33" };

    label.innerText = meta.text;
    label.style.backgroundColor = meta.color;
    box.style.borderLeftColor = meta.color;
    document.getElementById('resultsArea').style.display = 'block';
    createPlots(data);
}

function createPlots(d) {
    Object.values(charts).forEach(c => c.destroy());
   const baseOpt = (label, data, color, showX, yLabel = 'm/s²') => ({
    type: 'line',
    data: { 
        labels: d.t, 
        datasets: [{ label, data, borderColor: color, borderWidth: 1.5, pointRadius: 0 }]
    },
    options: { 
        responsive: true, 
        maintainAspectRatio: false,
        scales: { 
            x: { 
                display: showX, 
                grid: { color: '#e0e0e0' }, // Lighter grid for printing
                title: { display: true, text: 'Time (s)' }
            },
            y: { 
                grid: { color: '#e0e0e0' }, 
                title: { display: true, text: yLabel } 
            }
        },
        plugins: { legend: { display: false } }
    }
});

    charts.raw = new Chart(document.getElementById('chartRaw'), baseOpt('Raw', d.az, '#444', false));
    charts.vert = new Chart(document.getElementById('chartVertical'), baseOpt('Vertical', d.a_v_raw, '#00e676', false));
    charts.dyn = new Chart(document.getElementById('chartDynamic'), baseOpt('Dynamic', d.a_v_dyn, '#00b0ff', false));
    charts.filt = new Chart(document.getElementById('chartFiltered'), baseOpt('Filtered', d.a_susp, '#ff9100', false));
    charts.road = new Chart(document.getElementById('chartRoad'), baseOpt('Road Profile', d.road, '#e91e63', true, 'cm'));
}