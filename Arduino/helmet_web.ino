// ==========================================
// SMART MINE WORKER SAFETY HELMET
// WIFI + FLASK WEBSITE CODE
// File: helmet_web.ino
// ==========================================

#include <Wire.h>
#include <DHT.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <math.h>

// -------- PIN CONFIGURATION --------
#define DHT_PIN 4
#define DHT_TYPE DHT22

#define MQ_PIN 34
#define FLAME_PIN 25
#define SOS_PIN 27
#define BUZZER_PIN 26

#define GPS_RX 16
#define GPS_TX 17

// -------- WIFI CONFIGURATION --------
const char* ssid = "YOUR_NEW_WIFI_NAME";
const char* password = "YOUR_NEW_WIFI_PASSWORD";

const char* serverURL =
"http://192.168.31.77:5000/api/sensor-data";
// -------- OBJECTS --------
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;

HardwareSerial gpsSerial(1);

// -------- VARIABLES --------
bool mpuAvailable = false;

// -------- FUNCTION DECLARATION --------
void sendSensorData(
  float temperature,
  float humidity,
  int gasValue,
  int flameValue,
  bool sosPressed,
  float acceleration,
  bool emergency
);

void setup() {

  Serial.begin(115200);

  // WIFI CONNECTION
  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi");

  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startTime < 15000) {

    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi Connected!");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi not connected");
  }

  // SENSOR INITIALIZATION
  pinMode(MQ_PIN, INPUT);
  pinMode(FLAME_PIN, INPUT);
  pinMode(SOS_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);

  dht.begin();

  Wire.begin(21, 22);

  mpuAvailable = mpu.begin(0x68, &Wire);

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  Serial.println();
  Serial.println("SMART MINE WORKER SAFETY HELMET");
  Serial.println("SYSTEM STARTED");
  Serial.println("-------------------------------");

  if (mpuAvailable) {
    Serial.println("MPU6050: CONNECTED");
  } else {
    Serial.println("MPU6050: NOT AVAILABLE");
  }
}

// -------- MAIN LOOP --------
void loop() {

  // GPS DATA
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  // DHT22 SENSOR
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // MQ GAS SENSOR
  int gasValue = analogRead(MQ_PIN);

  // FLAME SENSOR
  int flameValue = digitalRead(FLAME_PIN);

  // SOS BUTTON
  bool sosPressed = (digitalRead(SOS_PIN) == LOW);

  // MPU6050 SENSOR
  float totalAcceleration = 0;

  if (mpuAvailable) {
    sensors_event_t a, g, temp;

    mpu.getEvent(&a, &g, &temp);

    totalAcceleration = sqrt(
      a.acceleration.x * a.acceleration.x +
      a.acceleration.y * a.acceleration.y +
      a.acceleration.z * a.acceleration.z
    );
  }

  // EMERGENCY CONDITIONS
  bool emergency = sosPressed ||
                   (flameValue == LOW) ||
                   (gasValue > 1500);

  // BUZZER
  digitalWrite(BUZZER_PIN, emergency ? HIGH : LOW);

  // SEND DATA TO FLASK WEBSITE
  sendSensorData(
    temperature,
    humidity,
    gasValue,
    flameValue,
    sosPressed,
    totalAcceleration,
    emergency
  );

  // SERIAL MONITOR OUTPUT
  Serial.println();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT22: READ ERROR");
  } else {
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.println(" C");

    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  }

  Serial.print("MQ Gas Raw Value: ");
  Serial.println(gasValue);

  Serial.print("Flame DO Value: ");
  Serial.println(flameValue);

  Serial.print("SOS Button: ");
  Serial.println(sosPressed ? "PRESSED" : "NOT PRESSED");

  if (mpuAvailable) {
    Serial.print("Total Acceleration: ");
    Serial.print(totalAcceleration);
    Serial.println(" m/s^2");
  } else {
    Serial.println("MPU6050: NOT AVAILABLE");
  }

  if (gps.location.isValid()) {
    Serial.print("GPS Latitude: ");
    Serial.println(gps.location.lat(), 6);

    Serial.print("GPS Longitude: ");
    Serial.println(gps.location.lng(), 6);
  } else {
    Serial.println("GPS: WAITING FOR FIX");
  }

  if (emergency) {
    Serial.println("EMERGENCY: ALERT DETECTED!");
    Serial.println("!!! ALERT ACTIVE !!!");
  } else {
    Serial.println("SYSTEM STATUS: NORMAL");
  }

  Serial.println("-------------------------------");

  delay(2000);
}

// -------- SEND DATA TO FLASK --------
void sendSensorData(
  float temperature,
  float humidity,
  int gasValue,
  int flameValue,
  bool sosPressed,
  float acceleration,
  bool emergency
) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected - data not sent");
    return;
  }

  HTTPClient http;
  WiFiClient client;

  http.begin(client, serverURL);

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  // HANDLE INVALID SENSOR VALUES
  String tempJSON = isnan(temperature)
    ? "null" : String(temperature, 2);

  String humidityJSON = isnan(humidity)
    ? "null" : String(humidity, 2);

  String latitudeJSON = gps.location.isValid()
    ? String(gps.location.lat(), 6) : "null";

  String longitudeJSON = gps.location.isValid()
    ? String(gps.location.lng(), 6) : "null";

  // CREATE JSON DATA
  String json = "{";

  json += "\"temperature\":" + tempJSON + ",";
  json += "\"humidity\":" + humidityJSON + ",";
  json += "\"gas\":" + String(gasValue) + ",";
  json += "\"flame\":" + String(flameValue) + ",";
  json += "\"sos\":" + String(sosPressed ? "true" : "false") + ",";
  json += "\"acceleration\":" + String(acceleration, 2) + ",";
  json += "\"emergency\":" + String(emergency ? "true" : "false") + ",";
  json += "\"latitude\":" + latitudeJSON + ",";
  json += "\"longitude\":" + longitudeJSON;

  json += "}";

  // SEND HTTP POST REQUEST
  int responseCode = http.POST(json);

  Serial.print("Server Response: ");
  Serial.println(responseCode);

  if (responseCode > 0) {
    Serial.println("Sensor data sent to website!");
    Serial.println(http.getString());
  } else {
    Serial.println("Failed to send sensor data");
  }

  http.end();
}