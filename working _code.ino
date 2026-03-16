#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ESP32Servo.h>

// --- USER CONFIG ---
const char* ssid = "DiluWRT_2.4G/5G";
const char* password = "questpx443";

// --- PIN MAP ---
const int PIN_TEMP = 4;
const int PIN_HEAT = 14; 
const int PIN_COOL = 27;
const int PIN_SERVO = 25;
const int PIN_SEND = 22;
const int PIN_RECV = 23;
const int BTN_START = 32; 
const int BTN_STOP  = 34;

// --- PWM CONSTANTS ---
const int PWM_70_PCT = 178;
const int PWM_10_PCT = 25;
const int PWM_COOLING = 180;

// --- OBJECTS ---
OneWire oneWire(PIN_TEMP);
DallasTemperature sensors(&oneWire);
Servo valve;
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// --- GLOBAL VARIABLES ---
enum SystemStatus { IDLE=0, HEATING=1, READY=2, TESTING=3, FINISHED=4, FLUSHING=5, ERROR=6 };
SystemStatus currentStatus = IDLE;

float currentT = 0;
long liveDiel = 0;
long dielectricCaptured = 0;
unsigned long testStartTime = 0;
float finalTime = 0;
bool highTempCooling = false;

// --- FUNCTION PROTOTYPES ---
void stopThermal();
long readDielectric();
void manageThermal();
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len);
void broadcastData();

void setup() {
  Serial.begin(115200);
  sensors.begin();
  
  ESP32PWM::allocateTimer(0);
  valve.setPeriodHertz(50);
  valve.attach(PIN_SERVO, 500, 2400);
  valve.write(140); // Valve Closed

  pinMode(PIN_HEAT, OUTPUT);
  pinMode(PIN_COOL, OUTPUT);
  pinMode(PIN_SEND, OUTPUT);
  pinMode(PIN_RECV, INPUT);
  pinMode(BTN_START, INPUT_PULLUP);
  pinMode(BTN_STOP, INPUT);

  digitalWrite(PIN_SEND, LOW);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  server.begin();
  Serial.println("\nVISCOPULSE ONLINE: " + WiFi.localIP().toString());
}

void loop() {
  ws.cleanupClients();
  
  // 1. Temperature Polling
  sensors.requestTemperatures();
  float t = sensors.getTempCByIndex(0);
  
  if (t == -127.0 || t == 85.0) {
    currentStatus = ERROR;
    stopThermal();
  } else {
    currentT = t;
  }

  // 2. Dielectric Polling
  liveDiel = readDielectric();

  // 3. State Machine Logic
  switch (currentStatus) {
    case HEATING:
    case READY:
      manageThermal();
      if (digitalRead(BTN_START) == LOW && currentStatus == READY) {
        delay(50); 
        testStartTime = millis();
        dielectricCaptured = liveDiel; // Lock the value
        valve.write(40); // OPEN
        currentStatus = TESTING;
      }
      break;
      
    case TESTING:
      manageThermal();
      if (digitalRead(BTN_STOP) == LOW) {
        delay(100);
        finalTime = (millis() - testStartTime);
        currentStatus = FINISHED; 
        stopThermal();
      }
      break;
      
    case FLUSHING:
      stopThermal();
      valve.write(40);
      break;
      
    default: 
      stopThermal();
      if(currentStatus != FINISHED && currentStatus != FLUSHING) valve.write(140);
      break;
  }

  broadcastData();
  delay(150);
}

void manageThermal() {
  if (currentT > 60.0) highTempCooling = true;
  
  if (highTempCooling) {
    if (currentT > 47.0) {
      analogWrite(PIN_HEAT, 0);
      analogWrite(PIN_COOL, PWM_COOLING);
    } else {
      highTempCooling = false;
      stopThermal();
    }
    return;
  }

  if (currentT < 39.5) {
    analogWrite(PIN_HEAT, PWM_70_PCT);
    analogWrite(PIN_COOL, 0);
  } else if (currentT >= 39.5 && currentT <= 40.5) {
    analogWrite(PIN_HEAT, PWM_10_PCT);
    analogWrite(PIN_COOL, 0);
    if(currentStatus == HEATING) currentStatus = READY;
  } else {
    stopThermal();
  }
}

void stopThermal() {
  analogWrite(PIN_HEAT, 0);
  analogWrite(PIN_COOL, 0);
}

long readDielectric() {

  noInterrupts(); 
  
  digitalWrite(PIN_SEND, LOW);
  delayMicroseconds(10); // Very short reset

  long start = micros();
  digitalWrite(PIN_SEND, HIGH);

  // 15ms Timeout Window
  while (digitalRead(PIN_RECV) == LOW && (micros() - start < 15000));
  
  long val = micros() - start;
  digitalWrite(PIN_SEND, LOW);
  
  interrupts(); // Turn WiFi background tasks back ON
  return val;
}

void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_DATA) {
    String msg = "";
    for(size_t i=0; i<len; i++) msg += (char)data[i];
    if (msg == "prepare") currentStatus = HEATING;
    if (msg == "flush")   currentStatus = FLUSHING;
    if (msg == "restart") { 
      currentStatus = IDLE; 
      valve.write(140); 
      stopThermal();
      highTempCooling = false;
      finalTime = 0;
      dielectricCaptured = 0;
    }
  }
}

void broadcastData() {
  String json = "{";
  json += "\"status\":" + String(currentStatus) + ",";
  json += "\"tempA\":" + String(currentT) + ",";
  json += "\"diel\":" + String(currentStatus == TESTING ? dielectricCaptured : liveDiel) + ",";
  json += "\"tA\":" + String(currentStatus == TESTING ? (millis()-testStartTime) : finalTime);
  json += "}";
  ws.textAll(json);
  Serial.println("TX -> " + json);
}