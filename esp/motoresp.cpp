#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>

// WiFi credentials
const char* ssid = "aryantak";
const char* password = "aryantak10";

// ESP32 IP address for sensor requests (the other ESP32 with sensors)
const char* sensor_esp32_ip = "192.168.50.76"; // Replace with actual sensor ESP32 IP

WebServer server(80);
WiFiClient wifiClient;

// Motor driver pins for ESP32
const int ENA = 18;  // PWM pin for motor A
const int ENB = 19;  // PWM pin for motor B
const int IN1 = 21;  // Motor A direction pin 1
const int IN2 = 22;  // Motor A direction pin 2
const int IN3 = 23;  // Motor B direction pin 1
const int IN4 = 25;  // Motor B direction pin 2

// PWM settings for ESP32 (new API)
const int freq = 1000;      // PWM frequency
const int resolution = 8;   // PWM resolution (0-255)

bool automaticMode = false;
unsigned long moveStartTime = 0;
bool isMoving = false;
int currentDirection = 0; // 0=stop, 1=forward, 2=backward, 3=left, 4=right

void setup() {
  Serial.begin(115200);
  
  // Initialize motor pins
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  
  // Setup PWM channels for ESP32 (NEW API)
  ledcAttach(ENA, freq, resolution);  // Attach ENA pin directly
  ledcAttach(ENB, freq, resolution);  // Attach ENB pin directly
  
  stopMotors();
  
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
  server.on("/forward", handleForward);
  server.on("/backward", handleBackward);
  server.on("/left", handleLeft);
  server.on("/right", handleRight);
  server.on("/stop", handleStop);
  server.on("/automatic", handleAutomatic);
  server.on("/manual", handleManual);
  server.on("/ping", handlePing);
  
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
  
  // Handle automatic mode logic
  if (automaticMode) {
    handleAutomaticMode();
  }
}

void handleRoot() {
  String html = "<h1>ESP32 Motor Control</h1>";
  html += "<p>Commands: /forward, /backward, /left, /right, /stop</p>";
  html += "<p>Modes: /automatic, /manual</p>";
  html += "<p>Current mode: " + String(automaticMode ? "Automatic" : "Manual") + "</p>";
  html += "<p>IP Address: " + WiFi.localIP().toString() + "</p>";
  server.send(200, "text/html", html);
}

void handleForward() {
  if (!automaticMode) {
    moveForward();
  }
  
  // Send JSON response for web app
  String response = "{";
  response += "\"command\":\"forward\",";
  response += "\"status\":\"success\",";
  response += "\"leftMotor\":\"active\",";
  response += "\"rightMotor\":\"active\",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("Command: Forward");
}

void handleBackward() {
  if (!automaticMode) {
    moveBackward();
  }
  
  String response = "{";
  response += "\"command\":\"backward\",";
  response += "\"status\":\"success\",";
  response += "\"leftMotor\":\"active\",";
  response += "\"rightMotor\":\"active\",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("Command: Backward");
}

void handleLeft() {
  if (!automaticMode) {
    turnLeft();
  }
  
  String response = "{";
  response += "\"command\":\"left\",";
  response += "\"status\":\"success\",";
  response += "\"leftMotor\":\"inactive\",";
  response += "\"rightMotor\":\"active\",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("Command: Left");
}

void handleRight() {
  if (!automaticMode) {
    turnRight();
  }
  
  String response = "{";
  response += "\"command\":\"right\",";
  response += "\"status\":\"success\",";
  response += "\"leftMotor\":\"active\",";
  response += "\"rightMotor\":\"inactive\",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("Command: Right");
}

void handleStop() {
  stopMotors();
  
  String response = "{";
  response += "\"command\":\"stop\",";
  response += "\"status\":\"success\",";
  response += "\"leftMotor\":\"inactive\",";
  response += "\"rightMotor\":\"inactive\",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("Command: Stop");
}

void handlePing() {
  String response = "{";
  response += "\"status\":\"online\",";
  response += "\"device\":\"ESP32 Motor Controller\",";
  response += "\"mode\":\"" + String(automaticMode ? "automatic" : "manual") + "\",";
  response += "\"uptime\":" + String(millis()) + ",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("Ping received");
}

void handleAutomatic() {
  automaticMode = true;
  isMoving = false;
  moveStartTime = millis();
  
  String response = "{";
  response += "\"command\":\"automatic\",";
  response += "\"status\":\"success\",";
  response += "\"mode\":\"automatic\",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("Automatic mode enabled");
}

void handleManual() {
  automaticMode = false;
  stopMotors();
  
  String response = "{";
  response += "\"command\":\"manual\",";
  response += "\"status\":\"success\",";
  response += "\"mode\":\"manual\",";
  response += "\"timestamp\":\"" + String(millis()) + "\"";
  response += "}";
  
  server.send(200, "application/json", response);
  Serial.println("Manual mode enabled");
}

void handleAutomaticMode() {
  if (!isMoving) {
    // Start moving forward for 3 seconds
    moveForward();
    isMoving = true;
    moveStartTime = millis();
    Serial.println("Auto mode: Moving forward for 3 seconds");
  } else if (millis() - moveStartTime >= 3000) {
    // Stop after 3 seconds and request sensor check
    stopMotors();
    isMoving = false;
    Serial.println("Auto mode: Stopped, requesting sensor check");
    
    // Send request to sensor ESP32 for sensor check and irrigation
    requestSensorCheck();
    
    // Wait 5 seconds before next cycle
    delay(5000);
  }
}

void requestSensorCheck() {
  HTTPClient http;
  http.begin(String("http://") + sensor_esp32_ip + "/check_sensors");
  http.setTimeout(5000); // 5 second timeout
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Sensor ESP32 Response: " + response);
  } else {
    Serial.println("Error connecting to Sensor ESP32: " + String(httpResponseCode));
  }
  
  http.end();
}

void moveForward() {
  currentDirection = 1;
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  ledcWrite(ENA, 255);  // NEW API - use pin directly
  ledcWrite(ENB, 255);  // NEW API - use pin directly
  Serial.println("Moving forward");
}

void moveBackward() {
  currentDirection = 2;
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  ledcWrite(ENA, 255);
  ledcWrite(ENB, 255);
  Serial.println("Moving backward");
}

void turnLeft() {
  currentDirection = 3;
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  ledcWrite(ENA, 255);
  ledcWrite(ENB, 255);
  Serial.println("Turning left");
}

void turnRight() {
  currentDirection = 4;
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  ledcWrite(ENA, 255);
  ledcWrite(ENB, 255);
  Serial.println("Turning right");
}

void stopMotors() {
  currentDirection = 0;
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  ledcWrite(ENA, 0);
  ledcWrite(ENB, 0);
  Serial.println("Motors stopped");
}