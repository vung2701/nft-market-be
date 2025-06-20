// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RarityVerification
 * @dev Contract để xác thực độ hiếm của NFT (phiên bản đơn giản)
 */
contract RarityVerification is Ownable {
    // Struct để lưu trữ thông tin về NFT và độ hiếm
    struct NFTRarity {
        address nftAddress;
        uint256 tokenId;
        uint256 rarityScore;
        string rarityTier; // "Common", "Uncommon", "Rare", "Epic", "Legendary"
        string[] traits;
        uint256 timestamp;
        bool isVerified;
    }
    
    // Mapping từ NFT address + tokenId -> rarityId
    mapping(address => mapping(uint256 => uint256)) public nftToRarityId;
    
    // Mảng lưu trữ tất cả thông tin về độ hiếm
    NFTRarity[] public rarities;
    
    // Số lượng NFT cần xác thực độ hiếm
    uint256 public pendingVerifications = 0;
    
    // Thời gian giữa các lần kiểm tra tự động
    uint256 public interval = 1 days;
    
    // Thời gian của lần kiểm tra cuối cùng
    uint256 public lastTimeStamp;
    
    // Events
    event RarityRequested(address indexed nftAddress, uint256 indexed tokenId, uint256 rarityId);
    event RarityVerified(address indexed nftAddress, uint256 indexed tokenId, uint256 rarityScore, string rarityTier);
    
    constructor() Ownable(msg.sender) {
        lastTimeStamp = block.timestamp;
    }
    
    /**
     * @dev Yêu cầu xác thực độ hiếm cho một NFT
     * @param nftAddress Địa chỉ của NFT contract
     * @param tokenId ID của NFT
     * @param traits Mảng các đặc điểm của NFT
     */
    function requestRarityVerification(
        address nftAddress,
        uint256 tokenId,
        string[] memory traits
    ) external {
        // Tạo một bản ghi mới về độ hiếm
        uint256 rarityId = rarities.length;
        
        rarities.push(
            NFTRarity({
                nftAddress: nftAddress,
                tokenId: tokenId,
                rarityScore: 0,
                rarityTier: "",
                traits: traits,
                timestamp: block.timestamp,
                isVerified: false
            })
        );
        
        // Cập nhật mapping
        nftToRarityId[nftAddress][tokenId] = rarityId;
        
        // Tăng số lượng xác thực đang chờ
        pendingVerifications += 1;
        
        emit RarityRequested(nftAddress, tokenId, rarityId);
        
        // Mô phỏng xác thực độ hiếm
        simulateRarityVerification(rarityId);
    }
    
    /**
     * @dev Mô phỏng xác thực độ hiếm (thay thế cho Chainlink VRF và Functions)
     * @param rarityId ID của bản ghi độ hiếm
     */
    function simulateRarityVerification(uint256 rarityId) internal {
        NFTRarity storage rarity = rarities[rarityId];
        
        // Tính toán độ hiếm dựa trên các đặc điểm và thời gian
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            rarity.nftAddress, 
            rarity.tokenId, 
            block.timestamp, 
            block.prevrandao
        )));
        
        // Tính toán độ hiếm (0-9999)
        uint256 rarityScore = randomSeed % 10000;
        
        // Cập nhật độ hiếm
        rarity.rarityScore = rarityScore;
        
        // Xác định tier dựa trên điểm
        if (rarityScore < 5000) {
            rarity.rarityTier = "Common";
        } else if (rarityScore < 7500) {
            rarity.rarityTier = "Uncommon";
        } else if (rarityScore < 9000) {
            rarity.rarityTier = "Rare";
        } else if (rarityScore < 9900) {
            rarity.rarityTier = "Epic";
        } else {
            rarity.rarityTier = "Legendary";
        }
        
        // Đánh dấu là đã xác thực
        rarity.isVerified = true;
        
        // Giảm số lượng xác thực đang chờ
        pendingVerifications -= 1;
        
        emit RarityVerified(rarity.nftAddress, rarity.tokenId, rarity.rarityScore, rarity.rarityTier);
    }
    
    /**
     * @dev Kiểm tra điều kiện để thực hiện tự động
     */
    function checkUpkeep() external view returns (bool upkeepNeeded) {
        upkeepNeeded = (pendingVerifications > 0) && ((block.timestamp - lastTimeStamp) > interval);
    }
    
    /**
     * @dev Thực hiện tự động xác thực độ hiếm
     */
    function performUpkeep() external {
        if ((block.timestamp - lastTimeStamp) > interval) {
            lastTimeStamp = block.timestamp;
            
            // Tìm các NFT chưa được xác thực và gửi yêu cầu xác thực
            for (uint256 i = 0; i < rarities.length && i < 10; i++) {
                if (!rarities[i].isVerified) {
                    simulateRarityVerification(i);
                }
            }
        }
    }
    
    /**
     * @dev Lấy thông tin độ hiếm của một NFT
     * @param nftAddress Địa chỉ của NFT contract
     * @param tokenId ID của NFT
     * @return Thông tin độ hiếm
     */
    function getNFTRarity(address nftAddress, uint256 tokenId) external view returns (NFTRarity memory) {
        uint256 rarityId = nftToRarityId[nftAddress][tokenId];
        return rarities[rarityId];
    }
    
    /**
     * @dev Lấy tất cả thông tin về độ hiếm
     * @return Mảng các thông tin độ hiếm
     */
    function getAllRarities() external view returns (NFTRarity[] memory) {
        return rarities;
    }
    
    /**
     * @dev Cập nhật khoảng thời gian giữa các lần kiểm tra
     * @param _interval Khoảng thời gian mới (giây)
     */
    function updateInterval(uint256 _interval) external onlyOwner {
        interval = _interval;
    }
} 