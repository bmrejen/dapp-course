// this file will be run by Truffle script runner
// run it with > truffle exec scripts/seed-exchange.js and open Ganache -> Transactions to see the result

const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange");

// ****************** UTILS *******************************
const ETHER_ADDRESS = "0x0000000000000000000000000000000000000000"; // Ether token deposit address

const ether = (n) => {
  return new web3.utils.BN(web3.utils.toWei(n.toString(), "ether"));
};

const tokens = (n) => ether(n);

const wait = (seconds) => {
  const milliseconds = seconds * 1000;
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

// **********************************************************
module.exports = async function(callback) {
  try {
    console.log("Script running ! Let's seed some info in the blockchain ");

    // Fetch all accounts from wallet
    const accounts = await web3.eth.getAccounts();

    // Fetch the deployed token
    const token = await Token.deployed();
    console.log("Token fetched! : ", token.address);

    // Fetch the deployed exchange
    const exchange = await Exchange.deployed();
    console.log("Exchange fetched! : ", exchange.address);

    // Give tokens to first account in the list after deployer
    const sender = accounts[0];
    const receiver = accounts[1];
    let amount = web3.utils.toWei("10000", "ether"); // 10,000 tokens

    await token.transfer(receiver, amount, { from: sender });
    console.log(`Transferred ${amount} tokens from deployer to user1 !`);

    // Set up exchange users
    const user1 = accounts[0];
    const user2 = accounts[1];

    // User1 deposits ether
    amount = 1;
    await exchange.depositEther({ from: user1, value: ether(amount) });
    console.log(`Deposited ${amount} Ether from user1`);

    // user2 approves tokens
    amount = 10000;
    await token.approve(exchange.address, tokens(amount), { from: user2 });
    console.log(`Approved ${amount} tokens from user2`);

    // User2 deposits tokens
    await exchange.depositToken(token.address, tokens(amount), {
      from: user2,
    });
    console.log(`Deposited ${amount} tokens from user2`);

    // SEND A CANCELLED ORDER (just to show we have some)
    // user1 makes an order to get tokens
    let result, orderId;
    result = await exchange.makeOrder(
      token.address,
      tokens(100),
      ETHER_ADDRESS,
      ether(0.1),
      { from: user1 }
    );
    console.log("Made order for user1");

    // user1 cancels order
    orderId = result.logs[0].args.id;
    await exchange.cancelOrder(orderId, { from: user1 });
    console.log("Cancelled order from user1");

    // SEED FILLED ORDERS
    // User 1 makes order
    result = await exchange.makeOrder(
      token.address,
      tokens(100),
      ETHER_ADDRESS,
      ether(0.1),
      { from: user1 }
    );
    console.log(`Made order from user1`);

    // User 2 fills order
    orderId = result.logs[0].args.id;
    await exchange.fillOrder(orderId, { from: user2 });
    console.log(`Filled order from user1`);

    // Wait 1 second
    await wait(1);

    // User 1 makes another order
    result = await exchange.makeOrder(
      token.address,
      tokens(50),
      ETHER_ADDRESS,
      ether(0.01),
      { from: user1 }
    );
    console.log(`Made order from user1`);

    // User 2 fills another order
    orderId = result.logs[0].args.id;
    await exchange.fillOrder(orderId, { from: user2 });
    console.log(`Filled order from user1`);

    // Wait 1 second
    await wait(1);

    // User 1 makes final order
    result = await exchange.makeOrder(
      token.address,
      tokens(200),
      ETHER_ADDRESS,
      ether(0.15),
      { from: user1 }
    );
    console.log(`Made order from user1`);

    // User 2 fills final order
    orderId = result.logs[0].args.id;
    await exchange.fillOrder(orderId, { from: user2 });
    console.log(`Filled order from user1`);

    // Wait 1 second
    await wait(1);

    // SEED OPEN ORDERS TO BE FILLED

    // User 1 makes 10 orders
    for (let i = 1; i <= 10; i++) {
      result = await exchange.makeOrder(
        token.address,
        tokens(10 * i),
        ETHER_ADDRESS,
        ether(0.01),
        { from: user1 }
      );
      console.log(`Made order from user1`);
      // Wait 1 second
      await wait(1);
    }

    // User 2 makes 10 orders
    for (let i = 1; i <= 10; i++) {
      result = await exchange.makeOrder(
        ETHER_ADDRESS,
        ether(0.01),
        token.address,
        tokens(10 * i),
        { from: user2 }
      );
      console.log(`Made order from user2`);
      // Wait 1 second
      await wait(1);
    }
  } catch (error) {
    console.log(error);
  }
  callback();
};
