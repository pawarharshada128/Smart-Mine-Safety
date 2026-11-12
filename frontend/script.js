
const API_URL =
    "https://smart-mine-safety-api.onrender.com/api/sensor-data";

const HISTORY_URL =
    "https://smart-mine-safety-api.onrender.com/api/history";

// -------------------------------
// VARIABLES
// -------------------------------

let monitoringActive = true;
let sensorChart;
let toastTimer;

const chartLabels = [];
const temperatureValues = [];
const humidityValues = [];
const gasValues = [];

const MAX_POINTS = 15;

// -------------------------------
// CHART
// -------------------------------

const ctx = document.getElementById("sensorChart");

sensorChart = new Chart(ctx, {
    type: "line",

    data: {
        labels: chartLabels,
        datasets: [
            {
                label: "Temperature (°C)",
                data: temperatureValues,
                borderColor: "#3977ed",
                backgroundColor: "rgba(57,119,237,0.12)",
                fill: true,
                tension: 0.4,
                pointRadius: 3
            },
            {
                label: "Humidity (%)",
                data: humidityValues,
                borderColor: "#16a36a",
                backgroundColor: "rgba(22,163,106,0.08)",
                fill: false,
                tension: 0.4,
                pointRadius: 3
            },
            {
                label: "Gas Level",
                data: gasValues,
                borderColor: "#e39a35",
                backgroundColor: "rgba(227,154,53,0.08)",
                fill: false,
                tension: 0.4,
                pointRadius: 3,
                hidden: true
            }
        ]
    },

    options: {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
            intersect: false,
            mode: "index"
        },

        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 10
                    }
                }
            }
        },

        scales: {
            x: {
                grid: {
                    display: false
                }
            },

            y: {
                beginAtZero: true,
                grid: {
                    color: "#edf1f6"
                }
            }
        }
    }
});

// -------------------------------
// TOAST MESSAGE
// -------------------------------

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// -------------------------------
// UPDATE SENSOR INDICATORS
// -------------------------------

function setIndicator(id, message, type = "normal") {
    const element = document.getElementById(id);

    element.textContent = "● " + message;
    element.className = "card-indicator " + type;
}

// -------------------------------
// CONNECTION STATUS
// -------------------------------

function setConnection(connected) {
    const pill = document.getElementById("connectionPill");
    const dot = pill.querySelector(".dot");

    document.getElementById("connection").textContent =
        connected ? "Connected" : "Disconnected";

    document.getElementById("sidebarConnection").textContent =
        connected ? "Online" : "Offline";

    document.getElementById("workerConnection").textContent =
        connected ? "Connected" : "Disconnected";

    document.getElementById("monitorConnection").textContent =
        connected ? "Connected" : "Disconnected";

    dot.style.background = connected ? "#16a36a" : "#e34444";
}

// -------------------------------
// UPDATE DASHBOARD
// -------------------------------

