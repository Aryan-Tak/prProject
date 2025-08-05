#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h> 

const char* ssid = "SDP";
const char* password = "123456789";

const int RELAY_PIN = 15; // Pump relay
const int SERVO_PIN = 12; // Servo signal
const int SOIL_PIN = 13;  // Soil sensor

WebServer server(80);
Servo soilServo;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Pump OFF at startup

  soilServo.attach(SERVO_PIN);
  pinMode(SOIL_PIN, INPUT);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi...");
  WiFi.setSleep(false);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
  Serial.print("IP: "); Serial.println(WiFi.localIP());

  server.on("/", HTTP_GET, handleRoot);
  server.on("/pump_start", HTTP_GET, handlePumpStart);
  server.on("/pump_stop", HTTP_GET, handlePumpStop);
  server.on("/servo_start", HTTP_GET, handleServoStart);
  server.on("/servo_stop", HTTP_GET, handleServoStop);

  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>Pump & Servo Control</title></head><body>";
  html += "<h1>ESP32 Pump & Servo Control</h1>";
  html += "<button onclick=\"fetch('/pump_start')\">💧 Start Pump</button> ";
  html += "<button onclick=\"fetch('/pump_stop')\">🛑 Stop Pump</button> ";
  html += "<button onclick=\"fetch('/servo_start')\">🔄 Start Servo & Read Soil</button>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handlePumpStart() {
  digitalWrite(RELAY_PIN, LOW); // Turn ON relay (pump ON)
  Serial.println("Pump started");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"pump\":\"ON\"}");
}

void handlePumpStop() {
  digitalWrite(RELAY_PIN, HIGH); // Turn OFF relay (pump OFF)
  Serial.println("Pump stopped");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"pump\":\"OFF\"}");
}

void handleServoStart() {
  soilServo.write(30); // Move servo to 30°
  delay(500); // Wait for servo to move

  int soilValue = analogRead(SOIL_PIN); // Read soil sensor

  Serial.printf("Servo moved to 30°, Soil sensor reading: %d\n", soilValue);

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", 
    String("{\"servo_angle\":30,\"soil_value\":") + soilValue + "}"
  );
}

void handleServoStop() {
  soilServo.write(0); // Move servo to 0° (stop position)
  delay(500);
  Serial.println("Servo stopped (moved to 0°)");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"servo\":\"stopped\",\"angle\":0}");
}