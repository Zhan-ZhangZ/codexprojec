#!/usr/bin/env python3
"""
Integration test suite for Octopart MCP Server.

This test suite simulates how an LLM (like Claude) would parse natural language
queries from test-queries.md and call the appropriate tools with structured parameters.

Each test case represents:
1. The original natural language query
2. The expected tool to be called
3. The structured parameters the LLM should extract

Run with: python test_integration.py
Or with pytest: pytest test_integration.py -v
"""

import asyncio
import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from octopart_server import (
    find_resistors,
    find_capacitors,
    find_inductors,
    find_semiconductors,
    find_crystals,
    find_connectors,
    search_components,
    get_datasheet,
    get_part_details,
)


# =============================================================================
# TEST CASES: Each maps a natural language query to expected tool + parameters
# =============================================================================

# Format: (natural_language_query, tool_function, kwargs, description)
TEST_CASES = [
    # =========================================================================
    # MICROCONTROLLERS (use find_semiconductors)
    # =========================================================================
    (
        "Find me a 32-bit 3.3V ST Micro microcontroller with at least 20 GPIOs available at DigiKey",
        find_semiconductors,
        {
            "query": "STM32 microcontroller",
            "distributor": "digikey",
        },
        "STM32 MCU at DigiKey",
    ),
    (
        "Search for ESP32 modules with built-in WiFi and Bluetooth in stock at Mouser",
        find_semiconductors,
        {
            "query": "ESP32 WiFi Bluetooth module",
            "distributor": "mouser",
            "in_stock_only": True,
        },
        "ESP32 modules at Mouser",
    ),
    (
        "Find an 8-bit PIC microcontroller with USB support under $3 at qty 100",
        find_semiconductors,
        {
            "query": "PIC microcontroller 8-bit USB",
            "manufacturer": "Microchip",
            "max_price": 3.0,
            "quantity": 100,
        },
        "PIC MCU with USB under $3",
    ),
    (
        "Search for Nordic nRF52 series BLE microcontrollers in QFN package",
        find_semiconductors,
        {
            "query": "nRF52 BLE",
            "package": "QFN",
        },
        "Nordic nRF52 BLE in QFN",
    ),
    (
        "Find a Microchip SAMD21 with at least 256KB flash available at Arrow",
        find_semiconductors,
        {
            "query": "SAMD21 256KB flash",
            "manufacturer": "Microchip",
            "distributor": "arrow",
        },
        "SAMD21 at Arrow",
    ),

    # =========================================================================
    # RESISTORS (use find_resistors)
    # =========================================================================
    (
        "Search for 0805 10kΩ 1% resistors sorted by price at qty 50 at Newark",
        find_resistors,
        {
            "resistance": "10k",
            "tolerance": "1%",
            "package": "0805",
            "distributor": "newark",
            "quantity": 50,
        },
        "10k 0805 1% resistors at Newark",
    ),
    (
        "Find 2512 package 0.1Ω 1% current sense resistors rated for 1W or more",
        find_resistors,
        {
            "resistance": "0.1",
            "tolerance": "1%",
            "power_rating": "1W",
            "package": "2512",
        },
        "0.1 ohm current sense resistors",
    ),
    (
        "Search for 0402 100Ω 5% resistors at qty 1000 in stock at DigiKey",
        find_resistors,
        {
            "resistance": "100",
            "tolerance": "5%",
            "package": "0402",
            "distributor": "digikey",
            "quantity": 1000,
            "in_stock_only": True,
        },
        "100 ohm 0402 resistors at DigiKey",
    ),
    (
        "Find thick film 0603 4.7kΩ resistor arrays (4 element) at Mouser",
        find_resistors,
        {
            "resistance": "4.7k",
            "package": "0603",
            "distributor": "mouser",
        },
        "4.7k resistor arrays at Mouser",
    ),
    (
        "Search for 1206 10Ω 1% anti-surge resistors",
        find_resistors,
        {
            "resistance": "10",
            "tolerance": "1%",
            "package": "1206",
        },
        "10 ohm anti-surge resistors",
    ),

    # =========================================================================
    # CAPACITORS (use find_capacitors)
    # =========================================================================
    (
        "Find 0805 10µF 16V X5R ceramic capacitors under $0.10 at qty 100",
        find_capacitors,
        {
            "capacitance": "10uF",
            "voltage_rating": "16V",
            "dielectric": "X5R",
            "package": "0805",
            "capacitor_type": "ceramic",
            "max_price": 0.10,
            "quantity": 100,
        },
        "10uF 0805 X5R capacitors",
    ),
    (
        "Search for 1210 22µF 25V X7R MLCCs in stock at DigiKey",
        find_capacitors,
        {
            "capacitance": "22uF",
            "voltage_rating": "25V",
            "dielectric": "X7R",
            "package": "1210",
            "capacitor_type": "ceramic",
            "distributor": "digikey",
            "in_stock_only": True,
        },
        "22uF X7R MLCCs at DigiKey",
    ),
    (
        "Find aluminum electrolytic capacitors 100µF 50V with less than 100mΩ ESR",
        find_capacitors,
        {
            "capacitance": "100uF",
            "voltage_rating": "50V",
            "capacitor_type": "aluminum electrolytic",
        },
        "100uF electrolytic capacitors",
    ),
    (
        "Search for 0402 100nF 16V X7R capacitors at qty 5000",
        find_capacitors,
        {
            "capacitance": "100nF",
            "voltage_rating": "16V",
            "dielectric": "X7R",
            "package": "0402",
            "quantity": 5000,
        },
        "100nF 0402 X7R capacitors",
    ),
    (
        "Find tantalum capacitors 47µF 10V in B-case size",
        find_capacitors,
        {
            "capacitance": "47uF",
            "voltage_rating": "10V",
            "capacitor_type": "tantalum",
        },
        "47uF tantalum capacitors",
    ),

    # =========================================================================
    # INDUCTORS (use find_inductors)
    # =========================================================================
    (
        "Search for 4.7µH shielded power inductors with DCR under 50mΩ and Isat above 2A",
        find_inductors,
        {
            "inductance": "4.7uH",
            "shielded": True,
            "current_rating": "2A",
        },
        "4.7uH shielded inductors",
    ),
    (
        "Find 10µH 0805 ferrite bead inductors rated for 500mA",
        find_inductors,
        {
            "inductance": "10uH",
            "package": "0805",
            "current_rating": "500mA",
        },
        "10uH ferrite beads",
    ),
    (
        "Search for 22µH drum core inductors with saturation current above 3A at DigiKey",
        find_inductors,
        {
            "inductance": "22uH",
            "current_rating": "3A",
            "distributor": "digikey",
        },
        "22uH drum core inductors at DigiKey",
    ),
    (
        "Find 100nH 0402 RF inductors with Q > 20 at 100MHz",
        find_inductors,
        {
            "inductance": "100nH",
            "package": "0402",
        },
        "100nH RF inductors",
    ),

    # =========================================================================
    # POWER MANAGEMENT (use find_semiconductors)
    # =========================================================================
    (
        "Find a 3.3V buck regulator with output current of at least 500mA and input voltage above 10V",
        find_semiconductors,
        {
            "query": "3.3V buck regulator 500mA",
        },
        "3.3V buck regulator",
    ),
    (
        "Search for 5V 3A synchronous buck converters with integrated FETs in QFN package",
        find_semiconductors,
        {
            "query": "5V 3A synchronous buck converter",
            "package": "QFN",
        },
        "5V 3A buck converter in QFN",
    ),
    (
        "Find LDO regulators 3.3V 500mA with dropout under 300mV at Mouser",
        find_semiconductors,
        {
            "query": "LDO regulator 3.3V 500mA low dropout",
            "distributor": "mouser",
        },
        "3.3V LDO at Mouser",
    ),
    (
        "Search for boost converters with input 3.3V output 5V at 1A or more",
        find_semiconductors,
        {
            "query": "boost converter 3.3V to 5V 1A",
        },
        "3.3V to 5V boost converter",
    ),
    (
        "Find isolated DC-DC converters 5V to 5V at 1W in SIP package",
        find_semiconductors,
        {
            "query": "isolated DC-DC converter 5V 1W",
            "package": "SIP",
        },
        "Isolated DC-DC in SIP",
    ),
    (
        "Search for USB-C PD controllers with integrated buck converter",
        find_semiconductors,
        {
            "query": "USB-C PD controller integrated buck",
        },
        "USB-C PD controllers",
    ),

    # =========================================================================
    # MOSFETs & TRANSISTORS (use find_semiconductors)
    # =========================================================================
    (
        "Find N-channel MOSFETs with Vds ≥ 60V, Rds(on) < 10mΩ at 10V Vgs in SO-8 package",
        find_semiconductors,
        {
            "query": "N-channel MOSFET 60V SO-8",
        },
        "N-channel MOSFET 60V SO-8",
    ),
    (
        "Search for P-channel MOSFETs rated 30V 10A in SOT-23 package",
        find_semiconductors,
        {
            "query": "P-channel MOSFET 30V",
            "package": "SOT-23",
        },
        "P-channel MOSFET SOT-23",
    ),
    (
        "Find NPN transistors 2N2222 equivalent in SOT-23 at qty 500",
        find_semiconductors,
        {
            "query": "2N2222 NPN SOT-23",
            "quantity": 500,
        },
        "2N2222 equivalent in SOT-23",
    ),
    (
        "Search for N-channel logic-level MOSFETs (Vgs(th) < 2V) with Id > 5A",
        find_semiconductors,
        {
            "query": "N-channel logic level MOSFET 5A",
        },
        "Logic-level N-ch MOSFET",
    ),
    (
        "Find dual N-channel MOSFETs in SO-8 package with Rds(on) under 20mΩ",
        find_semiconductors,
        {
            "query": "dual N-channel MOSFET SO-8",
        },
        "Dual N-channel MOSFET SO-8",
    ),

    # =========================================================================
    # DIODES (use find_semiconductors)
    # =========================================================================
    (
        "Search for Schottky diodes 40V 3A in SMA package with Vf under 0.5V",
        find_semiconductors,
        {
            "query": "Schottky diode 40V 3A",
            "package": "SMA",
        },
        "40V 3A Schottky diode SMA",
    ),
    (
        "Find TVS diodes 5V bidirectional in SOD-123 package",
        find_semiconductors,
        {
            "query": "TVS diode 5V bidirectional",
            "package": "SOD-123",
        },
        "5V bidirectional TVS SOD-123",
    ),
    (
        "Search for 1N4148 equivalent fast switching diodes in SOD-323",
        find_semiconductors,
        {
            "query": "1N4148 fast switching diode",
            "package": "SOD-323",
        },
        "1N4148 equivalent SOD-323",
    ),
    (
        "Find Zener diodes 3.3V 500mW in SOD-123 at DigiKey",
        find_semiconductors,
        {
            "query": "Zener diode 3.3V 500mW",
            "package": "SOD-123",
            "distributor": "digikey",
        },
        "3.3V Zener SOD-123 at DigiKey",
    ),
    (
        "Search for bridge rectifiers 100V 1A in DIP-4 package",
        find_semiconductors,
        {
            "query": "bridge rectifier 100V 1A",
            "package": "DIP-4",
        },
        "100V 1A bridge rectifier DIP-4",
    ),

    # =========================================================================
    # CONNECTORS (use find_connectors)
    # =========================================================================
    (
        "Find USB-C receptacle connectors 16-pin SMD mid-mount at Mouser",
        find_connectors,
        {
            "query": "USB-C",
            "connector_type": "receptacle",
            "pin_count": 16,
            "mounting": "SMD",
            "distributor": "mouser",
        },
        "USB-C receptacle at Mouser",
    ),
    (
        "Search for 2.54mm pitch male headers 40-pin single row",
        find_connectors,
        {
            "query": "male header",
            "pin_count": 40,
            "pitch": "2.54mm",
        },
        "40-pin male header 2.54mm",
    ),
    (
        "Find JST-PH 2mm pitch 4-pin receptacles with through-hole terminals",
        find_connectors,
        {
            "query": "JST-PH",
            "connector_type": "receptacle",
            "pin_count": 4,
            "pitch": "2mm",
            "mounting": "through-hole",
        },
        "JST-PH 4-pin receptacle",
    ),
    (
        "Search for micro SD card connectors push-push type SMD",
        find_connectors,
        {
            "query": "micro SD card connector push-push",
            "mounting": "SMD",
        },
        "Micro SD connector SMD",
    ),
    (
        "Find RJ45 connectors with integrated magnetics and LEDs",
        find_connectors,
        {
            "query": "RJ45 integrated magnetics LED",
        },
        "RJ45 with magnetics",
    ),

    # =========================================================================
    # CRYSTALS & OSCILLATORS (use find_crystals)
    # =========================================================================
    (
        "Search for 8MHz crystals in HC-49 package with 20ppm tolerance",
        find_crystals,
        {
            "frequency": "8MHz",
            "package": "HC-49",
            "ppm_tolerance": "20ppm",
        },
        "8MHz HC-49 crystal",
    ),
    (
        "Find 32.768kHz crystals in 2x1.2mm SMD package for RTC",
        find_crystals,
        {
            "frequency": "32.768kHz",
            "package": "2x1.2mm",
        },
        "32.768kHz RTC crystal",
    ),
    (
        "Search for 25MHz TCXO oscillators with ±2.5ppm stability",
        find_crystals,
        {
            "frequency": "25MHz",
            "ppm_tolerance": "2.5ppm",
        },
        "25MHz TCXO",
    ),
    (
        "Find 12MHz crystals with 18pF load capacitance in 3.2x2.5mm package",
        find_crystals,
        {
            "frequency": "12MHz",
            "load_capacitance": "18pF",
            "package": "3.2x2.5mm",
        },
        "12MHz crystal 18pF load",
    ),

    # =========================================================================
    # SENSORS (use find_semiconductors or search_components)
    # =========================================================================
    (
        "Search for I2C temperature sensors ±0.5°C accuracy in SOT-23",
        find_semiconductors,
        {
            "query": "I2C temperature sensor 0.5C accuracy",
            "package": "SOT-23",
        },
        "I2C temp sensor SOT-23",
    ),
    (
        "Find BME280 or equivalent pressure/humidity/temperature sensors",
        search_components,
        {
            "query": "BME280 pressure humidity temperature sensor",
        },
        "BME280 sensor",
    ),
    (
        "Search for Hall effect sensors with analog output at DigiKey",
        find_semiconductors,
        {
            "query": "Hall effect sensor analog output",
            "distributor": "digikey",
        },
        "Hall effect sensor at DigiKey",
    ),
    (
        "Find MEMS accelerometers 3-axis with I2C/SPI interface",
        find_semiconductors,
        {
            "query": "MEMS accelerometer 3-axis I2C SPI",
        },
        "3-axis accelerometer",
    ),
    (
        "Search for ambient light sensors with I2C interface under $1",
        find_semiconductors,
        {
            "query": "ambient light sensor I2C",
            "max_price": 1.0,
        },
        "Ambient light sensor under $1",
    ),

    # =========================================================================
    # LEDs & OPTOELECTRONICS (use find_semiconductors)
    # =========================================================================
    (
        "Find 0603 green LEDs with forward voltage 2.0-2.4V at qty 100",
        find_semiconductors,
        {
            "query": "green LED 0603",
            "package": "0603",
            "quantity": 100,
        },
        "Green 0603 LED",
    ),
    (
        "Search for WS2812B addressable RGB LEDs in 5050 package",
        find_semiconductors,
        {
            "query": "WS2812B addressable RGB LED",
            "package": "5050",
        },
        "WS2812B RGB LED",
    ),
    (
        "Find optocouplers with CTR > 100% and isolation voltage > 3kV",
        find_semiconductors,
        {
            "query": "optocoupler 3kV isolation",
        },
        "Optocoupler 3kV isolation",
    ),
    (
        "Search for IR LEDs 940nm with viewing angle < 30°",
        find_semiconductors,
        {
            "query": "IR LED 940nm narrow angle",
        },
        "940nm IR LED narrow",
    ),
    (
        "Find photodiodes for visible light detection in SMD package",
        find_semiconductors,
        {
            "query": "photodiode visible light SMD",
        },
        "Visible light photodiode",
    ),

    # =========================================================================
    # INTERFACE ICs (use find_semiconductors)
    # =========================================================================
    (
        "Search for RS-485 transceivers 3.3V with ESD protection in SO-8",
        find_semiconductors,
        {
            "query": "RS-485 transceiver 3.3V ESD protection",
            "package": "SO-8",
        },
        "RS-485 transceiver SO-8",
    ),
    (
        "Find I2C level shifters bidirectional 4-channel at Mouser",
        find_semiconductors,
        {
            "query": "I2C level shifter bidirectional 4-channel",
            "distributor": "mouser",
        },
        "I2C level shifter at Mouser",
    ),
    (
        "Search for CAN transceivers 3.3V with standby mode in SO-8",
        find_semiconductors,
        {
            "query": "CAN transceiver 3.3V standby",
            "package": "SO-8",
        },
        "CAN transceiver SO-8",
    ),
    (
        "Find USB to UART bridge ICs with integrated oscillator",
        find_semiconductors,
        {
            "query": "USB UART bridge integrated oscillator",
        },
        "USB-UART bridge IC",
    ),
    (
        "Search for SPI flash memory 16Mbit in SO-8 package",
        find_semiconductors,
        {
            "query": "SPI flash memory 16Mbit",
            "package": "SO-8",
        },
        "16Mbit SPI flash SO-8",
    ),

    # =========================================================================
    # MISCELLANEOUS (use find_semiconductors or search_components)
    # =========================================================================
    (
        "Find ESD protection diodes for USB 2.0 data lines in SOT-23-6",
        find_semiconductors,
        {
            "query": "ESD protection USB 2.0",
            "package": "SOT-23-6",
        },
        "USB ESD protection SOT-23-6",
    ),
    (
        "Search for ferrite beads 0805 600Ω at 100MHz rated 500mA",
        find_inductors,
        {
            "inductance": "",  # Ferrite beads spec'd by impedance, not inductance
            "package": "0805",
            "current_rating": "500mA",
        },
        "0805 ferrite bead 600 ohm",
    ),
    (
        "Find resettable fuses (PTCs) 500mA hold current in 1206",
        search_components,
        {
            "query": "PTC resettable fuse 500mA",
            "package": "1206",
        },
        "500mA PTC fuse 1206",
    ),
    (
        "Search for varistors 5V for USB ESD protection",
        search_components,
        {
            "query": "varistor 5V USB ESD protection",
        },
        "5V varistor for USB",
    ),
    (
        "Find TVS diode arrays for HDMI protection",
        find_semiconductors,
        {
            "query": "TVS diode array HDMI protection",
        },
        "HDMI TVS array",
    ),
]


