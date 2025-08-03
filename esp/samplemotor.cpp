#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>

// WiFi credentials
const char* ssid = "SDP";
const char* password = "123456789";

WebServer server(80);

// Motor pins
const int ENA = 32; // PWM pin for motor A (GPIO32)
const int ENB = 33; // PWM pin for motor B (GPIO33)
const int IN1 = 14; // Motor A direction pin 1 (GPIO14)
const int IN2 = 27; // Motor A direction pin 2 (GPIO27)
const int IN3 = 26; // Motor B direction pin 1 (GPIO26)
const int IN4 = 25; // Motor B direction pin 2 (GPIO25)

// PWM channels for ESP32 (must be unique, 0-15)
#define ENA_CHANNEL 0
#define ENB_CHANNEL 1

// Sensor and servo pins
#define SOIL_MOISTURE_PIN 34   // GPIO34 - Soil moisture sensor (analog)
#define SERVO_PIN         13   // GPIO13 - Servo motor signal
#define PUMP_RELAY_PIN    19   // GPIO19 - Pump relay control
#define LED_PIN            2   // GPIO2 - Status LED

Servo soilServo;

// Servo setup
const int SERVO_UP_ANGLE = 60;
const int SERVO_DOWN_ANGLE = 90;
bool servoInitialized = false;

// Soil and pump settings
const int DRY_SOIL_THRESHOLD = 2800;
const unsigned long PUMP_DURATION = 5000; // ms

// State variables
bool automaticMode = false;
bool pumpRunning = false;
bool servoDown = false;
unsigned long pumpStartTime = 0;
unsigned long lastSensorCheck = 0;
const unsigned long SENSOR_CHECK_INTERVAL = 30000; // ms

// Movement state
bool isMoving = false;
int currentDirection = 0; // 0=stop, 1=forward, 2=backward, 3=left, 4=right

// Sensor state
int lastSoilReading = 0;
String lastSoilStatus = "unknown";

// ======= SETUP =======
void setup() {
  Serial.begin(115200);

  // Motor control pins
  pinMode(IN1, OUTPUT); digitalWrite(IN1, LOW);
  pinMode(IN2, OUTPUT); digitalWrite(IN2, LOW);
  pinMode(IN3, OUTPUT); digitalWrite(IN3, LOW);
  pinMode(IN4, OUTPUT); digitalWrite(IN4, LOW);

  // PWM setup
  ledcSetup(ENA_CHANNEL, 1000, 8); // 1kHz, 8-bit
  ledcAttachPin(ENA, ENA_CHANNEL);
  ledcSetup(ENB_CHANNEL, 1000, 8);
  ledcAttachPin(ENB, ENB_CHANNEL);

  // Output pins
  pinMode(PUMP_RELAY_PIN, OUTPUT); digitalWrite(PUMP_RELAY_PIN, LOW);
  pinMode(LED_PIN, OUTPUT); digitalWrite(LED_PIN, LOW);

  // Servo setup, DO NOT move at boot
  soilServo.attach(SERVO_PIN);
  servoDown = false; servoInitialized = false;

  stopMotors();

  // WiFi connect
  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi..");
  
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; ++i) {
    delay(250);
    Serial.print(".");
    digitalWrite(LED_PIN, i%2==0);
  }
  digitalWrite(LED_PIN, WiFi.status()==WL_CONNECTED ? HIGH : LOW);
  Serial.println(WiFi.status()==WL_CONNECTED ? "\nConnected!" : "\nWiFi FAIL");

  // Web Server endpoints
  server.on("/", handleRoot);
  server.on("/forward", HTTP_GET, handleForward);
  server.on("/backward", HTTP_GET, handleBackward);
  server.on("/left", HTTP_GET, handleLeft);
  server.on("/right", HTTP_GET, handleRight);
  server.on("/stop", HTTP_GET, handleStop);

  server.on("/start", HTTP_GET, handleStartPump);
  server.on("/stop_pump", HTTP_GET, handleStopPump);

  server.on("/start_sensor", HTTP_GET, handleStartSensor);
  server.on("/read_soil", HTTP_GET, handleReadSoil);
  server.on("/servo_down", HTTP_GET, handleServoDown);
  server.on("/servo_up", HTTP_GET, handleServoUp);
  server.on("/init_servo", HTTP_GET, handleInitServo);

  server.on("/automatic", HTTP_GET, handleAutomatic);
  server.on("/manual", HTTP_GET, handleManual);

  server.on("/status", HTTP_GET, handleStatus);
  server.on("/ping", HTTP_GET, handlePing);

  // OPTIONS for CORS
  String corsEndpoints[] = {"/forward", "/backward", "/left", "/right", "/stop",
      "/start", "/stop_pump", "/start_sensor", "/read_soil",
      "/servo_down", "/servo_up", "/init_servo",
      "/automatic", "/manual", "/status", "/ping"};
  for(auto &ep : corsEndpoints) server.on(ep.c_str(), HTTP_OPTIONS, handleOptions);

  server.enableCORS(true);
  server.begin();

  Serial.println("HTTP server started");
}

