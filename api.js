const express = require("express");

const app = express();

const uuid = require("uuid").v4;

const rp = require("request-promise");

const BlockChain = require("./BlockChain");

const bitcoin = new BlockChain();

const nodeAddress = uuid().split("-").join("");

// middlewares to parse the request body and form data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 *
 * @route GET /blockchain
 * @desc returns the complete blockchain
 * @access Public
 *
 *
 */
app.get("/blockchain", (request, response) => {
  response.status(200).json(bitcoin);
});

/**
 *
 * @route POST /transactions
 * @desc add to the pending txns & returns the index of the next block in which these txns will be mined
 * @access Private
 *
 *
 */
app.post("/transactions", (request, response) => {
  const newTransaction = request.body;

  const blockIndex =
    bitcoin.addTransactionsToPendingTransactions(newTransaction);

  return response.status(201).json({
    note: `Transaction will be added in block ${blockIndex}`,
  });
});

/**
 *
 * @route POST /transactions-broadcast
 * @desc create new Transaction and broadcast
 * @access Public
 *
 *
 */
app.post("/transactions-broadcast", (request, response) => {
  const { amount, sender, recipient } = request.body;
  const newTransaction = bitcoin.createNewTransaction(
    amount,
    sender,
    recipient
  );

  // now broadcast this transaction to every node in n/w

  const transactionPromises = [];

  bitcoin.networkNodeURLs.forEach((nodeURL) => {
    const requestOptions = {
      uri: nodeURL + "/transactions",
      method: "POST",
      body: newTransaction,
      json: true,
    };

    transactionPromises.push(rp(requestOptions));
  });

  // run all
  Promise.all(transactionPromises).then((data) => {
    return response.status(201).json({
      note: "Transaction is created and broadcasted successfully",
    });
  });
});

/**
 *
 * @route POST /receive-new-block
 * @desc creates newBlock and mines the block and add to chain and returns the new block
 * @access Private
 *
 *
 */

app.post("/receive-new-block", (request, response) => {
  const newBlock = request.body.newBlock;
  const previousBlockHash = bitcoin.getLastBlock()["hash"];
  // check if previousblockhash and the newblock.previousblockhash should be same
  if (previousBlockHash === newBlock.previousBlockHash) {
    bitcoin.chain.push(newBlock);
    // empty the pending transactions
    bitcoin.pendingTransactions = [];

    return response.status(201).json({
      note: "New Block added succesffully",
      newBlock,
    });
  }
  return response.status(400).json({
    note: "New Block rejected",
  });
});

/**
 *
 * @route GET /mine
 * @desc creates newBlock and mines the block and broadcast it to other nodes in the network and then broadcast the reward
 * @access Public
 *
 *
 */
app.get("/mine", (request, response) => {
  // get the previous block hash
  const previousBlockHash = bitcoin.getLastBlock()["hash"];

  //
  const currentBlockData = {
    index: bitcoin.chain.length + 1,
    transactions: bitcoin.pendingTransactions,
  };

  // do proof of work
  const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);

  // get currentBlockHash

  const hash = bitcoin.hashBlock(nonce, previousBlockHash, currentBlockData);

  // now create a block
  const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, hash);

  // after creating teh block we need to broadcast that block to other nodes

  const newBlockPromises = [];

  bitcoin.networkNodeURLs.forEach((nodeURL) => {
    const requestOptions = {
      uri: nodeURL + "/receive-new-block",
      method: "POST",
      body: {
        newBlock,
      },
      json: true,
    };

    newBlockPromises.push(rp(requestOptions));
  });

  // run all Promises
  Promise.all(newBlockPromises).then((data) => {
    // now broadcast mining reward transaction
    const newTransactionOptions = {
      uri: bitcoin.currentNodeURL + "/transactions-broadcast",
      method: "POST",
      body: {
        amount: 12.5,
        sender: "00",
        recipient: nodeAddress,
      },
      json: true,
    };

    return rp(newTransactionOptions).then((data) => {
      response.status(200).json({
        note: "New block has been mined adn broadcasted succesfully",
      });
    });
  });
});

/**
 *
 * @route POST /register-and-broadcast-node
 * @desc new node will who want to join the network will send a request to a node in network and that node will broadcast it to other nodes in the Network
 * @access Public
 *
 *
 */
app.post("/register-and-broadcast-node", (request, response) => {
  // first get the current Node Url
  const newNodeURL = request.body.newNodeURL;

  // add the new node url to the networkNodeUrl array
  const isNodePresent = bitcoin.networkNodeURLs.indexOf(newNodeURL) == -1;
  if (isNodePresent) bitcoin.networkNodeURLs.push(newNodeURL);

  const registerNodePromises = [];

  // now broadcast this url to all the nodes in the network

  bitcoin.networkNodeURLs.forEach((nodeURL) => {
    // preparing the request object
    const requestOptions = {
      uri: nodeURL + "/register-node", // register the new node and no broadcast
      method: "POST",
      body: {
        newNodeURL,
      },
      json: true,
    };

    registerNodePromises.push(rp(requestOptions));
  });

  // now resolve all Promises and in data we will get back the network node urls so we needto register them to our networksURLs
  Promise.all(registerNodePromises).then((_) => {
    const bulkRegisterOptions = {
      uri: newNodeURL + "/register-node-bulk",
      method: "POST",
      body: {
        networkNodesURL: [...bitcoin.networkNodeURLs, bitcoin.currentNodeURL],
      },
      json: true,
    };
    return rp(bulkRegisterOptions).then((_) => {
      response.status(201).json({
        note: "New Node registered",
      });
    });
  });
});

/**
 *
 * @route POST /register-node
 * @desc register the new Node in thier networkNodeUrls if not present
 * @access Public
 *
 *
 */
app.post("/register-node", (request, response) => {
  const newNodeURL = request.body.newNodeURL;

  const isNodePresent = bitcoin.networkNodeURLs.indexOf(newNodeURL) == -1;
  const isSameNode = bitcoin.currentNodeURL == newNodeURL;

  if (isNodePresent && !isSameNode) {
    bitcoin.networkNodeURLs.push(newNodeURL);
  }

  return response.status(201).json({
    note: "New node registered",
  });
});

/**
 *
 * @route POST /register-node-bulk
 * @desc register the all network nodes with the  new Node
 * @access Public
 *
 *
 */
app.post("/register-node-bulk", (request, response) => {
  const networkNodesURL = request.body.networkNodesURL;

  networkNodesURL.forEach((nodeURL) => {
    const isNodePresent = bitcoin.networkNodeURLs.indexOf(nodeURL) == -1;
    const isSameNode = bitcoin.currentNodeURL == nodeURL;
    if (isNodePresent && !isSameNode) {
      bitcoin.networkNodeURLs.push(nodeURL);
    }
  });

  return response.status(201).json({
    note: "All node registered with new Node",
  });
});

const PORT = process.env.PORT || process.argv[2];

app.listen(PORT, () => {
  console.log(`Server is listening at ${PORT}`);
});