# =============================================================================
# TEST RUNNER
# =============================================================================

class TestResult:
    """Holds test result information."""
    def __init__(self, name, query, passed, error=None, result_preview=None):
        self.name = name
        self.query = query
        self.passed = passed
        self.error = error
        self.result_preview = result_preview


async def run_single_test(query, tool_func, kwargs, description):
    """Run a single test case and return result."""
    try:
        # Call the tool with the structured parameters
        result = await tool_func(**kwargs)

        # Check if we got results (not an error)
        if result.startswith("Error:") or result.startswith("API Error:"):
            return TestResult(
                name=description,
                query=query,
                passed=False,
                error=result,
            )

        # Check if we found components
        if "No components found" in result or "Found 0 " in result:
            return TestResult(
                name=description,
                query=query,
                passed=False,
                error="No components found",
                result_preview=result[:200],
            )

        # Success - extract hit count if available
        preview = result[:300] if len(result) > 300 else result
        return TestResult(
            name=description,
            query=query,
            passed=True,
            result_preview=preview,
        )

    except Exception as e:
        return TestResult(
            name=description,
            query=query,
            passed=False,
            error=str(e),
        )


async def run_all_tests(verbose=True, limit=None):
    """Run all test cases and report results."""
    results = []
    test_cases = TEST_CASES[:limit] if limit else TEST_CASES

    print(f"\n{'='*70}")
    print(f"Running {len(test_cases)} integration tests")
    print(f"{'='*70}\n")

    for i, (query, tool_func, kwargs, description) in enumerate(test_cases, 1):
        print(f"[{i}/{len(test_cases)}] {description}...")

        result = await run_single_test(query, tool_func, kwargs, description)
        results.append(result)

        if result.passed:
            print(f"  PASS")
            if verbose and result.result_preview:
                # Extract hit count
                lines = result.result_preview.split('\n')
                if lines:
                    print(f"  {lines[0]}")
        else:
            print(f"  FAIL: {result.error}")

        # Small delay to avoid rate limiting
        await asyncio.sleep(0.5)

    # Summary
    passed = sum(1 for r in results if r.passed)
    failed = sum(1 for r in results if not r.passed)

    print(f"\n{'='*70}")
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(results)} tests")
    print(f"{'='*70}")

    if failed > 0:
        print("\nFailed tests:")
        for r in results:
            if not r.passed:
                print(f"  - {r.name}: {r.error}")

    return results


