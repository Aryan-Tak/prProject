#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

// WiFi credentials
const char* ssid = "SDP";
const char* password = "123456789";

// Relay and pump pin
const int RELAY_PIN = D4; // Relay IN connected to D4 (GPIO2 on ESP8266)

ESP8266WebServer server(80);

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Pump OFF at startup (active LOW relay)

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
  html += "<h1>ESP8266 Pump Control</h1>";
  html += "<button onclick=\"fetch('/pump_start')\">💧 Start Pump</button> ";
  html += "<button onclick=\"fetch('/pump_stop')\">🛑 Stop Pump</button>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handlePumpStart() {
  digitalWrite(RELAY_PIN, LOW); // Turn ON relay (pump ON, active LOW)
  Serial.println("Pump started");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"pump\":\"ON\"}");
}

void handlePumpStop() {
  digitalWrite(RELAY_PIN, HIGH); // Turn OFF relay (pump OFF, active LOW)
  Serial.println("Pump stopped");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"pump\":\"OFF\"}");
}