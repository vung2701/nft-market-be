// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockVRFCoordinator {
    mapping(uint256 => address) public requests;
    uint256 public requestCounter;

    event RandomWordsRequested(
        uint256 indexed requestId,
        address indexed requester
    );

    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId) {
        requestCounter++;
        requestId = requestCounter;
        requests[requestId] = msg.sender;
        
        emit RandomWordsRequested(requestId, msg.sender);
        return requestId;
    }

    // Mock function to simulate fulfilling random words
    function fulfillRandomWordsWithCallback(
        uint256 requestId,
        address consumer,
        uint256[] memory randomWords
    ) external {
        // Call the consumer's fulfillRandomWords function
        (bool success, ) = consumer.call(
            abi.encodeWithSignature(
                "rawFulfillRandomWords(uint256,uint256[])",
                requestId,
                randomWords
            )
        );
        require(success, "Failed to fulfill random words");
    }
} 