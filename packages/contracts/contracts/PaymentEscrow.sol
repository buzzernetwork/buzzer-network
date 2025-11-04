// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PaymentEscrow
 * @dev Holds advertiser campaign budgets in escrow
 */
contract PaymentEscrow is Ownable, ReentrancyGuard {
    // Campaign ID => Token Address => Balance
    mapping(uint256 => mapping(address => uint256)) public campaignBalances;
    
    // Campaign ID => Token Address => Total Spent
    mapping(uint256 => mapping(address => uint256)) public campaignSpent;
    
    // Authorized backend address (can spend funds)
    address public authorizedBackend;
    
    event Deposited(uint256 indexed campaignId, address indexed token, uint256 amount, address indexed depositor);
    event Withdrawn(uint256 indexed campaignId, address indexed token, uint256 amount, address indexed recipient);
    event Spent(uint256 indexed campaignId, address indexed token, uint256 amount);
    event BackendUpdated(address indexed oldBackend, address indexed newBackend);
    
    modifier onlyAuthorized() {
        require(msg.sender == authorizedBackend || msg.sender == owner(), "Unauthorized");
        _;
    }
    
    constructor(address _authorizedBackend) Ownable(msg.sender) {
        require(_authorizedBackend != address(0), "Invalid backend address");
        authorizedBackend = _authorizedBackend;
    }
    
    // Native ETH address constant
    address public constant NATIVE_ETH = address(0x0000000000000000000000000000000000000001);
    
    /**
     * @dev Deposit funds to campaign escrow
     */
    function deposit(uint256 campaignId, address token) external payable nonReentrant {
        require(campaignId > 0, "Invalid campaign ID");
        // Allow native ETH (special address) or ERC20 tokens
        require(token == NATIVE_ETH || token != address(0), "Invalid token address");
        
        uint256 amount = msg.value;
        require(amount > 0, "Amount must be greater than 0");
        
        campaignBalances[campaignId][token] += amount;
        
        emit Deposited(campaignId, token, amount, msg.sender);
    }
    
    /**
     * @dev Withdraw unused funds from campaign
     */
    function withdraw(uint256 campaignId, address token, uint256 amount) external nonReentrant {
        require(campaignId > 0, "Invalid campaign ID");
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(campaignBalances[campaignId][token] >= amount, "Insufficient balance");
        
        campaignBalances[campaignId][token] -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(campaignId, token, amount, msg.sender);
    }
    
    /**
     * @dev Spend funds from campaign (authorized backend only)
     */
    function spend(uint256 campaignId, address token, uint256 amount) external onlyAuthorized nonReentrant {
        require(campaignId > 0, "Invalid campaign ID");
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(campaignBalances[campaignId][token] >= amount, "Insufficient balance");
        
        campaignBalances[campaignId][token] -= amount;
        campaignSpent[campaignId][token] += amount;
        
        emit Spent(campaignId, token, amount);
    }
    
    /**
     * @dev Get campaign balance
     */
    function getBalance(uint256 campaignId, address token) external view returns (uint256) {
        return campaignBalances[campaignId][token];
    }
    
    /**
     * @dev Get total spent for campaign
     */
    function getTotalSpent(uint256 campaignId, address token) external view returns (uint256) {
        return campaignSpent[campaignId][token];
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
}