function updateDashboard(data) {

    // Temperature
    document.getElementById("temperature").textContent =
        data.temperature ?? "--";

    // Humidity
    document.getElementById("humidity").textContent =
        data.humidity ?? "--";

    // Gas
    document.getElementById("gas").textContent =
        data.gas ?? "--";

    // Flame
    const flameDetected = Number(data.flame) === 0;

    document.getElementById("flame").textContent =
        flameDetected ? "DETECTED" : "NORMAL";

    // SOS
    const sosPressed =
        data.sos === true ||
        data.sos === 1 ||
        data.sos === "true";

    document.getElementById("sos").textContent =
        sosPressed ? "PRESSED" : "NOT PRESSED";

    // Acceleration
    document.getElementById("acceleration").textContent =
        data.acceleration ?? "--";

    // GPS
    document.getElementById("latitude").textContent =
        data.latitude ?? "--";

    document.getElementById("longitude").textContent =
        data.longitude ?? "--";

    // Map link
    const lat = Number(data.latitude);
    const lng = Number(data.longitude);
    const mapLink = document.getElementById("mapLink");

    if (
        data.latitude !== null &&
        data.latitude !== undefined &&
        data.longitude !== null &&
        data.longitude !== undefined &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
    ) {
        mapLink.href =
            `https://www.google.com/maps?q=${lat},${lng}`;

        mapLink.classList.remove("disabled");
    } else {
        mapLink.href = "#";
        mapLink.classList.add("disabled");
    }

    // Mode
    const hardwareMode = data.mode === "HARDWARE";

    document.getElementById("mode").textContent =
        hardwareMode ? "HARDWARE MODE" : "SIMULATION MODE";

    document.getElementById("workerMode").textContent =
        hardwareMode ? "Hardware" : "Simulation";

    document.getElementById("monitorMode").textContent =
        hardwareMode ? "Hardware" : "Simulation";

    // Safety conditions
    const gasLevel = Number(data.gas);
    const temperature = Number(data.temperature);

    const isEmergency =
        data.emergency === true ||
        data.emergency === 1 ||
        sosPressed ||
        flameDetected ||
        gasLevel > 1500;

    const isTemperatureWarning = temperature > 40;
    const isGasWarning = gasLevel > 1500;

    // Indicators
    setIndicator(
        "temperatureIndicator",
        isTemperatureWarning ? "High" : "Normal",
        isTemperatureWarning ? "warning" : "normal"
    );

    setIndicator(
        "humidityIndicator",
        "Monitoring",
        "normal"
    );

    setIndicator(
        "gasIndicator",
        isGasWarning ? "Danger" : "Normal",
        isGasWarning ? "danger" : "normal"
    );

    setIndicator(
        "flameIndicator",
        flameDetected ? "Detected" : "Normal",
        flameDetected ? "danger" : "normal"
    );

    setIndicator(
        "sosIndicator",
        sosPressed ? "Pressed" : "Normal",
        sosPressed ? "danger" : "normal"
    );

    // Overall safety status
    const status = document.getElementById("safetyStatus");
    const alertBox = document.getElementById("alertBox");

    if (isEmergency) {
        status.className = "status emergency";
        status.innerHTML =
            '<span class="status-circle"></span> EMERGENCY DETECTED';

        alertBox.classList.remove("hidden");
    } else if (isTemperatureWarning) {
        status.className = "status emergency";
        status.innerHTML =
            '<span class="status-circle"></span> TEMPERATURE WARNING';

        alertBox.classList.add("hidden");
    } else {
        status.className = "status normal";
        status.innerHTML =
            '<span class="status-circle"></span> SYSTEM NORMAL';

        alertBox.classList.add("hidden");
    }

    // Connection and update time
    setConnection(true);

    const currentTime = new Date().toLocaleTimeString();

    document.getElementById("lastUpdate").textContent =
        "Last updated: " + currentTime;

    document.getElementById("monitorUpdate").textContent =
        currentTime;

    // Update chart
    addChartData(data);
}

// -------------------------------
// CHART DATA
// -------------------------------

function addChartData(data) {

    if (
        data.temperature === null ||
        data.temperature === undefined ||
        data.humidity === null ||
        data.humidity === undefined
    ) {
        return;
    }

    chartLabels.push(new Date().toLocaleTimeString());

    temperatureValues.push(Number(data.temperature));
    humidityValues.push(Number(data.humidity));
    gasValues.push(Number(data.gas ?? 0));

    if (chartLabels.length > MAX_POINTS) {
        chartLabels.shift();
        temperatureValues.shift();
        humidityValues.shift();
        gasValues.shift();
    }

    sensorChart.update("none");
}

// -------------------------------
// GET SENSOR DATA
// -------------------------------

async function getSensorData(testEmergency = false) {

    try {
        const url = testEmergency
            ? API_URL + "?test=emergency"
            : API_URL;

        const response = await fetch(url, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Server error: " + response.status);
        }

        const data = await response.json();

        updateDashboard(data);

        return data;

    } catch (error) {
        console.error("Sensor API error:", error);

        setConnection(false);

        document.getElementById("lastUpdate").textContent =
            "Unable to receive sensor data.";

        showToast("Unable to connect to cloud server.");

        throw error;
    }
}

// -------------------------------
// NAVIGATION
// -------------------------------

const pageTitles = {
    dashboard: "Dashboard Overview",
    monitoring: "Live Monitoring",
    history: "Sensor History"
};

document.querySelectorAll(".nav-btn").forEach(button => {

    button.addEventListener("click", () => {

        const pageName = button.dataset.page;

        document.querySelectorAll(".nav-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        document.querySelectorAll(".page").forEach(page => {
            page.classList.remove("active");
        });

        document.getElementById(pageName).classList.add("active");

        document.getElementById("pageTitle").textContent =
            pageTitles[pageName];

        if (pageName === "history") {
            loadHistory();
        }
    });
});

// -------------------------------
// PAUSE / RESUME MONITORING
// -------------------------------

