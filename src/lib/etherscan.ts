const ETHERSCAN_API_KEY = "IVV7ETIR2NRWJTXI5XEN8PKPIY6ZJ7617I";
const ARBISCAN_API_KEY = "JR52K12QPA3I61A3PUJAYS8BVIM7TU5ZID";

const ENDPOINTS = {
  ethereum: "https://api.etherscan.io/api",
  arbitrum: "https://api.arbiscan.io/api"
};

export interface Transaction {
  isError: string;
  gasUsed: string;
  gasPrice: string;
  value: string;
  timeStamp: string;
  to: string;
  from: string;
  contractAddress?: string;
}

const NAUGHTY_CONTRACTS = {
  MILADY: "0x5af0d9827e0c53e4799bb226655a1de152a425a5".toLowerCase(),
  BAYC: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d".toLowerCase()
};

export const getTransactions = async (address: string, chain: 'ethereum' | 'arbitrum'): Promise<Transaction[]> => {
  const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
  const apiKey = chain === 'ethereum' ? ETHERSCAN_API_KEY : ARBISCAN_API_KEY;
  const baseUrl = ENDPOINTS[chain];
  
  // Get ALL possible transaction types
  const [txResponse, nftResponse, erc20Response] = await Promise.all([
    fetch(`${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=${apiKey}`),
    fetch(`${baseUrl}?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=${apiKey}`),
    fetch(`${baseUrl}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=${apiKey}`)
  ]);

  const [txData, nftData, erc20Data] = await Promise.all([
    txResponse.json(),
    nftResponse.json(),
    erc20Response.json()
  ]);

  console.log("NFT Transactions:", nftData?.result);
  console.log("Regular Transactions:", txData?.result);
  console.log("ERC20 Transactions:", erc20Data?.result);

  // Combine all transactions
  const allTxs = [
    ...(txData.result || []),
    ...(nftData.result || []),
    ...(erc20Data.result || [])
  ];
  
  return allTxs.filter((tx: Transaction) => 
    parseInt(tx.timeStamp) > oneYearAgo
  );
};

export const calculateScore = (transactions: Transaction[]) => {
  if (transactions.length === 0) {
    return null;
  }

  // Debug logs
  console.log("Checking transactions for naughty contracts:", NAUGHTY_CONTRACTS);

  // Check ALL possible contract interactions
  const naughtyTx = transactions.find(tx => {
    const addressesToCheck = [
      tx.to?.toLowerCase(),
      tx.from?.toLowerCase(),
      tx.contractAddress?.toLowerCase()
    ].filter(Boolean);

    const isNaughty = addressesToCheck.some(addr => 
      Object.values(NAUGHTY_CONTRACTS).includes(addr)
    );

    console.log("Checking addresses:", addressesToCheck);
    
    return isNaughty;
  });

  if (naughtyTx) {
    console.log("FOUND NAUGHTY TRANSACTION:", naughtyTx);
    return {
      score: -100,
      explanation: "Ho ho ho! Looks like someone's been trading meme NFTs! Straight to the naughty list! 😈",
      metrics: {
        totalTransactions: transactions.length,
        failedTransactions: 0,
        failedRatio: "0",
        avgGasUsed: 0
      }
    };
  }

  // Calculate metrics
  const failedTxs = transactions.filter(tx => tx.isError === "1").length;
  const failedRatio = failedTxs / transactions.length;
  const avgGasUsed = transactions.reduce((sum, tx) => 
    sum + (parseInt(tx.gasUsed) * parseInt(tx.gasPrice)), 0) / transactions.length;

  // Generate analysis points
  const points: string[] = [];

  // Transaction success analysis
  if (failedRatio === 0) {
    points.push("Perfect transaction success rate! 🎯");
  } else if (failedRatio < 0.1) {
    points.push("Consistently successful transactions ✅");
  } else if (failedRatio > 0.2) {
    points.push("High number of failed transactions ❌");
  }

  // Gas usage analysis
  if (avgGasUsed < 500000) {
    points.push("Very efficient with gas usage 💰");
  } else if (avgGasUsed > 1000000) {
    points.push("High gas fees detected 🔥");
  }

  // Activity analysis
  if (transactions.length > 50) {
    points.push("Very active trader 📈");
  } else if (transactions.length < 10) {
    points.push("Limited trading activity 🐌");
  }

  // Calculate score (keep existing scoring logic)
  let score = 0;
  score += Math.min(transactions.length / 10, 20);
  score += failedRatio < 0.1 ? 15 : 0;
  score -= avgGasUsed > 1000000 ? 10 : 0;
  score -= failedRatio > 0.2 ? 20 : 0;
  score -= transactions.length < 5 ? 10 : 0;

  return {
    score,
    explanation: score > 0 
      ? "You've made Santa's Nice list! Keep up the good work! 🎄" 
      : "Oh dear... looks like someone's getting coal this year! 😈",
    points, // Add the detailed points array
    metrics: {
      totalTransactions: transactions.length,
      failedTransactions: failedTxs,
      failedRatio: (failedRatio * 100).toFixed(1),
      avgGasUsed: Math.floor(avgGasUsed),
    }
  };
};