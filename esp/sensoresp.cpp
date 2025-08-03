#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "SDP";
const char* password = "123456789";

// Motor ESP32 IP address
const char* motor_esp32_ip = "10.109.46.244";

WebServer server(80);
WiFiClient wifiClient;

// Sensor pins
#define SOIL_MOISTURE_PIN A0    // GPIO36 - Capacitive soil moisture sensor (analog)
#define DHT_PIN 4               // GPIO4 - DHT22 sensor
#define WATER_LEVEL_PIN A3      // GPIO39 - Water level sensor (analog)
#define SERVO_PIN 18            // GPIO18 - Servo motor
#define RELAY_PIN 19            // GPIO19 - Pump relay
#define LED_PIN 2               // GPIO2 - Status LED

// DHT sensor setup
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// Servo setup
Servo soilServo;

// Sensor thresholds
const int DRY_SOIL_THRESHOLD = 2800;    // Higher value = drier soil (adjust based on your sensor)
const int MIN_WATER_LEVEL = 100;        // Minimum water level to allow pumping
const int SERVO_DOWN_ANGLE = 90;        // Servo angle to lower sensor into soil
const int SERVO_UP_ANGLE = 0;           // Servo angle to lift sensor from soil

// System states
bool automaticMode = false;
bool pumpRunning = false;
bool servoDown = false;
unsigned long lastSensorCheck = 0;
unsigned long pumpStartTime = 0;
const unsigned long PUMP_DURATION = 5000;      // Pump for 5 seconds when irrigating
const unsigned long SENSOR_CHECK_INTERVAL = 30000; // Check sensors every 30 seconds in auto mode

// Sensor data structure
struct SensorData {
  int soilMoisture;
  float temperature;
  float humidity;
  int waterLevel;
  bool needsIrrigation;
  String status;
};

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // Ensure pump is off
  digitalWrite(LED_PIN, LOW);
  
  // Initialize servo
  soilServo.attach(SERVO_PIN);
  soilServo.write(SERVO_UP_ANGLE);  // Start with servo up
  servoDown = false;
  
  // Initialize DHT sensor
  dht.begin();
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Blink LED while connecting
  }
  Serial.println(" connected!");
  Serial.print("Sensor ESP32 IP address: ");
  Serial.println(WiFi.localIP());
  digitalWrite(LED_PIN, HIGH); // Solid LED when connected
  
  // Disable WiFi sleep mode for faster response
  WiFi.setSleep(false);
  Serial.println("WiFi sleep mode disabled for faster response");
  
  // Setup web server routes
  server.on("/", handleRoot);
  server.on("/start", HTTP_GET, handleStartPump);           // Manual pump start
  server.on("/stop", HTTP_GET, handleStopPump);             // Manual pump stop
  server.on("/check_sensors", HTTP_GET, handleCheckSensors);// Check all sensors
  server.on("/automatic", HTTP_GET, handleAutomatic);       // Enable automatic mode
  server.on("/manual", HTTP_GET, handleManual);             // Disable automatic mode
  server.on("/ping", HTTP_GET, handlePing);                 // Status ping
  server.on("/servo_down", HTTP_GET, handleServoDown);      // Lower servo manually
  server.on("/servo_up", HTTP_GET, handleServoUp);          // Raise servo manually
  
  // Add OPTIONS handler for CORS preflight requests
  server.on("/start", HTTP_OPTIONS, handleOptions);
  server.on("/stop", HTTP_OPTIONS, handleOptions);
  server.on("/check_sensors", HTTP_OPTIONS, handleOptions);
  server.on("/automatic", HTTP_OPTIONS, handleOptions);
  server.on("/manual", HTTP_OPTIONS, handleOptions);
  server.on("/ping", HTTP_OPTIONS, handleOptions);
  
  // Enable CORS for all routes
  server.enableCORS(true);
  
  server.begin();
  Serial.println("HTTP server started with CORS support");
  Serial.println("\n=== ESP32 Sensor System Ready ===");
  Serial.println("Sensors: Soil Moisture, DHT22, Water Level");
  Serial.println("Actuators: Servo, Pump Relay");
  Serial.println("Pin Configuration:");
  Serial.println("- Soil Moisture: A0 (GPIO36)");
  Serial.println("- DHT22: GPIO4");
  Serial.println("- Water Level: A3 (GPIO39)");
  Serial.println("- Servo: GPIO18");
  Serial.println("- Relay: GPIO19");
  Serial.println("- LED: GPIO2");
  Serial.println("=====================================\n");
}

