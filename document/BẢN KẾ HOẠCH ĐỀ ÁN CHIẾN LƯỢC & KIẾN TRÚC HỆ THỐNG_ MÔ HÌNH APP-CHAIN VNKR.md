# BẢN KẾ HOẠCH ĐỀ ÁN CHIẾN LƯỢC & KIẾN TRÚC HỆ THỐNG
## MÔ HÌNH APP-CHAIN VNKR — PHIÊN BẢN KỸ THUẬT ĐẦY ĐỦ v2.0

> **Tình trạng:** Đang triển khai Testnet | **Mạng ID:** 78968 | **Chain:** VNKR EVM App-chain
> **Thư mục gốc dự án:** `/var/www/core/` | **Frontend:** React SPA + HTML Static UI Kit

---

## PHẦN 1 — HẠ TẦNG NODE RIÊNG VÀ CƠ CHẾ GAS TOKEN (TESTNET → MAINNET)

Để giải quyết bài toán **tự chủ hoàn toàn mạng lưới** và biến VNKR thành **Native Gas Token** (đóng vai trò như ETH trên Ethereum), hệ thống được triển khai trên kiến trúc **EVM-Compatible App-chain** sử dụng Erigon Client (tương đương Polygon CDK).

### 1.1 Cấu trúc thư mục Node (`/var/www/core/vnkr-node/`)

```
/var/www/core/vnkr-node/
├── docker-compose.yml          # Orchestration: Sequencer + RPC Node
├── genesis.json                # Cấu hình mạng lưới, native token, chain ID
├── config/
│   ├── sequencer.toml          # Cấu hình Sequencer Node
│   ├── rpc.toml                # Cấu hình RPC Node công khai
│   └── validator.key.enc       # Khóa Validator (mã hóa HSM)
├── data/                       # Blockchain data directory
│   ├── chaindata/
│   └── logs/
└── scripts/
    ├── init-node.sh            # Script khởi tạo node lần đầu
    ├── health-check.sh         # Script kiểm tra trạng thái node
    └── upgrade-node.sh         # Script nâng cấp không downtime
```

### 1.2 Quy trình DevOps / CLI khởi chạy Node trên Ubuntu VPS

```bash
# Bước 1: Cài đặt Docker, Docker Compose và các gói công cụ cốt lõi
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl iptables build-essential git wget jq make gcc nano tmux htop

# Bước 2: Khởi tạo thư mục định tuyến riêng cho mạng VNKR
mkdir -p /var/www/core/vnkr-node/{data,config,scripts} && cd /var/www/core/vnkr-node

# Bước 3: Tạo genesis.json định nghĩa Native Token VNKR
cat << 'EOF' > genesis.json
{
  "config": {
    "chainId": 78968,
    "homesteadBlock": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    "istanbulBlock": 0,
    "berlinBlock": 0,
    "londonBlock": 0
  },
  "nativeCurrency": {
    "name": "VNKR Token",
    "symbol": "VNKR",
    "decimals": 18
  },
  "difficulty": "0x400",
  "gasLimit": "0x8000000",
  "alloc": {
    "0xYourFoundationWalletAddress": {
      "balance": "0x314DC6448D9338C15B0A00000000"
    }
  }
}
EOF

# Bước 4: Cấu hình docker-compose.yml với Sequencer Node và RPC Node
cat << 'EOF' > docker-compose.yml
version: '3.8'
services:
  vnkr-sequencer:
    image: ghcr.io/ledgerwatch/erigon:latest
    container_name: vnkr-sequencer-node
    restart: always
    ports:
      - "8545:8545"
      - "8546:8546"
      - "30303:30303"
    volumes:
      - /var/www/core/vnkr-node/data:/datadir
      - /var/www/core/vnkr-node/genesis.json:/genesis.json:ro
    command:
      - --datadir=/datadir
      - --http
      - --http.addr=0.0.0.0
      - --http.vhosts=*
      - --http.corsdomain=*
      - --http.api=eth,net,web3,personal,miner,txpool,debug
      - --ws
      - --ws.addr=0.0.0.0
      - --ws.api=eth,net,web3,txpool
      - --networkid=78968
      - --mine
      - --miner.etherbase=0xYourValidatorWalletAddress
      - --log.console.verbosity=3
    networks:
      - vnkr-network

  vnkr-rpc:
    image: ghcr.io/ledgerwatch/erigon:latest
    container_name: vnkr-rpc-node
    restart: always
    ports:
      - "8547:8545"
      - "8548:8546"
    volumes:
      - /var/www/core/vnkr-node/data:/datadir:ro
    command:
      - --datadir=/datadir
      - --http
      - --http.addr=0.0.0.0
      - --http.vhosts=*
      - --http.corsdomain=*
      - --http.api=eth,net,web3,txpool
      - --networkid=78968
    networks:
      - vnkr-network
    depends_on:
      - vnkr-sequencer

networks:
  vnkr-network:
    driver: bridge
EOF

# Bước 5: Khởi chạy Node ở chế độ nền
docker compose up -d

# Bước 6: Kiểm tra trạng thái đồng bộ và kết nối RPC
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545 | jq .

# Bước 7: Kiểm tra chain ID
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://localhost:8545 | jq .
```