// ======= LOOP =======
void loop() {
  server.handleClient();
  if (automaticMode) handleAutomaticIrrigation();
  if (pumpRunning && (millis() - pumpStartTime >= PUMP_DURATION)) stopPump();

  // LED heartbeat
  static unsigned long lastBlink = 0;
  if (pumpRunning || isMoving || servoDown)
    if (millis()-lastBlink > 250) { digitalWrite(LED_PIN, !digitalRead(LED_PIN)); lastBlink=millis(); }
  else digitalWrite(LED_PIN, HIGH); // idle=solid
}

// ======= HANDLERS & UTILITIES =======

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>ESP32 Robot Controller</title>";
  html += "<meta http-equiv='refresh' content='5'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;margin:20px;background:#f0f8ff;text-align:center;}</style></head><body>";
  html += "<div style='background:#fff;padding:20px;border-radius:15px;max-width:800px;margin:0 auto;'>";
  html += "<h1>🤖 ESP32 Robot Controller</h1>";
  if (!servoInitialized) html += "<div style='background:#fff3cd;color:#856404;padding:10px;margin-bottom:10px;'>⚠️ <b>SERVO NOT INITIALIZED</b><br><button onclick=\"fetch('/init_servo')\">🔧 Initialize Servo</button></div>";
  html += "<h3>Status</h3><b>Mode:</b> "+String(automaticMode?"Auto":"Manual")+"<br>";
  html += "<b>Move:</b> "+getMovementString(currentDirection)+"<br>";
  html += "<b>Pump:</b> "+String(pumpRunning?"ON":"OFF")+"<br>";
  html += "<b>Servo:</b> "+String(servoDown?"DOWN":"UP")+"/"+(servoInitialized?"Ready":"NotInit")+"<br>";
  html += "<b>Soil:</b> "+String(lastSoilReading)+" ("+lastSoilStatus+")<br>";
  html += "<hr>";
  html += "<b>Movement:</b> <button onclick=\"fetch('/forward')\">↑</button> ";
  html += "<button onclick=\"fetch('/left')\">←</button> ";
  html += "<button onclick=\"fetch('/stop')\">⏹</button> ";
  html += "<button onclick=\"fetch('/right')\">→</button> ";
  html += "<button onclick=\"fetch('/backward')\">↓</button><br><br>";
  html += "<b>Sensors:</b> <button onclick=\"fetch('/start_sensor')\">🔍 Check</button> ";
  html += "<button onclick=\"fetch('/read_soil')\">🌱 Soil</button> ";
  html += "<button onclick=\"fetch('/servo_down')\">⬇️</button> ";
  html += "<button onclick=\"fetch('/servo_up')\">⬆️</button><br>";
  html += "<b>Pump:</b> <button onclick=\"fetch('/start')\">💧 ON</button> ";
  html += "<button onclick=\"fetch('/stop_pump')\">🛑 OFF</button><br>";
  html += "<b>Mode:</b> <button onclick=\"fetch('/automatic')\">AUTO</button> ";
  html += "<button onclick=\"fetch('/manual')\">MANUAL</button>";
  html += "<br><small>IP: "+WiFi.localIP().toString()+" | Page refresh: 5s</small></div></body></html>";

  addCORSHeaders();
  server.send(200, "text/html", html);
}

