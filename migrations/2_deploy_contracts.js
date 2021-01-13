// import Token from abis
const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange");

module.exports = async function(deployer) {
  const accounts = await web3.eth.getAccounts();
  await deployer.deploy(Token);

  const feeAccount = accounts[0];
  const feePercent = 10;
  await deployer.deploy(Exchange, feeAccount, feePercent);
};

// deploy with > truffle migrate --reset (to launch a new copy of the contract on the blockchain)
// then open Ganache --> Transactions to see the contracts deployed
