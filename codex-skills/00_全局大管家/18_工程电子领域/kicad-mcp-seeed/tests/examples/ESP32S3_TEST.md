# ESP32S3 Development Board Test Example

This document demonstrates how to use the KiCad MCP Server to create a complete ESP32S3 development board schematic with peripherals and generate Arduino test code.

## Project Description

Create an ESP32S3 development board with:
- **MCU**: ESP32S3-WROOM-1 module
- **Display**: SSD1306 I2C OLED (128x32)
- **Input**: Push button with pull-up resistor
- **Output**: LED with current limiting resistor

## Generated Files

### 1. Schematic File (`esp32s3_devboard.kicad_sch`)

KiCad schematic file with the following components:

| Reference | Component | Value | Footprint |
|-----------|-----------|-------|-----------|
| U1 | ESP32 Module | ESP32S3-WROOM-1 | Module:ESP32S3-WROOM-1-N16R8 |
| U2 | OLED Display | SSD1306 | Display:OLED-0.91-128x32 |
| SW1 | Push Button | BUTTON | Button_Switch_SMD:SW_Push_1P1T_NO_6x6mm_H9.5mm |
| D1 | LED | LED_RED | LED_SMD:LED_0805_2012Metric |
| R1 | Resistor | 1k | Resistor_SMD:R_0805_2012Metric |
| R2 | Resistor | 10k | Resistor_SMD:R_0805_2012Metric |

### 2. Arduino Test Code (`esp32s3_test.ino`)

Complete Arduino test firmware with:

#### Features
- **LED Test**: Blinks LED 3 times on startup
- **Button Test**: Detects button presses with debounce
- **I2C Scan**: Scans I2C bus and detects OLED display
- **OLED Display**: Shows test status and button press count
- **Serial Output**: 115200 baud debug output

#### Pin Configuration
```
BUTTON_PIN = GPIO0 (internal pull-up)
LED_PIN    = GPIO2
I2C_SDA    = GPIO6
I2C_SCL    = GPIO7
```

#### Test Sequence
1. Initialize serial communication
2. Configure GPIO pins
3. Initialize I2C bus
4. Initialize OLED display
5. Run LED blink test
6. Run button input test
7. Scan I2C bus for devices
8. Enter interactive mode:
   - Press button to toggle LED
   - Update display with test count
   - Serial output of each action

#### Required Libraries
```cpp
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
```

Install via Arduino IDE Library Manager:
- Adafruit GFX Library
- Adafruit SSD1306

#### Hardware Connections
```
ESP32S3-WROOM-1:
  GPIO6 → OLED SDA
  GPIO7 → OLED SCL
  GPIO0 → SW1 (Button)
  GPIO2 → R1 → D1 (LED) → GND
  +3V3  → OLED VDD, R2, R1
  GND   → OLED GND, SW1, D1 cathode
```

## Usage Instructions

### 1. Setup Arduino IDE

```bash
# Install Arduino IDE 2.0
# Add ESP32 board support
# Tools > Board > Boards Manager > Search "ESP32" > Install
```

### 2. Configure Board

```
Tools > Board > esp32 > ESP32S3 Dev Module
Tools > Upload Speed: 921600
Tools > USB Mode: Hardware CDC and JTAG
Tools > Port: (Select your ESP32S3 board)
```

### 3. Install Required Libraries

```
Sketch > Include Library > Manage Libraries
Search: "Adafruit GFX" → Install
Search: "Adafruit SSD1306" → Install
```

### 4. Upload Code

1. Open `esp32s3_test.ino` in Arduino IDE
2. Verify/Compile the code (✓ button)
3. Upload to ESP32S3
4. Open Serial Monitor (115200 baud)

### 5. Expected Output

```
===============================================
ESP32S3 Dev Board - Arduino Test Suite
===============================================

✅ Pins initialized:
  Button: GPIO0
  LED:    GPIO2

✅ I2C initialized:
  SDA: GPIO6
  SCL: GPIO7

✅ OLED display initialized (0x3C)

Display test pattern shown on OLED

Running initial tests...

Test: LED Blink
  Blink 1
  Blink 2
  Blink 3
✅ LED test passed

Test: Button Input
  Initial state: HIGH
  Waiting for button press...
✅ Button test ready

Test: I2C Bus Scan
  Scanning I2C bus...
  I2C device found at 0x3C
  1 device(s) found
✅ I2C scan complete

===============================================
Initialization complete!
Ready for interactive testing
===============================================
```

### 6. Interactive Testing

Press the button to:
- Toggle LED on/off
- Increment test counter
- Update OLED display
- Log to serial monitor

OLED will show:
```
ESP32S3 Test
Count: 5
LED: ON
Btn: PRESSED
```

## Troubleshooting

### OLED not detected
- Check I2C connections (SDA/SCL)
- Verify I2C address (default 0x3C)
- Try scanning I2C bus with different addresses

### Button not working
- Verify GPIO0 is properly connected
- Check internal pull-up is enabled
- Test with external pull-up resistor (10k)

### LED not lighting
- Verify LED orientation (anode to MCU)
- Check current limiting resistor (1k to GND)
- Test LED with multimeter

### Upload fails
- Press BOOT button when uploading
- Check USB driver installation
- Try lower upload speed (460800)

## Example Output Video

Expected behavior:
1. Power on → OLED displays "ESP32S3 Test"
2. LED blinks 3 times
3. Serial monitor shows test sequence
4. Press button → LED toggles
5. OLED updates with count

## Extensions

Possible enhancements:
- Add WiFi/Bluetooth connectivity tests
- PWM output to LED for brightness control
- ADC input for analog sensors
- SPI flash memory test
- Deep sleep mode test
- OTA firmware update

## License

This test code is part of the KiCad MCP Server project.
