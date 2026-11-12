
const API_URL =
"https://smart-mine-safety-api.onrender.com/api/sensor-data";

const temperatureValues = [];
const humidityValues = [];
const chartLabels = [];

const ctx = document.getElementById("sensorChart");

const sensorChart = new Chart(ctx, {
    type: "line",

    data: {
        labels: chartLabels,

        datasets: [
            {
                label: "Temperature (°C)",
                data: temperatureValues,
                borderColor: "#2563eb",
                backgroundColor: "#2563eb",
                tension: 0.3
            },
            {
                label: "Humidity (%)",
                data: humidityValues,
                borderColor: "#16a34a",
                backgroundColor: "#16a34a",
                tension: 0.3
            }
        ]
    },

    options: {
        responsive: true,
        maintainAspectRatio: false,

        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

async function getSensorData() {

    try {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Server error: " + response.status);
        }

        const data = await response.json();

        // TEMPERATURE
        document.getElementById("temperature").textContent =
            data.temperature ?? "--";

        // HUMIDITY
        document.getElementById("humidity").textContent =
            data.humidity ?? "--";

        // GAS
        document.getElementById("gas").textContent =
            data.gas ?? "--";

        // FLAME
        document.getElementById("flame").textContent =
            data.flame === 0 ? "DETECTED" : "NORMAL";

        // SOS
        document.getElementById("sos").textContent =
            data.sos ? "PRESSED" : "NOT PRESSED";

        // ACCELERATION
        document.getElementById("acceleration").textContent =
            data.acceleration ?? "--";

        // GPS
        document.getElementById("latitude").textContent =
            data.latitude ?? "--";

        document.getElementById("longitude").textContent =
            data.longitude ?? "--";

        // MODE
        document.getElementById("mode").textContent =
            data.mode === "HARDWARE"
                ? "HARDWARE MODE"
                : "SIMULATION MODE";

        // EMERGENCY STATUS
        const isEmergency =
            data.emergency === true ||
            data.sos === true ||
            data.flame === 0;

        const status = document.getElementById("safetyStatus");
        const alertBox = document.getElementById("alertBox");

        if (isEmergency) {

            status.textContent = "EMERGENCY DETECTED";
            status.className = "status emergency";

            alertBox.classList.remove("hidden");

        } else {

            status.textContent = "SYSTEM NORMAL";
            status.className = "status normal";

            alertBox.classList.add("hidden");
        }

        // CONNECTION
        document.getElementById("connection").textContent =
            "Connected";

        document.querySelector(".dot").style.background =
            "#22c55e";

        // UPDATE TIME
        document.getElementById("lastUpdate").textContent =
            "Last updated: " + new Date().toLocaleTimeString();

        // UPDATE CHART
        if (
            data.temperature !== null &&
            data.temperature !== undefined &&
            data.humidity !== null &&
            data.humidity !== undefined
        ) {

            chartLabels.push(new Date().toLocaleTimeString());

            temperatureValues.push(data.temperature);
            humidityValues.push(data.humidity);

            // Keep only the last 10 readings
            if (chartLabels.length > 10) {
                chartLabels.shift();
                temperatureValues.shift();
                humidityValues.shift();
            }

            sensorChart.update();
        }

    } catch (error) {

        console.error("Error:", error);

        document.getElementById("connection").textContent =
            "Disconnected";

        document.querySelector(".dot").style.background =
            "#ef4444";
    }
}

// GET DATA EVERY 2 SECONDS
getSensorData();

setInterval(getSensorData, 2000);
