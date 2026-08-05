#!/bin/bash

echo ""
echo "============================================"
echo "   Golem Bot  ~  Server Guardian"
echo "   Startup Bootstrap v1.0"
echo "============================================"
echo ""

REPO_URL="https://github.com/wayback09/Utility-Golem-.git"
CONTAINER_DIR="/home/container"

cd "$CONTAINER_DIR"

# ─────────────────────────────────────────────
# STEP 1: Pull or Update Bot Files
# ─────────────────────────────────────────────
if [ ! -f "$CONTAINER_DIR/package.json" ]; then
    echo "[Golem] No bot files detected. Downloading from GitHub..."
    echo ""

    # Try git clone first
    if command -v git &> /dev/null; then
        echo "[Golem] Cloning repository via git..."
        git clone "$REPO_URL" "$CONTAINER_DIR/golem_tmp"
        
        if [ $? -eq 0 ]; then
            cp -r "$CONTAINER_DIR/golem_tmp/." "$CONTAINER_DIR/"
            rm -rf "$CONTAINER_DIR/golem_tmp"
            echo "[Golem] Repository cloned successfully!"
        else
            echo "[Golem] Git clone failed, trying curl fallback..."
            FALLBACK=true
        fi
    else
        FALLBACK=true
    fi

    # Fallback: download as zip using curl
    if [ "$FALLBACK" = true ]; then
        echo "[Golem] Downloading repository as ZIP..."
        
        if command -v curl &> /dev/null; then
            curl -fsSL "https://github.com/wayback09/Utility-Golem-/archive/refs/heads/main.zip" -o /tmp/golem.zip
        elif command -v wget &> /dev/null; then
            wget -q "https://github.com/wayback09/Utility-Golem-/archive/refs/heads/main.zip" -O /tmp/golem.zip
        else
            echo "[Golem] ERROR: Neither curl nor wget is available. Cannot download bot files."
            exit 1
        fi

        echo "[Golem] Extracting ZIP..."
        if command -v unzip &> /dev/null; then
            unzip -q /tmp/golem.zip -d /tmp/
        else
            # Try python as a final fallback for unzip
            python3 -c "import zipfile; zipfile.ZipFile('/tmp/golem.zip').extractall('/tmp/')" 2>/dev/null
        fi

        # The extracted folder is named "Utility-Golem--main"
        if [ -d "/tmp/Utility-Golem--main" ]; then
            cp -r /tmp/Utility-Golem--main/. "$CONTAINER_DIR/"
            rm -rf /tmp/Utility-Golem--main /tmp/golem.zip
            echo "[Golem] Files extracted and moved successfully!"
        else
            echo "[Golem] ERROR: Could not extract ZIP. Please check the repository URL."
            exit 1
        fi
    fi
else
    echo "[Golem] Bot files already present. Skipping download."
fi

echo ""

# ─────────────────────────────────────────────
# STEP 2: Install Node Dependencies
# ─────────────────────────────────────────────
if [ ! -d "$CONTAINER_DIR/node_modules" ] || [ ! -d "$CONTAINER_DIR/node_modules/discord.js" ]; then
    echo "[Golem] Installing Node.js dependencies..."
    echo ""
    npm install --omit=dev
    
    if [ $? -ne 0 ]; then
        echo "[Golem] ERROR: npm install failed. Please check logs."
        exit 1
    fi
    echo ""
    echo "[Golem] Dependencies installed successfully!"
else
    echo "[Golem] node_modules already installed. Skipping npm install."
fi

echo ""

# ─────────────────────────────────────────────
# STEP 3: Validate Environment Variables
# ─────────────────────────────────────────────
if [ -f "$CONTAINER_DIR/.env" ]; then
    echo "[Golem] Loading .env file..."
    export $(grep -v '^#' "$CONTAINER_DIR/.env" | xargs)
fi

if [ -z "$DISCORD_TOKEN" ]; then
    echo ""
    echo "[Golem] WARNING: DISCORD_TOKEN is not set!"
    echo "        Set it in your Pterodactyl Startup Variables or upload a .env file."
    echo "        The API server will still start but the bot will NOT connect to Discord."
    echo ""
fi

if [ -z "$CLIENT_ID" ]; then
    echo "[Golem] WARNING: CLIENT_ID is not set! Slash commands will not be deployed."
fi

# ─────────────────────────────────────────────
# STEP 4: Launch Golem!
# ─────────────────────────────────────────────
echo ""
echo "============================================"
echo "   Launching Golem..."
echo "============================================"
echo ""

node "$CONTAINER_DIR/src/index.js"
