#include <WiFi.h>
#include <WebServer.h>

// WiFi credentials
const char* ssid = "SDP";
const char* password = "123456789";

// Relay and pump pin
const int RELAY_PIN = 15; // Relay IN connected to GPIO15

WebServer server(80);

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Pump OFF at startup

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

  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>Pump Control</title></head><body>";
  html += "<h1>ESP32 Pump Control</h1>";
  html += "<button onclick=\"fetch('/pump_start')\">💧 Start Pump</button> ";
  html += "<button onclick=\"fetch('/pump_stop')\">🛑 Stop Pump</button>";
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