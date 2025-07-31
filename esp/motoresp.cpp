#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>

// WiFi credentials
const char* ssid = "aryantak";
const char* password = "aryantak10";

// ESP32 IP address for sensor requests
const char* esp32_ip = "192.168.1.100"; // Replace with actual ESP32 IP

ESP8266WebServer server(80);
WiFiClient wifiClient;

// Motor driver pins (using your existing pin configuration)
const int ENA = D7;
const int ENB = D8;
const int IN1 = D1;
const int IN2 = D2;
const int IN3 = D5;
const int IN4 = D6;

bool automaticMode = false;
unsigned long moveStartTime = 0;
bool isMoving = false;
int currentDirection = 0; // 0=stop, 1=forward, 2=backward, 3=left, 4=right

void setup() {
  Serial.begin(115200);
  
  // Initialize motor pins
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  
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
  server.send(200, "text/html", html);
}

void handleForward() {
  if (!automaticMode) {
    moveForward();
  }
  server.send(200, "text/plain", "Moving forward");
}

void handleBackward() {
  if (!automaticMode) {
    moveBackward();
  }
  server.send(200, "text/plain", "Moving backward");
}

void handleLeft() {
  if (!automaticMode) {
    turnLeft();
  }
  server.send(200, "text/plain", "Turning left");
}

void handleRight() {
  if (!automaticMode) {
    turnRight();
  }
  server.send(200, "text/plain", "Turning right");
}

void handleStop() {
  stopMotors();
  server.send(200, "text/plain", "Motors stopped");
}

void handleAutomatic() {
  automaticMode = true;
  isMoving = false;
  moveStartTime = millis();
  server.send(200, "text/plain", "Automatic mode enabled");
  Serial.println("Automatic mode enabled");
}

void handleManual() {
  automaticMode = false;
  stopMotors();
  server.send(200, "text/plain", "Manual mode enabled");
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
    
    // Send request to ESP32 for sensor check and irrigation
    requestSensorCheck();
    
    // Wait 5 seconds before next cycle
    delay(5000);
  }
}

void requestSensorCheck() {
  HTTPClient http;
  http.begin(wifiClient, String("http://") + esp32_ip + "/check_sensors");
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("ESP32 Response: " + response);
  } else {
    Serial.println("Error connecting to ESP32: " + String(httpResponseCode));
  }
  
  http.end();
}

void moveForward() {
  currentDirection = 1;
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 255);
  analogWrite(ENB, 255);
  Serial.println("Moving forward");
}

void moveBackward() {
  currentDirection = 2;
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  analogWrite(ENA, 255);
  analogWrite(ENB, 255);
  Serial.println("Moving backward");
}

void turnLeft() {
  currentDirection = 3;
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 255);
  analogWrite(ENB, 255);
  Serial.println("Turning left");
}

void turnRight() {
  currentDirection = 4;
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  analogWrite(ENA, 255);
  analogWrite(ENB, 255);
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