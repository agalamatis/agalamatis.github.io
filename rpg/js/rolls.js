const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
const textColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

const SIGMA_SINGLE   = 2.958;  // sigma for individual rolls and non-resisted curve
const SIGMA_RESISTED = 4.183;  // sigma for the resisted curve only

let actor = 0;
let target = 0;
let resisted = false;
let roll1 = null;   // actor's sample, scaled by SIGMA_SINGLE
let roll2 = null;   // target's sample, scaled by SIGMA_SINGLE
let result = null;

// --- Math helpers ---

function normalPDF(x, mu, sigma) {
    return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

function normalCDF(x, mu, sigma) {
    return 0.5 * (1 + math.erf((x - mu) / (sigma * Math.sqrt(2))));
}

// Box-Muller scaled by SIGMA_SINGLE
function sampleNormal() {
    let u, v;
    do { u = Math.random(); } while (u === 0);
    do { v = Math.random(); } while (v === 0);
    return SIGMA_SINGLE * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// --- Curve data ---

const xMin = -20, xMax = 20;
const N = 400;
const xs = Array.from({ length: N }, (_, i) => xMin + (xMax - xMin) * i / (N - 1));

function buildData(mu) {
    // Use SIGMA_RESISTED for the curve shape when in resisted mode,
    // SIGMA_SINGLE otherwise
    const sigma = resisted ? SIGMA_RESISTED : SIGMA_SINGLE;
    return {
    pdf: xs.map(x => ({ x, y: normalPDF(x, mu, sigma) })),
    cdf: xs.map(x => ({ x, y: normalCDF(x, mu, sigma) })),
    };
}

// --- Chart setup ---

const initData = buildData(0);

const chart = new Chart(document.getElementById('distChart'), {
    type: 'line',
    data: {
    datasets: [
        {
        label: 'PDF',
        data: initData.pdf,
        borderColor: '#3B6D11',
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        backgroundColor: isDark ? 'rgba(59,109,17,0.12)' : 'rgba(59,109,17,0.10)',
        tension: 0.4,
        yAxisID: 'yLeft',
        },
        {
        label: 'CDF',
        data: initData.cdf,
        borderColor: '#185FA5',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.4,
        yAxisID: 'yRight',
        },
    ]
    },
    options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 200 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: { display: false },
        tooltip: {
        callbacks: {
            title: items => `x = ${parseFloat(items[0].parsed.x).toFixed(2)}`,
            label: item => `${item.dataset.label}: ${item.parsed.y.toFixed(4)}`
        }
        }
    },
    scales: {
        x: {
        type: 'linear',
        min: xMin,
        max: xMax,
        ticks: {
            color: textColor,
            stepSize: 1,
            callback: v => Number.isInteger(v) ? v : ''
        },
        grid: {
            color: ctx => Number.isInteger(ctx.tick.value) ? gridColor : 'transparent'
        }
        },
        yLeft: {
        position: 'left',
        min: 0,
        max: 1,
        ticks: { color: '#3B6D11', stepSize: 0.1, callback: v => v.toFixed(1) },
        grid: { color: gridColor },
        title: { display: true, text: 'PDF', color: '#3B6D11', font: { size: 11 } }
        },
        yRight: {
        position: 'right',
        min: 0,
        max: 1,
        ticks: { color: '#185FA5', stepSize: 0.1, callback: v => v.toFixed(1) },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'CDF', color: '#185FA5', font: { size: 11 } }
        }
    }
    },

    // --- Custom plugin: draws the vertical result line ---
    plugins: [
    {
        id: 'rollLine',
        afterDraw(chart) {
        if (result === null) return;
        const { ctx, chartArea, scales } = chart;
        const xPx = scales.x.getPixelForValue(result);
        if (xPx < chartArea.left || xPx > chartArea.right) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(xPx, chartArea.top);
        ctx.lineTo(xPx, chartArea.bottom);
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.85)' : '#111';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '500 12px sans-serif';
        ctx.textAlign = 'center';
        const label = `result = ${result.toFixed(2)}`;
        const labelX = Math.min(Math.max(xPx, chartArea.left + 42), chartArea.right - 42);
        const labelY = chartArea.top + 16;
        const w = ctx.measureText(label).width + 10;
        ctx.fillStyle = isDark ? 'rgba(30,30,30,0.75)' : 'rgba(255,255,255,0.85)';
        ctx.fillRect(labelX - w / 2, labelY - 13, w, 18);
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.9)' : '#111';
        ctx.fillText(label, labelX, labelY);
        ctx.restore();
        }
    }
    ]
});

// --- Helpers ---

function updateCurves() {
    const mu = resisted ? actor - target : actor;
    const d = buildData(mu);
    chart.data.datasets[0].data = d.pdf;
    chart.data.datasets[1].data = d.cdf;
    chart.update('none');
}

function fmt(v) {
    return `${v >= 0 ? '+' : '−'} ${Math.abs(v)}`;
}

function renderResult() {
    if (roll1 === null) return;
    let html;
    if (resisted) {
    html =
        `<span class="val">(${roll1.toFixed(2)} ${fmt(actor)})</span>` +
        `<span class="sep"> − </span>` +
        `<span class="val">(${roll2.toFixed(2)} ${fmt(target)})</span>` +
        `<span class="sep"> = </span>` +
        `<span class="val">${result.toFixed(3)}</span>`;
    } else {
    html =
        `<span class="val">${roll1.toFixed(3)}</span>` +
        `<span class="sep">${actor >= 0 ? '+' : '−'} ${Math.abs(actor)} =</span>` +
        `<span class="val">${result.toFixed(3)}</span>`;
    }
    document.getElementById('rollResult').innerHTML = html;
}

function recalcResult() {
    if (roll1 === null) return;
    result = resisted
    ? (roll1 + actor) - (roll2 + target)
    : roll1 + actor;
    renderResult();
    chart.update();
}

// --- Event handlers ---

document.getElementById('actorSlider').addEventListener('input', e => {
    actor = parseInt(e.target.value, 10);
    document.getElementById('actorVal').textContent = actor;
    updateCurves();
    recalcResult();
});

document.getElementById('targetSlider').addEventListener('input', e => {
    target = parseInt(e.target.value, 10);
    document.getElementById('targetVal').textContent = target;
    updateCurves();
    recalcResult();
});

document.getElementById('rollBtn').addEventListener('click', () => {
    roll1 = sampleNormal();
    roll2 = sampleNormal();
    result = resisted
    ? (roll1 + actor) - (roll2 + target)
    : roll1 + actor;
    renderResult();
    chart.update();
});

document.getElementById('resistedToggle').addEventListener('click', () => {
    resisted = !resisted;
    document.getElementById('resistedBody').classList.toggle('open', resisted);
    document.getElementById('toggleArrow').classList.toggle('open', resisted);
    document.getElementById('actorLabel').textContent = resisted ? 'Actor' : 'Modifier';
    document.getElementById('actorLabel').classList.toggle('active', resisted);
    updateCurves();
    recalcResult();
});
