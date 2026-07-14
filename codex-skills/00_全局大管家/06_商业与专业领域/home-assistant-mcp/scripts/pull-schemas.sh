#!/bin/bash
set -e
rm -rf /tmp/schenmas
git clone https://github.com/keesschollaart81/vscode-home-assistant.git /tmp/schenmas
cd src/language-service/src/schemas
npm install
npm run schema
ls -halt json/
