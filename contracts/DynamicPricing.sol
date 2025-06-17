// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DynamicPricing
 * @dev Contract để tính phí giao dịch dựa trên giá ETH/USD từ Chainlink Oracle
 */
contract DynamicPricing is Ownable, ReentrancyGuard {
    AggregatorV3Interface internal priceFeed;
    
    // Phí giao dịch tính bằng basis points (1/100 của 1%)
    // 200 = 2%
    uint256 public feePercentage = 200;
    
    // Địa chỉ ví nhận phí
    address public feeRecipient;
    
    // Lưu trữ thông tin về các giao dịch
    struct Transaction {
        address user;
        uint256 amountETH;
        uint256 amountUSD;
        uint256 feeETH;
        uint256 feeUSD;
        uint256 timestamp;
    }
    
    Transaction[] public transactions;
    
    event FeePaid(
        address indexed user,
        uint256 amountETH,
        uint256 amountUSD,
        uint256 feeETH,
        uint256 feeUSD,
        uint256 timestamp
    );
    
    event FeePercentageUpdated(uint256 oldFeePercentage, uint256 newFeePercentage);
    event FeeRecipientUpdated(address oldFeeRecipient, address newFeeRecipient);
    
    constructor(address _priceFeedAddress, address _feeRecipient) Ownable(msg.sender) {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Lấy giá ETH/USD mới nhất từ Chainlink Oracle
     * @return Giá ETH/USD với 8 chữ số thập phân
     */
    function getLatestPrice() public view returns (uint256) {
        (
            /* uint80 roundID */,
            int256 price,
            /* uint startedAt */,
            /* uint timeStamp */,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();
        
        // Chainlink Price Feeds thường trả về giá với 8 chữ số thập phân
        return uint256(price);
    }
    
    /**
     * @dev Chuyển đổi số tiền USD sang ETH
     * @param usdAmount Số tiền USD (với 18 chữ số thập phân)
     * @return Số tiền ETH tương đương
     */
    function convertUsdToEth(uint256 usdAmount) public view returns (uint256) {
        uint256 ethPrice = getLatestPrice();
        // ethPrice có 8 chữ số thập phân, usdAmount có 18 chữ số thập phân
        // Kết quả sẽ có 18 chữ số thập phân (wei)
        return (usdAmount * 1e18) / (ethPrice * 1e10);
    }
    
    /**
     * @dev Chuyển đổi số tiền ETH sang USD
     * @param ethAmount Số tiền ETH (wei)
     * @return Số tiền USD tương đương (với 18 chữ số thập phân)
     */
    function convertEthToUsd(uint256 ethAmount) public view returns (uint256) {
        uint256 ethPrice = getLatestPrice();
        // ethPrice có 8 chữ số thập phân
        // Kết quả sẽ có 18 chữ số thập phân
        return (ethAmount * ethPrice * 1e10) / 1e18;
    }
    
    /**
     * @dev Tính phí giao dịch dựa trên giá trị ETH
     * @param ethAmount Số tiền ETH (wei)
     * @return feeETH Phí giao dịch tính bằng ETH
     * @return feeUSD Phí giao dịch tính bằng USD
     */
    function calculateFee(uint256 ethAmount) public view returns (uint256 feeETH, uint256 feeUSD) {
        // Chuyển đổi ETH sang USD
        uint256 usdAmount = convertEthToUsd(ethAmount);
        
        // Tính phí USD (2% của giá trị USD)
        feeUSD = (usdAmount * feePercentage) / 10000;
        
        // Chuyển đổi phí USD sang ETH
        feeETH = convertUsdToEth(feeUSD);
        
        return (feeETH, feeUSD);
    }
    
    /**
     * @dev Xử lý thanh toán phí giao dịch
     */
    function payFee() external payable nonReentrant {
        require(msg.value > 0, "Must send ETH");
        
        // Tính phí
        (uint256 feeETH, uint256 feeUSD) = calculateFee(msg.value);
        
        // Lưu thông tin giao dịch
        transactions.push(
            Transaction({
                user: msg.sender,
                amountETH: msg.value,
                amountUSD: convertEthToUsd(msg.value),
                feeETH: feeETH,
                feeUSD: feeUSD,
                timestamp: block.timestamp
            })
        );
        
        // Chuyển phí đến ví nhận phí
        payable(feeRecipient).transfer(feeETH);
        
        // Hoàn lại số tiền còn lại cho người dùng
        uint256 refundAmount = msg.value - feeETH;
        if (refundAmount > 0) {
            payable(msg.sender).transfer(refundAmount);
        }
        
        emit FeePaid(
            msg.sender,
            msg.value,
            convertEthToUsd(msg.value),
            feeETH,
            feeUSD,
            block.timestamp
        );
    }
    
    /**
     * @dev Cập nhật tỷ lệ phí
     * @param _newFeePercentage Tỷ lệ phí mới (basis points)
     */
    function updateFeePercentage(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= 1000, "Fee too high"); // Giới hạn tối đa 10%
        
        uint256 oldFeePercentage = feePercentage;
        feePercentage = _newFeePercentage;
        
        emit FeePercentageUpdated(oldFeePercentage, feePercentage);
    }
    
    /**
     * @dev Cập nhật địa chỉ nhận phí
     * @param _newFeeRecipient Địa chỉ ví mới để nhận phí
     */
    function updateFeeRecipient(address _newFeeRecipient) external onlyOwner {
        require(_newFeeRecipient != address(0), "Invalid address");
        
        address oldFeeRecipient = feeRecipient;
        feeRecipient = _newFeeRecipient;
        
        emit FeeRecipientUpdated(oldFeeRecipient, feeRecipient);
    }
    
    /**
     * @dev Lấy tất cả các giao dịch
     * @return Mảng các giao dịch
     */
    function getAllTransactions() external view returns (Transaction[] memory) {
        return transactions;
    }
} 