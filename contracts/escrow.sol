// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGITToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function transferOwnership(address newOwner) external;
}

contract GITTokenEscrow is Ownable {
    IGITToken public gitToken; // Your GITToken
    mapping(address => uint256) public deposits;
    mapping(address => bool) public authorized;

    event Deposited(address indexed sender, uint256 amount);
    event Released(address indexed recipient, uint256 amount);
    event Authorized(address indexed account, bool status);
    event TokensMinted(address indexed to, uint256 amount);
    event OwnershipTransferredToEscrow(address indexed previousOwner, address indexed newOwner);

    // Deploy escrow and set initial owner
    constructor(address _initialOwner) Ownable(_initialOwner) {
    gitToken = IGITToken(0xD912B147F86B72E3898b464B314305dcA2828FD6);
    }


    // Authorize accounts to release funds
    function setAuthorized(address account, bool status) external onlyOwner {
        authorized[account] = status;
        emit Authorized(account, status);
    }

    // Deposit tokens into escrow
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(gitToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        deposits[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    // Release tokens to recipient
    function release(address recipient, uint256 amount) external {
        require(authorized[msg.sender] || msg.sender == owner(), "Not authorized");
        require(deposits[recipient] >= amount, "Insufficient escrow balance");

        deposits[recipient] -= amount;
        require(gitToken.transfer(recipient, amount), "Transfer failed");

        emit Released(recipient, amount);
    }

    // Mint new tokens (only works if escrow owns the token)
    function mintTokens(address to, uint256 amount) external onlyOwner {
        gitToken.mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // Transfer token ownership to another account if needed
    function transferTokenOwnership(address newOwner) external onlyOwner {
        gitToken.transferOwnership(newOwner);
        emit OwnershipTransferredToEscrow(owner(), newOwner);
    }

    // Check escrow balance
    function escrowBalance(address account) external view returns (uint256) {
        return deposits[account];
    }
}
