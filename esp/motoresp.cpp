#include <WiFi.h>
#include <WebServer.h>

// WiFi credentials
const char* ssid = "SDP";
const char* password = "123456789";

WebServer server(80);

// Motor pins
const int ENA = 32;  // Motor A enable
const int ENB = 33;  // Motor B enable
const int IN1 = 14;  // Motor A direction 1
const int IN2 = 27;  // Motor A direction 2
const int IN3 = 26;  // Motor B direction 1
const int IN4 = 25;  // Motor B direction 2


// Movement state
bool isMoving = false;
int currentDirection = 0; // 0=stop, 1=forward, 2=backward, 3=left, 4=right

// Automatic mode
bool automaticMode = false;
unsigned long lastAutoMove = 0;
const unsigned long AUTO_MOVE_INTERVAL = 10000; // 10 seconds

void setup() {
  Serial.begin(115200);

  // Motor pins
  pinMode(ENA, OUTPUT); digitalWrite(ENA, LOW);
  pinMode(ENB, OUTPUT); digitalWrite(ENB, LOW);
  pinMode(IN1, OUTPUT); digitalWrite(IN1, LOW);
  pinMode(IN2, OUTPUT); digitalWrite(IN2, LOW);
  pinMode(IN3, OUTPUT); digitalWrite(IN3, LOW);
  pinMode(IN4, OUTPUT); digitalWrite(IN4, LOW);


  stopMotors();

  // WiFi connect
  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi..");
  WiFi.setSleep(false);

  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
    
  }
  Serial.println("\nConnected!");
  Serial.print("IP: "); Serial.println(WiFi.localIP());
  

  // Web Server endpoints
  server.on("/", handleRoot);
  server.on("/forward", HTTP_GET, handleForward);
  server.on("/backward", HTTP_GET, handleBackward);
  server.on("/left", HTTP_GET, handleLeft);
  server.on("/right", HTTP_GET, handleRight);
  server.on("/stop", HTTP_GET, handleStop);
  server.on("/automatic", HTTP_GET, handleAutomatic);
  server.on("/manual", HTTP_GET, handleManual);

  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();

  // Automatic mode: move forward every interval
  if (automaticMode) {
    if (millis() - lastAutoMove > AUTO_MOVE_INTERVAL) {
      lastAutoMove = millis();
      moveForward();
      delay(3000); // Move forward for 3 seconds
      stopMotors();
    }
  }
}

// ======= HANDLERS & UTILITIES =======

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>ESP32 Bot Control</title></head><body>";
  html += "<h1>ESP32 Bot Control</h1>";
  html += "<hr>";
  html += "<button onclick=\"fetch('/forward')\">↑ Forward (W)</button> ";
  html += "<button onclick=\"fetch('/left')\">← Left (A)</button> ";
  html += "<button onclick=\"fetch('/stop')\">⏹ Stop</button> ";
  html += "<button onclick=\"fetch('/right')\">→ Right (D)</button> ";
  html += "<button onclick=\"fetch('/backward')\">↓ Backward (S)</button><br><br>";
  html += "<button onclick=\"fetch('/automatic')\">🤖 Automatic Mode</button> ";
  html += "<button onclick=\"fetch('/manual')\">👤 Manual Mode</button>";
  html += "<p>Current: " + getMovementString(currentDirection) + (automaticMode ? " (AUTO)" : " (MANUAL)") + "</p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

// --- MOVEMENT ---
void moveForward() {
  currentDirection = 1;
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
  digitalWrite(ENA, HIGH); digitalWrite(ENB, HIGH);
  isMoving = true;
  Serial.println("Moving forward");
}
void moveBackward() {
  currentDirection = 2;
  digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
  digitalWrite(ENA, HIGH); digitalWrite(ENB, HIGH);
  isMoving = true;
  Serial.println("Moving backward");
}
void turnLeft() {
  currentDirection = 3;
  digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
  digitalWrite(ENA, HIGH); digitalWrite(ENB, HIGH);
  isMoving = true;
  Serial.println("Turning left");
}
void turnRight() {
  currentDirection = 4;
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
  digitalWrite(ENA, HIGH); digitalWrite(ENB, HIGH);
  isMoving = true;
  Serial.println("Turning right");
}
void stopMotors() {
  currentDirection = 0;
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
  digitalWrite(ENA, LOW); digitalWrite(ENB, LOW);
  isMoving = false;
  Serial.println("Motors stopped");
}

// --- WEB HANDLERS ---
void handleForward()  { if (!automaticMode) moveForward(); server.send(200, "text/plain", "Forward"); }
void handleBackward() { if (!automaticMode) moveBackward(); server.send(200, "text/plain", "Backward"); }
void handleLeft()     { if (!automaticMode) turnLeft();    server.send(200, "text/plain", "Left"); }
void handleRight()    { if (!automaticMode) turnRight();   server.send(200, "text/plain", "Right"); }
void handleStop()     { stopMotors();                      server.send(200, "text/plain", "Stopped"); }

void handleAutomatic() {
  automaticMode = true;
  stopMotors();
  lastAutoMove = millis();
  server.send(200, "text/plain", "Automatic mode enabled");
  Serial.println("Automatic mode enabled");
}
void handleManual() {
  automaticMode = false;
  stopMotors();
  server.send(200, "text/plain", "Manual mode enabled");
  Serial.println("Manual mode enabled");
}

// --- Utility ---
String getMovementString(int direction) {
  switch (direction) {
    case 1: return "Forward";
    case 2: return "Backward";
    case 3: return "Left";
    case 4: return "Right";
    default: return "Stopped";
  }
}