void loop() {
  server.handleClient();
  
  // Handle automatic mode logic
  if (automaticMode) {
    handleAutomaticIrrigation();
  }
  
  // Handle pump timer (auto stop after duration)
  if (pumpRunning && (millis() - pumpStartTime >= PUMP_DURATION)) {
    stopPump();
    Serial.println("🛑 Pump auto-stopped after " + String(PUMP_DURATION/1000) + " seconds");
  }
}

void handleRoot() {
  SensorData data = readAllSensors();
  
  String html = "<html><head><title>ESP32 Sensor Control</title>";
  html += "<style>body{font-family:Arial;margin:40px;} h1{color:#2E8B57;} p{margin:10px 0;} a{color:#1E90FF;text-decoration:none;margin:5px;} a:hover{text-decoration:underline;}</style>";
  html += "</head><body>";
  html += "<h1>🌱 ESP32 Irrigation Sensor System</h1>";
  html += "<h2>Current Sensor Readings:</h2>";
  html += "<p>🌡️ Temperature: <b>" + String(data.temperature, 1) + "°C</b></p>";
  html += "<p>💧 Humidity: <b>" + String(data.humidity, 1) + "%</b></p>";
  html += "<p>🌱 Soil Moisture: <b>" + String(data.soilMoisture) + "</b> (" + getSoilStatus(data.soilMoisture) + ")</p>";
  html += "<p>🚰 Water Level: <b>" + String(data.waterLevel) + "</b></p>";
  html += "<p>⚙️ Mode: <b>" + String(automaticMode ? "Automatic" : "Manual") + "</b></p>";
  html += "<p>💦 Pump: <b>" + String(pumpRunning ? "Running" : "Stopped") + "</b></p>";
  html += "<p>🔧 Servo: <b>" + String(servoDown ? "Down (sensing)" : "Up (idle)") + "</b></p>";
  html += "<p>📡 Motor ESP32: <b>" + String(motor_esp32_ip) + "</b></p>";
  
  html += "<h2>Manual Controls:</h2>";
  html += "<p><a href='/start' style='background:#28a745;color:white;padding:10px;border-radius:5px;'>🟢 Start Pump</a>";
  html += " <a href='/stop' style='background:#dc3545;color:white;padding:10px;border-radius:5px;'>🔴 Stop Pump</a></p>";
  html += "<p><a href='/servo_down'>⬇️ Servo Down</a> | <a href='/servo_up'>⬆️ Servo Up</a></p>";
  html += "<p><a href='/check_sensors'>🔍 Check Sensors</a></p>";
  html += "<p><a href='/automatic'>🤖 Auto Mode</a> | <a href='/manual'>👤 Manual Mode</a></p>";
  
  html += "<h2>System Thresholds:</h2>";
  html += "<p>Dry Soil Threshold: <b>" + String(DRY_SOIL_THRESHOLD) + "</b></p>";
  html += "<p>Min Water Level: <b>" + String(MIN_WATER_LEVEL) + "</b></p>";
  html += "<p>Pump Duration: <b>" + String(PUMP_DURATION/1000) + " seconds</b></p>";
  
  html += "<h2>Status Messages:</h2>";
  html += "<p><b>" + data.status + "</b></p>";
  
  html += "<p><small>Last updated: " + String(millis()/1000) + " seconds since boot</small></p>";
  html += "</body></html>";
  
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  server.send(200, "text/html", html);
}

