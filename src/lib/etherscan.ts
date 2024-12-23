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

  let score = 0;
  const totalGasUsed = transactions.reduce((sum, tx) => 
    sum + (parseInt(tx.gasUsed) * parseInt(tx.gasPrice)), 0);
  const avgGasUsed = totalGasUsed / transactions.length;
  const failedTxs = transactions.filter(tx => tx.isError === "1").length;
  const failedRatio = failedTxs / transactions.length;

  // Base score calculations
  score += Math.min(transactions.length / 10, 20); // Up to +20 for activity
  score += failedRatio < 0.1 ? 15 : 0; // +15 for low failed tx ratio
  score -= avgGasUsed > 1000000 ? 10 : 0; // -10 for high gas usage
  score -= failedRatio > 0.2 ? 20 : 0; // -20 for high failed tx ratio
  score -= transactions.length < 5 ? 10 : 0; // -10 for very low activity

  // Generate explanation
  let explanation = "";
  if (score > 0) {
    explanation = `This wallet shows responsible behavior with ${transactions.length} transactions and only ${(failedRatio * 100).toFixed(1)}% failed transactions.`;
    if (avgGasUsed <= 1000000) {
      explanation += " They're also efficient with gas usage!";
    }
  } else {
    explanation = `This wallet has some concerning patterns: ${(failedRatio * 100).toFixed(1)}% of transactions failed`;
    if (avgGasUsed > 1000000) {
      explanation += " and they're using a lot of gas";
    }
    if (transactions.length < 5) {
      explanation += ", with very low activity";
    }
    explanation += ".";
  }

  return {
    score,
    explanation,
    metrics: {
      totalTransactions: transactions.length,
      failedTransactions: failedTxs,
      failedRatio: (failedRatio * 100).toFixed(1),
      avgGasUsed: Math.floor(avgGasUsed),
    }
  };
};