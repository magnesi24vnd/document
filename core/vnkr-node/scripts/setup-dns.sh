#!/usr/bin/env bash
# ============================================================
# VNKR.VN — Cloudflare DNS Auto-Setup Script
# Usage: bash scripts/setup-dns.sh
# ============================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.cloudflare"

[[ -f "$ENV_FILE" ]] || { echo "❌ Không tìm thấy $ENV_FILE"; exit 1; }
# shellcheck source=/dev/null
source "$ENV_FILE"

: "${CF_API_TOKEN:?}"
: "${CF_ZONE_ID:?}"
: "${CF_ZONE_NAME:?}"
: "${CF_ACCOUNT_ID:?}"
: "${SERVER_IP:?}"

API="https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records"

echo "============================================================"
echo "  VNKR.VN — Cloudflare DNS Setup"
echo "  Zone  : ${CF_ZONE_NAME} (${CF_ZONE_ID})"
echo "  Server: ${SERVER_IP}"
echo "============================================================"

# ─── Hàm: lấy record ID hiện có (trả về chuỗi rỗng nếu chưa tồn tại) ───
get_id() {
  local name="$1" type="$2"
  local resp
  resp=$(curl -s "${API}?name=${name}&type=${type}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}")
  echo "$resp" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true
}

# ─── Hàm: upsert (tạo mới hoặc cập nhật) ───
upsert() {
  local name="$1" type="$2" content="$3" proxied="$4"
  local body existing action url method

  body="{\"type\":\"${type}\",\"name\":\"${name}\",\"content\":\"${content}\",\"ttl\":1,\"proxied\":${proxied}}"

  existing=$(get_id "$name" "$type")

  if [[ -n "$existing" ]]; then
    url="${API}/${existing}"
    method="PUT"
    action="UPDATED"
  else
    url="${API}"
    method="POST"
    action="CREATED"
  fi

  result=$(curl -s -X "${method}" "${url}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "${body}")

  if echo "$result" | grep -q '"success":true'; then
    printf "  ✅ %-8s  %-35s  →  %s\n" "$action" "$name" "$content"
  else
    local err
    err=$(echo "$result" | grep -o '"message":"[^"]*"' | head -1)
    printf "  ❌ FAILED   %-35s  | %s\n" "$name" "$err"
  fi
}

# ============================================================
# PHẦN 1 — Root domain & www
# ============================================================
echo ""
echo "▶ Root domain & www"
upsert "vnkr.vn"     "A"     "${SERVER_IP}" "true"
upsert "www.vnkr.vn" "CNAME" "vnkr.vn"     "true"

# ============================================================
# PHẦN 2 — 9 Sub-domain chính thức (proxied qua Cloudflare)
# ============================================================
echo ""
echo "▶ 9 Sub-domain hệ sinh thái VNKR"

for sub in id scan faucet swap otc stake game pay dao; do
  upsert "${sub}.vnkr.vn" "A" "${SERVER_IP}" "true"
done

# ============================================================
# PHẦN 3 — RPC / Node endpoints
# rpc & ws KHÔNG proxied — kết nối trực tiếp (WebSocket cần vậy)
# ============================================================
echo ""
echo "▶ RPC / Node endpoints"
upsert "rpc.vnkr.vn"      "A" "${SERVER_IP}" "false"
upsert "ws.vnkr.vn"       "A" "${SERVER_IP}" "false"
upsert "explorer.vnkr.vn" "A" "${SERVER_IP}" "true"

# ============================================================
echo ""
echo "============================================================"
echo "  ✅ Hoàn tất cấu hình DNS"
echo "  🔗 Kiểm tra tại:"
echo "     https://dash.cloudflare.com/${CF_ACCOUNT_ID}/${CF_ZONE_NAME}/dns"
echo "============================================================"
