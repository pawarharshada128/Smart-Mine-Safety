
import random

def generate_sensor_data():

    # Normal sensor readings
    gas = random.randint(300, 1200)
    temperature = round(random.uniform(28, 38), 2)
    humidity = round(random.uniform(35, 65), 2)

    flame = 1
    sos = False

    acceleration = round(random.uniform(9.5, 10.2), 2)

    # Emergency testing
    if random.random() < 0.2:
        gas = 1800
        temperature = 45
        flame = 0
        sos = True

    emergency = (
        gas > 1500 or
        flame == 0 or
        sos
    )

    return {
        "temperature": temperature,
        "humidity": humidity,
        "gas": gas,
        "flame": flame,
        "sos": sos,
        "acceleration": acceleration,
        "emergency": emergency,
        "latitude": 20.1667,
        "longitude": 74.4500,
        "mode": "SIMULATION"
    }
