import { expect } from 'chai';
import {tokens, checkNumber, EVM_REVERT} from './helpers';

const Token = artifacts.require('Token');
require('chai')
    .use(require('chai-as-promised'))
    .should();

// truffle provides contract(name of contract, account list)
contract('Token', (accounts) => {
    let token;
    const [deployer, receiver] = accounts;
    beforeEach(async() => {
        // fetch token from the blockchain
        token = await Token.new();
    });

    describe('deployment', () => {
        it('tracks the name', async () => {
            const result = await token.name();
            result.should.equal('BMR Token');
        });

        it('tracks the symbol', async () => {
            const result = await token.symbol();
            result.should.equal('BMR');
        });

        it('tracks the decimals', async () => {
            const result = await token.decimals();
            result.toString().should.equal('18');
        });

        it('tracks the total supply', async () => {
            const result = await token.totalSupply();
            result.toString().should.equal('1000000000000000000000000');
        });

        it('deployer has all supply', async () => {
            const result = await token.balanceOf(accounts[0]);
            const totalSupply = await token.totalSupply();
            result.toString().should.equal(totalSupply.toString());
        });
    });

    describe('sending tokens', () => {
        let amount;

        describe('success', () => {
            let result;
            beforeEach('send amount', async () => {
                amount = tokens(100000);
                result = await token.transfer(receiver, amount, {from: deployer});
            });
            
            it('transfer token balances', async () => {
                const balanceOfDeployer = await token.balanceOf(deployer);
                const balanceOfReceiver = await token.balanceOf(receiver);
                
                checkNumber(balanceOfDeployer, 900000);
                checkNumber(balanceOfReceiver, 100000);
            });
            
            it('emits a Transfer event', async () => {
                const logs = result.logs[0];
                expect(logs.event).to.equal('Transfer', 'event has been emitted');
                expect(logs.args.from.toString()).to.eq(deployer, 'deployer is correct');
                expect(logs.args.to.toString()).to.eq(receiver, 'receiver is correct');
                logs.args.value.toString().should.eq(amount.toString(), 'amount is correct');
            });
        });
        describe('failure', () => {
            it('rejects insufficient funds', async () => {
                let invalidAmount;
                invalidAmount = tokens(100000000);
                await token.transfer(receiver, invalidAmount, {from: deployer})
                        .should.be.rejectedWith(EVM_REVERT);
            });

            // Attempts to send funds when you have none

            it('rejects if balance is zero', async () => {
                await token.transfer(deployer, amount, {from: receiver})
                        .should.be.rejectedWith(EVM_REVERT);
            });

            it('rejects invalid recipients', async () => {
                await token.transfer(0x0, amount, {from: deployer})
                        .should.be.rejected;
            });
        });
    });
});

