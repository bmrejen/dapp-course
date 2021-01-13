export const tokens = (n) => {
  return new web3.utils.BN(web3.utils.toWei(n.toString(), "ether"));
};

export const ether = tokens;

export const EVM_REVERT = "VM Exception while processing transaction: revert";
export const ETHER_ADDRESS = "0x0000000000000000000000000000000000000000";

export function checkNumber(_number, _numberExpected) {
  return _number.toString().should.equal(tokens(_numberExpected).toString());
}
