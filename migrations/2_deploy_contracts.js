// import Token from abis
const Token = artifacts.require('Token');

module.exports = function(deployer){
    deployer.deploy(Token);
}