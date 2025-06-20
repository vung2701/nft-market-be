// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/AggregatorV3Interface.sol";

contract MarketPlace is ReentrancyGuard {
    AggregatorV3Interface internal priceFeed;

    constructor(address _priceFeedAddress) {
        // ETH/USD price feed - có thể truyền vào address hoặc mock cho test
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    struct Listing {
        address seller;
        address nftAddress;
        uint256 tokenId;
        uint256 price;
        bool isSold;
    }

    Listing[] public listings;

    event NFTListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event NFTBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    function listNFT(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _price
    ) external {
        require(_price > 0, "Price must be greater than zero");

        IERC721 nft = IERC721(_nftAddress);
        require(nft.ownerOf(_tokenId) == msg.sender, "You are not the owner");
        require(
            nft.getApproved(_tokenId) == address(this),
            "Marketplace not approved"
        );

        listings.push(
            Listing(msg.sender, _nftAddress, _tokenId, _price, false)
        );

        emit NFTListed(msg.sender, _nftAddress, _tokenId, _price);
    }

    function buyNFT(uint256 _listingId) external payable nonReentrant {
        Listing storage listing = listings[_listingId];

        require(!listing.isSold, "Already sold");
        
        // Chuyển đổi USD price sang ETH để so sánh
        uint256 requiredEth = convertUsdToEth(listing.price);
        require(msg.value >= requiredEth, "Insufficient ETH sent");

        listing.isSold = true;

        // Transfer ETH to seller
        payable(listing.seller).transfer(requiredEth);
        
        // Hoàn lại số dư thừa nếu có
        if (msg.value > requiredEth) {
            payable(msg.sender).transfer(msg.value - requiredEth);
        }

        // Transfer NFT to buyer
        IERC721(listing.nftAddress).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        emit NFTBought(
            msg.sender,
            listing.nftAddress,
            listing.tokenId,
            listing.price
        );
    }

    function getListings() external view returns (Listing[] memory) {
        return listings;
    }

    function getLatestPrice() public view returns (uint256) {
        (
            ,
            /* uint80 roundID */ int256 price /* uint startedAt */ /* uint timeStamp */ /* uint80 answeredInRound */,
            ,
            ,

        ) = priceFeed.latestRoundData();
        return uint256(price);
    }

    function convertUsdToEth(uint256 usdAmount) public view returns (uint256) {
        uint256 ethPrice = getLatestPrice();
        // ethPrice có 8 chữ số thập phân từ Chainlink, usdAmount có 8 chữ số thập phân
        // Kết quả cần 18 chữ số thập phân (wei)
        return (usdAmount * 1e18) / (ethPrice * 1e2);
    }
}
