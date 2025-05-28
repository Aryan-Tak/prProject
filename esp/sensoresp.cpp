#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>
#include <HTTPClient.h>

const char* ssid = "aryantak";
const char* password = "aryantak10";

WebServer server(80);

#define SOIL_SENSOR A0
#define SERVO_PIN 5
#define PUMP_PIN 27
#define WATER_SENSOR_PIN 32

Servo servo;

bool autoIrrigation = false;

const String motorEspIP = "192.168.242.244"; // IP of ESP32 #1

void handleManual() {
  autoIrrigation = false;
  server.send(200, "application/json", "{\"mode\":\"manual\"}");
}

void handleAuto() {
  autoIrrigation = true;
  server.send(200, "application/json", "{\"mode\":\"automatic\"}");
}

void checkSoilAndIrrigate() {
  int soilValue;
  int waterLevel;
  
  // Lower servo
  servo.write(90);
  delay(1000);

  // Read sensor
  soilValue = analogRead(SOIL_SENSOR);
  Serial.println("Soil moisture: " + String(soilValue));

  // Raise servo
  servo.write(0);
  delay(1000);

  if (soilValue > 2500) { // dry
    waterLevel = digitalRead(WATER_SENSOR_PIN);
    if (waterLevel == LOW) {
      Serial.println("Low water level, can't irrigate");
      return;
    }

    digitalWrite(PUMP_PIN, HIGH);
    delay(3000);
    digitalWrite(PUMP_PIN, LOW);

    // Move bot ahead
    HTTPClient http;
    http.begin("http://" + motorEspIP + "/moveforwardauto");
    int httpCode = http.GET();
    http.end();

    Serial.println("Moved forward");
  } else {
    Serial.println("Soil is wet");
  }
}

void handleStatus() {
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

void setup() {
  Serial.begin(9600);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("Sensor ESP connected");

  pinMode(PUMP_PIN, OUTPUT);
  pinMode(WATER_SENSOR_PIN, INPUT);
  digitalWrite(PUMP_PIN, LOW);

  servo.attach(SERVO_PIN);
  servo.write(0);

  server.on("/manualirrigation", handleManual);
  server.on("/automaticirrigation", handleAuto);
  server.on("/status", handleStatus);

  server.begin();
}

void loop() {
  server.handleClient();

  if (autoIrrigation) {
    checkSoilAndIrrigate();
    delay(10000); // delay between each cycle
  }
}
