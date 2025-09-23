// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IGITToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function transferOwnership(address newOwner) external;
}

contract GITTokenEscrow is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IGITToken;
    
    IGITToken public immutable gitToken;
    mapping(address => uint256) public deposits;
    mapping(address => bool) public authorized;

    // Events
    event Deposited(address indexed sender, uint256 amount);
    event Released(address indexed from, address indexed to, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event Authorized(address indexed account, bool status);
    event TokensMinted(address indexed to, uint256 amount);
    
    // Errors for gas efficiency
    error ZeroAmount();
    error InsufficientBalance();
    error NotAuthorized();
    error MintingFailed();
    error InvalidAddress();

    constructor(address _initialOwner, address _tokenAddress) Ownable(_initialOwner) {
        if(_tokenAddress == address(0)) revert InvalidAddress();
        gitToken = IGITToken(_tokenAddress);
    }

    // Authorize accounts to release funds
    function setAuthorized(address account, bool status) external onlyOwner {
        if(account == address(0)) revert InvalidAddress();
        authorized[account] = status;
        emit Authorized(account, status);
    }

    // ✅ SECURE: Deposit tokens into escrow (handles fee-on-transfer tokens)
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if(amount == 0) revert ZeroAmount();
        
        // Track actual received amount for fee-on-transfer tokens
        uint256 balanceBefore = gitToken.balanceOf(address(this));
        gitToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = gitToken.balanceOf(address(this));
        uint256 actualReceived = balanceAfter - balanceBefore;
        
        // Credit actual received amount to user's deposit
        deposits[msg.sender] += actualReceived;
        
        emit Deposited(msg.sender, actualReceived);
    }

    // ✅ SECURE: Release tokens from sender's balance (handles fee-on-transfer tokens)
    function release(address recipient, uint256 amount) external nonReentrant whenNotPaused {
        if(recipient == address(0)) revert InvalidAddress();
        if(amount == 0) revert ZeroAmount();
        if(!authorized[msg.sender] && msg.sender != owner()) revert NotAuthorized();
        if(deposits[msg.sender] < amount) revert InsufficientBalance();

        // Track actual transferred amount for fee-on-transfer tokens
        uint256 balanceBefore = gitToken.balanceOf(address(this));
        gitToken.safeTransfer(recipient, amount);
        uint256 balanceAfter = gitToken.balanceOf(address(this));
        uint256 actualTransferred = balanceBefore - balanceAfter;
        
        // Deduct actual transferred amount from user's deposit
        deposits[msg.sender] -= actualTransferred;
        
        emit Released(msg.sender, recipient, actualTransferred);
    }

    // ✅ SECURE: Release tokens on behalf of another user (handles fee-on-transfer tokens)
    function releaseOnBehalf(address from, address recipient, uint256 amount) external nonReentrant whenNotPaused {
        if(recipient == address(0)) revert InvalidAddress();
        if(from == address(0)) revert InvalidAddress();
        if(amount == 0) revert ZeroAmount();
        if(!authorized[msg.sender] && msg.sender != owner()) revert NotAuthorized();
        if(deposits[from] < amount) revert InsufficientBalance();

        // Track actual transferred amount for fee-on-transfer tokens
        uint256 balanceBefore = gitToken.balanceOf(address(this));
        gitToken.safeTransfer(recipient, amount);
        uint256 balanceAfter = gitToken.balanceOf(address(this));
        uint256 actualTransferred = balanceBefore - balanceAfter;
        
        // Deduct actual transferred amount from specified user's deposit
        deposits[from] -= actualTransferred;
        
        emit Released(from, recipient, actualTransferred);
    }

    // ✅ SECURE: Withdraw full balance (handles fee-on-transfer tokens)
    function withdraw() external nonReentrant whenNotPaused {
        uint256 balance = deposits[msg.sender];
        if(balance == 0) revert ZeroAmount();
        
        // Track actual transferred amount for fee-on-transfer tokens
        uint256 balanceBefore = gitToken.balanceOf(address(this));
        gitToken.safeTransfer(msg.sender, balance);
        uint256 balanceAfter = gitToken.balanceOf(address(this));
        uint256 actualTransferred = balanceBefore - balanceAfter;
        
        // Clear user's deposit (full withdrawal)
        deposits[msg.sender] = 0;
        
        emit Withdrawn(msg.sender, actualTransferred);
    }

    // ✅ SECURE: Partial withdrawal function (handles fee-on-transfer tokens)
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if(amount == 0) revert ZeroAmount();
        if(deposits[msg.sender] < amount) revert InsufficientBalance();
        
        // Track actual transferred amount for fee-on-transfer tokens
        uint256 balanceBefore = gitToken.balanceOf(address(this));
        gitToken.safeTransfer(msg.sender, amount);
        uint256 balanceAfter = gitToken.balanceOf(address(this));
        uint256 actualTransferred = balanceBefore - balanceAfter;
        
        // Deduct actual transferred amount from user's deposit
        deposits[msg.sender] -= actualTransferred;
        
        emit Withdrawn(msg.sender, actualTransferred);
    }

    // Mint new tokens (only works if escrow owns the token)
    function mintTokens(address to, uint256 amount) external onlyOwner nonReentrant {
        if(to == address(0)) revert InvalidAddress();
        if(amount == 0) revert ZeroAmount();
        
        try gitToken.mint(to, amount) {
            emit TokensMinted(to, amount);
        } catch {
            revert MintingFailed();
        }
    }

    // Emergency functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ✅ NEW: Useful view function for frontend integration
    function canRelease(address from, uint256 amount) external view returns (bool) {
        return deposits[from] >= amount;
    }

    // View functions
    function escrowBalance(address account) external view returns (uint256) {
        return deposits[account];
    }

    function getTotalEscrowed() external view returns (uint256) {
        return gitToken.balanceOf(address(this));
    }

    // ✅ NEW: Get multiple user balances in one call (gas efficient for frontend)
    function getBalances(address[] calldata accounts) external view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            balances[i] = deposits[accounts[i]];
        }
        return balances;
    }

    // Fallback to reject ETH
    receive() external payable {
        revert("ETH not accepted");
    }

    fallback() external payable {
        revert("ETH not accepted");
    }
}
