// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Educational attendance registry, not an NFT or proof of physical presence.
contract NadPass {
    string public constant VERSION = "NadPass/1";
    struct Gathering { address organizer; string title; uint32 capacity; uint32 issued; bool open; }
    struct Credential { uint64 issuedAt; bool revoked; }
    uint256 public eventCount;
    mapping(uint256 => Gathering) public gatherings;
    mapping(uint256 => mapping(address => Credential)) public credentials;
    event EventCreated(uint256 indexed eventId, address indexed organizer, string title);
    event CredentialIssued(uint256 indexed eventId, address indexed participant);
    event CredentialRevoked(uint256 indexed eventId, address indexed participant);
    error Unauthorized();
    error InvalidInput();
    error Unavailable();
    error AlreadyIssued();
    error MissingCredential();

    modifier organizerOnly(uint256 eventId) {
        if (gatherings[eventId].organizer != msg.sender) revert Unauthorized();
        _;
    }
    function createEvent(string calldata title, uint32 capacity) external returns (uint256 id) {
        if (bytes(title).length == 0 || bytes(title).length > 120 || capacity == 0 || capacity > 500) revert InvalidInput();
        id = ++eventCount;
        gatherings[id] = Gathering(msg.sender, title, capacity, 0, true);
        emit EventCreated(id, msg.sender, title);
    }
    function issue(uint256 eventId, address participant) external organizerOnly(eventId) {
        Gathering storage e = gatherings[eventId];
        if (!e.open || e.issued >= e.capacity) revert Unavailable();
        if (participant == address(0)) revert InvalidInput();
        if (credentials[eventId][participant].issuedAt != 0) revert AlreadyIssued();
        credentials[eventId][participant] = Credential(uint64(block.timestamp), false);
        e.issued++;
        emit CredentialIssued(eventId, participant);
    }
    function revoke(uint256 eventId, address participant) external organizerOnly(eventId) {
        Credential storage c = credentials[eventId][participant];
        if (c.issuedAt == 0 || c.revoked) revert MissingCredential();
        c.revoked = true;
        emit CredentialRevoked(eventId, participant);
    }
    function closeEvent(uint256 eventId) external organizerOnly(eventId) {
        gatherings[eventId].open = false;
    }
    function verify(uint256 eventId, address participant) external view returns (bool) {
        Credential memory c = credentials[eventId][participant];
        return c.issuedAt != 0 && !c.revoked;
    }
}
