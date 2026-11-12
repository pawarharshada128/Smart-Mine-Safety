
from flask import Flask, jsonify, request
from flask_cors import CORS
from simulator import generate_sensor_data

import sqlite3
import os
from datetime import datetime

# =====================================
# FLASK APPLICATION
# =====================================

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "helmet.db")


# =====================================
# DATABASE CONNECTION
# =====================================

def get_db_connection():

    conn = sqlite3.connect(DB_NAME, timeout=10)
    conn.row_factory = sqlite3.Row

    return conn


# =====================================
# CREATE DATABASE TABLE
# =====================================

def create_database():

    conn = get_db_connection()
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


# =====================================
# SAVE SENSOR DATA
# =====================================

def save_data(data):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO sensor_history (
            temperature,
            humidity,
            gas,
            flame,
            sos,
            acceleration,
            emergency,
            latitude,
            longitude,
            mode,
            timestamp
        )
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


# =====================================
# HOME API
# =====================================

@app.route("/")
def home():

    return jsonify({

        "message": "Smart Mine Safety Helmet Backend Running",
        "status": "Online",
        "mode": "Cloud Server"

    })


# =====================================
# HEALTH CHECK
# =====================================

@app.route("/health")
def health():

    return jsonify({

        "status": "online",
        "project": "Smart Mine Safety Helmet"

    })


# =====================================
# GET SIMULATED SENSOR DATA
# =====================================

@app.route("/api/sensor-data", methods=["GET"])
def get_sensor_data():

    try:

        data = generate_sensor_data()

        # Emergency testing mode
        if request.args.get("test") == "emergency":

            data["gas"] = 2000
            data["flame"] = 0
            data["sos"] = True
            data["emergency"] = True

        else:

            data["emergency"] = (
                bool(data.get("sos", False)) or
                int(data.get("flame", 1)) == 0 or
                float(data.get("gas", 0)) > 1500
            )

        save_data(data)

        return jsonify(data), 200

    except Exception as e:

        app.logger.exception("Sensor data error")

        return jsonify({
            "error": str(e)
        }), 500


# =====================================
# RECEIVE ESP32 SENSOR DATA
# =====================================

@app.route("/api/sensor-data", methods=["POST"])
def receive_sensor_data():

    try:

        data = request.get_json(silent=True)

        if not isinstance(data, dict):

            return jsonify({
                "message": "Invalid JSON data"
            }), 400

        required_fields = [
            "temperature",
            "humidity",
            "gas",
            "flame",
            "sos",
            "acceleration"
        ]

        missing_fields = [
            field for field in required_fields
            if field not in data
        ]

        if missing_fields:

            return jsonify({
                "message": "Missing required fields",
                "fields": missing_fields
            }), 400

        # Validate numeric values
        try:

            data["temperature"] = float(data["temperature"])
            data["humidity"] = float(data["humidity"])
            data["gas"] = int(data["gas"])
            data["flame"] = int(data["flame"])
            data["acceleration"] = float(data["acceleration"])

        except (TypeError, ValueError):

            return jsonify({
                "message": "Invalid sensor values"
            }), 400

        if data["flame"] not in (0, 1):

            return jsonify({
                "message": "Flame value must be 0 or 1"
            }), 400

        data["sos"] = bool(data["sos"])
        data["mode"] = "HARDWARE"

        # Calculate emergency status
        data["emergency"] = (
            data["sos"] or
            data["flame"] == 0 or
            data["gas"] > 1500
        )

        save_data(data)

        print("ESP32 DATA RECEIVED:", data)

        return jsonify({

            "message": "Sensor data received successfully",
            "status": "success",
            "emergency": data["emergency"]

        }), 200

    except Exception as e:

        app.logger.exception("ESP32 data error")

        return jsonify({
            "message": "Server error",
            "error": str(e)
        }), 500


# =====================================
# GET SENSOR HISTORY
# =====================================

@app.route("/api/history", methods=["GET"])
def get_history():

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM sensor_history
            ORDER BY id DESC
            LIMIT 50
        """)

        rows = cursor.fetchall()
        conn.close()

        return jsonify([
            dict(row) for row in rows
        ]), 200

    except Exception as e:

        app.logger.exception("History error")

        return jsonify({
            "error": str(e)
        }), 500


# =====================================
# SERVER START
# =====================================

create_database()


if __name__ == "__main__":

    app.run(

        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False

    )
