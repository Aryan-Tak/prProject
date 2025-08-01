#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <Servo.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "aryantak";
const char* password = "aryantak10";

// Pin definitions for ESP8266
#define DHT_PIN D4       // GPIO2
#define DHT_TYPE DHT22
#define SERVO_PIN D3     // GPIO0  
#define RELAY_PIN D1     // GPIO5
#define WATER_LEVEL_PIN A0   // Analog pin
#define SOIL_MOISTURE_PIN A0 // Note: ESP8266 has only one analog pin

// Sensor objects
DHT dht(DHT_PIN, DHT_TYPE);
Servo moistureServo;
ESP8266WebServer server(80);

// Sensor thresholds
const int DRY_SOIL_THRESHOLD = 300; // Adjust based on your sensor
const int LOW_WATER_THRESHOLD = 100; // Adjust based on your sensor

bool pumpRunning = false;
bool useWaterSensor = true; // Flag to alternate between sensors

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Pump off initially
  
  // Initialize sensors
  dht.begin();
  moistureServo.attach(SERVO_PIN);
  moistureServo.write(90); // Servo up position
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Setup web server routes
  server.on("/", handleRoot);
  server.on("/check_sensors", handleSensorCheck);
  server.on("/start", handleStartPump);
  server.on("/stop", handleStopPump);
  server.on("/status", handleStatus);
  server.on("/ping", handlePing);
  
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}

void handleRoot() {
  String html = "<h1>ESP8266 Sensor Control</h1>";
  html += "<p>Commands: /check_sensors, /start, /stop, /status, /ping</p>";
  html += "<p>Pump Status: " + String(pumpRunning ? "Running" : "Stopped") + "</p>";
  html += "<p>IP Address: " + WiFi.localIP().toString() + "</p>";
  html += "<p>Note: Water and soil sensors share A0 pin</p>";
  server.send(200, "text/html", html);
}

void handlePing() {
  String response = "{";
  response += "\"status\":\"online\",";
  response += "\"device\":\"ESP8266 Sensor Controller\",";
  response += "\"pumpStatus\":\"" + String(pumpRunning ? "running" : "stopped") + "\",";
  response += "\"uptime\":" + String(millis()) + ",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("Ping received");
}

void handleSensorCheck() {
  Serial.println("Received sensor check request");
  
  // Read water level (using A0)
  useWaterSensor = true;
  delay(100); // Allow sensor to stabilize
  int waterLevel = analogRead(A0);
  Serial.println("Water level reading: " + String(waterLevel));
  
  if (waterLevel < LOW_WATER_THRESHOLD) {
    Serial.println("Water level too low!");
    
    String response = "{";
    response += "\"status\":\"error\",";
    response += "\"message\":\"Water level too low - irrigation skipped\",";
    response += "\"waterLevel\":" + String(waterLevel) + ",";
    response += "\"timestamp\":\"" + String(millis()) + "\"";
    response += "}";
    
    server.send(200, "application/json", response);
    return;
  }
  
  // Move servo down to check soil moisture
  Serial.println("Moving servo down to check soil moisture");
  moistureServo.write(0); // Servo down position
  delay(1000); // Wait for servo to reach position
  
  // Switch to soil moisture sensor (using A0)
  useWaterSensor = false;
  delay(100); // Allow sensor to stabilize
  int soilMoisture = analogRead(A0);
  Serial.println("Soil moisture reading: " + String(soilMoisture));
  
  // Move servo back up
  moistureServo.write(90); // Servo up position
  delay(1000);
  
  // Prepare response
  String response = "{";
  response += "\"status\":\"success\",";
  response += "\"waterLevel\":" + String(waterLevel) + ",";
  response += "\"soilMoisture\":" + String(soilMoisture) + ",";
  
  // Check if soil is dry
  if (soilMoisture > DRY_SOIL_THRESHOLD) {
    Serial.println("Soil is dry - starting irrigation");
    startPump();
    delay(5000); // Irrigate for 5 seconds
    stopPump();
    
    response += "\"irrigated\":true,";
    response += "\"message\":\"Soil dry - irrigated for 5 seconds\",";
  } else {
    Serial.println("Soil moisture adequate - no irrigation needed");
    response += "\"irrigated\":false,";
    response += "\"message\":\"Soil moisture adequate - no irrigation\",";
  }
  
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
}

void handleStartPump() {
  // Check water level before starting pump
  useWaterSensor = true;
  delay(100);
  int waterLevel = analogRead(A0);
  
  if (waterLevel < LOW_WATER_THRESHOLD) {
    String response = "{";
    response += "\"status\":\"error\",";
    response += "\"message\":\"Cannot start pump - water level too low\",";
    response += "\"waterLevel\":" + String(waterLevel) + ",";
    response += "\"timestamp\":\"" + String(millis()) + "\"";
    response += "}";
    
    server.send(400, "application/json", response);
    return;
  }
  
  startPump();
  
  String response = "{";
  response += "\"status\":\"success\",";
  response += "\"message\":\"Pump started\",";
  response += "\"pumpRunning\":true,";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
}

void handleStopPump() {
  stopPump();
  
  String response = "{";
  response += "\"status\":\"success\",";
  response += "\"message\":\"Pump stopped\",";
  response += "\"pumpRunning\":false,";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
}

void handleStatus() {
  // Read water level
  useWaterSensor = true;
  delay(100);
  int waterLevel = analogRead(A0);
  
  // Read soil moisture  
  useWaterSensor = false;
  delay(100);
  int soilMoisture = analogRead(A0);
  
  // Read DHT sensor
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  // Check for valid DHT readings
  if (isnan(temperature)) temperature = -999;
  if (isnan(humidity)) humidity = -999;
  
  String status = "{";
  status += "\"status\":\"success\",";
  status += "\"waterLevel\":" + String(waterLevel) + ",";
  status += "\"soilMoisture\":" + String(soilMoisture) + ",";
  status += "\"temperature\":" + String(temperature) + ",";
  status += "\"humidity\":" + String(humidity) + ",";
  status += "\"pumpRunning\":" + String(pumpRunning ? "true" : "false") + ",";
  status += "\"uptime\":" + String(millis()) + ",";
  status += "\"timestamp\":\"" + String(millis()) + "\"";
  status += "}";
  
  server.send(200, "application/json", status);
  Serial.println("Status requested - Water: " + String(waterLevel) + ", Soil: " + String(soilMoisture));
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