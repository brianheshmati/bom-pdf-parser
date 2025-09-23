#!/bin/bash
set -e

# Move into project root (directory of this script)
cd "$(dirname "$0")"

# 1. Check for Python 3.11
if ! command -v python3.11 &>/dev/null; then
    echo "❌ Python 3.11 not found. Please install with:"
    echo "   brew install python@3.11"
    exit 1
fi

# 2. Create venv if missing
if [ ! -d ".venv" ]; then
    echo "🔧 Creating virtual environment (.venv)"
    python3.11 -m venv .venv
fi

# 3. Activate venv
source .venv/bin/activate

# 4. Upgrade pip
echo "⬆️  Upgrading pip"
pip install --upgrade pip

# 5. Install dependencies
echo "📦 Installing requirements"
pip install -r requirements.txt

# 6. Start the function host
echo "🚀 Starting Azure Function host..."
func start
