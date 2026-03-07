#include <WiFi.h>
#include <ESPAsyncWebServer.h>

const char* ssid = "DiluWRT_2.4G/5G";
const char* password = "questpx443";

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// ViscoPulse Variables
int systemStatus = 0; 
float tempA = 25.0, tempB = 25.0;
int dielectric = 1200;
unsigned long timeA = 0, timeB = 0;
unsigned long testStartTime = 0;
bool dataSentFinal = false;

// Pins
const int btnCompensate = 13; 
const int btnValveTrigger = 14;

void broadcastViscoPulseData() {
  if (ws.count() > 0) {
    String json = "{\"device\":\"ViscoPulse\",\"status\":" + String(systemStatus) + 
                  ",\"tempA\":" + String(tempA, 1) + ",\"tempB\":" + String(tempB, 1) + 
                  ",\"diel\":" + String(dielectric) + ",\"tA\":" + String(timeA) + 
                  ",\"tB\":" + String(timeB) + "}";
    ws.textAll(json);
  }
}

// Handler for incoming browser commands
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_DATA) {
    String msg = "";
    for (size_t i = 0; i < len; i++) msg += (char)data[i];
    
    if (msg == "restart") {
      ESP.restart(); // Full Hardware Reboot
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(btnCompensate, INPUT_PULLUP);
  pinMode(btnValveTrigger, INPUT_PULLUP);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  Serial.println(WiFi.localIP());

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  server.begin();
}

void loop() {
  static unsigned long lastUpdate = 0;
  if (!dataSentFinal) {
    if (millis() - lastUpdate > 100) { 
      lastUpdate = millis();
      
      if (digitalRead(btnCompensate) == LOW && systemStatus == 0) systemStatus = 1;
      if (systemStatus == 1) { 
        if (tempA < 40.0) tempA += 0.4;
        if (tempB < 100.0) tempB += 1.1;
        if (tempA >= 40.0 && tempB >= 100.0) systemStatus = 2;
      }
      if (digitalRead(btnValveTrigger) == LOW && systemStatus == 2) {
        systemStatus = 3;
        testStartTime = millis();
        dielectric = 1432; 
      }
      if (systemStatus == 3) { 
         if (millis() - testStartTime > 5000) {
           timeA = 5021; timeB = 4890;
           systemStatus = 4;
         }
      }
      broadcastViscoPulseData();
      if (systemStatus == 4) dataSentFinal = true;
    }
  }
  ws.cleanupClients();
}