# Code-to-PCB: Automated Hardware Design from Firmware

## Vision

Enable users to provide microcontroller code and automatically generate a complete PCB design with parts list, pricing, and 3D model in a single interaction.

## User Story

As a firmware developer, I want to provide my microcontroller code to the MCP and receive a complete PCB design proposal with:

- Analyzed hardware requirements
- Suggested components with pricing
- Generated schematic
- Routed PCB layout
- 3D model for mechanical verification
  So that I can rapidly prototype hardware without manual PCB design work.

## Example Usage

```
User: "Here's my ESP32 code for a temperature sensor with OLED display.
      Create a PCB for this."

[Attaches main.cpp with pin definitions and peripheral usage]

MCP Response:
1. Analyzing code...
   - Detected: ESP32-WROOM-32 microcontroller
   - I2C Bus: SDA=21, SCL=22 (OLED display)
   - OneWire: GPIO4 (DS18B20 temp sensor)
   - Power: USB-C input, 3.3V regulation required

2. Generating parts list with pricing (100 units, JLCPCB)...
   - ESP32-WROOM-32: $2.45 ea
   - 0.96" I2C OLED (SSD1306): $1.89 ea
   - DS18B20 Temperature Sensor: $0.95 ea
   - AMS1117-3.3 LDO: $0.12 ea
   - USB-C Connector: $0.18 ea
   - Passive components (caps, resistors): $0.35 total

   Total BOM cost: $6.94/unit

3. Draft schematic ready. Approve to generate PCB? [Yes/No/Modify]

User: "Yes, but make it a 2-layer board"

MCP:
4. Generating 2-layer PCB...
   - Schematic created ✓
   - Components placed ✓
   - Auto-routing completed ✓
   - DRC checks passed ✓

5. 3D model generated: [shows STEP file preview]

Project saved to: ./esp32-temp-sensor/
Files: schematic.kicad_sch, pcb.kicad_pcb, bom.csv, 3d-model.step

Ready for fabrication! Gerbers can be exported with: "Export Gerbers for JLCPCB"
```

## Core Requirements

### 1. Code Analysis Engine

**Capabilities:**

- Parse C/C++/Arduino/PlatformIO code
- Extract pin assignments and GPIO usage
- Detect peripherals (I2C, SPI, UART, ADC, PWM, etc.)
- Identify power requirements
- Detect communication protocols
- Extract timing/frequency requirements

**Technologies:**

- Tree-sitter for code parsing
- LLM (Claude/GPT-4) for semantic understanding
- Pattern matching for common frameworks (Arduino, ESP-IDF, etc.)

**Output:**

```json
{
  "microcontroller": {
    "family": "ESP32",
    "variant": "ESP32-WROOM-32",
    "package": "SMD-38",
    "voltage": "3.3V",
    "flash": "4MB"
  },
  "pins": [
    { "pin": 21, "function": "I2C_SDA", "peripheral": "OLED" },
    { "pin": 22, "function": "I2C_SCL", "peripheral": "OLED" },
    { "pin": 4, "function": "OneWire", "peripheral": "DS18B20" }
  ],
  "peripherals": [
    {
      "type": "I2C_OLED",
      "address": "0x3C",
      "suggested_part": "SSD1306 0.96inch",
      "voltage": "3.3V"
    },
    {
      "type": "Temperature_Sensor",
      "protocol": "OneWire",
      "suggested_part": "DS18B20"
    }
  ],
  "power": {
    "input": "USB-C or 5V barrel jack",
    "regulation": "3.3V LDO required",
    "estimated_current": "250mA"
  }
}
```

### 2. Intelligent Component Selection

**Capabilities:**

- Map detected peripherals to actual components
- Suggest compatible parts with specs
- Query supplier APIs for availability and pricing
- Rank options by cost, availability, features
- Support user preferences (e.g., "JLCPCB basic parts only")

**Data Sources:**

- OctoPart API (pricing, availability)
- JLCPCB Parts Library API
- Mouser/Digikey APIs
- Component database (local cache)