// --- MOVEMENT ---
void moveMotors(int dir) {
  // dir: 0=stop, 1=forward, 2=backward, 3=left, 4=right
  switch(dir) {
    case 1: // forward
      digitalWrite(IN1,HIGH); digitalWrite(IN2,LOW);
      digitalWrite(IN3,HIGH); digitalWrite(IN4,LOW);
      ledcWrite(ENA_CHANNEL, 200); ledcWrite(ENB_CHANNEL, 200);
      break;
    case 2: // backward
      digitalWrite(IN1,LOW); digitalWrite(IN2,HIGH);
      digitalWrite(IN3,LOW); digitalWrite(IN4,HIGH);
      ledcWrite(ENA_CHANNEL, 200); ledcWrite(ENB_CHANNEL, 200);
      break;
    case 3: // left
      digitalWrite(IN1,LOW); digitalWrite(IN2,HIGH);
      digitalWrite(IN3,HIGH); digitalWrite(IN4,LOW);
      ledcWrite(ENA_CHANNEL, 200); ledcWrite(ENB_CHANNEL, 200);
      break;
    case 4: // right
      digitalWrite(IN1,HIGH); digitalWrite(IN2,LOW);
      digitalWrite(IN3,LOW); digitalWrite(IN4,HIGH);
      ledcWrite(ENA_CHANNEL, 200); ledcWrite(ENB_CHANNEL, 200);
      break;
    default: // stop
      stopMotors();
      break;
  }
  isMoving = (dir!=0);
  currentDirection = dir;
}

void stopMotors() {
  digitalWrite(IN1,LOW); digitalWrite(IN2,LOW);
  digitalWrite(IN3,LOW); digitalWrite(IN4,LOW);
  ledcWrite(ENA_CHANNEL,0); ledcWrite(ENB_CHANNEL,0);
  isMoving = false; currentDirection = 0;
}

void handleForward()  { if(!automaticMode){ moveMotors(1); }   sendMovementResponse("forward", "Moving forward"); }
void handleBackward() { if(!automaticMode){ moveMotors(2); }   sendMovementResponse("backward", "Moving backward"); }
void handleLeft()     { if(!automaticMode){ moveMotors(3); }   sendMovementResponse("left", "Turning left"); }
void handleRight()    { if(!automaticMode){ moveMotors(4); }   sendMovementResponse("right", "Turning right"); }
void handleStop()     { stopMotors(); sendMovementResponse("stop", "Motors stopped"); }
void sendMovementResponse(String cmd, String msg) {
  addCORSHeaders();
  server.send(200, "application/json", "{\"command\":\""+cmd+"\",\"status\":\"ok\",\"message\":\""+msg+"\",\"timestamp\":"+String(millis())+"}");
}

String getMovementString(int dir) {
  switch(dir) {
    case 1: return "Forward";
    case 2: return "Backward";
    case 3: return "Left";
    case 4: return "Right";
    default: return "Stopped";
  }
}

// --- SERVO ---
void lowerServo() { if (servoInitialized) { soilServo.write(SERVO_DOWN_ANGLE); servoDown = true; delay(500); } }
void raiseServo() { if (servoInitialized) { soilServo.write(SERVO_UP_ANGLE);   servoDown = false; delay(500); } }

void handleInitServo() {
  addCORSHeaders();
  soilServo.write(SERVO_UP_ANGLE);
  servoInitialized = true; servoDown = false;
  server.send(200, "application/json","{\"command\":\"init_servo\",\"status\":\"success\",\"message\":\"Servo initialized\",\"timestamp\":"+String(millis())+"}");
}
void handleServoDown() {
  addCORSHeaders();
  if(!servoInitialized){ sendErrorResponse("servo_down","Servo not initialized"); return; }
  lowerServo();
  server.send(200, "application/json","{\"command\":\"servo_down\",\"status\":\"success\",\"message\":\"Servo lowered\",\"timestamp\":"+String(millis())+"}");
}
void handleServoUp() {
  addCORSHeaders();
  if(!servoInitialized){ sendErrorResponse("servo_up","Servo not initialized"); return; }
  raiseServo();
  server.send(200, "application/json","{\"command\":\"servo_up\",\"status\":\"success\",\"message\":\"Servo raised\",\"timestamp\":"+String(millis())+"}");
}

// --- PUMP ---
void startPump() { digitalWrite(PUMP_RELAY_PIN, HIGH); pumpRunning = true; pumpStartTime = millis(); }
void stopPump()  { digitalWrite(PUMP_RELAY_PIN, LOW);  pumpRunning = false; }

void handleStartPump() {
  addCORSHeaders();
  if (pumpRunning) server.send(200, "application/json", "{\"command\":\"start_pump\",\"status\":\"already_running\",\"message\":\"Pump already running\",\"timestamp\":"+String(millis())+"}");
  else { startPump(); server.send(200, "application/json", "{\"command\":\"start_pump\",\"status\":\"success\",\"message\":\"Pump started\",\"timestamp\":"+String(millis())+"}"); }
}
void handleStopPump() {
  addCORSHeaders();
  stopPump();
  server.send(200, "application/json", "{\"command\":\"stop_pump\",\"status\":\"success\",\"message\":\"Pump stopped\",\"timestamp\":"+String(millis())+"}");
}

