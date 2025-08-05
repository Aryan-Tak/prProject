#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>

// WiFi credentials
const char* ssid = "SDP";
const char* password = "123456789";

// Web server on port 80
ESP8266WebServer server(80);

// Motor control pins (adjust to your ESP8266 GPIOs)
const int ENA = D1;
const int ENB = D2;
const int IN1 = D5;
const int IN2 = D6;
const int IN3 = D7;
const int IN4 = D8;

bool automaticMode = false;
unsigned long lastAutoMove = 0;
const unsigned long AUTO_MOVE_INTERVAL = 15000; // 15 seconds

String sensorEspIP = "";
const int SOIL_THRESHOLD = 500; // Adjust as needed

void setup() {
  Serial.begin(115200);

  pinMode(ENA, OUTPUT); digitalWrite(ENA, LOW);
  pinMode(ENB, OUTPUT); digitalWrite(ENB, LOW);
  pinMode(IN1, OUTPUT); digitalWrite(IN1, LOW);
  pinMode(IN2, OUTPUT); digitalWrite(IN2, LOW);
  pinMode(IN3, OUTPUT); digitalWrite(IN3, LOW);
  pinMode(IN4, OUTPUT); digitalWrite(IN4, LOW);

  stopMotors();

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Route definitions
  server.on("/", handleRoot);
  server.on("/forward", HTTP_GET, handleForward);
  server.on("/backward", HTTP_GET, handleBackward);
  server.on("/left", HTTP_GET, handleLeft);
  server.on("/right", HTTP_GET, handleRight);
  server.on("/stop", HTTP_GET, handleStop);
  server.on("/automatic", HTTP_GET, handleAutomatic);
  server.on("/manual", HTTP_GET, handleManual);
  server.on("/set_sensor_ip", HTTP_GET, handleSetSensorIP);

  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();

  if (automaticMode && sensorEspIP.length() > 0) {
    if (millis() - lastAutoMove > AUTO_MOVE_INTERVAL) {
      lastAutoMove = millis();

      moveForward();
      delay(2500);
      stopMotors();

      int soilValue = getSoilValueFromSensorESP();
      Serial.printf("Soil value from Sensor ESP: %d\n", soilValue);

      if (soilValue != -1 && soilValue < SOIL_THRESHOLD) {
        Serial.println("Soil dry, starting pump...");
        sendSensorCommand("/pump_start");
        delay(3000);
        sendSensorCommand("/pump_stop");
        Serial.println("Pump stopped.");
      } else {
        Serial.println("Soil OK, moving ahead.");
      }
    }
  }
}

// ======= HANDLERS & UTILITIES =======

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>ESP8266 Bot Control</title></head><body>";
  html += "<h1>ESP8266 Bot Control</h1><hr>";
  html += "<button onclick=\"fetch('/forward')\">↑ Forward (W)</button> ";
  html += "<button onclick=\"fetch('/left')\">← Left (A)</button> ";
  html += "<button onclick=\"fetch('/stop')\">⏹ Stop</button> ";
  html += "<button onclick=\"fetch('/right')\">→ Right (D)</button> ";
  html += "<button onclick=\"fetch('/backward')\">↓ Backward (S)</button><br><br>";
  html += "<button onclick=\"fetch('/automatic')\">🤖 Automatic Mode</button> ";
  html += "<button onclick=\"fetch('/manual')\">👤 Manual Mode</button>";
  html += "<p>Sensor ESP IP: " + sensorEspIP + "</p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void moveForward() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
  digitalWrite(ENA, HIGH); digitalWrite(ENB, HIGH);
  Serial.println("Moving forward");
}

void stopMotors() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
  digitalWrite(ENA, LOW); digitalWrite(ENB, LOW);
  Serial.println("Motors stopped");
}

void handleForward()  { if (!automaticMode) moveForward(); server.send(200, "text/plain", "Forward"); }
void handleBackward() { Serial.println("Backward"); server.send(200, "text/plain", "Backward"); }
void handleLeft()     { Serial.println("Left"); server.send(200, "text/plain", "Left"); }
void handleRight()    { Serial.println("Right"); server.send(200, "text/plain", "Right"); }
void handleStop()     { stopMotors(); server.send(200, "text/plain", "Stopped"); }

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

void handleSetSensorIP() {
  if (server.hasArg("ip")) {
    sensorEspIP = server.arg("ip");
    Serial.print("Sensor ESP IP set to: ");
    Serial.println(sensorEspIP);
    server.send(200, "text/plain", "Sensor ESP IP set to " + sensorEspIP);
  } else {
    server.send(400, "text/plain", "Missing 'ip' parameter");
  }
}

int getSoilValueFromSensorESP() {
  if (sensorEspIP.length() == 0) return -1;

  WiFiClient client;
  HTTPClient http;
  String url = "http://" + sensorEspIP + "/servo_start";
  http.begin(client, url);  // ✅ Fixed API

  int httpCode = http.GET();
  int soilValue = -1;

  if (httpCode == 200) {
    String payload = http.getString();
    int idx = payload.indexOf("soil_value");
    if (idx != -1) {
      int start = payload.indexOf(":", idx) + 1;
      int end = payload.indexOf("}", start);
      soilValue = payload.substring(start, end).toInt();
    }
  }

  http.end();
  return soilValue;
}

void sendSensorCommand(const String& endpoint) {
  if (sensorEspIP.length() == 0) return;

  WiFiClient client;
  HTTPClient http;
  String url = "http://" + sensorEspIP + endpoint;
  http.begin(client, url);  // ✅ Fixed API
  http.GET();
  http.end();
}