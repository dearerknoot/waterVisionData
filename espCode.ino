#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>


/* =====================================================
   CONFIGURAÇÕES DE REDE
===================================================== */

const char* WIFI_SSID = "iPhone";
const char* WIFI_SENHA = "thiago123";


/* =====================================================
   API WATER VISION
===================================================== */

const char* API_URL =
    "https://script.google.com/macros/s/AKfycbznlbSb8CjpyRPbxv7w5xI9K3gRFrx-pANDryaaykBxrN3TPzDUk5WyArM_obZRpia5/exec";


/* =====================================================
   PINOS DOS SENSORES
===================================================== */

/*
   Sensor ultrassônico
*/

const int PINO_TRIG = 5;
const int PINO_ECHO = 18;


/*
   DS18B20
*/

const int PINO_TEMPERATURA = 4;


/*
   Sensor de pH
*/

const int PINO_PH = 36;


/*
   Sensor de turbidez
*/

const int PINO_TURBIDEZ = 35;


/* =====================================================
   SENSOR DE TEMPERATURA
===================================================== */

OneWire oneWire(PINO_TEMPERATURA);

DallasTemperature sensorTemperatura(
    &oneWire
);


/* =====================================================
   INTERVALO DE ENVIO
===================================================== */

const unsigned long INTERVALO_ENVIO =
    10000;

unsigned long ultimoEnvio = 0;


/* =====================================================
   LEITURA DO NÍVEL
===================================================== */

float lerNivel() {

    digitalWrite(
        PINO_TRIG,
        LOW
    );

    delayMicroseconds(2);


    digitalWrite(
        PINO_TRIG,
        HIGH
    );

    delayMicroseconds(10);


    digitalWrite(
        PINO_TRIG,
        LOW
    );


    unsigned long duracao =
        pulseIn(
            PINO_ECHO,
            HIGH,
            30000
        );


    if (duracao == 0) {

        return 0.0;

    }


    float distancia =
        duracao * 0.0343 / 2.0;


    /*
       ATENÇÃO:

       Aqui estamos retornando a distância
       entre o sensor e a superfície da água.

       Quando você definir a altura de referência
       do reservatório/estrutura, poderá converter
       para nível real da água.
    */

    return distancia;
}


/* =====================================================
   LEITURA DA TEMPERATURA
===================================================== */

float lerTemperatura() {

    sensorTemperatura.requestTemperatures();

    float temperatura =
        sensorTemperatura.getTempCByIndex(0);

    if (
        temperatura == DEVICE_DISCONNECTED_C ||
        temperatura < -55.0 ||
        temperatura > 125.0
    ) {

        Serial.println("Erro ao ler o sensor de temperatura.");

        return NAN;
    }

    return temperatura;
}


/* =====================================================
   LEITURA DO PH
===================================================== */

float lerPH() {

    int leitura =
        analogRead(PINO_PH);


    float tensao =
        leitura * 3.3 / 4095.0;


    /*
       ESTA FÓRMULA É PROVISÓRIA.

       O sensor real de pH precisará
       ser calibrado.

       Não use esta equação como
       calibração definitiva.
    */

    float ph =
        7.0 +
        ((2.50 - tensao) / 0.18);


    return ph;
}


/* =====================================================
   LEITURA DA TURBIDEZ
===================================================== */

float lerTurbidez() {

    int leitura =
        analogRead(PINO_TURBIDEZ);


    float tensao =
        leitura * 3.3 / 4095.0;


    /*
       ESTA FÓRMULA É PROVISÓRIA.

       O sensor real deverá ser
       calibrado de acordo com o
       modelo utilizado.
    */

    float turbidez =
        (3.3 - tensao) * 100.0;


    if (turbidez < 0) {

        turbidez = 0;

    }


    return turbidez;
}


/* =====================================================
   CONEXÃO WI-FI
===================================================== */

