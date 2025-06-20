const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Basic Contract Tests", function () {
	// Các biến cần thiết
	let owner;
	let user1;
	let user2;
	let ownerAddress;
	let user1Address;
	let user2Address;

	// Contracts
	let mockPriceFeed;
	let dynamicPricing;
	let nftCollection;
	let marketplace;

	// Constants
	const ETH_USD_PRICE = 200000000000; // $2000 với 8 chữ số thập phân (Chainlink format)

	beforeEach(async function () {
		// Lấy các tài khoản
		[owner, user1, user2] = await ethers.getSigners();
		ownerAddress = await owner.getAddress();
		user1Address = await user1.getAddress();
		user2Address = await user2.getAddress();

		// Deploy mock price feed
		const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
		mockPriceFeed = await MockPriceFeed.deploy(ETH_USD_PRICE);
		await mockPriceFeed.waitForDeployment();

		// Deploy NFTCollection
		const NFTCollection = await ethers.getContractFactory("NFTCollection");
		nftCollection = await NFTCollection.deploy();
		await nftCollection.waitForDeployment();

		// Deploy DynamicPricing
		const DynamicPricing = await ethers.getContractFactory("DynamicPricing");
		dynamicPricing = await DynamicPricing.deploy(
			await mockPriceFeed.getAddress(),
			ownerAddress
		);
		await dynamicPricing.waitForDeployment();

		// Deploy Marketplace
		const MarketPlace = await ethers.getContractFactory("MarketPlace");
		marketplace = await MarketPlace.deploy(
			await mockPriceFeed.getAddress()
		);
		await marketplace.waitForDeployment();
	});

	describe("Dynamic Pricing Tests", function () {
		it("should get latest price from mock feed", async function () {
			const price = await dynamicPricing.getLatestPrice();
			expect(price).to.equal(ETH_USD_PRICE);
		});

		it("should calculate fee correctly based on ETH/USD price", async function () {
			// Test với 1 ETH
			const ethAmount = ethers.parseEther("1"); // 1 ETH
			const [feeETH, feeUSD] = await dynamicPricing.calculateFee(ethAmount);

			// Kiểm tra rằng có phí được tính toán
			expect(feeETH).to.be.gt(0);
			expect(feeUSD).to.be.gt(0);
		});
	});

	describe("Marketplace Tests", function () {
		it("should get price from price feed", async function () {
			const price = await marketplace.getLatestPrice();
			expect(price).to.equal(ETH_USD_PRICE);
		});

		it("should convert USD to ETH correctly", async function () {
			const usdAmount = ethers.parseUnits("100", 8); // $100
			const ethAmount = await marketplace.convertUsdToEth(usdAmount);
			expect(ethAmount).to.be.gt(0);
		});
	});

	describe("NFT Collection Tests", function () {
		it("should mint NFT", async function () {
			await nftCollection.connect(owner).mintNFT(user1Address, "ipfs://metadata");
			expect(await nftCollection.ownerOf(0)).to.equal(user1Address);
		});
	});
}); 