// --- SOIL SENSOR ---
String getSoilStatus(int value) {
  if (value < 1500) return "wet";
  else if (value < DRY_SOIL_THRESHOLD) return "moist";
  else return "dry";
}
void handleReadSoil() {
  addCORSHeaders();
  int soilValue = analogRead(SOIL_MOISTURE_PIN);
  String status = getSoilStatus(soilValue);
  lastSoilReading = soilValue; lastSoilStatus=status;
  server.send(200, "application/json", "{\"command\":\"read_soil\",\"status\":\"success\",\"soilMoisture\":"+String(soilValue)+",\"soilStatus\":\""+status+"\",\"message\":\"Soil reading completed\",\"timestamp\":"+String(millis())+"}");
}
void handleStartSensor() {
  addCORSHeaders();
  if(!servoInitialized){ sendErrorResponse("start_sensor","Servo not initialized"); return; }
  lowerServo(); delay(1000);
  int soilValue = analogRead(SOIL_MOISTURE_PIN);
  String status = getSoilStatus(soilValue);
  lastSoilReading = soilValue; lastSoilStatus = status;
  raiseServo(); delay(500);
  bool needsIrrigation = (soilValue > DRY_SOIL_THRESHOLD);
  server.send(200, "application/json",
    "{\"command\":\"start_sensor\",\"status\":\"success\",\"soilMoisture\":"+String(soilValue)+
    ",\"soilStatus\":\""+status+"\",\"needsIrrigation\":"+(needsIrrigation?"true":"false")+
    ",\"message\":\"Sensor check completed\",\"timestamp\":"+String(millis())+"}");
  if (needsIrrigation && !pumpRunning) startPump();
}

// --- MODE ---
void handleAutomatic() {
  addCORSHeaders();
  if(!servoInitialized) { sendErrorResponse("automatic","Servo not initialized"); return; }
  automaticMode = true; lastSensorCheck = 0;
  server.send(200,"application/json", "{\"command\":\"automatic\",\"status\":\"success\",\"mode\":\"automatic\",\"message\":\"Automatic mode enabled\",\"timestamp\":"+String(millis())+"}" );
}
void handleManual() {
  addCORSHeaders();
  automaticMode = false; stopMotors();
  if(servoDown && servoInitialized) raiseServo();
  server.send(200,"application/json", "{\"command\":\"manual\",\"status\":\"success\",\"mode\":\"manual\",\"message\":\"Manual mode enabled\",\"timestamp\":"+String(millis())+"}" );
}

// --- AUTO-IRRIGATION ---
void handleAutomaticIrrigation() {
  if (millis() - lastSensorCheck < SENSOR_CHECK_INTERVAL) return;
  lastSensorCheck = millis();
  lowerServo(); delay(1000);
  int soilValue = analogRead(SOIL_MOISTURE_PIN);
  lastSoilReading = soilValue; lastSoilStatus=getSoilStatus(soilValue);
  bool needsIrrigation = (soilValue > DRY_SOIL_THRESHOLD);
  raiseServo(); delay(500);
  if (needsIrrigation && !pumpRunning) startPump();
}

// --- STATUS ---
void handleStatus() {
  addCORSHeaders();
  String json="{\"status\":\"success\",\"mode\":\""+String(automaticMode?"automatic":"manual")+"\",\"movement\":\""+
    getMovementString(currentDirection)+"\",\"pumpStatus\":\""+String(pumpRunning?"running":"stopped")+"\",\"servoPosition\":\""+String(servoDown?"down":"up")+"\",\"servoInitialized\":"+
    String(servoInitialized?"true":"false")+",\"soilMoisture\":"+String(lastSoilReading)+",\"soilStatus\":\""+lastSoilStatus+"\",\"timestamp\":"+String(millis())+"}";
  server.send(200, "application/json", json);
}
void handlePing() {
  addCORSHeaders();
  server.send(200,"application/json", "{\"status\":\"online\",\"device\":\"ESP32 Robot Controller\",\"message\":\"System operational\",\"timestamp\":"+String(millis())+"}");
}

// --- ERROR and CORS ---
void sendErrorResponse(String cmd, String msg) {
  addCORSHeaders();
  server.send(400,"application/json","{\"command\":\""+cmd+"\",\"status\":\"error\",\"message\":\""+msg+"\",\"timestamp\":"+String(millis())+"}");
}
void addCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
}
void handleOptions() {
  addCORSHeaders(); server.send(204,"text/plain","");
}