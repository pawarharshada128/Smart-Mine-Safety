
from flask import Flask, jsonify, request
from flask_cors import CORS
from simulator import generate_sensor_data
import sqlite3
from datetime import datetime

app = Flask(__name__)
CORS(app)

DB_NAME = "helmet.db"


# Create database table
def create_database():

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sensor_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            temperature REAL,
            humidity REAL,
            gas INTEGER,
            flame INTEGER,
            sos INTEGER,
            acceleration REAL,
            emergency INTEGER,
            latitude REAL,
            longitude REAL,
            mode TEXT,
            timestamp TEXT
        )
    """)

    conn.commit()
    conn.close()


# Save sensor readings
def save_data(data):

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO sensor_history
        (temperature, humidity, gas, flame, sos,
         acceleration, emergency, latitude, longitude,
         mode, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("temperature", 0),
        data.get("humidity", 0),
        data.get("gas", 0),
        data.get("flame", 1),
        int(bool(data.get("sos", False))),
        data.get("acceleration", 0),
        int(bool(data.get("emergency", False))),
        data.get("latitude", 0),
        data.get("longitude", 0),
        data.get("mode", "SIMULATION"),
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))

    conn.commit()
    conn.close()


# Get sensor data
@app.route("/api/sensor-data", methods=["GET"])
def get_sensor_data():

    data = generate_sensor_data()

    save_data(data)

    return jsonify(data)


# Receive ESP32 data later
@app.route("/api/sensor-data", methods=["POST"])
def receive_sensor_data():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"message": "Invalid data"}), 400

    data["mode"] = "HARDWARE"

    save_data(data)

    print("ESP32 DATA:", data)

    return jsonify({
        "message": "Data saved successfully"
    }), 200


# Get previous sensor readings
@app.route("/api/history", methods=["GET"])
def get_history():

    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM sensor_history
        ORDER BY id DESC
        LIMIT 50
    """)

    rows = cursor.fetchall()
    conn.close()

    return jsonify([dict(row) for row in rows])


@app.route("/")
def home():
    return "Smart Mine Safety Helmet Backend Running"


if __name__ == "__main__":

    create_database()

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