void handleStartPump() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  SensorData data = readAllSensors();
  
  if (data.waterLevel < MIN_WATER_LEVEL) {
    String response = "{";
    response += "\"command\":\"start_pump\",";
    response += "\"status\":\"error\",";
    response += "\"message\":\"Water level too low for pumping\",";
    response += "\"waterLevel\":" + String(data.waterLevel) + ",";
    response += "\"requiredLevel\":" + String(MIN_WATER_LEVEL) + ",";
    response += "\"timestamp\":\"" + String(millis()) + "\"";
    response += "}";
    
    server.send(400, "application/json", response);
    Serial.println("❌ Pump start denied - Low water level: " + String(data.waterLevel) + " (min: " + String(MIN_WATER_LEVEL) + ")");
    return;
  }
  
  startPump();
  
  String response = "{";
  response += "\"command\":\"start_pump\",";
  response += "\"status\":\"success\",";
  response += "\"pumpStatus\":\"running\",";
  response += "\"waterLevel\":" + String(data.waterLevel) + ",";
  response += "\"duration\":" + String(PUMP_DURATION) + ",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("✅ Manual pump start - Water level OK: " + String(data.waterLevel));
}

void handleStopPump() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  stopPump();
  
  String response = "{";
  response += "\"command\":\"stop_pump\",";
  response += "\"status\":\"success\",";
  response += "\"pumpStatus\":\"stopped\",";
  response += "\"message\":\"Pump manually stopped\",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("✅ Manual pump stop");
}

void handleCheckSensors() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  Serial.println("🔍 Sensor check requested - Starting servo sequence");
  
  // Step 1: Lower servo to check soil
  if (!servoDown) {
    lowerServo();
    delay(2000); // Wait for servo to reach position and soil sensor to stabilize
  }
  
  // Step 2: Read all sensors
  SensorData data = readAllSensors();
  Serial.println("📊 Sensor reading complete - Soil: " + String(data.soilMoisture) + 
                 " (" + getSoilStatus(data.soilMoisture) + "), Water: " + String(data.waterLevel));
  
  // Step 3: Raise servo after reading (unless in automatic mode)
  if (servoDown && !automaticMode) {
    delay(1000);
    raiseServo();
    Serial.println("⬆️ Servo raised after manual sensor check");
  }
  
  String response = "{";
  response += "\"command\":\"check_sensors\",";
  response += "\"status\":\"success\",";
  response += "\"soilMoisture\":" + String(data.soilMoisture) + ",";
  response += "\"soilStatus\":\"" + getSoilStatus(data.soilMoisture) + "\",";
  response += "\"temperature\":" + String(data.temperature, 1) + ",";
  response += "\"humidity\":" + String(data.humidity, 1) + ",";
  response += "\"waterLevel\":" + String(data.waterLevel) + ",";
  response += "\"needsIrrigation\":" + String(data.needsIrrigation ? "true" : "false") + ",";
  response += "\"irrigated\":" + String(data.needsIrrigation ? "true" : "false") + ",";
  response += "\"message\":\"" + data.status + "\",";
  response += "\"servoMoved\":\"true\",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("📊 Sensor check completed: " + data.status);
  
  // Step 4: If irrigation needed and water available, start pump
  if (data.needsIrrigation && data.waterLevel >= MIN_WATER_LEVEL && !pumpRunning) {
    startPump();
    Serial.println("💧 Auto-irrigation started based on sensor reading");
  }
}

void handleServoDown() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  lowerServo();
  
  String response = "{";
  response += "\"command\":\"servo_down\",";
  response += "\"status\":\"success\",";
  response += "\"servoPosition\":\"down\",";
  response += "\"angle\":" + String(SERVO_DOWN_ANGLE) + ",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("⬇️ Servo manually lowered to " + String(SERVO_DOWN_ANGLE) + "°");
}

void handleServoUp() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  raiseServo();
  
  String response = "{";
  response += "\"command\":\"servo_up\",";
  response += "\"status\":\"success\",";
  response += "\"servoPosition\":\"up\",";
  response += "\"angle\":" + String(SERVO_UP_ANGLE) + ",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("⬆️ Servo manually raised to " + String(SERVO_UP_ANGLE) + "°");
}

