#!/bin/bash
# VNKR Node Health Check Script
# Usage: ./health-check.sh

RPC_URL="http://localhost:8545"
RPC_PUBLIC="http://localhost:8547"
CHAIN_ID_HEX="0x13488"  # 78968

echo "============================================"
echo "  VNKR Node Health Check — $(date)"
echo "============================================"

check_rpc() {
    local url=$1
    local name=$2
    
    result=$(curl -s -m 5 -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
        "$url" 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$result" ]; then
        echo "[$name] ❌ UNREACHABLE at $url"
        return 1
    fi
    
    chain_id=$(echo "$result" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$chain_id" == "$CHAIN_ID_HEX" ]; then
        block=$(curl -s -m 5 -X POST -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            "$url" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
        block_dec=$((16#${block#0x}))
        echo "[$name] ✅ ONLINE | Chain: 78968 | Latest Block: #$block_dec"
    else
        echo "[$name] ⚠️  Wrong chain ID: $chain_id (expected $CHAIN_ID_HEX)"
    fi
}

check_rpc "$RPC_URL" "Sequencer"
check_rpc "$RPC_PUBLIC" "RPC Node"

# Check containers
echo ""
echo "[Docker] Container Status:"
docker ps --filter "name=vnkr-" --format "  {{.Names}} | {{.Status}} | {{.Ports}}" 2>/dev/null || echo "  Docker not running"

# Check disk usage
echo ""
echo "[Storage] Data directory:"
du -sh /var/www/core/vnkr-node/data/ 2>/dev/null || echo "  Not found"
