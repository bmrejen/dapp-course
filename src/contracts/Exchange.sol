pragma solidity ^0.5.0;

import "./Token.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Exchange {
  using SafeMath for uint;

  // the account that receives the fee
  address public feeAccount;

  // the fee I want to get for each transaction
  uint256 public feePercent;

  // the list of people and their balance
  // tokens[Ben][Bob] == 10 ETH
  mapping(address => mapping (address => uint256)) public tokens;

  // Store the order
  mapping(uint256 => _Order) public orders;
  uint256 public orderCount;    // will start at 0
  mapping(uint256 => bool) public orderCancelled;
  mapping(uint256 => bool) public orderFilled;

  // Events
  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);
  event Order (
    uint256 id,
    address user,
    address tokenGet,
    uint256 amountGet, 
    address tokenGive,
    uint256 amountGive,
    uint256 timestamp
  );
  
  event Cancel (
    uint256 id,
    address user,
    address tokenGet,
    uint256 amountGet, 
    address tokenGive,
    uint256 amountGive,
    uint256 timestamp
  );

  event Trade (
    uint256 id,
    address user,
    address tokenGet,
    uint256 amountGet, 
    address tokenGive,
    uint256 amountGive,
    address userFill,     // add the user filling the order
    uint256 timestamp
  );

  // Model the order
  struct _Order {
    uint256 id;    // we'll generate it ourself
    address user;   // person who made the order
    address tokenGet;   // token they want to purchase
    uint256 amountGet; 
    address tokenGive;    // token they will give in return
    uint256 amountGive;
    uint256 timestamp;
  }

  address constant ETHER = address(0);

  constructor(address _feeAccount, uint256 _feePercent) public {
    feeAccount = _feeAccount;
    feePercent = _feePercent;
  }

  // fallback function - reverts if Ether is sent to this contract by mistake
  function() external {
    revert();
  }

  // Allow people to deposit tokens on the exchange
  function depositToken(address _token, uint256 _amount) public {
    // do not allow ether
    require(_token != ETHER);
    // == please deposit the ERC20 token at THIS address
    // and use THAT amount
    // _token == address of the smart contract
    // Token(_token) == a copy of an instance of this token
    // The person calling this contract will send tokens to  
    // the address of this smart contract

    // if transferFrom returns false then stop
    require(Token(_token).transferFrom(msg.sender, address(this), _amount));

    // We want to keep track how many tokens have been deposited
    // in the sender balance and how they belong to
    tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);

    emit Deposit(
      _token, 
      msg.sender, 
      _amount,
      tokens[_token][msg.sender]    // balance of sender
      );
  }

  function withdrawToken(address _token, uint256 _amount) public {
    require(_token != ETHER);
    require(tokens[_token][msg.sender] >= _amount);
    tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
    // transfer tokens from the smart contract
    require(Token(_token).transfer(msg.sender, _amount));
    emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);

  }

  function withdrawEther(uint256 _amount) public {
    require(tokens[ETHER][msg.sender] >= _amount);
    tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
    msg.sender.transfer(_amount); // this is how to transfer Ether in solidity.
    emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
  }


  // payable = accept ether
  function depositEther() payable public {
    // no need to import Ether contract
    // let's assume anything with a blank address is Ether
    // msg.value allows you to say how much ETH you want to send
    tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
    emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
  }

  function balanceOf(address _token, address _user) public view returns(uint256) {
    return tokens[_token][_user];
  }

  function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) public {
    orderCount = orderCount.add(1);
    orders[orderCount] = _Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
    // now = built-in function in Epoch time

    emit Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
  }

  function cancelOrder(uint256 _id) public{
    // fetch the order stored on the blockchain
    _Order storage _order = orders[_id];

    // I can only cancel my own orders
    require(address(_order.user) == msg.sender);

    // The order must exist
    require(_order.id == _id);

    orderCancelled[_id] = true; 
    
    emit Cancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, now);
  }

  function fillOrder(uint256 _id) public {
    require(!orderFilled[_id]);
    require(!orderCancelled[_id]);
    require(_id <= orderCount && _id > 0);

    // Fetch the order
    _Order storage _order = orders[_id];
    _trade(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);

    // Mark the order as filled
    orderFilled[_order.id] = true;
  }

  function _trade(uint256 _orderId, address _user, address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) internal {

    // Do the trade
    // _user created the order
    // msg.sender fills the order
    // Charge fees
    // The fee is paid by the guy filling the order, aka msg.sender
    // It is deducted from _amountGet
    
    uint256 _feeAmount = _amountGive.mul(feePercent).div(100);  // == 5 / 100
    tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].sub(_amountGet.add(_feeAmount));
    
    tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);
    
    // Charge fee
    tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount].add(_feeAmount);
    
    tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive);
    tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].add(_amountGet);
    
    // Emit a Trade event
    emit Trade(_orderId, _user, _tokenGet, _amountGet, _tokenGive, _amountGive, msg.sender, now);
  }
}