# =============================================================================
# PYTEST FIXTURES AND TESTS
# =============================================================================

@pytest.fixture
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# Generate individual pytest test cases
@pytest.mark.parametrize(
    "query,tool_func,kwargs,description",
    TEST_CASES,
    ids=[t[3] for t in TEST_CASES]
)
@pytest.mark.asyncio
async def test_query(query, tool_func, kwargs, description):
    """Test that a natural language query returns valid results."""
    result = await run_single_test(query, tool_func, kwargs, description)

    if not result.passed:
        pytest.fail(f"{description}: {result.error}")


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run Octopart MCP integration tests")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument("-n", "--limit", type=int, help="Limit number of tests to run")
    parser.add_argument("--category", type=str, help="Run tests for specific category")
    args = parser.parse_args()

    # Check for API credentials
    if not os.environ.get("NEXAR_CLIENT_ID") or not os.environ.get("NEXAR_CLIENT_SECRET"):
        print("ERROR: NEXAR_CLIENT_ID and NEXAR_CLIENT_SECRET environment variables required")
        print("\nSet them with:")
        print('  export NEXAR_CLIENT_ID="your-client-id"')
        print('  export NEXAR_CLIENT_SECRET="your-client-secret"')
        sys.exit(1)

    asyncio.run(run_all_tests(verbose=args.verbose, limit=args.limit))
