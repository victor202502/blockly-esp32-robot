#include <Wire.h>
#include <Adafruit_AS7341.h>

// ── CONFIGURACIÓN DEL SENSOR AS7341 ─────────────────────────
Adafruit_AS7341 as7341;
bool sensorColorOk = false;

// Coeficientes estándar para la conversión de canales espectrales a XYZ
const float cieX[8] = {0.0776, 0.3481, 0.0956, 0.0291, 0.5121, 1.0263, 0.6424, 0.0468};
const float cieY[8] = {0.0022, 0.0298, 0.1390, 0.6082, 1.0000, 0.7570, 0.2650, 0.0170};
const float cieZ[8] = {0.3713, 1.7826, 0.8130, 0.1117, 0.0057, 0.0011, 0.0000, 0.0000};

// UMBRALES DE CALIBRACIÓN OPTIMIZADOS
const float UMBRAL_NEGRO = 55000.0;   
const float UMBRAL_BLANCO = 350000.0; 

bool iniciarSensor() {
  if (as7341.begin()) {
    as7341.setATIME(100);
    as7341.setASTEP(999);
    as7341.setGain(AS7341_GAIN_256X); 
    as7341.enableLED(true); 
    return true;
  }
  return false;
}

String clasificarColorHSV(int r, int g, int b, float intensidadTotal) {
  // Convertir RGB a escala 0.0 - 1.0 para el algoritmo HSV
  float rf = r / 255.0; 
  float gf = g / 255.0; 
  float bf = b / 255.0;
  
  float cmax = max(rf, max(gf, bf)); 
  float cmin = min(rf, min(gf, bf));
  float delta = cmax - cmin;
  
  // Calcular Saturación (S) y Brillo (V)
  float s = (cmax == 0) ? 0 : (delta / cmax);
  float v = cmax; 

  // Calcular Tono (H)
  float h = 0;
  if (delta > 0) {
    if (cmax == rf) { 
      h = 60.0 * ((gf - bf) / delta); 
      if (h < 0) h += 360.0; 
    }
    else if (cmax == gf) h = 60.0 * (((bf - rf) / delta) + 2.0);
    else if (cmax == bf) h = 60.0 * (((rf - gf) / delta) + 4.0);
  }

  // --- IMPRESIÓN DE DEPURACIÓN ---
  Serial.print(" | H: "); Serial.print(h, 0);
  Serial.print(" S: "); Serial.print(s, 2);
  Serial.print(" V: "); Serial.print(v, 2);
  Serial.print(" | -> ");

  // 1. Detección de NEGRO (Schwarz)
  if (intensidadTotal < UMBRAL_NEGRO) {
    return "Schwarz";
  }

  // 2. Detección de BLANCO / GRIS (Weiss / Grau)
  if (s < 0.30) { 
    if (intensidadTotal > UMBRAL_BLANCO) {
      return "Weiss";
    } else {
      return "Grau / Unbestimmt"; 
    }
  }

  // 3. Clasificación de colores en Alemán (Deutsch)

  // LILA / VIOLETT (Morado)
  if (h >= 340 || h < 10) {
    return "Lila";
  }
  
  // ROT (Rojo)
  if (h >= 10 && h < 22) {
    if (s < 0.50) return "Braun"; 
    return "Rot";
  }
  
  // ORANGE / BRAUN (Naranja y Marrón)
  if (h >= 22 && h < 40) {
    if (s < 0.55 || intensidadTotal < 180000.0) { 
      return "Braun";
    } else {
      return "Orange";
    }
  }
  
  // GELB (Amarillo)
  if (h >= 40 && h < 65) {
    return "Gelb";
  }
  
  // GRUEN (Verde)
  if (h >= 65 && h < 160) {
    return "Gruen";
  }
  
  // BLAU (Azul)
  if (h >= 160 && h < 245) {
    return "Blau";
  }

  return "Grau / Unbestimmt";
}

void setup() {
  Serial.begin(115200);
  delay(1000); 
  
  Serial.println("\n--- FARBSENSOR SYSTEM START ---");
  Wire.begin(21, 22); // Pines I2C para ESP32 (SDA=21, SCL=22)

  if (iniciarSensor()) {
    sensorColorOk = true;
    Serial.println("Sensor AS7341 bereit.");
  } else {
    Serial.println("Verbindungsfehler. Automatische Wiederherstellung aktiv...");
  }
}

void loop() {
  // Rutina de recuperación automática de conexión I2C
  if (!sensorColorOk) {
    Serial.println("Versuche I2C-Verbindung wiederherzustellen...");
    Wire.end(); 
    delay(100);
    Wire.begin(21, 22); 
    delay(100);
    
    if (iniciarSensor()) {
      sensorColorOk = true;
      Serial.println("Sensor AS7341 erfolgreich wiederverbunden!");
    } else {
      Serial.println("Verbindung fehlgeschlagen. Naechster Versuch in 3 Sekunden...");
      delay(3000);
      return;
    }
  }

  uint16_t ch[12];
  if (as7341.readAllChannels(ch)) {
    float spec[8] = {
      (float)ch[0], (float)ch[1], (float)ch[2], (float)ch[3], 
      (float)ch[6], (float)ch[7], (float)ch[8], (float)ch[9]
    };
    
    float intTotal = 0, X = 0, Y = 0, Z = 0;
    for(int i = 0; i < 8; i++){
      intTotal += spec[i];
      X += spec[i] * cieX[i]; 
      Y += spec[i] * cieY[i]; 
      Z += spec[i] * cieZ[i];
    }
    
    float R =  3.2406 * X - 1.5372 * Y - 0.4986 * Z;
    float G = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
    float B =  0.0557 * X - 0.2040 * Y + 1.0570 * Z;

    if (R < 0) R = 0; 
    if (G < 0) G = 0; 
    if (B < 0) B = 0;
    
    float maxRGB = max(R, max(G, B));
    if (maxRGB > 0) { 
      R /= maxRGB; 
      G /= maxRGB; 
      B /= maxRGB; 
    }

    R = pow(R, 1.0 / 2.2); 
    G = pow(G, 1.0 / 2.2); 
    B = pow(B, 1.0 / 2.2);
    
    int r = (int)(R * 255.0); 
    int g = (int)(G * 255.0); 
    int b = (int)(B * 255.0);

    Serial.print("Intensitaet: "); Serial.print(intTotal, 1);
    String colorDetectado = clasificarColorHSV(r, g, b, intTotal);
    Serial.println(colorDetectado);
    
  } else {
    Serial.println("Physikalischer Lesefehler. Erzwinge Bus-Neustart...");
    sensorColorOk = false; 
  }

  delay(1000); 
}