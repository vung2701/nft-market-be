# NFT Marketplace Blockchain

Dự án NFT Marketplace với các tính năng trust-minimized sử dụng Chainlink Oracle.

## Tính năng

### 1. Dynamic Pricing (Tính phí giao dịch bằng USD)

- Sử dụng Chainlink ETH/USD Price Feed để tính phí giao dịch theo giá trị USD
- Phí giao dịch được tính dựa trên tỷ lệ phần trăm của giá trị giao dịch (mặc định: 2%)
- Tự động chuyển đổi giữa ETH và USD dựa trên tỷ giá thời gian thực

### 2. Rarity Verification (Xác thực độ hiếm NFT)

- Sử dụng Chainlink VRF (Verifiable Random Function) để tạo số ngẫu nhiên đáng tin cậy
- Sử dụng Chainlink Functions để gọi API bên ngoài và xác thực metadata của NFT
- Lưu trữ thông tin độ hiếm on-chain để đảm bảo tính minh bạch

### 3. Automated Rewards (Airdrop dựa trên hoạt động)

- Theo dõi hoạt động của người dùng (khối lượng giao dịch, số lượng giao dịch)
- Sử dụng Chainlink Automation để tự động phân phối phần thưởng theo định kỳ
- Phân phối token thưởng cho top traders dựa trên khối lượng giao dịch

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Biên dịch các contract
npx hardhat compile

# Chạy các test
npx hardhat test

# Triển khai lên mạng thử nghiệm Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

## Cấu trúc dự án

```
contracts/
├── MarketPlace.sol           # Contract chính của marketplace
├── NFTCollection.sol         # Contract ERC721 cho NFT
├── DynamicPricing.sol        # Contract xử lý tính phí động
├── RarityVerification.sol    # Contract xác thực độ hiếm NFT
├── AutomatedRewards.sol      # Contract phân phối phần thưởng tự động
└── RewardToken.sol           # Token ERC20 dùng làm phần thưởng

test/
└── ChainlinkOracle.test.ts   # Test các tính năng Chainlink Oracle

scripts/
└── deploy.ts                 # Script triển khai các contract
```

## Môi trường

- Solidity: ^0.8.20
- Hardhat: ^2.24.0
- Chainlink: ^0.8.0
- OpenZeppelin: ^5.3.0

## Địa chỉ Contract (Sepolia)

- MarketPlace: [đang cập nhật]
- NFTCollection: [đang cập nhật]
- DynamicPricing: [đang cập nhật]
- RarityVerification: [đang cập nhật]
- AutomatedRewards: [đang cập nhật]
- RewardToken: [đang cập nhật]

Các contract đã được deploy lên Sepolia testnet với dữ liệu thật:
NFTCollection: 0x809cf41F0697De961B85D3ccF57C24933457d8Dc
MarketPlace: 0x34a70199FF31F4238f971ec7CF4866BF4006978c
Chainlink ETH/USD Price Feed: 0x694AA1769357215DE4FAC081bf1f309aDC325306 (official feed)
🔧 Những thay đổi đã thực hiện:
Loại bỏ MockPriceFeed: Không cần deploy mock data nữa
Sử dụng Chainlink Price Feed thật: Địa chỉ chính thức 0x694AA1769357215DE4FAC081bf1f309aDC325306
Giá ETH/USD thời gian thực: MarketPlace sẽ lấy giá ETH/USD cập nhật liên tục từ Chainlink Oracle
💡 Lợi ích của việc sử dụng dữ liệu thật:
✅ Giá cả chính xác và cập nhật theo thời gian thực
✅ Tin cậy và được đảm bảo bởi mạng Oracle của Chainlink
✅ Không cần quản lý mock data
✅ Sẵn sàng cho production
Bây giờ MarketPlace của bạn sẽ sử dụng giá ETH/USD thật từ Chainlink Oracle thay vì giá cố định $2000 như trước đây!