void conectarWiFi() {

    Serial.println();
    Serial.println(
        "Conectando ao Wi-Fi..."
    );


    WiFi.begin(
        WIFI_SSID,
        WIFI_SENHA
    );


    int tentativas = 0;


    while (
        WiFi.status() != WL_CONNECTED &&
        tentativas < 30
    ) {

        delay(500);

        Serial.print(".");

        tentativas++;

    }


    Serial.println();


    if (
        WiFi.status() == WL_CONNECTED
    ) {

        Serial.println(
            "Wi-Fi conectado!"
        );

        Serial.print(
            "IP: "
        );

        Serial.println(
            WiFi.localIP()
        );

    } else {

        Serial.println(
            "Falha ao conectar ao Wi-Fi."
        );

    }
}


/* =====================================================
   ENVIO PARA A API
===================================================== */

void enviarDados(
    float nivel,
    float temperatura,
    float ph,
    float turbidez
) {

    if (
        WiFi.status() != WL_CONNECTED
    ) {

        Serial.println(
            "Wi-Fi desconectado."
        );

        conectarWiFi();

        return;
    }


    HTTPClient http;


    http.setFollowRedirects(
        HTTPC_STRICT_FOLLOW_REDIRECTS
    );

    http.setTimeout(15000);


    http.begin(API_URL);


    http.addHeader(
        "Content-Type",
        "application/json"
    );


    String json = "{";

    json += "\"nivel\":";
    json += String(nivel, 2);

    json += ",\"temperatura\":";
    json += String(temperatura, 2);

    json += ",\"ph\":";
    json += String(ph, 2);

    json += ",\"turbidez\":";
    json += String(turbidez, 2);

    json += "}";


    Serial.println();
    Serial.println(
        "Enviando dados..."
    );

    Serial.println(json);


    int codigoHTTP =
        http.POST(json);


    Serial.print(
        "HTTP: "
    );

    Serial.println(
        codigoHTTP
    );


    if (codigoHTTP > 0) {

        String resposta =
            http.getString();

        Serial.println(
            "Resposta da API:"
        );

        Serial.println(
            resposta
        );

    } else {

        Serial.println(
            "Erro no envio."
        );

    }


    http.end();
}


/* =====================================================
   SETUP
===================================================== */

void setup() {

    Serial.begin(115200);


    /*
       Ultrassônico
    */

    pinMode(
        PINO_TRIG,
        OUTPUT
    );

    pinMode(
        PINO_ECHO,
        INPUT
    );


    /*
       ADC
    */

    analogReadResolution(12);


    /*
       Temperatura
    */

    sensorTemperatura.begin();


    /*
       Wi-Fi
    */

    conectarWiFi();


    Serial.println();
    Serial.println(
        "================================="
    );

    Serial.println(
        "       WATERVISION - ESP32"
    );

    Serial.println(
        "================================="
    );
}


/* =====================================================
   LOOP
===================================================== */

void loop() {

    unsigned long agora =
        millis();


    if (
        agora - ultimoEnvio >=
        INTERVALO_ENVIO
    ) {

        ultimoEnvio = agora;


        /*
           Leitura dos sensores
        */

        float nivel =
            lerNivel();


        float temperatura =
            lerTemperatura();


        float ph =
            lerPH();


        float turbidez =
            lerTurbidez();


        /*
           Monitor Serial
        */

        Serial.println();
        Serial.println(
            "---------- LEITURA ----------"
        );


        Serial.print(
            "Nivel: "
        );

        Serial.print(
            nivel
        );

        Serial.println(
            " cm"
        );


        Serial.print(
            "Temperatura: "
        );

        Serial.print(
            temperatura
        );

        Serial.println(
            " C"
        );


        Serial.print(
            "pH: "
        );

        Serial.println(
            ph
        );


        Serial.print(
            "Turbidez: "
        );

        Serial.print(
            turbidez
        );

        Serial.println(
            " NTU"
        );


        /*
           Enviar para Google Sheets
        */

        enviarDados(
            nivel,
            temperatura,
            ph,
            turbidez
        );

    }


    delay(10);
}