**Selection Criteria:**

- Price (weighted by quantity)
- Availability (in-stock, lead time)
- Compatibility (voltage, interface, package)
- Manufacturability (JLCPCB assembly support)
- User constraints (cost limit, specific suppliers)

### 3. PRD Generation with Pricing

**Output Format:**

- Markdown or JSON structured report
- Component list with specifications
- Per-unit pricing breakdown
- Total cost estimation (for specified quantities)
- Links to datasheets and supplier pages
- Alternative component suggestions

**Interactive Review:**

- User can approve, modify, or reject components
- Substitution suggestions if parts unavailable
- Real-time price updates

### 4. Automated Schematic Generation

**Capabilities:**

- Generate KiCad schematic from hardware spec
- Place MCU with pin assignments
- Add peripheral circuits (pull-ups, decoupling, etc.)
- Create power supply section
- Add connectors and interfaces
- Generate netlist

**Technologies:**

- KiCad Python API (kicad-cli or scripting)
- Template-based circuit generation
- LLM-guided circuit design for complex peripherals

**Circuit Knowledge Base:**

- Common MCU reference designs
- Peripheral connection patterns (I2C, SPI, etc.)
- Power supply circuits (LDOs, buck converters)
- Protection circuits (ESD, reverse polarity)

### 5. Auto-Placement and Routing

**Capabilities:**

- Intelligent component placement based on:
  - Signal flow and connections
  - Thermal considerations
  - Mechanical constraints
  - Layer count optimization
- Automated trace routing with:
  - KiCad built-in autorouter
  - FreeRouting integration
  - AI-guided routing (future: ML-based)
- DRC/ERC validation and auto-fix

**Constraints:**

- Trace width rules (power vs. signal)
- Clearance rules
- Differential pairs (if needed)
- Impedance control (for high-speed signals)

### 6. 3D Model Generation

**Capabilities:**

- Assign 3D models to components (from library)
- Generate board 3D view
- Export STEP/VRML for mechanical integration
- Render realistic previews (with FreeCAD)

**Output:**

