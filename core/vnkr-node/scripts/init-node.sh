#!/bin/bash
# VNKR Node Initialization Script
# Run once before first docker compose up
# Usage: chmod +x init-node.sh && ./init-node.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_DIR="$(dirname "$SCRIPT_DIR")"

echo "================================================"
echo "  VNKR App-Chain Node Initialization"
echo "  Network ID: 78968 | Native Token: VNKR"
echo "================================================"

# Create required directories
mkdir -p "$NODE_DIR/data/chaindata"
mkdir -p "$NODE_DIR/data/logs"
mkdir -p "$NODE_DIR/config"

echo "[1/5] Directories created ✓"

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

if ! docker compose version &> /dev/null; then
    echo "Docker Compose V2 not found. Installing..."
    sudo apt install docker-compose-plugin -y
fi

echo "[2/5] Docker dependencies verified ✓"

# Generate .env if not exists
if [ ! -f "$NODE_DIR/.env" ]; then
    echo "VALIDATOR_WALLET=0x0000000000000000000000000000000000000000" > "$NODE_DIR/.env"
    echo "GRAFANA_PASSWORD=vnkr_admin_$(openssl rand -hex 8)" >> "$NODE_DIR/.env"
    echo "[3/5] .env file created — EDIT VALIDATOR_WALLET before starting! ✓"
else
    echo "[3/5] .env file exists ✓"
fi

# Create Prometheus config
cat > "$NODE_DIR/config/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'vnkr-sequencer'
    static_configs:
      - targets: ['vnkr-sequencer:6060']
    metrics_path: /debug/metrics/prometheus

  - job_name: 'vnkr-rpc'
    static_configs:
      - targets: ['vnkr-rpc:6060']
    metrics_path: /debug/metrics/prometheus
EOF

echo "[4/5] Prometheus config created ✓"

# Initialize chaindata with genesis
echo "[5/5] Ready to start! Run: cd $NODE_DIR && docker compose up -d"
echo ""
echo "⚠️  IMPORTANT: Edit .env and set your VALIDATOR_WALLET address first!"
echo ""
echo "After starting, verify with:"
echo "  curl -s -X POST -H 'Content-Type: application/json' \\"
echo "    --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}' \\"
echo "    http://localhost:8545"
echo ""
echo "Expected: {\"result\":\"0x13488\"} (78968 in hex)"
