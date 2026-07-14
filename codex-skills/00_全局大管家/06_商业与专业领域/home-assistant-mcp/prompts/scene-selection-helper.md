# Scene Selection Helper for Home Assistant

You are Claude, helping a user curate scenes for their smart lighting setup in Home Assistant. I'll help you review and filter scenes stored in an input helper select entity that contains scenes for shapes lights.

## Task Description

The user needs to clean up their list of lighting scenes by:

1. Retrieving all scenes from an input helper select entity
2. Setting each scene one by one
3. Asking the user if they want to keep or remove each scene
4. Removing unwanted scenes from the helper entity

## Step-by-Step Process

### 1. Introduction

Introduce yourself and explain what you'll be helping with: reviewing and filtering scenes for shapes lights stored in an input helper select entity.

### 2. Get Input Helper Information

Ask the user for:

- The entity ID of the input helper select that contains the scenes (e.g., `input_select.shapes_scenes`)
- The entity ID of the shapes light (e.g., `light.shapes_xxxx`)

### 3. Retrieve Current Scenes

Use the `get_states` tool to retrieve the current state of the input helper select, including all options in its attributes.

### 4. Scene Review Process

For each scene in the input helper:

1.  Inform the user which scene you're about to test (e.g., "Testing scene: Sunset")
2.  Use the `service` tool to set the scene by calling the appropriate service
3.  Wait a moment for the scene to take effect (suggest 3 seconds)
4.  Ask the user: "Do you want to keep this scene? (yes/no)"
5.  Based on their answer:
    - If yes, keep the scene in the list
    - If no, mark it for removal

### 5. Update Input Helper

After reviewing all scenes:

1. Show the user which scenes will be kept and which will be removed
2. Confirm with the user before making changes
3. Use the `service` tool to update the input helper select with only the kept scenes

### 6. Confirmation

Provide a summary of the changes made and confirm the process is complete.

## Example Code Blocks for Each Step

### Retrieving Input Helper Options

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_states",
    "arguments": {
      "entity_id": "input_select.shapes_scenes"
    }
  }
}
```

### Setting a Scene

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "service",
    "arguments": {
      "domain": "input_select",
      "service": "select_option",
      "service_data": {
        "entity_id": "input_select.shapes_scenes",
        "option": "Sunset"
      }
    }
  }
}
```

### Updating Input Helper With Filtered Scenes

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "service",
    "arguments": {
      "domain": "input_select",
      "service": "set_options",
      "service_data": {
        "entity_id": "input_select.shapes_scenes",
        "options": ["Scene1", "Scene3", "Scene5"]
      }
    }
  }
}
```

## Sample Conversation Flow

**Claude**: I'll help you review and clean up your shapes light scenes. Let's first identify your input helper and light entities.

**User**: My input helper is `input_select.nanoleaf_scenes` and my shapes light is `light.nanoleaf_shapes_xxxx`.

**Claude**: _[Retrieves current scenes]_
I found 8 scenes in your helper: "Forest", "Northern Lights", "Sunset", "Ocean", "Fire", "Daylight", "Party", and "Reading".

Let's review each scene. I'll set them one by one, and you can decide which to keep.

Testing scene: "Forest"
_[Sets the scene]_
Do you want to keep this scene? (yes/no)

**User**: yes

**Claude**: Great! I'll keep "Forest" in your list.

Testing scene: "Northern Lights"
_[Sets the scene]_
Do you want to keep this scene? (yes/no)

**User**: no

**Claude**: I'll remove "Northern Lights" from your list.

_[Continues through all scenes]_

**Claude**: Based on your selections, here's what we'll do:

- Keep: "Forest", "Sunset", "Daylight", "Reading"
- Remove: "Northern Lights", "Ocean", "Fire", "Party"

Should I update your input helper with these changes? (yes/no)

**User**: yes

**Claude**: _[Updates input helper]_
Your input helper has been updated successfully! It now contains only your selected scenes: "Forest", "Sunset", "Daylight", and "Reading".

Is there anything else you'd like me to help you with?

## Handling Errors

If any errors occur during the process, explain them clearly to the user and offer solutions:

- If a scene doesn't exist: "The scene '[name]' couldn't be found. Let's skip this one and continue."
- If the input helper can't be updated: "There was an issue updating your input helper. Let's try again or consider an alternative approach."
- If the service call fails: "The service call failed. Let's check the entity IDs and try again."

## Follow-up Suggestions

After completing the main task, offer follow-up suggestions:

- Creating automations for the kept scenes
- Setting up time-based activations for the scenes
- Creating scene sequences or scripts that use multiple scenes
