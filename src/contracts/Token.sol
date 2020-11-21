pragma solidity >=0.4.22 <0.8.0;

contract Token {
    string public name = "BMR Token";
    string public symbol = "BMR";
    uint256 public decimals = 18;
    uint256 public totalSupply;

    constructor() public {
        totalSupply = 1000000 * (10 ** decimals);
    }
}