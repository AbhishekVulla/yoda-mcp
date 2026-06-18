#ifndef _BOARD_CONFIG_H_
#define _BOARD_CONFIG_H_

#include <driver/gpio.h>

// ===================== Yoda Pendant =====================
// Seeed XIAO ESP32-S3 Sense + MAX98357A amplifier + onboard PDM mic + OV2640 camera.
// No display, no LED (base Board provides NoDisplay / NoLed).

// ---------------- Audio ----------------
// Speaker: MAX98357A (I2S standard output).  Mic: onboard PDM microphone.
// Driven by NoAudioCodecSimplexPdm (separate speaker I2S + PDM mic RX).
#define AUDIO_INPUT_SAMPLE_RATE  16000
#define AUDIO_OUTPUT_SAMPLE_RATE 24000

// MAX98357A amplifier — verified wiring on the necklace (LRC=GPIO1, BCLK=GPIO2, DIN=GPIO3, VIN=5V)
#define AUDIO_I2S_SPK_GPIO_BCLK  GPIO_NUM_2   // BCLK
#define AUDIO_I2S_SPK_GPIO_LRCK  GPIO_NUM_1   // LRC / WS
#define AUDIO_I2S_SPK_GPIO_DOUT  GPIO_NUM_3   // DIN on the amp

// Onboard PDM microphone (XIAO ESP32-S3 Sense daughterboard)
#define AUDIO_I2S_MIC_GPIO_CLK   GPIO_NUM_42  // PDM clock
#define AUDIO_I2S_MIC_GPIO_DIN   GPIO_NUM_41  // PDM data

// ---------------- Buttons ----------------
#define BOOT_BUTTON_GPIO         GPIO_NUM_0

// ---------------- Camera (OV2640 on XIAO ESP32-S3 Sense, Seeed pinout) ----------------
#define CAMERA_PIN_PWDN   GPIO_NUM_NC
#define CAMERA_PIN_RESET  GPIO_NUM_NC
#define CAMERA_PIN_XCLK   GPIO_NUM_10
#define CAMERA_PIN_SIOD   GPIO_NUM_40   // SCCB SDA
#define CAMERA_PIN_SIOC   GPIO_NUM_39   // SCCB SCL
#define CAMERA_PIN_D7     GPIO_NUM_48   // Y9
#define CAMERA_PIN_D6     GPIO_NUM_11   // Y8
#define CAMERA_PIN_D5     GPIO_NUM_12   // Y7
#define CAMERA_PIN_D4     GPIO_NUM_14   // Y6
#define CAMERA_PIN_D3     GPIO_NUM_16   // Y5
#define CAMERA_PIN_D2     GPIO_NUM_18   // Y4
#define CAMERA_PIN_D1     GPIO_NUM_17   // Y3
#define CAMERA_PIN_D0     GPIO_NUM_15   // Y2
#define CAMERA_PIN_VSYNC  GPIO_NUM_38
#define CAMERA_PIN_HREF   GPIO_NUM_47
#define CAMERA_PIN_PCLK   GPIO_NUM_13
#define XCLK_FREQ_HZ      20000000

#endif // _BOARD_CONFIG_H_
