#include <Wire.h>
#include <DHT.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>
#include <WiFi.h>
#include <HTTPClient.h>

// -------- PIN CONFIGURATION --------
#define DHT_PIN 4
#define DHT_TYPE DHT22

#define MQ_PIN 34
#define FLAME_PIN 25
#define SOS_PIN 27
#define BUZZER_PIN 26

#define GPS_RX 16
#define GPS_TX 17

const char* ssid = "Harshada!!";
const char* password = "Harshada@1913";
const char* serverURL = "http://192.168.31.77:5000/api/sensor-data";

// -------- OBJECTS --------
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial gpsSerial(1);

// -------- VARIABLES --------
bool mpuAvailable = false;

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

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi Connected!");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi not connected");
  }

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
}

void loop() {
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  int gasValue = analogRead(MQ_PIN);
  int flameValue = digitalRead(FLAME_PIN);
  bool sosPressed = (digitalRead(SOS_PIN) == LOW);

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

  bool emergency = sosPressed || (flameValue == LOW) || (gasValue > 1500);

  sendSensorData(
    temperature,
    humidity,
    gasValue,
    flameValue,
    sosPressed,
    totalAcceleration,
    emergency
  );

  digitalWrite(BUZZER_PIN, emergency ? HIGH : LOW);

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
    return;
  }

  HTTPClient http;
  WiFiClient client;

  http.begin(client, serverURL);
  http.addHeader("Content-Type", "application/json");

  String tempJSON = isnan(temperature) ? "null" : String(temperature, 2);
  String humidityJSON = isnan(humidity) ? "null" : String(humidity, 2);
  String latitudeJSON = gps.location.isValid() ? String(gps.location.lat(), 6) : "null";
  String longitudeJSON = gps.location.isValid() ? String(gps.location.lng(), 6) : "null";

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

  int responseCode = http.POST(json);
  Serial.print("Server Response: ");
  Serial.println(responseCode);

  http.end();
}