void handleAutomatic() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  automaticMode = true;
  lastSensorCheck = 0; // Force immediate sensor check
  
  String response = "{";
  response += "\"command\":\"automatic\",";
  response += "\"status\":\"success\",";
  response += "\"mode\":\"automatic\",";
  response += "\"message\":\"Automatic irrigation mode enabled\",";
  response += "\"checkInterval\":" + String(SENSOR_CHECK_INTERVAL/1000) + ",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("🤖 Automatic irrigation mode enabled - Check interval: " + String(SENSOR_CHECK_INTERVAL/1000) + "s");
  
  // Notify motor ESP32 that we're in automatic mode
  notifyMotorESP("sensor_ready");
}

void handleManual() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  automaticMode = false;
  
  // Raise servo if it's down
  if (servoDown) {
    raiseServo();
    Serial.println("⬆️ Servo raised when switching to manual mode");
  }
  
  String response = "{";
  response += "\"command\":\"manual\",";
  response += "\"status\":\"success\",";
  response += "\"mode\":\"manual\",";
  response += "\"message\":\"Manual control mode enabled\",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("👤 Manual control mode enabled");
  
  // Notify motor ESP32 that we're in manual mode
  notifyMotorESP("manual_mode");
}

void handlePing() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  SensorData data = readAllSensors();
  
  String response = "{";
  response += "\"status\":\"online\",";
  response += "\"device\":\"ESP32 Sensor Controller\",";
  response += "\"mode\":\"" + String(automaticMode ? "automatic" : "manual") + "\",";
  response += "\"pumpStatus\":\"" + String(pumpRunning ? "running" : "stopped") + "\",";
  response += "\"servoPosition\":\"" + String(servoDown ? "down" : "up") + "\",";
  response += "\"soilMoisture\":" + String(data.soilMoisture) + ",";
  response += "\"temperature\":" + String(data.temperature, 1) + ",";
  response += "\"humidity\":" + String(data.humidity, 1) + ",";
  response += "\"waterLevel\":" + String(data.waterLevel) + ",";
  response += "\"uptime\":" + String(millis()) + ",";
  response += "\"freeHeap\":" + String(ESP.getFreeHeap()) + ",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("📡 Ping received - Status: " + String(automaticMode ? "Auto" : "Manual") + 
                 ", Pump: " + String(pumpRunning ? "ON" : "OFF") + 
                 ", Servo: " + String(servoDown ? "DOWN" : "UP"));
}

void handleOptions() {
  // Handle CORS preflight requests
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "text/plain", "");
}

void handleAutomaticIrrigation() {
  // Check if it's time for sensor reading
  if (millis() - lastSensorCheck >= SENSOR_CHECK_INTERVAL) {
    lastSensorCheck = millis();
    
    Serial.println("🤖 Automatic mode: Starting sensor check cycle");
    
    // Step 1: Lower servo
    if (!servoDown) {
      lowerServo();
      delay(2000); // Wait for servo and sensor stabilization
    }
    
    // Step 2: Read sensors
    SensorData data = readAllSensors();
    Serial.println("📊 Auto sensor reading - Soil: " + String(data.soilMoisture) + 
                   " (" + getSoilStatus(data.soilMoisture) + "), Water: " + String(data.waterLevel));
    
    // Step 3: Decide on irrigation
    if (data.needsIrrigation && data.waterLevel >= MIN_WATER_LEVEL && !pumpRunning) {
      Serial.println("💧 Soil is dry (" + String(data.soilMoisture) + " > " + String(DRY_SOIL_THRESHOLD) + ") - Starting irrigation");
      startPump();
      
      // Notify motor ESP32 that irrigation is happening
      notifyMotorESP("irrigating");
    } else if (!data.needsIrrigation) {
      Serial.println("✅ Soil moisture OK (" + String(data.soilMoisture) + " <= " + String(DRY_SOIL_THRESHOLD) + ") - No irrigation needed");
      
      // Notify motor ESP32 to continue moving
      notifyMotorESP("continue_movement");
    } else if (data.waterLevel < MIN_WATER_LEVEL) {
      Serial.println("⚠️ Water level too low (" + String(data.waterLevel) + " < " + String(MIN_WATER_LEVEL) + ") for irrigation");
      
      // Notify motor ESP32 about low water
      notifyMotorESP("low_water");
    } else if (pumpRunning) {
      Serial.println("💦 Pump already running - waiting for completion");
    }
    
    // Step 4: Raise servo after check
    delay(1000);
    raiseServo();
    Serial.println("🔄 Automatic sensor cycle completed - Next check in " + String(SENSOR_CHECK_INTERVAL/1000) + " seconds");
  }
}

