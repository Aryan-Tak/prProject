#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>

// WiFi credentials
const char* ssid = "aryantak";
const char* password = "aryantak10";

// ESP8266 IP address for sensor requests (your sensor ESP8266)
const char* sensor_esp8266_ip = "192.168.50.76"; // Replace with actual sensor ESP8266 IP

ESP8266WebServer server(80);
WiFiClient wifiClient;

// Motor driver pins for ESP8266
const int ENA = D5;  // GPIO14 - PWM pin for motor A
const int ENB = D6;  // GPIO12 - PWM pin for motor B
const int IN1 = D1;  // GPIO5  - Motor A direction pin 1
const int IN2 = D2;  // GPIO4  - Motor A direction pin 2
const int IN3 = D3;  // GPIO0  - Motor B direction pin 1
const int IN4 = D4;  // GPIO2  - Motor B direction pin 2

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
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  
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
  String html = "<h1>ESP8266 Motor Control</h1>";
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
  response += "\"device\":\"ESP8266 Motor Controller\",";
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
    
    // Send request to sensor ESP8266 for sensor check and irrigation
    requestSensorCheck();
    
    // Wait 5 seconds before next cycle
    delay(5000);
  }
}

void requestSensorCheck() {
  HTTPClient http;
  WiFiClient client;
  
  http.begin(client, String("http://") + sensor_esp8266_ip + "/check_sensors");
  http.setTimeout(5000); // 5 second timeout
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Sensor ESP8266 Response: " + response);
  } else {
    Serial.println("Error connecting to Sensor ESP8266: " + String(httpResponseCode));
  }
  
  http.end();
}

void moveForward() {
  currentDirection = 1;
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 1023);  // Full speed for ESP8266 (0-1023)
  analogWrite(ENB, 1023);  // Full speed for ESP8266 (0-1023)
  Serial.println("Moving forward");
}

void moveBackward() {
  currentDirection = 2;
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  analogWrite(ENA, 1023);
  analogWrite(ENB, 1023);
  Serial.println("Moving backward");
}

void turnLeft() {
  currentDirection = 3;
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 1023);
  analogWrite(ENB, 1023);
  Serial.println("Turning left");
}

void turnRight() {
  currentDirection = 4;
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  analogWrite(ENA, 1023);
  analogWrite(ENB, 1023);
  Serial.println("Turning right");
}

void stopMotors() {
  currentDirection = 0;
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
  Serial.println("Motors stopped");
}