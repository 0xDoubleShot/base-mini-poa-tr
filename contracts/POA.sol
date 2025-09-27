// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract POA is ERC721, Ownable {
    uint256 public nextId;
    mapping(address => bool) public claimed;

    // OZ v5: Ownable artık initialOwner ister
    constructor() ERC721("ProofOfAttendance", "POA") Ownable(msg.sender) {}

    function mintPOA() external {
        require(!claimed[msg.sender], "Already claimed");
        claimed[msg.sender] = true;
        _safeMint(msg.sender, nextId);
        nextId++;
    }
}
