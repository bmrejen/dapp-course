import { tokens, ether, EVM_REVERT, ETHER_ADDRESS } from "./helpers";

const Exchange = artifacts.require("Exchange");
const Token = artifacts.require("Token");

require("chai")
  .use(require("chai-as-promised"))
  .should();

contract("Exchange", (accounts) => {
  const [deployer, feeAccount, user1, user2] = accounts;
  let exchange, token;
  const feePercent = 10;

  beforeEach(async () => {
    // DEPLOY THE Token smart contract
    // and pass the feeAccount to the contract constructor
    token = await Token.new();

    // Let's give user1 some tokens - deployer has all tokens at first
    token.transfer(user1, tokens(100), { from: deployer });

    // Deploy exchange
    exchange = await Exchange.new(feeAccount, feePercent);
  });

  describe("DEPLOYMENT", () => {
    // the account should be passed to constructor
    it("tracks the fee account", async () => {
      const result = await exchange.feeAccount();
      result.should.eq(feeAccount);
    });

    it("tracks the fee amount", async () => {
      const result = await exchange.feePercent();
      result.toString().should.eq(feePercent.toString());
    });
  });
  describe("FALLBACK", () => {
    it("reverts the transaction if Ether is sent", async () => {
      await exchange
        // sendTransaction == send basic ETH transaction
        .sendTransaction({ value: 1, from: user1 })
        .should.be.rejectedWith(EVM_REVERT);
    });
  });
  describe("DEPOSITING ETHER", () => {
    let result, amount;
    beforeEach(async () => {
      amount = ether(1);
      // ETH cannot be passed as argument but metadata
      result = await exchange.depositEther({ from: user1, value: amount });
    });

    it("tracks the Ether deposit", async () => {
      const balance = await exchange.tokens(ETHER_ADDRESS, user1);
      balance.toString().should.equal(amount.toString());
    });

    it("emits a Deposit event", async () => {
      const log = await result.logs[0].event;
      log.should.eq("Deposit");
      const event = await result.logs[0].args;
      event.token.should.eq(ETHER_ADDRESS, "token address is ok");
      event.user.should.eq(user1, "user address is ok");
      event.amount.toString().should.eq(amount.toString(), "amount is ok");
      event.balance.toString().should.eq(amount.toString(), "balance is ok");
    });
  });

  describe("WITHDRAWING ETHER", () => {
    let result;
    let amount;
    beforeEach(async () => {
      amount = ether(1);
      await exchange.depositEther({ from: user1, value: amount });
    });

    describe("success", () => {
      beforeEach(async () => {
        result = await exchange.withdrawEther(amount, { from: user1 });
      });

      it("should withdraw ether", async () => {
        const balance = await exchange.tokens(ETHER_ADDRESS, user1);
        balance.toString().should.eq("0");
      });

      it("should emit a Withdraw event", async () => {
        const log = await result.logs[0].event;
        log.should.eq("Withdraw");
        const event = await result.logs[0].args;
        event.token.should.eq(ETHER_ADDRESS);
        event.user.should.eq(user1);
        event.amount.toString().should.eq(amount.toString());
        event.balance.toString().should.eq("0");
      });
    });

    describe("failure", () => {
      it("should reject withdraw for insufficient balance", async () => {
        await exchange
          .withdrawEther(ether(100), { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      });
    });
  });

  describe("DEPOSITING TOKENS", () => {
    let result, amount;

    describe("success", () => {
      // APPROVE THE TOKENS BEFORE WE CAN TRANSFER THEM
      beforeEach(async () => {
        amount = tokens(10);

        // exchange.address == reserved word
        // user1 received funds from deployer and now approves exchange to
        // move tokens for him
        await token.approve(exchange.address, amount, {
          from: user1,
        });

        // ask exchange to deposit funds corresponding to THIS ERC20 contract
        // for THAT amount
        result = await exchange.depositToken(token.address, amount, {
          from: user1,
        });
      });

      it("tracks the token deposit", async () => {
        let exchangeBalance = await token.balanceOf(exchange.address);
        exchangeBalance.toString().should.eq(amount.toString());

        // Check tokens on exchange
        exchangeBalance = await exchange.tokens(token.address, user1);
        exchangeBalance.toString().should.eq(amount.toString());
      });

      it("emits a Deposit event", async () => {
        result.logs[0].event.should.eq("Deposit");
        const args = result.logs[0].args;
        args.token.should.eq(token.address, "token address is correct");
        args.user.should.eq(user1, "user address is correct");
        args.amount
          .toString()
          .should.eq(amount.toString(), "amount is correct");
      });
    });

    describe("failure", () => {
      it("fails when tokens are not approved", async () => {
        await exchange
          .depositToken(token.address, amount, { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      });

      it("rejects Ether deposits", async () => {
        await exchange
          .depositToken(ETHER_ADDRESS, tokens(10), { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      });
    });
  });

  describe("WITHDRAWING TOKENS", () => {
    let result, amount;
    beforeEach(async () => {
      amount = tokens(10);

      // Deposit tokens
      await token.approve(exchange.address, amount, { from: user1 });
      await exchange.depositToken(token.address, amount, { from: user1 });

      // Withdraw tokens
      result = await exchange.withdrawToken(token.address, amount, {
        from: user1,
      });
    });

    it("withdraws token funds", async () => {
      const balance = await exchange.tokens(token.address, user1);
      balance.toString().should.eq("0");
    });

    it("should emit a Withdraw event", async () => {
      const log = await result.logs[0];
      log.event.should.eq("Withdraw");
      const event = await log.args;
      event.token.should.eq(token.address);
      event.user.should.eq(user1);
      event.amount.toString().should.eq(amount.toString());
      event.balance.toString().should.eq("0");
    });

    describe("failure", () => {
      it("rejects Ether withdrawal", async () => {
        await exchange
          .withdrawToken(ETHER_ADDRESS, amount, { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      });

      // attempts to withdraw tokens without depositing them first
      it("fails for insufficient balance", async () => {
        await exchange
          .withdrawToken(token.address, amount, { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      });
    });
  });

  describe("checking balances", async () => {
    beforeEach(async () => {
      exchange.depositEther({ from: user1, value: ether(1) });
    });

    it("returns user balance", async () => {
      const result = await exchange.balanceOf(ETHER_ADDRESS, user1);
      result.toString().should.eq(ether(1).toString());
    });
  });

  describe("MAKING ORDERS", () => {
    let result;

    beforeEach(async () => {
      result = await exchange.makeOrder(
        token.address,
        tokens(1),
        ETHER_ADDRESS,
        ether(1),
        { from: user1 }
      );
    });

    it("tracks the newly created order", async () => {
      const orderCount = await exchange.orderCount();
      orderCount.toString().should.eq("1");

      const order = await exchange.orders("1");
      order.id.toString().should.eq("1");
      order.user.should.eq(user1);
      order.tokenGet.should.eq(token.address);
      order.amountGet.toString().should.eq(tokens(1).toString());
      order.tokenGive.should.eq(ETHER_ADDRESS);
      order.amountGive.toString().should.eq(ether(1).toString());
      order.timestamp.toString().length.should.be.at.least(1);
    });

    it("emits an Order event", async () => {
      const log = result.logs[0];
      log.event.should.eq("Order");

      const event = log.args;
      event.id.toString().should.eq("1");
      event.user.should.eq(user1);
      event.tokenGet.should.eq(token.address);
      event.amountGet.toString().should.eq(tokens(1).toString());
      event.tokenGive.should.eq(ETHER_ADDRESS);
      event.amountGive.toString().should.eq(ether(1).toString());
      event.timestamp.toString().length.should.be.at.least(1);
    });
  });

  describe("ORDER ACTIONS", () => {
    beforeEach(async () => {
      // user1 deposits ether
      await exchange.depositEther({ from: user1, value: ether(1) });

      // give tokens to user2
      await token.transfer(user2, tokens(100), { from: deployer });

      // user2 deposits tokens
      await token.approve(exchange.address, tokens(2), { from: user2 });
      await exchange.depositToken(token.address, tokens(2), { from: user2 });

      // user1 makes an order to buy token with Ether
      await exchange.makeOrder(
        token.address,
        tokens(1),
        ETHER_ADDRESS,
        ether(1),
        { from: user1 }
      );
    });

    describe("filling orders", () => {
      let result;

      describe("success", () => {
        beforeEach(async () => {
          // user2 fills order
          result = await exchange.fillOrder("1", { from: user2 });
        });
        //user2 should receive 10% less ether
        it("executes the trade & charges fees", async () => {
          let balance;
          balance = await exchange.balanceOf(token.address, user1);
          balance
            .toString()
            .should.equal(tokens(1).toString(), "user1 received tokens");
          balance = await exchange.balanceOf(ETHER_ADDRESS, user2);
          balance
            .toString()
            .should.equal(ether(1).toString(), "user2 received Ether");
          balance = await exchange.balanceOf(ETHER_ADDRESS, user1);
          balance.toString().should.equal("0", "user1 Ether deducted");
          balance = await exchange.balanceOf(token.address, user2);
          balance
            .toString()
            .should.equal(
              tokens(0.9).toString(),
              "user2 tokens deducted with fee applied"
            );
          const feeAccount = await exchange.feeAccount();
          balance = await exchange.balanceOf(token.address, feeAccount);
          balance
            .toString()
            .should.equal(tokens(0.1).toString(), "feeAccount received fee");
        });

        it("updates filled orders", async () => {
          const orderFilled = await exchange.orderFilled(1);
          orderFilled.should.equal(true);
        });

        it('emits a "Trade" event', () => {
          const log = result.logs[0];
          log.event.should.eq("Trade");
          const event = log.args;
          event.id.toString().should.equal("1", "id is correct");
          event.user.should.equal(user1, "user is correct");
          event.tokenGet.should.equal(token.address, "tokenGet is correct");
          event.amountGet
            .toString()
            .should.equal(tokens(1).toString(), "amountGet is correct");
          event.tokenGive.should.equal(ETHER_ADDRESS, "tokenGive is correct");
          event.amountGive
            .toString()
            .should.equal(ether(1).toString(), "amountGive is correct");
          event.userFill.should.equal(user2, "userFill is correct");
          event.timestamp
            .toString()
            .length.should.be.at.least(1, "timestamp is present");
        });
      });

      describe("failure", () => {
        it("rejects invalid order ids", () => {
          const invalidOrderId = 99999;
          exchange
            .fillOrder(invalidOrderId, { from: user2 })
            .should.be.rejectedWith(EVM_REVERT);
        });

        it("rejects already-filled orders", () => {
          // Fill the order
          exchange.fillOrder("1", { from: user2 }).should.be.fulfilled;
          // Try to fill it again
          exchange
            .fillOrder("1", { from: user2 })
            .should.be.rejectedWith(EVM_REVERT);
        });

        it("rejects cancelled orders", () => {
          // Cancel the order
          exchange.cancelOrder("1", { from: user1 }).should.be.fulfilled;
          // Try to fill the order
          exchange
            .fillOrder("1", { from: user2 })
            .should.be.rejectedWith(EVM_REVERT);
        });
      });
    });
    describe("cancelling orders", () => {
      let result;

      describe("success", () => {
        beforeEach(async () => {
          result = await exchange.cancelOrder("1", { from: user1 });
        });

        it("updates cancelled orders", async () => {
          const orderCancelled = await exchange.orderCancelled(1);
          orderCancelled.should.eq(true);
        });

        it("emits a Cancel event", async () => {
          const log = result.logs[0];
          log.event.should.eq("Cancel");

          const event = log.args;
          event.id.toString().should.eq("1");
          event.user.should.eq(user1);
          event.tokenGet.should.eq(token.address);
          event.amountGet.toString().should.eq(tokens(1).toString());
          event.tokenGive.should.eq(ETHER_ADDRESS);
          event.amountGive.toString().should.eq(ether(1).toString());
          event.timestamp.toString().length.should.be.at.least(1);
        });
      });

      describe("failure", () => {
        it("rejects invalid orders", async () => {
          const invalidOrder = 9999;
          await exchange
            .cancelOrder(invalidOrder, { from: user1 })
            .should.be.rejectedWith(EVM_REVERT);
        });

        it("rejects unauthorized cancellations", async () => {
          // Try to cancel someone else's order
          await exchange
            .cancelOrder("1", { from: user2 })
            .should.be.rejectedWith(EVM_REVERT);
        });
      });
    });
  });
});
