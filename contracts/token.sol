// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GITToken is ERC20, Ownable, ERC20Permit {
    constructor(address recipient, address initialOwner)
        ERC20("GIT token", "GTK")
        Ownable(initialOwner)
        ERC20Permit("GIT token")
    {
        _mint(recipient, 500 * 10 ** decimals());
    }

    // Mint new tokens (only owner, which will be Escrow later)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // Burn tokens from sender
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    // Optional: burn from another address (requires allowance)
    function burnFrom(address account, uint256 amount) public {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
    }
}

