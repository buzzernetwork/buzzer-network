// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PublisherPayout
 * @dev Executes publisher earnings payouts
 */
contract PublisherPayout is Ownable, ReentrancyGuard {
    // Publisher address => Token address => Total paid
    mapping(address => mapping(address => uint256)) public totalPaid;
    
    // Authorized backend address
    address public authorizedBackend;
    
    struct Payout {
        address publisher;
        address token;
        uint256 amount;
    }
    
    event Paid(address indexed publisher, address indexed token, uint256 amount, bytes32 indexed txHash);
    event BatchPaid(uint256 count, uint256 totalAmount);
    event BackendUpdated(address indexed oldBackend, address indexed newBackend);
    
    modifier onlyAuthorized() {
        require(msg.sender == authorizedBackend || msg.sender == owner(), "Unauthorized");
        _;
    }
    
    constructor(address _authorizedBackend) Ownable(msg.sender) {
        require(_authorizedBackend != address(0), "Invalid backend address");
        authorizedBackend = _authorizedBackend;
    }
    
    /**
     * @dev Execute single payout
     */
    function payout(address publisher, address token, uint256 amount) external onlyAuthorized nonReentrant {
        require(publisher != address(0), "Invalid publisher address");
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalPaid[publisher][token] += amount;
        
        (bool success, ) = publisher.call{value: amount}("");
        require(success, "Transfer failed");
        
        bytes32 txHash = keccak256(abi.encodePacked(block.timestamp, publisher, amount));
        emit Paid(publisher, token, amount, txHash);
    }
    
    /**
     * @dev Execute batch payouts (gas optimized)
     */
    function batchPayout(Payout[] calldata payouts) external onlyAuthorized nonReentrant {
        require(payouts.length > 0, "Empty payouts array");
        require(payouts.length <= 100, "Too many payouts"); // Gas limit protection
        
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < payouts.length; i++) {
            Payout memory payoutData = payouts[i];
            require(payoutData.publisher != address(0), "Invalid publisher");
            require(payoutData.token != address(0), "Invalid token");
            require(payoutData.amount > 0, "Invalid amount");
            
            totalPaid[payoutData.publisher][payoutData.token] += payoutData.amount;
            totalAmount += payoutData.amount;
            
            (bool success, ) = payoutData.publisher.call{value: payoutData.amount}("");
            require(success, "Transfer failed");
        }
        
        emit BatchPaid(payouts.length, totalAmount);
    }
    
    /**
     * @dev Get total paid to publisher
     */
    function getTotalPaid(address publisher, address token) external view returns (uint256) {
        return totalPaid[publisher][token];
    }
    
    /**
     * @dev Update authorized backend address
     */
    function updateBackend(address newBackend) external onlyOwner {
        require(newBackend != address(0), "Invalid backend address");
        address oldBackend = authorizedBackend;
        authorizedBackend = newBackend;
        emit BackendUpdated(oldBackend, newBackend);
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Contract can receive ETH for payouts
    }
}

