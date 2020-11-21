const { before, iteratee } = require('lodash');
const { contracts_build_directory } = require('../truffle-config');

const Token = artifacts.require('Token');
require('chai')
    .use(require('chai-as-promised'))
    .should();

// args: name of contract, accounts
contract('Token', (accounts) => {
    let token;
    beforeEach(async() => {
        // fetch token from the blockchain
        token = await Token.new();
    });

    describe('deployment', () => {
        it('tracks the name', async () => {
            const result = await token.name();
            result.should.equal('BMR Token');
        });
    });

    describe('deployment', () => {
        it('tracks the symbol', async () => {
            const result = await token.symbol();
            result.should.equal('BMR');
        });
    });

    describe('deployment', () => {
        it('tracks the decimals', async () => {
            const result = await token.decimals();
            result.toString().should.equal('18');
        });
    });

    describe('deployment', () => {
        it('tracks the total supply', async () => {
            const result = await token.totalSupply();
            result.toString().should.equal('1000000000000000000000000');
        });
    });
});