- STEP file for mechanical CAD
- VRML for visualization
- PNG/JPG renders for approval

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Input (Code)                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Code Analysis Service                       │
│  • Tree-sitter parsing                                  │
│  • LLM semantic extraction (Claude/GPT-4)               │
│  • Hardware requirement extraction                       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│          Component Selection Service                     │
│  • Query OctoPart, JLCPCB, Mouser APIs                 │
│  • Rank by price, availability, compatibility           │
│  • Generate parts list with pricing                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│               PRD Generation Service                     │
│  • Format component list                                │
│  • Calculate costs                                       │
│  • Generate approval document                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼ [User Approval]
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│          Schematic Generation Service                    │
│  • KiCad Python API                                     │
│  • Circuit template library                              │
│  • Netlist generation                                    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│           PCB Layout Service                             │
│  • Auto-placement (KiCad Python API)                    │
│  • Auto-routing (FreeRouting/KiCad)                     │
│  • DRC/ERC validation                                    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│            3D Model Service                              │
│  • Assign 3D models                                      │
│  • Export STEP/VRML                                      │
│  • Render preview                                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Output: Complete PCB Project                │
│  • Schematic, PCB, BOM, 3D model, Gerbers               │
└─────────────────────────────────────────────────────────┘
```

## MCP Tools Required

### New Tools:

1. **kicad_analyze_code**
   - Input: Source code file(s) or code snippet
   - Output: Hardware requirements JSON

2. **kicad_generate_parts_list**
   - Input: Hardware requirements
   - Output: Component list with pricing

3. **kicad_create_from_code**
   - Input: Code, user preferences, approval
   - Output: Complete PCB project

4. **kicad_generate_schematic**
   - Input: Parts list, netlist
   - Output: KiCad schematic file

5. **kicad_auto_layout**
   - Input: Schematic netlist
   - Output: Placed and routed PCB

### Enhanced Tools:

- **kicad_init_project** - Add "from_code" parameter
- **kicad_generate_bom** - Add supplier pricing integration
- **kicad_generate_3d** - Add realistic rendering

## Dependencies

### External Services:

- OctoPart API (component search and pricing)
- JLCPCB API (parts library and pricing)
- Mouser/Digikey APIs (alternative suppliers)
- Perplexity/Claude API (LLM for code analysis)

### KiCad Integration:

- KiCad 8.x IPC protocol (once available)
- KiCad Python scripting bridge
- kicad-cli for command-line operations

### Additional Tools:

- Tree-sitter (code parsing)
- FreeRouting (advanced routing)
- FreeCAD (3D rendering)

## Implementation Phases

### Phase 1: Code Analysis (MVP)

- Parse Arduino/ESP32 code
- Extract pin assignments
- Detect common peripherals (I2C, SPI, GPIO)
- Output hardware requirements JSON

### Phase 2: Component Selection

- Integrate OctoPart API
- Component matching algorithm
- Generate parts list with pricing
- Interactive approval workflow

### Phase 3: Schematic Generation

- KiCad Python API integration
- Circuit template library (MCU, power, peripherals)
- Automated netlist generation
- ERC validation

### Phase 4: PCB Layout

- Auto-placement algorithm
- FreeRouting integration
- DRC validation and auto-fix
- Export Gerbers

### Phase 5: 3D Visualization

- 3D model assignment
- STEP export
- Realistic rendering with FreeCAD
- Mechanical validation tools

### Phase 6: Full Integration

- Single-command workflow
- Iterative refinement support
- Cost optimization suggestions
- Multi-variant generation (e.g., different MCUs)

## Success Criteria

- ✅ User provides code → receives complete PCB in <5 minutes
- ✅ 90%+ accuracy in peripheral detection
- ✅ Pricing within 10% of manual selection
- ✅ Generated schematic passes ERC
- ✅ Generated PCB passes DRC
- ✅ 3D model accurately represents board
- ✅ Supports common platforms (Arduino, ESP32, STM32, RP2040)

## Risks and Mitigations

**Risk 1:** Code analysis fails to detect all peripherals

- _Mitigation:_ Allow manual specification of components
- _Mitigation:_ Use LLM with RAG for edge cases

**Risk 2:** Supplier API rate limits or costs

- _Mitigation:_ Cache component data locally
- _Mitigation:_ Batch API requests

**Risk 3:** KiCad IPC not yet available

- _Mitigation:_ Use Python scripting bridge as interim
- _Mitigation:_ kicad-cli command-line operations

**Risk 4:** Auto-routing quality poor

- _Mitigation:_ User review and manual adjustment
- _Mitigation:_ Iterative improvement with AI feedback

**Risk 5:** Complex circuits not supported

- _Mitigation:_ Start with simple digital circuits
- _Mitigation:_ Expand template library incrementally

## Future Enhancements

- Multi-board systems (e.g., main board + sensor modules)
- Firmware-hardware co-optimization
- Design for manufacturability (DFM) checks
- Cost optimization across suppliers
- PCB variant generation (different sizes, features)
- Integration with PCB assembly services
- Simulation integration (LTspice, ngspice)
- Version control for hardware (like Git for PCBs)

## Timeline Estimate

- **Phase 1:** 2-3 weeks (Code analysis MVP)
- **Phase 2:** 2-3 weeks (Component selection)
- **Phase 3:** 3-4 weeks (Schematic generation)
- **Phase 4:** 4-5 weeks (PCB layout)
- **Phase 5:** 2-3 weeks (3D visualization)
- **Phase 6:** 2-3 weeks (Integration & polish)

**Total:** ~4-5 months for complete feature

## MVP Definition (1 month)

For rapid validation, an MVP could include:

1. **Code analysis** for ESP32/Arduino (pin detection only)
2. **Manual component entry** with pricing lookup
3. **Template-based schematic** generation
4. **Manual placement** with auto-routing
5. **Basic 3D export**

This proves the concept and allows user feedback before full automation.
