import { expect } from "chai";
import { tokens, checkNumber, EVM_REVERT } from "./helpers";

const Token = artifacts.require("Token");
require("chai")
  .use(require("chai-as-promised"))
  .should();

// truffle provides contract(name of contract, account list)
contract("Token", (accounts) => {
  let token;
  const [deployer, receiver, exchange] = accounts;
  beforeEach(async () => {
    // fetch token from the blockchain
    token = await Token.new();
  });

  describe("deployment", async () => {
    it("tracks the name", async () => {
      shouldEqual(await token.name(), "BMR Token");
    });

    it("tracks the symbol", async () => {
      shouldEqual(await token.symbol(), "BMR");
    });

    it("tracks the decimals", async () => {
      const decimals = await token.decimals();
      shouldEqual(decimals.toString(), "18");
    });

    it("tracks the total supply", async () => {
      const totalSupply = await token.totalSupply();
      shouldEqual(totalSupply.toString(), tokens(1000000).toString());
    });

    it("deployer has all supply", async () => {
      const result = await token.balanceOf(accounts[0]);
      const totalSupply = await token.totalSupply();
      result.toString().should.equal(totalSupply.toString());
    });
  });

  describe("sending tokens", () => {
    let result, amount;

    describe("success", () => {
      beforeEach(async () => {
        amount = tokens(100);
        result = await token.transfer(receiver, amount, { from: deployer });
      });

      it("transfer token balances", async () => {
        const balanceOfDeployer = await token.balanceOf(deployer);
        const balanceOfReceiver = await token.balanceOf(receiver);

        checkNumber(balanceOfDeployer, 999900);
        checkNumber(balanceOfReceiver, 100);
      });

      it("emits a Transfer event", async () => {
        const logs = result.logs[0];
        expect(logs.event).to.equal("Transfer", "event has been emitted");
        expect(logs.args.from.toString()).to.eq(
          deployer,
          "deployer is correct"
        );
        expect(logs.args.to.toString()).to.eq(receiver, "receiver is correct");
        logs.args.value
          .toString()
          .should.eq(amount.toString(), "amount is correct");
      });
    });
    describe("failure", () => {
      // Attempts to send funds when you have none

      it("rejects if balance is zero", async () => {
        await token
          .transfer(deployer, amount, { from: receiver })
          .should.be.rejectedWith(EVM_REVERT);
      });

      it("rejects invalid recipients", async () => {
        await token.transfer(0x0, amount, { from: deployer }).should.be
          .rejected;
      });

      it("rejects insufficient funds", async () => {
        let invalidAmount;
        invalidAmount = tokens(100000000);
        await token
          .transfer(receiver, invalidAmount, { from: deployer })
          .should.be.rejectedWith(EVM_REVERT);
      });

      it("rejects non-approved transfer", async () => {
        await token.transferFrom(deployer, receiver, tokens(10), {
          from: exchange,
        }).should.be.rejected;
      });
    });
  });

  describe("approving tokens", () => {
    let result, amount;

    beforeEach(async () => {
      amount = tokens(100);
      result = await token.approve(exchange, amount, { from: deployer });
    });

    describe("success", () => {
      it("allocates an allowance", async () => {
        const allowance = await token.allowance(deployer, exchange);
        allowance.toString().should.equal(amount.toString());
      });

      it("emits an approval event", async () => {
        const log = result.logs[0];
        log.event.should.equal("Approval");

        const event = log.args;
        event.owner.should.eq(deployer, "owner is ok");
        event.spender.should.eq(exchange, "spender is ok");
        event.value.toString().should.eq(amount.toString(), "amount is ok");
      });
    });

    describe("failure", () => {
      it("rejects invalid spenders", async () => {
        await token.approve(0x0, amount, { from: deployer }).should.be.rejected;
      });
    });
  });

  describe("delegated token transfer", async () => {
    let amount, result;

    beforeEach(async () => {
      amount = tokens(100);
      result = await token.approve(exchange, amount, {
        from: deployer,
      });
    });

    describe("success", () => {
      beforeEach(async () => {
        result = await token.transferFrom(deployer, receiver, amount, {
          from: exchange,
        });
      });

      it("transfers tokens", async () => {
        let balanceOf;
        balanceOf = await token.balanceOf(deployer);
        balanceOf.toString().should.equal(tokens(999900).toString());
        balanceOf = await token.balanceOf(receiver);
        balanceOf.toString().should.eq(tokens(100).toString());
      });

      it("resets the allowance", async () => {
        const allowance = await token.allowance(deployer, exchange);
        allowance.toString().should.eq("0");
      });

      it("emits a Transfer event", async () => {
        const event = await result.logs[0].event;
        const args = await result.logs[0].args;

        event.should.eq("Transfer");
        args.from.toString().should.eq(deployer, "from is ok");
        args.to.toString().should.eq(receiver, "to is ok");
      });
    });

    describe("failure", () => {
      it("rejects insufficient funds", async () => {
        await token
          .transferFrom(receiver, deployer, tokens(100000))
          .should.be.rejectedWith(EVM_REVERT);
      });

      it("rejects invalid recipients", async () => {
        await token.transferFrom(deployer, 0x0, amount, { from: exchange })
          .should.be.rejected;
      });
    });
  });
});

function shouldEqual(property, expectedResult) {
  property.should.equal(expectedResult);
}
