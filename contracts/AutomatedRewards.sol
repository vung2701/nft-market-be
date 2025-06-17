// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AutomatedRewards
 * @dev Contract để tự động phân phối phần thưởng dựa trên hoạt động của người dùng
 */
contract AutomatedRewards is Ownable, ReentrancyGuard {
    // Token ERC20 được sử dụng làm phần thưởng
    IERC20 public rewardToken;
    
    // Marketplace contract
    address public marketplaceAddress;
    
    // Thời gian giữa các lần phân phối phần thưởng (mặc định là 1 tuần)
    uint256 public interval = 7 days;
    
    // Thời gian của lần phân phối cuối cùng
    uint256 public lastTimeStamp;
    
    // Tổng số phần thưởng cho mỗi đợt phân phối
    uint256 public rewardPoolPerPeriod;
    
    // Số lượng người dùng hàng đầu nhận phần thưởng
    uint256 public topUsersCount = 10;
    
    // Struct lưu trữ thông tin người dùng
    struct UserActivity {
        address userAddress;
        uint256 tradingVolume;
        uint256 transactionCount;
        uint256 lastActive;
    }
    
    // Mapping từ địa chỉ người dùng -> thông tin hoạt động
    mapping(address => UserActivity) public userActivities;
    
    // Mảng lưu trữ địa chỉ của tất cả người dùng
    address[] public allUsers;
    
    // Mapping để theo dõi xem một địa chỉ đã được thêm vào mảng allUsers chưa
    mapping(address => bool) private userExists;
    
    // Struct lưu trữ thông tin về một đợt phân phối phần thưởng
    struct RewardDistribution {
        uint256 timestamp;
        address[] recipients;
        uint256[] amounts;
        uint256 totalDistributed;
    }
    
    // Lịch sử các đợt phân phối phần thưởng
    RewardDistribution[] public rewardHistory;
    
    // Events
    event UserActivityUpdated(address indexed user, uint256 tradingVolume, uint256 transactionCount);
    event RewardsDistributed(uint256 indexed distributionId, uint256 timestamp, uint256 totalAmount);
    event RewardClaimed(address indexed user, uint256 amount, uint256 timestamp);
    
    constructor(address _rewardToken, address _marketplaceAddress, uint256 _rewardPoolPerPeriod) Ownable(msg.sender) {
        rewardToken = IERC20(_rewardToken);
        marketplaceAddress = _marketplaceAddress;
        rewardPoolPerPeriod = _rewardPoolPerPeriod;
        lastTimeStamp = block.timestamp;
    }
    
    /**
     * @dev Cập nhật hoạt động của người dùng
     * @param user Địa chỉ người dùng
     * @param volumeIncrease Khối lượng giao dịch tăng thêm
     */
    function updateUserActivity(address user, uint256 volumeIncrease) external {
        require(msg.sender == marketplaceAddress, "Only marketplace can update");
        
        // Thêm người dùng vào mảng nếu chưa tồn tại
        if (!userExists[user]) {
            allUsers.push(user);
            userExists[user] = true;
        }
        
        // Cập nhật thông tin hoạt động
        UserActivity storage activity = userActivities[user];
        activity.userAddress = user;
        activity.tradingVolume += volumeIncrease;
        activity.transactionCount += 1;
        activity.lastActive = block.timestamp;
        
        emit UserActivityUpdated(user, activity.tradingVolume, activity.transactionCount);
    }
    
    /**
     * @dev Hàm kiểm tra điều kiện để thực hiện tự động
     */
    function checkUpkeep() external view returns (bool upkeepNeeded) {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
    }
    
    /**
     * @dev Hàm thực hiện tự động phân phối phần thưởng
     */
    function performUpkeep() external {
        if ((block.timestamp - lastTimeStamp) > interval) {
            lastTimeStamp = block.timestamp;
            distributeRewards();
        }
    }
    
    /**
     * @dev Phân phối phần thưởng cho top users
     */
    function distributeRewards() public {
        require(allUsers.length > 0, "No users to reward");
        
        // Lấy top users dựa trên khối lượng giao dịch
        (address[] memory topTraders, uint256[] memory volumes) = getTopTraders();
        
        // Tính tổng khối lượng giao dịch của top traders
        uint256 totalVolume = 0;
        for (uint256 i = 0; i < volumes.length; i++) {
            totalVolume += volumes[i];
        }
        
        // Phân phối phần thưởng dựa trên tỷ lệ khối lượng giao dịch
        address[] memory recipients = new address[](topTraders.length);
        uint256[] memory amounts = new uint256[](topTraders.length);
        uint256 totalDistributed = 0;
        
        for (uint256 i = 0; i < topTraders.length; i++) {
            // Tính phần thưởng dựa trên tỷ lệ khối lượng giao dịch
            uint256 reward = totalVolume > 0 
                ? (rewardPoolPerPeriod * volumes[i]) / totalVolume 
                : rewardPoolPerPeriod / topTraders.length;
            
            // Chuyển phần thưởng
            if (reward > 0 && rewardToken.balanceOf(address(this)) >= reward) {
                rewardToken.transfer(topTraders[i], reward);
                totalDistributed += reward;
                
                recipients[i] = topTraders[i];
                amounts[i] = reward;
                
                emit RewardClaimed(topTraders[i], reward, block.timestamp);
            }
        }
        
        // Lưu thông tin về đợt phân phối
        rewardHistory.push(
            RewardDistribution({
                timestamp: block.timestamp,
                recipients: recipients,
                amounts: amounts,
                totalDistributed: totalDistributed
            })
        );
        
        emit RewardsDistributed(rewardHistory.length - 1, block.timestamp, totalDistributed);
        
        // Reset khối lượng giao dịch của tất cả người dùng
        for (uint256 i = 0; i < allUsers.length; i++) {
            userActivities[allUsers[i]].tradingVolume = 0;
        }
    }
    
    /**
     * @dev Lấy danh sách top traders dựa trên khối lượng giao dịch
     * @return Mảng địa chỉ của top traders và khối lượng giao dịch tương ứng
     */
    function getTopTraders() public view returns (address[] memory, uint256[] memory) {
        // Xác định số lượng người dùng thực tế để lấy
        uint256 count = topUsersCount;
        if (allUsers.length < count) {
            count = allUsers.length;
        }
        
        // Tạo mảng kết quả
        address[] memory topTraders = new address[](count);
        uint256[] memory volumes = new uint256[](count);
        
        // Sao chép tất cả người dùng vào một mảng tạm thời
        address[] memory tempUsers = new address[](allUsers.length);
        uint256[] memory tempVolumes = new uint256[](allUsers.length);
        
        for (uint256 i = 0; i < allUsers.length; i++) {
            tempUsers[i] = allUsers[i];
            tempVolumes[i] = userActivities[allUsers[i]].tradingVolume;
        }
        
        // Sắp xếp người dùng theo khối lượng giao dịch (bubble sort)
        for (uint256 i = 0; i < tempUsers.length; i++) {
            for (uint256 j = 0; j < tempUsers.length - i - 1; j++) {
                if (tempVolumes[j] < tempVolumes[j + 1]) {
                    // Swap volumes
                    uint256 tempVolume = tempVolumes[j];
                    tempVolumes[j] = tempVolumes[j + 1];
                    tempVolumes[j + 1] = tempVolume;
                    
                    // Swap users
                    address tempUser = tempUsers[j];
                    tempUsers[j] = tempUsers[j + 1];
                    tempUsers[j + 1] = tempUser;
                }
            }
        }
        
        // Lấy top users
        for (uint256 i = 0; i < count; i++) {
            topTraders[i] = tempUsers[i];
            volumes[i] = tempVolumes[i];
        }
        
        return (topTraders, volumes);
    }
    
    /**
     * @dev Lấy thông tin hoạt động của một người dùng
     * @param user Địa chỉ người dùng
     * @return Thông tin hoạt động
     */
    function getUserActivity(address user) external view returns (UserActivity memory) {
        return userActivities[user];
    }
    
    /**
     * @dev Lấy tất cả người dùng và khối lượng giao dịch của họ
     * @return Mảng địa chỉ người dùng và mảng khối lượng giao dịch tương ứng
     */
    function getAllUsersWithVolume() external view returns (address[] memory, uint256[] memory) {
        address[] memory users = new address[](allUsers.length);
        uint256[] memory volumes = new uint256[](allUsers.length);
        
        for (uint256 i = 0; i < allUsers.length; i++) {
            users[i] = allUsers[i];
            volumes[i] = userActivities[allUsers[i]].tradingVolume;
        }
        
        return (users, volumes);
    }
    
    /**
     * @dev Lấy lịch sử phân phối phần thưởng
     * @return Mảng các đợt phân phối phần thưởng
     */
    function getRewardHistory() external view returns (RewardDistribution[] memory) {
        return rewardHistory;
    }
    
    /**
     * @dev Cập nhật khoảng thời gian giữa các đợt phân phối
     * @param _interval Khoảng thời gian mới (giây)
     */
    function updateInterval(uint256 _interval) external onlyOwner {
        interval = _interval;
    }
    
    /**
     * @dev Cập nhật số lượng người dùng hàng đầu nhận phần thưởng
     * @param _topUsersCount Số lượng mới
     */
    function updateTopUsersCount(uint256 _topUsersCount) external onlyOwner {
        require(_topUsersCount > 0, "Count must be positive");
        topUsersCount = _topUsersCount;
    }
    
    /**
     * @dev Cập nhật tổng số phần thưởng cho mỗi đợt phân phối
     * @param _rewardPoolPerPeriod Số lượng token mới
     */
    function updateRewardPoolPerPeriod(uint256 _rewardPoolPerPeriod) external onlyOwner {
        rewardPoolPerPeriod = _rewardPoolPerPeriod;
    }
    
    /**
     * @dev Cập nhật địa chỉ marketplace
     * @param _marketplaceAddress Địa chỉ mới
     */
    function updateMarketplaceAddress(address _marketplaceAddress) external onlyOwner {
        marketplaceAddress = _marketplaceAddress;
    }
    
    /**
     * @dev Rút token từ contract (trong trường hợp khẩn cấp)
     * @param _token Địa chỉ token
     * @param _amount Số lượng token
     */
    function withdrawToken(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(msg.sender, _amount);
    }
} 