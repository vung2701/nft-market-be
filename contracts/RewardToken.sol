// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RewardToken
 * @dev Token ERC20 được sử dụng làm phần thưởng trong hệ thống
 */
contract RewardToken is ERC20, Ownable {
    // Địa chỉ của contract AutomatedRewards
    address public automatedRewardsAddress;
    
    // Event khi cập nhật địa chỉ AutomatedRewards
    event AutomatedRewardsAddressUpdated(address indexed oldAddress, address indexed newAddress);
    
    constructor(uint256 initialSupply) ERC20("NFT Marketplace Reward Token", "NFTMR") Ownable(msg.sender) {
        // Mint token ban đầu cho owner
        _mint(msg.sender, initialSupply);
    }
    
    /**
     * @dev Cập nhật địa chỉ contract AutomatedRewards
     * @param _automatedRewardsAddress Địa chỉ mới
     */
    function setAutomatedRewardsAddress(address _automatedRewardsAddress) external onlyOwner {
        require(_automatedRewardsAddress != address(0), "Invalid address");
        
        address oldAddress = automatedRewardsAddress;
        automatedRewardsAddress = _automatedRewardsAddress;
        
        emit AutomatedRewardsAddressUpdated(oldAddress, automatedRewardsAddress);
    }
    
    /**
     * @dev Mint thêm token cho contract AutomatedRewards
     * @param amount Số lượng token cần mint
     */
    function mintForRewards(uint256 amount) external onlyOwner {
        require(automatedRewardsAddress != address(0), "Rewards address not set");
        _mint(automatedRewardsAddress, amount);
    }
    
    /**
     * @dev Mint thêm token cho một địa chỉ bất kỳ
     * @param to Địa chỉ nhận token
     * @param amount Số lượng token cần mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Đốt token
     * @param amount Số lượng token cần đốt
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
} 