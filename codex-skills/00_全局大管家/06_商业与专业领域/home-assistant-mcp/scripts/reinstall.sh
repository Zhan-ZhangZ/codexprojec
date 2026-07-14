#!/bin/bash

set -e

npm run build
npm install -g .
killall Claude &> /dev/null || true
echo "Use the tool 'light' (NOT 'lights') to turn off light.bed" | pbcopy
sleep 2
open -a Claude
echo "Done!"
