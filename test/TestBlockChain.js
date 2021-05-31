const BlockChain = require("../BlockChain");

const bitcoin = new BlockChain();

// create transactions
bitcoin.createNewTransaction(100, "raghav", "himanshu");
bitcoin.createNewTransaction(10, "raghav", "raj");
bitcoin.createNewTransaction(300, "raghav", "ram");

// proof of Work before adding a new Block
const nonce = bitcoin.proofOfWork(
  bitcoin.getLastBlock()["hash"],
  bitcoin.pendingTransactions
);

// then create a new Block in chain
bitcoin.createNewBlock(
  nonce,
  bitcoin.getLastBlock()["hash"],
  bitcoin.hashBlock(
    nonce,
    bitcoin.getLastBlock()["hash"],
    bitcoin.pendingTransactions
  )
);

// to verify the block just hash it and check if first 5 are zeros

console.log(
  bitcoin
    .hashBlock(
      nonce,
      bitcoin.getLastBlock()["hash"],
      bitcoin.chain[1].transactions
    )
    .substring(0, 5) === "00000"
    ? "Valid"
    : "Invalid"
);


bitcoin.createNewTransaction(30, "raghav", "raj");
bitcoin.createNewTransaction(200, "ram", "raghav");

const nonce2 = bitcoin.proofOfWork(
  bitcoin.getLastBlock()["hash"],
  bitcoin.pendingTransactions
);

// then create a new Block in chain
bitcoin.createNewBlock(
  nonce2,
  bitcoin.getLastBlock()["hash"],
  bitcoin.hashBlock(
    nonce2,
    bitcoin.getLastBlock()["hash"],
    bitcoin.pendingTransactions
  )
);

// to verify the block just hash it and check if first 5 are zeros


console.log(bitcoin);
