// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockFunctionsRouter {
    mapping(bytes32 => address) public requests;
    uint256 public requestCounter;

    event RequestSent(bytes32 indexed requestId, address indexed requester);

    function sendRequest(
        uint64 subscriptionId,
        bytes calldata data,
        uint16 dataVersion,
        uint32 gasLimit,
        bytes32 donId
    ) external returns (bytes32 requestId) {
        requestCounter++;
        requestId = keccak256(
            abi.encodePacked(block.timestamp, msg.sender, requestCounter)
        );
        requests[requestId] = msg.sender;
        
        emit RequestSent(requestId, msg.sender);
        return requestId;
    }

    // Mock function to simulate fulfilling a request
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) external {
        address consumer = requests[requestId];
        require(consumer != address(0), "Request not found");
        
        // Call the consumer's handleOracleFulfillment function
        (bool success, ) = consumer.call(
            abi.encodeWithSignature(
                "handleOracleFulfillment(bytes32,bytes,bytes)",
                requestId,
                response,
                err
            )
        );
        require(success, "Failed to fulfill request");
    }
} 