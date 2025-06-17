import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("Chainlink Oracle Integration Tests", function () {
	// Các biến cần thiết
	let owner: Signer;
	let user1: Signer;
	let user2: Signer;
	let ownerAddress: string;
	let user1Address: string;
	let user2Address: string;

	// Contracts
	let mockPriceFeed: Contract;
	let dynamicPricing: Contract;
	let rarityVerification: Contract;
	let rewardToken: Contract;
	let automatedRewards: Contract;
	let nftCollection: Contract;
	let marketplace: Contract;

	// Mock Chainlink contracts
	let mockVRFCoordinator: Contract;
	let mockFunctionsRouter: Contract;

	// Constants
	const INITIAL_TOKEN_SUPPLY = ethers.parseEther("1000000"); // 1 million tokens
	const REWARD_POOL_PER_PERIOD = ethers.parseEther("1000"); // 1000 tokens per period
	const ETH_USD_PRICE = 2000_00000000; // $2000 với 8 chữ số thập phân (Chainlink format)

	beforeEach(async function () {
		// Lấy các tài khoản
		[owner, user1, user2] = await ethers.getSigners();
		ownerAddress = await owner.getAddress();
		user1Address = await user1.getAddress();
		user2Address = await user2.getAddress();

		// Deploy mock price feed
		const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
		mockPriceFeed = await MockPriceFeed.deploy(ETH_USD_PRICE);

		// Deploy mock VRF Coordinator
		const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
		mockVRFCoordinator = await MockVRFCoordinator.deploy();

		// Deploy mock Functions Router
		const MockFunctionsRouter = await ethers.getContractFactory("MockFunctionsRouter");
		mockFunctionsRouter = await MockFunctionsRouter.deploy();

		// Deploy RewardToken
		const RewardToken = await ethers.getContractFactory("RewardToken");
		rewardToken = await RewardToken.deploy(INITIAL_TOKEN_SUPPLY);

		// Deploy NFTCollection
		const NFTCollection = await ethers.getContractFactory("NFTCollection");
		nftCollection = await NFTCollection.deploy();

		// Deploy DynamicPricing
		const DynamicPricing = await ethers.getContractFactory("DynamicPricing");
		dynamicPricing = await DynamicPricing.deploy(
			await mockPriceFeed.getAddress(),
			ownerAddress
		);

		// Deploy RarityVerification với các mock contracts
		const RarityVerification = await ethers.getContractFactory("RarityVerification");
		rarityVerification = await RarityVerification.deploy(
			await mockVRFCoordinator.getAddress(), // VRF Coordinator
			1, // subscriptionId
			"0x0000000000000000000000000000000000000000000000000000000000000000", // keyHash
			await mockFunctionsRouter.getAddress(), // Functions Router
			"0x0000000000000000000000000000000000000000000000000000000000000000", // donId
			1 // functionsSubscriptionId
		);

		// Deploy Marketplace
		const MarketPlace = await ethers.getContractFactory("MarketPlace");
		marketplace = await MarketPlace.deploy(
			await mockPriceFeed.getAddress(),
			await dynamicPricing.getAddress(),
			await rarityVerification.getAddress(),
			ownerAddress // Tạm thời sử dụng owner address thay cho AutomatedRewards
		);

		// Deploy AutomatedRewards
		const AutomatedRewards = await ethers.getContractFactory("AutomatedRewards");
		automatedRewards = await AutomatedRewards.deploy(
			await rewardToken.getAddress(),
			await marketplace.getAddress(),
			REWARD_POOL_PER_PERIOD
		);

		// Cập nhật địa chỉ AutomatedRewards trong Marketplace
		await marketplace.connect(owner).updateAutomatedRewardsAddress(await automatedRewards.getAddress());

		// Cấp token cho AutomatedRewards
		await rewardToken.connect(owner).setAutomatedRewardsAddress(await automatedRewards.getAddress());
		await rewardToken.connect(owner).mintForRewards(REWARD_POOL_PER_PERIOD.mul(10)); // 10 periods worth
	});

	describe("Use Case 1: Dynamic Pricing", function () {
		it("should calculate fee correctly based on ETH/USD price", async function () {
			// Giá ETH = $2000
			// Phí = 2% = 200 basis points

			// Test với 1 ETH
			const ethAmount = ethers.parseEther("1"); // 1 ETH
			const [feeETH, feeUSD] = await dynamicPricing.calculateFee(ethAmount);

			// 1 ETH = $2000, phí 2% = $40 = 0.02 ETH
			expect(feeUSD).to.be.closeTo(ethers.parseEther("40"), ethers.parseEther("0.01"));
			expect(feeETH).to.be.closeTo(ethers.parseEther("0.02"), ethers.parseEther("0.001"));
		});

		it("should process payment and transfer fee correctly", async function () {
			// Gửi 1 ETH đến contract
			const paymentAmount = ethers.parseEther("1");

			const initialBalance = await ethers.provider.getBalance(user1Address);

			// Thực hiện thanh toán
			const tx = await dynamicPricing.connect(user1).payFee({ value: paymentAmount });
			const receipt = await tx.wait();

			// Kiểm tra event
			const feePaidEvent = receipt.events.find((e: any) => e.event === "FeePaid");
			expect(feePaidEvent).to.not.be.undefined;

			// Kiểm tra số dư của user1 đã giảm khoảng 1 ETH + gas
			const finalBalance = await ethers.provider.getBalance(user1Address);
			const balanceDiff = initialBalance.sub(finalBalance);

			expect(balanceDiff).to.be.gt(paymentAmount);
			expect(balanceDiff).to.be.lt(paymentAmount.add(ethers.parseEther("0.01"))); // Tính cả gas
		});
	});

	describe("Use Case 2: Rarity Verification", function () {
		it("should request rarity verification for an NFT", async function () {
			// Mint một NFT mới
			await nftCollection.connect(owner).mintNFT(user1Address, "ipfs://metadata");

			// Chuẩn bị traits
			const traits = ["Background: Blue", "Eyes: Green", "Hat: None"];

			// Yêu cầu xác thực độ hiếm
			const tx = await rarityVerification.connect(user1).requestRarityVerification(
				await nftCollection.getAddress(),
				0, // tokenId
				traits
			);

			const receipt = await tx.wait();

			// Kiểm tra event
			const rarityRequestedEvent = receipt.events.find((e: any) => e.event === "RarityRequested");
			expect(rarityRequestedEvent).to.not.be.undefined;

			// Kiểm tra số lượng xác thực đang chờ
			const pendingVerifications = await rarityVerification.pendingVerifications();
			expect(pendingVerifications).to.equal(1);
		});

		it("should simulate VRF callback and update rarity score", async function () {
			// Mint một NFT mới
			await nftCollection.connect(owner).mintNFT(user1Address, "ipfs://metadata");

			// Chuẩn bị traits
			const traits = ["Background: Blue", "Eyes: Green", "Hat: None"];

			// Yêu cầu xác thực độ hiếm
			await rarityVerification.connect(user1).requestRarityVerification(
				await nftCollection.getAddress(),
				0, // tokenId
				traits
			);

			// Mô phỏng callback từ VRF Coordinator
			const requestId = 1; // Mock request ID
			const randomWords = [123456789]; // Mock random number

			await mockVRFCoordinator.fulfillRandomWordsWithCallback(
				requestId,
				await rarityVerification.getAddress(),
				randomWords
			);

			// Kiểm tra rarity score đã được cập nhật
			const rarityId = await rarityVerification.nftToRarityId(await nftCollection.getAddress(), 0);
			const rarity = await rarityVerification.rarities(rarityId);

			expect(rarity.rarityScore).to.be.gt(0);
			expect(rarity.rarityTier).to.not.equal("");
		});
	});

	describe("Use Case 3: Automated Rewards", function () {
		it("should track user activity correctly", async function () {
			// Giả lập một giao dịch từ marketplace
			const tradingVolume = ethers.parseEther("5"); // 5 ETH

			await automatedRewards.connect(owner).updateUserActivity(user1Address, tradingVolume);

			// Kiểm tra hoạt động của user đã được cập nhật
			const activity = await automatedRewards.userActivities(user1Address);
			expect(activity.tradingVolume).to.equal(tradingVolume);
			expect(activity.transactionCount).to.equal(1);
		});

		it("should distribute rewards to top traders", async function () {
			// Cập nhật hoạt động cho các user
			await automatedRewards.connect(owner).updateUserActivity(user1Address, ethers.parseEther("10")); // 10 ETH
			await automatedRewards.connect(owner).updateUserActivity(user2Address, ethers.parseEther("5")); // 5 ETH

			// Kiểm tra số dư token ban đầu
			const user1InitialBalance = await rewardToken.balanceOf(user1Address);
			const user2InitialBalance = await rewardToken.balanceOf(user2Address);

			// Phân phối phần thưởng
			await automatedRewards.connect(owner).distributeRewards();

			// Kiểm tra số dư token sau khi phân phối
			const user1FinalBalance = await rewardToken.balanceOf(user1Address);
			const user2FinalBalance = await rewardToken.balanceOf(user2Address);

			// User1 có khối lượng giao dịch cao hơn nên nhận được nhiều token hơn
			expect(user1FinalBalance).to.be.gt(user1InitialBalance);
			expect(user2FinalBalance).to.be.gt(user2InitialBalance);
			expect(user1FinalBalance.sub(user1InitialBalance)).to.be.gt(user2FinalBalance.sub(user2InitialBalance));

			// Kiểm tra lịch sử phân phối
			const rewardHistoryLength = await automatedRewards.rewardHistory();
			expect(rewardHistoryLength).to.be.gt(0);
		});

		it("should trigger rewards distribution via Chainlink Automation", async function () {
			// Cập nhật hoạt động cho các user
			await automatedRewards.connect(owner).updateUserActivity(user1Address, ethers.parseEther("10")); // 10 ETH
			await automatedRewards.connect(owner).updateUserActivity(user2Address, ethers.parseEther("5")); // 5 ETH

			// Tăng thời gian để vượt qua interval
			await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
			await ethers.provider.send("evm_mine", []);

			// Kiểm tra upkeepNeeded
			const [upkeepNeeded] = await automatedRewards.checkUpkeep("0x");
			expect(upkeepNeeded).to.be.true;

			// Thực hiện performUpkeep
			await automatedRewards.connect(owner).performUpkeep("0x");

			// Kiểm tra phần thưởng đã được phân phối
			const user1Balance = await rewardToken.balanceOf(user1Address);
			const user2Balance = await rewardToken.balanceOf(user2Address);

			expect(user1Balance).to.be.gt(0);
			expect(user2Balance).to.be.gt(0);
		});
	});

	describe("Integration with Marketplace", function () {
		it("should update user activity when buying NFT", async function () {
			// Mint một NFT mới
			await nftCollection.connect(owner).mintNFT(user1Address, "ipfs://metadata");

			// Approve marketplace
			await nftCollection.connect(user1).approve(await marketplace.getAddress(), 0);

			// List NFT
			const listingPrice = ethers.parseEther("1"); // 1 ETH
			await marketplace.connect(user1).listNFT(await nftCollection.getAddress(), 0, listingPrice);

			// User2 mua NFT
			await marketplace.connect(user2).buyNFT(0, { value: listingPrice });

			// Kiểm tra hoạt động của user đã được cập nhật
			const user1Activity = await automatedRewards.userActivities(user1Address);
			const user2Activity = await automatedRewards.userActivities(user2Address);

			expect(user1Activity.tradingVolume).to.equal(listingPrice);
			expect(user2Activity.tradingVolume).to.equal(listingPrice);
			expect(user1Activity.transactionCount).to.equal(1);
			expect(user2Activity.transactionCount).to.equal(1);
		});
	});
}); 