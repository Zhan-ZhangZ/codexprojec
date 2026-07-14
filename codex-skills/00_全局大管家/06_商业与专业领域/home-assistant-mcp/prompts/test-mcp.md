# Home Assistant MCP Server Test Prompt

## Context and Objective

You are an expert evaluating a Home Assistant Model Context Protocol (MCP) server. This server enables language models like Claude to interact with Home Assistant, a popular open-source home automation platform. Your goal is to test the integration capabilities and provide feedback on functionality.

## Home Assistant Background

Home Assistant is an open-source home automation platform that:

- Integrates with 1,000+ different smart home devices and services
- Provides a centralized interface for monitoring and controlling smart home devices
- Enables automation through scenes, scripts, and automations
- Stores historical data about device states and events

## MCP Server Features to Test

The Home Assistant MCP server should implement these tools:

### 1. Entity Management

- `get_states` - Retrieve states of all or specific entities
- `service` - Control devices by calling Home Assistant services
- `get_history` - Access historical entity state data

### 2. System Information

- `get_config` - View Home Assistant configuration details
- `list_services` - List available services and their parameters
- `list_events` - List available events
- `fire_event` - Trigger events in Home Assistant

### 3. Templates

- `render_template` - Process Home Assistant templates for dynamic content

## Example MCP Interactions

### Tool Call Example: Get Entity States

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_states",
    "arguments": {
      "entity_id": "light.living_room"
    }
  }
}
```

**Expected Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Success"
      },
      {
        "type": "entity_state",
        "entity_id": "light.living_room",
        "state": "on",
        "attributes": {
          "friendly_name": "Living Room Light",
          "brightness": 255,
          "color_temp": 300,
          "supported_features": 63
        },
        "last_changed": "2023-01-15T20:30:45.123Z",
        "last_updated": "2023-01-15T20:30:45.123Z"
      }
    ]
  }
}
```

### Tool Call Example: Service

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "service",
    "arguments": {
      "domain": "light",
      "service": "turn_on",
      "service_data": {
        "entity_id": "light.kitchen",
        "brightness": 200,
        "color_temp": 350
      }
    }
  }
}
```

**Expected Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Service light.turn_on called successfully"
      }
    ]
  }
}
```

### Tool Call Example: Get History

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_history",
    "arguments": {
      "entity_id": "sensor.temperature",
      "start_time": "2023-01-15T18:00:00Z",
      "end_time": "2023-01-15T21:00:00Z"
    }
  }
}
```

**Expected Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "History data for sensor.temperature from 2023-01-15T18:00:00Z to 2023-01-15T21:00:00Z"
      },
      {
        "type": "history_data",
        "entity_id": "sensor.temperature",
        "data": [
          {
            "state": "21.5",
            "attributes": {
              "unit_of_measurement": "°C",
              "friendly_name": "Temperature"
            },
            "last_changed": "2023-01-15T18:15:00.000Z"
          },
          {
            "state": "22.0",
            "attributes": {
              "unit_of_measurement": "°C",
              "friendly_name": "Temperature"
            },
            "last_changed": "2023-01-15T19:30:00.000Z"
          },
          {
            "state": "21.8",
            "attributes": {
              "unit_of_measurement": "°C",
              "friendly_name": "Temperature"
            },
            "last_changed": "2023-01-15T20:45:00.000Z"
          }
        ]
      }
    ]
  }
}
```

## Testing Scenarios to Try

1. **Device State Monitoring**

   - Retrieve states of various device types (lights, sensors, switches)
   - Get states of all entities in a specific domain
   - Check detailed attributes for complex entities

2. **Device Control**

   - Turn devices on/off
   - Adjust brightness/temperature/color of lights
   - Change thermostat settings
   - Control media players
   - Open/close covers

3. **Historical Data Analysis**

   - Retrieve temperature history for analysis
   - Check energy consumption patterns
   - Analyze presence sensor activations

4. **Home Assistant System Exploration**

   - List available services by domain
   - Explore configuration
   - Check available events

5. **Template Testing**
   - Render templates with entity states
   - Create conditional templates
   - Format timestamps and values

## Expected Error Handling

### Invalid Entity Example

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "get_states",
    "arguments": {
      "entity_id": "light.nonexistent"
    }
  }
}
```

**Expected Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "Entity not found: light.nonexistent"
      }
    ]
  }
}
```

### Malformed Service Call Example

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "service",
    "arguments": {
      "domain": "light",
      "service": "invalid_service",
      "service_data": {
        "entity_id": "light.kitchen"
      }
    }
  }
}
```

**Expected Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "Service light.invalid_service not found"
      }
    ]
  }
}
```

## Output Format

In your test report, include:

1. **Functionality Test Results**

   - Description of test performed
   - Request details
   - Response analysis
   - Verification of expected behavior

2. **Error Handling Assessment**

   - Quality of error messages
   - Proper error structures
   - Recovery suggestions

3. **Integration Experience**

   - Completeness of Home Assistant features exposed
   - Response time and reliability
   - Data presentation quality

4. **Suggested Improvements**
   - Feature additions
   - Error handling enhancements
   - Performance optimizations

## Common Home Assistant Entity Types for Testing

- **Lights**: `light.living_room`, `light.kitchen`, `light.bedroom`
- **Switches**: `switch.office_fan`, `switch.garden_pump`
- **Sensors**: `sensor.temperature`, `sensor.humidity`, `sensor.power_consumption`
- **Binary Sensors**: `binary_sensor.front_door`, `binary_sensor.motion_hallway`
- **Climate**: `climate.living_room`, `climate.bedroom`
- **Media Players**: `media_player.living_room_tv`, `media_player.kitchen_speaker`
- **Covers**: `cover.garage_door`, `cover.living_room_blinds`
- **Automations**: `automation.night_lights`, `automation.morning_routine`

## Common Home Assistant Service Domains

- **light**: `turn_on`, `turn_off`, `toggle`
- **switch**: `turn_on`, `turn_off`, `toggle`
- **climate**: `set_temperature`, `set_hvac_mode`, `set_fan_mode`
- **media_player**: `play_media`, `volume_set`, `media_play`, `media_pause`
- **cover**: `open_cover`, `close_cover`, `stop_cover`, `set_cover_position`
- **automation**: `trigger`, `turn_on`, `turn_off`
- **scene**: `turn_on`
- **script**: `turn_on`

## Mock Data Testing Support

If evaluating with mock data enabled:

- Verify mock entities are available across various domains
- Test service calls with mock acknowledgments
- Verify history includes simulated data points
- Ensure error responses are properly structured when testing error cases

## Evaluation Summary Template

**Server Name:** Home Assistant MCP Server
**Version:** [Version Number]
**Testing Date:** [YYYY-MM-DD]
**Tester:** [Tester Name]

### Functionality Score Summary

| Feature Area        | Score (1-10) | Strengths | Weaknesses |
| ------------------- | ------------ | --------- | ---------- |
| Entity State Access |              |           |            |
| Service Calling     |              |           |            |
| History Retrieval   |              |           |            |
| System Information  |              |           |            |
| Error Handling      |              |           |            |
| Response Quality    |              |           |            |
| Overall Experience  |              |           |            |

### Key Observations

- [Observation 1]
- [Observation 2]
- [Observation 3]

### Top Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]