SensorData readAllSensors() {
  SensorData data;
  
  // Read soil moisture (higher value = drier soil for capacitive sensor)
  data.soilMoisture = analogRead(SOIL_MOISTURE_PIN);
  
  // Read DHT22
  data.temperature = dht.readTemperature();
  data.humidity = dht.readHumidity();
  
  // Handle DHT reading errors
  if (isnan(data.temperature)) {
    data.temperature = 0.0;
    Serial.println("⚠️ DHT22 temperature reading failed");
  }
  if (isnan(data.humidity)) {
    data.humidity = 0.0;
    Serial.println("⚠️ DHT22 humidity reading failed");
  }
  
  // Read water level
  data.waterLevel = analogRead(WATER_LEVEL_PIN);
  
  // Determine if irrigation is needed
  data.needsIrrigation = (data.soilMoisture > DRY_SOIL_THRESHOLD);
  
  // Set status message
  if (data.needsIrrigation) {
    if (data.waterLevel >= MIN_WATER_LEVEL) {
      data.status = "Soil is dry - Irrigation recommended";
    } else {
      data.status = "Soil is dry but water level too low";
    }
  } else {
    data.status = "Soil moisture is adequate";
  }
  
  return data;
}

String getSoilStatus(int moistureValue) {
  if (moistureValue > DRY_SOIL_THRESHOLD) {
    return "DRY";
  } else if (moistureValue > DRY_SOIL_THRESHOLD - 500) {
    return "MOIST";
  } else {
    return "WET";
  }
}

void startPump() {
  if (!pumpRunning) {
    digitalWrite(RELAY_PIN, HIGH);
    pumpRunning = true;
    pumpStartTime = millis();
    Serial.println("💦 Pump started - Will run for " + String(PUMP_DURATION/1000) + " seconds");
  }
}

void stopPump() {
  if (pumpRunning) {
    digitalWrite(RELAY_PIN, LOW);
    pumpRunning = false;
    unsigned long runTime = millis() - pumpStartTime;
    Serial.println("🛑 Pump stopped after " + String(runTime/1000) + " seconds");
  }
}

void lowerServo() {
  if (!servoDown) {
    Serial.println("⬇️ Lowering servo to position " + String(SERVO_DOWN_ANGLE) + "°");
    soilServo.write(SERVO_DOWN_ANGLE);
    servoDown = true;
    delay(1000); // Give servo time to move
    Serial.println("✅ Servo positioned for soil sensing");
  }
}

void raiseServo() {
  if (servoDown) {
    Serial.println("⬆️ Raising servo to position " + String(SERVO_UP_ANGLE) + "°");
    soilServo.write(SERVO_UP_ANGLE);
    servoDown = false;
    delay(1000); // Give servo time to move
    Serial.println("✅ Servo raised from soil");
  }
}

void notifyMotorESP(String message) {
  HTTPClient http;
  String url = String("http://") + motor_esp32_ip + "/sensor_update?status=" + message;
  http.begin(url);
  http.setTimeout(5000); // Increased timeout
  
  Serial.println("📡 Notifying Motor ESP32: " + message + " at " + url);
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✅ Motor ESP32 response (" + String(httpResponseCode) + "): " + response);
  } else {
    Serial.println("❌ Failed to notify Motor ESP32 - Error: " + String(httpResponseCode));
    Serial.println("❌ Check if Motor ESP32 is running at " + String(motor_esp32_ip));
  }
  
  http.end();
}