### 1.3 Cơ chế chuyển đổi Testnet → Mainnet & Gas Token

| Giai đoạn | Token | Nguồn cung | Mục đích |
|-----------|-------|------------|----------|
| **Testnet** | Test-VNKR | Không giới hạn (Faucet) | Kiểm thử smart contract, game-fi, tải hệ thống |
| **Mainnet** | VNKR Native | 1,000,000,000 (cố định) | Gas fees, thanh toán, governance, staking |

- **Native Token:** Định nghĩa trong `genesis.json` — mọi giao dịch đều trả phí bằng VNKR
- **Token Burn:** 30% phí gas được đốt tự động qua smart contract → giảm cung dài hạn
- **Validator Reward:** 70% phí gas phân phối cho Validator Node

---

## PHẦN 2 — TIÊU CHUẨN AN TOÀN HỆ THỐNG CẤP ĐỘ 4

### 2.1 Kiến trúc High Availability & Multi-Zone

```
                    ┌─────────────────────────────────────────┐
                    │         CLOUDFLARE ENTERPRISE WAF        │
                    │    Anti-DDoS L7 + SSL/TLS Termination    │
                    └──────────────┬──────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────────┐
                    │         NGINX / HAPROXY LOAD BALANCER    │
                    │     Zone: Hà Nội | TP.HCM | Cloud INT    │
                    └──┬─────────────────┬────────────────┬───┘
                       │                 │                │
              ┌────────▼───┐    ┌────────▼───┐   ┌───────▼────┐
              │ Node HN-1  │    │ Node HCM-1 │   │ Node INTL  │
              │ Sequencer  │    │ RPC Node   │   │ RPC Node   │
              └────────────┘    └────────────┘   └────────────┘
```

### 2.2 Các lớp bảo mật chuyên sâu

| Lớp | Công nghệ | Mục đích |
|-----|-----------|----------|
| **L1 — WAF** | Cloudflare Enterprise / ModSecurity | Lọc DDoS, SQLi, XSS, Reentrancy |
| **L2 — TLS** | Let's Encrypt / Cloudflare SSL | Mã hóa kênh truyền end-to-end |
| **L3 — HSM** | Hardware Security Module | Bảo vệ khóa Validator vật lý |
| **L4 — Multi-sig** | Gnosis Safe (3/5) | Phân quyền hội đồng kỹ thuật |
| **L5 — Monitoring** | ELK Stack + Prometheus + Grafana | Ghi nhận toàn bộ sự kiện realtime |
| **L6 — Smart Contract** | OpenZeppelin Audit + Slither | Kiểm tra Reentrancy, Overflow |

---

## PHẦN 3 — GIẢI PHÁP CHỨNG MINH VỐN ĐIỀU LỆ 10.000 TỶ

### 3.1 Cấu trúc vốn điều lệ (không dùng tiền mặt 100%)

```
┌──────────────────────────────────────────────────────────────────┐
│              CẤU TRÚC VỐN ĐIỀU LỆ 10.000 TỶ ĐỒNG                │
├───────────────────────────────┬──────────────────────────────────┤
│  35% — VỐN CÔNG NGHỆ & IP    │  65% — VỐN ĐỊNH CHẾ TÀI CHÍNH   │
│  (~3,500 tỷ đồng)             │  (~6,500 tỷ đồng)                │
│                               │                                  │
│  • Mã nguồn App-chain         │  • Quỹ đầu tư hạ tầng số        │
│  • Node infrastructure        │  • Tập đoàn công nghệ lớn        │
│  • Smart contract codebase    │  • Định chế tài chính trong nước  │
│  • IP & Thương hiệu VNKR      │  • Góp bằng tiền mặt / tài sản  │
│  • Thẩm định: Bộ Tài chính    │                                  │
└───────────────────────────────┴──────────────────────────────────┘
```

### 3.2 Quy trình pháp lý thẩm định IP

