const sha256 = require("sha256");
const uuid = require("uuid").v4;

function BlockChain() {
  this.chain = []; // will keep all the transactions
  this.pendingTransactions = []; // will keep the transactions which are not yet mined by block

  // genesis block the start block
  this.createNewBlock(
    0,
    "0",
    this.hashBlock(this.proofOfWork("0", "0"), "0", "0")
  );

  // network related
  this.currentNodeURL = "http://localhost:" + process.argv[2];

  this.networkNodeURLs = [];
}

// create New Block

BlockChain.prototype.createNewBlock = function (
  nonce, // proof of workDone
  previousBlockHash,
  hash
) {
  // a new Block
  const newBlock = {
    index: this.chain.length + 1,
    timestamp: Date.now(),
    transactions: this.pendingTransactions,
    nonce,
    previousBlockHash,
    hash,
  };

  // add to the chain and empty the pending transactions
  this.chain.push(newBlock);
  this.pendingTransactions = [];

  // return the newBlock created
  return newBlock;
};

// get Last Block

BlockChain.prototype.getLastBlock = function () {
  return this.chain[this.chain.length - 1];
};

// create a new Transaction

BlockChain.prototype.createNewTransaction = function (
  amount,
  sender,
  recipient
) {
  // creating a transaction
  const newTransaction = {
    amount,
    sender,
    recipient,
    transactionId: uuid().split("-").join(""),
  };

  return newTransaction;
};

// add txns to pending txns
BlockChain.prototype.addTransactionsToPendingTransactions = function (
  transactionObj
) {
  this.pendingTransactions.push(transactionObj);
  return this.getLastBlock()["index"] + 1;
};

// hash the blockdata
BlockChain.prototype.hashBlock = function (
  nonce,
  previousBlockHash,
  currentBlockData
) {
  const blockData =
    previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);

  const hash = sha256(blockData);

  return hash;
};

// proof of work : will make the blockChain secure as it has to more computation and energy
// generate hash and increment nonce until the hash starting with 5 0's  not there.

BlockChain.prototype.proofOfWork = function (
  previousBlockHash,
  currentBlockData
) {
  let nonce = 0;

  let hash = this.hashBlock(nonce, previousBlockHash, currentBlockData);

  while (hash.substring(0, 5) !== "00000") {
    nonce++;
    hash = this.hashBlock(nonce, previousBlockHash, currentBlockData);
  }

  // return the nonce which will be used for next block and for validating a block we just have to hash and chcek if its valid hash ie starting 5 as 0's.
  return nonce;
};

// validate the blockchain
BlockChain.prototype.chainIsValid = function (blockChain) {
  // check if the previousHash of current == hash of the previous
  let validate = true;
  for (let i = 1; i < blockChain.chain.length; i++) {
    const currentBlock = blockChain.chain[i];
    const previousBlock = blockChain.chain[i - 1];
    const currentBlockPreviousHash = currentBlock["previousBlockHash"];
    const previousBlockHash = previousBlock["hash"];

    // check the hash of currentData
    const blockHash = this.hashBlock(
      currentBlock["nonce"],
      currentBlock["previousBlockHash"],

      {
        index: currentBlock["index"],
        transactions: currentBlock["transactions"],
      }
    );

    if (blockHash.substring(0, 5) !== "00000") validate = false;

    // check previous hash with current's previous Hash
    if (previousBlockHash !== currentBlockPreviousHash) validate = false;
  }
};

module.exports = BlockChain;
