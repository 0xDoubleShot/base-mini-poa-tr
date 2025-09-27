// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract POA is ERC721, Ownable {
    uint256 public nextId;
    mapping(address => bool) public claimed;

    constructor() ERC721("ProofOfAttendance", "POA") {}

    function mintPOA() external {
        require(!claimed[msg.sender], "Already claimed");
        claimed[msg.sender] = true;
        _safeMint(msg.sender, nextId);
        nextId++;
    }
}