const pauseBtn = document.getElementById("pauseBtn");

pauseBtn.addEventListener("click", () => {

    monitoringActive = !monitoringActive;

    if (monitoringActive) {
        pauseBtn.textContent = "Pause Monitoring";
        pauseBtn.className = "action-btn primary";

        document.getElementById("monitorState").textContent =
            "Active";

        showToast("Live monitoring resumed.");

        getSensorData().catch(() => {});
    } else {
        pauseBtn.textContent = "Resume Monitoring";
        pauseBtn.className = "action-btn secondary";

        document.getElementById("monitorState").textContent =
            "Paused";

        showToast("Live monitoring paused.");
    }
});

// -------------------------------
// REFRESH BUTTONS
// -------------------------------

async function manualRefresh() {

    try {
        await getSensorData();
        showToast("Sensor data refreshed.");
    } catch (error) {
        // Error message is handled in getSensorData().
    }
}

document.getElementById("refreshBtn")
    .addEventListener("click", manualRefresh);

document.getElementById("manualRefreshBtn")
    .addEventListener("click", manualRefresh);

// -------------------------------
// EMERGENCY TEST
// -------------------------------

document.getElementById("emergencyTestBtn")
    .addEventListener("click", async () => {

        const button = document.getElementById("emergencyTestBtn");

        button.disabled = true;
        button.textContent = "Testing...";

        try {
            await getSensorData(true);

            showToast("Emergency test completed. Check the alert.");

        } catch (error) {
            // Error message is handled in getSensorData().
        } finally {
            button.disabled = false;
            button.textContent = "⚠ Test Emergency";
        }
    });

// -------------------------------
// CHART FILTER
// -------------------------------

document.getElementById("chartFilter")
    .addEventListener("change", event => {

        const selected = event.target.value;

        sensorChart.data.datasets[0].hidden =
            selected !== "both" && selected !== "temperature";

        sensorChart.data.datasets[1].hidden =
            selected !== "both" && selected !== "humidity";

        sensorChart.data.datasets[2].hidden =
            selected !== "gas";

        sensorChart.update();
    });

// -------------------------------
// LOAD SENSOR HISTORY
// -------------------------------

async function loadHistory() {

    const body = document.getElementById("historyBody");

    body.innerHTML =
        '<tr><td colspan="7" class="empty-cell">Loading history...</td></tr>';

    try {
        const response = await fetch(HISTORY_URL, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("History request failed");
        }

        const records = await response.json();

        if (!Array.isArray(records) || records.length === 0) {
            body.innerHTML =
                '<tr><td colspan="7" class="empty-cell">No sensor history found.</td></tr>';

            document.getElementById("historyCount").textContent =
                "0 records";

            return;
        }

        document.getElementById("historyCount").textContent =
            records.length + " records";

        body.innerHTML = "";

        records.forEach(record => {

            const row = document.createElement("tr");

            const emergency =
                record.emergency === true ||
                record.emergency === 1 ||
                record.sos === true ||
                record.sos === 1 ||
                Number(record.flame) === 0 ||
                Number(record.gas) > 1500;

            const time = record.timestamp
                ? new Date(record.timestamp).toLocaleString()
                : "--";

            const values = [
                time,
                record.temperature ?? "--",
                record.humidity ?? "--",
                record.gas ?? "--",
                Number(record.flame) === 0 ? "Detected" : "Normal",
                record.sos ? "Pressed" : "No",
                emergency ? "EMERGENCY" : "SAFE"
            ];

            values.forEach((value, index) => {

                const cell = document.createElement("td");

                if (index === 6) {
                    const badge = document.createElement("span");

                    badge.className =
                        "table-status " + (emergency ? "unsafe" : "safe");

                    badge.textContent = value;

                    cell.appendChild(badge);
                } else {
                    cell.textContent = value;
                }

                row.appendChild(cell);
            });

            body.appendChild(row);
        });

    } catch (error) {
        console.error("History error:", error);

        body.innerHTML =
            '<tr><td colspan="7" class="empty-cell">Unable to load history. Please try again.</td></tr>';

        showToast("Could not load sensor history.");
    }
}

document.getElementById("historyRefreshBtn")
    .addEventListener("click", loadHistory);

// -------------------------------
// AUTOMATIC LIVE UPDATES
// -------------------------------

getSensorData().catch(() => {});

setInterval(() => {

    if (monitoringActive) {
        getSensorData().catch(() => {});
    }

}, 2000);
