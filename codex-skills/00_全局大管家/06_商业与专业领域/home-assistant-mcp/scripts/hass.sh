#!/bin/bash
set -e
. .env

curl -k -X POST -H "Authorization: Bearer $HASS_TOKEN" -H "Content-Type: application/json" -d '{
"function_name": "light",
"parameters": {
"action": "turn_on",
"domain": "light",
"service_data": {"entity_id": "light.bed"},
"brightness_pct": 75
}
}' "http://homeassistant.local:8123/api/services/light/turn_off"
