#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "aryantak";
const char* password = "aryantak10";

// Pin definitions
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define SERVO_PIN 18
#define RELAY_PIN 19
#define WATER_LEVEL_PIN 34
#define SOIL_MOISTURE_PIN 35

// Sensor objects
DHT dht(DHT_PIN, DHT_TYPE);
Servo moistureServo;
WebServer server(80);

// Sensor thresholds
const int DRY_SOIL_THRESHOLD = 300; // Adjust based on your sensor
const int LOW_WATER_THRESHOLD = 100; // Adjust based on your sensor

bool pumpRunning = false;

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(WATER_LEVEL_PIN, INPUT);
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  digitalWrite(RELAY_PIN, LOW); // Pump off initially
  
  // Initialize sensors
  dht.begin();
  moistureServo.attach(SERVO_PIN);
  moistureServo.write(90); // Servo up position
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Setup web server routes
  server.on("/", handleRoot);
  server.on("/check_sensors", handleSensorCheck);
  server.on("/start", handleStartPump);
  server.on("/stop", handleStopPump);
  server.on("/status", handleStatus);
  
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}

void handleRoot() {
  String html = "<h1>ESP32 Sensor Control</h1>";
  html += "<p>Commands: /check_sensors, /start, /stop, /status</p>";
  html += "<p>Pump Status: " + String(pumpRunning ? "Running" : "Stopped") + "</p>";
  server.send(200, "text/html", html);
}

void handleSensorCheck() {
  Serial.println("Received sensor check request from ESP8266");
  
  // Check water level first
  int waterLevel = analogRead(WATER_LEVEL_PIN);
  if (waterLevel < LOW_WATER_THRESHOLD) {
    Serial.println("Water level too low!");
    server.send(200, "text/plain", "Water level too low - irrigation skipped");
    return;
  }
  
  // Move servo down to check soil moisture
  Serial.println("Moving servo down to check soil moisture");
  moistureServo.write(0); // Servo down position
  delay(1000); // Wait for servo to reach position
  
  // Read soil moisture
  int soilMoisture = analogRead(SOIL_MOISTURE_PIN);
  Serial.println("Soil moisture reading: " + String(soilMoisture));
  
  // Move servo back up
  moistureServo.write(90); // Servo up position
  delay(1000);
  
  // Check if soil is dry
  if (soilMoisture > DRY_SOIL_THRESHOLD) {
    Serial.println("Soil is dry - starting irrigation");
    startPump();
    delay(5000); // Irrigate for 5 seconds
    stopPump();
    server.send(200, "text/plain", "Soil dry - irrigated for 5 seconds");
  } else {
    Serial.println("Soil moisture adequate - no irrigation needed");
    server.send(200, "text/plain", "Soil moisture adequate - no irrigation");
  }
}

void handleStartPump() {
  // Check water level before starting pump
  int waterLevel = analogRead(WATER_LEVEL_PIN);
  if (waterLevel < LOW_WATER_THRESHOLD) {
    server.send(400, "text/plain", "Cannot start pump - water level too low");
    return;
  }
  
  startPump();
  server.send(200, "text/plain", "Pump started");
}

void handleStopPump() {
  stopPump();
  server.send(200, "text/plain", "Pump stopped");
}

void handleStatus() {
  int waterLevel = analogRead(WATER_LEVEL_PIN);
  int soilMoisture = analogRead(SOIL_MOISTURE_PIN);
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  String status = "{\n";
  status += "  \"waterLevel\": " + String(waterLevel) + ",\n";
  status += "  \"soilMoisture\": " + String(soilMoisture) + ",\n";
  status += "  \"temperature\": " + String(temperature) + ",\n";
  status += "  \"humidity\": " + String(humidity) + ",\n";
  status += "  \"pumpRunning\": " + String(pumpRunning ? "true" : "false") + "\n";
  status += "}";
  
  server.send(200, "application/json", status);
}

void startPump() {
  digitalWrite(RELAY_PIN, HIGH);
  pumpRunning = true;
  Serial.println("Pump started");
}

void stopPump() {
  digitalWrite(RELAY_PIN, LOW);
  pumpRunning = false;
  Serial.println("Pump stopped");
}