1. **Đăng ký quyền sở hữu trí tuệ** — Mã nguồn, thương hiệu VNKR tại Cục SHTT
2. **Thuê tổ chức thẩm định giá độc lập** được Bộ Tài chính cấp phép
3. **Báo cáo định giá** công nhận toàn bộ hệ sinh thái công nghệ ≥ 3,500 tỷ
4. **Ký kết MOU** với các định chế tài chính cho cấu phần 65% còn lại

---

## PHẦN 4 — DÒNG TIỀN THỰC TẾ & MÔ HÌNH KINH DOANH KHÉP KÍN

### 4.1 Nguồn thu bền vững

| Nguồn thu | Cơ chế | Ước tính |
|-----------|--------|----------|
| **Gas Fees** | Phí giao dịch native VNKR (30% Burn / 70% Reward) | Tỷ lệ theo volume |
| **Platform Fees (OTC/Swap)** | 0.1% – 0.5% mỗi lệnh khớp | ~300,000 USD/tháng tại $100M volume |
| **Game-Fi B2B** | 5% – 10% ingame revenue từ studio tích hợp | Tăng theo số game onboard |
| **Staking APY** | Phân phối 70% gas fees cho stakers | Tùy thuộc TVL |
| **VNKR Pay Integration** | Phí tích hợp SDK/API một lần + %revenue | Scale theo đối tác |

### 4.2 Ví dụ dòng tiền thực tế

```
Volume giao dịch: $100,000,000/tháng
Phí trung bình:   0.3%
→ Dòng tiền ròng: $300,000/tháng (~7.6 tỷ VNĐ/tháng)

Staking TVL: $50,000,000 VNKR locked
APY 15%:     $7,500,000/năm phân phối cho stakers
→ Giảm cung lưu thông, tăng giá trị token
```

---

## PHẦN 5 — KIẾN TRÚC FRONTEND TỔNG THỂ

### 5.1 Tổng quan stack công nghệ

```
/var/www/core/
├── frontend/           # React 17 SPA — Production Frontend
│   ├── src/
│   │   ├── components/ # UI Components (Header, Wallet, Chart...)
│   │   ├── screens/    # Pages (Exchange, Market, Staking, DAO...)
│   │   ├── contexts/   # VNKRContext, Web3Context, AuthContext
│   │   └── services/   # vnkr-api.js, wallet.js, contracts.js
│   └── public/
│
├── html/               # Static HTML UI Kit — Prototyping & SEO pages
│   └── build/
│       ├── *.html      # Static pages với VNKR scripts injected
│       └── js/
│           ├── app.js           # jQuery UI interactions (hiện có)
│           ├── vnkr.js          # VNKR main module (MỚI)
│           ├── vnkr-api.js      # Web3/RPC connector (MỚI)
│           ├── vnkr-wallet.js   # MetaMask/WalletConnect (MỚI)
│           └── vnkr-charts.js   # Live price charts (MỚI)
│
└── vnkr-node/          # Blockchain Node Infrastructure
    ├── docker-compose.yml
    ├── genesis.json
    └── scripts/
```

### 5.2 Bảng quy hoạch Sub-domain

| Sub-domain | Ứng dụng | Route React | HTML Static |
|------------|----------|-------------|-------------|
| `vnkr.vn` | Landing / Home | `/` | `index.html` |
| `id.vnkr.vn` | VNKR ID & Auth | `/sign-in`, `/sign-up`, `/2fa` | `sign-in.html`, `sign-up.html` |
| `scan.vnkr.vn` | VNKR Explorer | `/explorer` | `explorer.html` (mới) |
| `faucet.vnkr.vn` | Testnet Faucet | `/faucet` | `faucet.html` (mới) |
| `swap.vnkr.vn` | VNKR Swap AMM | `/exchange` | `exchange.html` |
| `otc.vnkr.vn` | OTC Platform | `/otc` | `market.html` |
| `stake.vnkr.vn` | Staking Portal | `/staking` | `staking.html` (mới) |
| `game.vnkr.vn` | Game Hub | `/game-hub` | (Phase 3) |
| `pay.vnkr.vn` | VNKR Pay | `/pay` | (Phase 3) |
| `dao.vnkr.vn` | DAO Governance | `/dao` | `dao.html` (mới) |

---

## PHẦN 6 — LỘ TRÌNH TRIỂN KHAI CHI TIẾT (PHASED ROLLOUT)

### Giai đoạn 1 — Hạ tầng Cốt lõi & Cổng Định danh (Tháng 1–3)

