#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "aryantak";
const char* password = "aryantak10";

WebServer server(80);

// Motor pins (example: left motor IN1=12, right motor IN2=34)
const int motorPin1 = 12;
const int motorPin2 = 34;

bool isAutomatic = false;
bool shouldMoveForward = false;

void stopMotors() {
  digitalWrite(motorPin1, LOW);
  digitalWrite(motorPin2, LOW);
}

void setupMotors() {
  pinMode(motorPin1, OUTPUT);
  pinMode(motorPin2, OUTPUT);
  stopMotors();
}

void moveForward() {
  digitalWrite(motorPin1, HIGH);
  digitalWrite(motorPin2, HIGH);
}

void handleCommand() {
  String path = server.uri();
  if (path == "/manualirrigation") {
    isAutomatic = false;
    server.send(200, "application/json", "{\"mode\":\"manual\"}");
  } else if (path == "/automaticirrigation") {
    isAutomatic = true;
    server.send(200, "application/json", "{\"mode\":\"automatic\"}");
  } else if (!isAutomatic) {
    if (path == "/forward") moveForward();
    else if (path == "/backward") stopMotors();  // add your backward logic
    else if (path == "/left") stopMotors();      // add your turn left logic
    else if (path == "/right") stopMotors();     // add your turn right logic
    else stopMotors();
    server.send(200, "application/json", "{\"status\":\"manual movement\"}");
  } else {
    server.send(403, "application/json", "{\"error\":\"Manual commands not allowed in auto mode\"}");
  }
}

void handleAutoMove() {
  if (isAutomatic) {
    moveForward();
    delay(1000); // move for 1 sec
    stopMotors();
    server.send(200, "application/json", "{\"moved\":\"forward\"}");
  } else {
    server.send(403, "application/json", "{\"error\":\"Not in automatic mode\"}");
  }
}

void setup() {
  Serial.begin(115200);
  setupMotors();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("Motor ESP connected");

  server.on("/forward", handleCommand);
  server.on("/backward", handleCommand);
  server.on("/left", handleCommand);
  server.on("/right", handleCommand);
  server.on("/stop", handleCommand);
  server.on("/manualirrigation", handleCommand);
  server.on("/automaticirrigation", handleCommand);
  server.on("/moveforwardauto", handleAutoMove);

  server.begin();
}

void loop() {
  server.handleClient();
}




//ESP8266 ip  192.168.182.76