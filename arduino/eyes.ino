#include <Wire.h>
#include <string>
#include <WiFi.h>
#include <sstream>
#include <iostream>
#include <Arduino.h>
#include <FastLED.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_PWMServoDriver.h>

#define DATA_PIN 12 // Data pin connected to SDI
Adafruit_PWMServoDriver pca9685 = Adafruit_PWMServoDriver(0x40);

// Range corrections for exact servo arm positions, determined by trial and error
int MINIMUMS[6] = {50, 95, 10, 40, 80, 30};
int MAXIMUMS[6] = {150, 155, 60, 80, 140, 80};

#define SERVOMIN  120 // This is the 'minimum' pulse length count (out of 4096)(use135)
#define SERVOMAX  630 // This is the 'maximum' pulse length count (out of 4096)(use615)

#define SER0  0   //Servo Motor 0 on connector 0
#define SER1  12  //Servo Motor 1 on connector 12

int SERVO_PORTS[] = {0, 1, 2, 3, 4, 5};
int PWM_POSITIONS[6];

bool requestData(DynamicJsonDocument& doc) {
  HTTPClient http;
  http.begin("http://192.168.1.14:4444/positions");

  int httpCode = http.GET();

  if (httpCode > 0) {
    String payload = http.getString();

    DeserializationError error = deserializeJson(doc, payload);

    if (error) {
      Serial.println("Error parsing JSON");
      return false;
    }
  } else {
    Serial.println("Error on HTTP request");
    return false;
  }

  // Disconnect
  http.end();

  return true; // Request and parsing were successful
}

const int NUM_LEDS = 8;
CRGB leds[NUM_LEDS] = {CRGB::Black, CRGB::Black, CRGB::Black, CRGB::Black, CRGB::Black, CRGB::Black, CRGB::Black, CRGB::Black};

void setup() {
  FastLED.addLeds<NEOPIXEL, DATA_PIN>(leds, NUM_LEDS);
  FastLED.show();

  Serial.begin(115200);
  Serial.println("STARTING SPOOKY PUMPKIN");

  WiFi.begin("WIFI SSID", "WIFI PASSWORD");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");

  pca9685.begin();
  pca9685.setPWMFreq(60);
}

void setServoPos(int iServo, float angle) {
  int correctedAngle = map(angle, 0, 180, MINIMUMS[iServo], MAXIMUMS[iServo]);

  PWM_POSITIONS[iServo] = map(correctedAngle, 0, 180, SERVOMIN, SERVOMAX);
  pca9685.setPWM(SERVO_PORTS[iServo], 0, PWM_POSITIONS[iServo]);
}

float mapFloat(float x, float in_min, float in_max, float out_min, float out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

DynamicJsonDocument jsonData(2048);

void loop() {

  // Request and parse JSON data into the pre-allocated document
  if (requestData(jsonData)) {

    bool didHandle = false;
    if (jsonData.containsKey("lights")) {
      int red = jsonData["lights"]["red"].as<int>();
      int green = jsonData["lights"]["green"].as<int>();
      int blue = jsonData["lights"]["blue"].as<int>();

      for (int iLed=0; iLed<NUM_LEDS; ++iLed) {
        leds[iLed] = CRGB(red, green, blue);
      }

      FastLED.show();
    }


    if (jsonData.containsKey("gamepad:axis/0/0")) {
      float value = jsonData["gamepad:axis/0/0"]["event"]["detail"]["value"].as<float>();
      int finalValue = round(value * 100 + 100);
      setServoPos(0, finalValue);
    }

    if (jsonData.containsKey("gamepad:axis/0/1")) {
      float value = jsonData["gamepad:axis/0/1"]["event"]["detail"]["value"].as<float>();      
      int finalValue = round(200 - (value * 100 + 100));
      setServoPos(1, finalValue);
    }

    if (jsonData.containsKey("gamepad:button/0/4") && jsonData["gamepad:button/0/4"]["event"]["detail"]["pressed"].as<bool>()) {
      setServoPos(5, 0);
      setServoPos(4, 200);
    } else if (jsonData.containsKey("gamepad:button/0/6")) {
      float value = jsonData["gamepad:button/0/6"]["event"]["detail"]["value"].as<float>();
      
      int topValue = round(200 - (value * 100 + 100));
      int bottomValue = round(value * 100 + 100);

      setServoPos(4, topValue);
      setServoPos(5, bottomValue);
    }

    if (jsonData.containsKey("gamepad:button/0/5") && jsonData["gamepad:button/0/5"]["event"]["detail"]["pressed"].as<bool>()) {
      setServoPos(2, 0);
      setServoPos(3, 200);
    } else if (jsonData.containsKey("gamepad:button/0/7")) {
      float value = jsonData["gamepad:button/0/7"]["event"]["detail"]["value"].as<float>();
      
      int topValue = round(200 - (value * 100 + 100));
      int bottomValue = round(value * 100 + 100);

      setServoPos(2, bottomValue);
      setServoPos(3, topValue);
    }
  } else {
    Serial.println("NO REQUEST SUCCESS");
  }
}

