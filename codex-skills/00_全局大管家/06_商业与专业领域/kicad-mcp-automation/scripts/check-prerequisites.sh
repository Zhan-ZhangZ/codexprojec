#!/bin/bash
# Prerequisite checker for KiCad MCP Server
# Checks all required dependencies and provides installation instructions

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking KiCad MCP Prerequisites..."
echo ""

MISSING_DEPS=0

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Found $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "  Install Node.js from: https://nodejs.org/ (v18+ required)"
    MISSING_DEPS=1
fi

# Check Python 3
echo -n "Checking Python 3... "
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Found $PYTHON_VERSION${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "  Install: sudo apt-get install python3"
    MISSING_DEPS=1
fi

# Check pip
echo -n "Checking pip... "
if command -v pip3 &> /dev/null || python3 -m pip --version &> /dev/null 2>&1; then
    PIP_VERSION=$(python3 -m pip --version 2>/dev/null || pip3 --version)
    echo -e "${GREEN}✓ Found pip${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "  Install: sudo apt-get install python3-pip"
    echo "  Or: curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && python3 get-pip.py"
    MISSING_DEPS=1
fi

# Check kiutils
echo -n "Checking kiutils... "
if python3 -c "import kiutils" &> /dev/null; then
    KIUTILS_VERSION=$(python3 -c "import kiutils; print(kiutils.__version__)" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓ Found kiutils $KIUTILS_VERSION${NC}"
else
    echo -e "${YELLOW}✗ Not found${NC}"
    echo "  Install: pip3 install -r requirements.txt"
    echo "  Or: pip3 install kiutils>=1.2.0"
    MISSING_DEPS=1
fi

# Check KiCad CLI (optional but recommended for 3D export)
echo -n "Checking KiCad CLI (optional)... "
if command -v kicad-cli &> /dev/null; then
    echo -e "${GREEN}✓ Found kicad-cli${NC}"
else
    echo -e "${YELLOW}✗ Not found (optional)${NC}"
    echo "  Install KiCad from: https://www.kicad.org/download/"
    echo "  Required for 3D model export (STEP/VRML)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $MISSING_DEPS -eq 0 ]; then
    echo -e "${GREEN}✅ All required dependencies are installed!${NC}"
    echo ""
    echo "You can now run:"
    echo "  npm install"
    echo "  npm start"
    exit 0
else
    echo -e "${RED}❌ Missing required dependencies${NC}"
    echo ""
    echo "Quick install (Ubuntu/Debian):"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install -y python3 python3-pip nodejs npm"
    echo "  pip3 install -r requirements.txt"
    echo ""
    echo "Then run:"
    echo "  npm install"
    echo "  npm start"
    exit 1
fi