- [x] **Codebase Frontend** — React SPA + HTML Static UI Kit (`/var/www/core/`)
- [x] **VNKR JS Scripts** — `vnkr.js`, `vnkr-api.js`, `vnkr-wallet.js`, `vnkr-charts.js`
- [ ] **VNKR Node** — Docker Sequencer + RPC trên VPS Ubuntu
- [ ] **VNKR ID & Wallet** — MetaMask / WalletConnect tích hợp eKYC
- [ ] **VNKR Explorer** — Block explorer tùy chỉnh cho App-chain

### Giai đoạn 2 — Mainnet, OTC & Swap (Tháng 4–6)

- [ ] **VNKR Mainnet Launch** — Genesis block production
- [ ] **VNKR Swap AMM** — Uniswap V2 fork trên App-chain
- [ ] **OTC P2P Platform** — Escrow Smart Contract
- [ ] **Staking Portal** — Lock VNKR nhận APY từ gas fees

### Giai đoạn 3 — Game-Fi & Thanh toán B2B (Tháng 7–9)

- [ ] **VNKR Game Hub** — Platform phát hành game Web3
- [ ] **NFT Marketplace** — Mua bán vật phẩm game chuẩn ERC-721/1155
- [ ] **VNKR Pay Gateway** — SDK/API cho doanh nghiệp

### Giai đoạn 4 — Hoàn thiện Cấp độ 4 & DAO (Tháng 10–12)

- [ ] **DAO Governance** — On-chain voting với VNKR token
- [ ] **ELK Stack** — Monitoring & audit log hoàn chỉnh
- [ ] **Security Audit** — Kiểm toán toàn bộ smart contract

---

## PHẦN 7 — TÀI LIỆU KỸ THUẬT TÍCH HỢP

### 7.1 Thông số kỹ thuật mạng VNKR

```json
{
  "networkName": "VNKR Mainnet",
  "chainId": 78968,
  "rpcUrl": "https://rpc.vnkr.vn",
  "wsUrl": "wss://ws.vnkr.vn",
  "explorerUrl": "https://scan.vnkr.vn",
  "nativeCurrency": {
    "name": "VNKR",
    "symbol": "VNKR",
    "decimals": 18
  },
  "faucetUrl": "https://faucet.vnkr.vn",
  "testnetRpc": "https://testnet-rpc.vnkr.vn",
  "testnetChainId": 789680
}
```

### 7.2 Smart Contract Addresses (Testnet)

| Contract | Address | Chức năng |
|----------|---------|-----------|
| `VNKR Token` | `0x...` (deploy khi mainnet) | Native ERC-20 wrapper |
| `VNKR Swap Router` | `0x...` | AMM routing |
| `VNKR Staking` | `0x...` | Lock & earn rewards |
| `VNKR Escrow` | `0x...` | OTC P2P trades |
| `VNKR DAO` | `0x...` | On-chain governance |
| `VNKR Faucet` | `0x...` | Testnet token distribution |

### 7.3 API Endpoints

```
GET  /api/v1/price/vnkr          # Giá VNKR hiện tại
GET  /api/v1/market/overview     # Tổng quan thị trường
GET  /api/v1/blocks/latest       # Block mới nhất
GET  /api/v1/tx/:hash            # Chi tiết giao dịch
POST /api/v1/faucet/request      # Yêu cầu test tokens
GET  /api/v1/staking/stats       # Thống kê staking
POST /api/v1/swap/quote          # Báo giá swap
```

---

## TỔNG KẾT GIÁ TRỊ CHIẾN LƯỢC

Việc phân rã hệ thống thành các sub-domain chuyên biệt dưới mái nhà chung `vnkr.vn` giúp dự án đạt được:

1. **Khép kín dòng tiền** — Swap, OTC, Game-Fi, Thanh toán B2B đều quy tụ → nguồn thu bền vững hàng triệu USD không phụ thuộc bên ngoài.
2. **Tiêu chuẩn Cấp độ 4** — Tách biệt hạ tầng front-end cho phép cấu hình WAF độc lập, cân bằng tải và phân rã luồng dữ liệu chống sập hệ thống khi có lượng truy cập đột biến.
3. **Tự chủ công nghệ** — Toàn bộ blockchain node, smart contract, frontend đều do team kiểm soát → không phụ thuộc bên thứ ba.
4. **Cộng đồng làm chủ** — Cơ chế DAO cho phép người nắm giữ VNKR biểu quyết phát triển → mạng lưới tự vận hành bền vững.

---

*Tài liệu này được duy trì tại `/var/www/document/` — cập nhật theo tiến độ triển khai thực tế.*
*Version: 2.0 | Ngày cập nhật: 2025 | Team: VNKR Core Engineering*
