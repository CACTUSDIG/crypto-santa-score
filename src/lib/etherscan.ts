const ETHERSCAN_API_KEY = "IVV7ETIR2NRWJTXI5XEN8PKPIY6ZJ7617I";
const ARBISCAN_API_KEY = "JR52K12QPA3I61A3PUJAYS8BVIM7TU5ZID";

const ENDPOINTS = {
  ethereum: "https://api.etherscan.io/api",
  arbitrum: "https://api.arbiscan.io/api"
};

const NAUGHTY_CONTRACTS = {
  MILADY: "0x5Af0D9827E0c53E4799BB226655A1de152A425a5",
  BAYC: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"
};

export interface Transaction {
  isError: string;
  gasUsed: string;
  gasPrice: string;
  value: string;
  timeStamp: string;
  to: string;
  from: string;
}

export const getTransactions = async (address: string, chain: 'ethereum' | 'arbitrum'): Promise<Transaction[]> => {
  const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
  const apiKey = chain === 'ethereum' ? ETHERSCAN_API_KEY : ARBISCAN_API_KEY;
  const baseUrl = ENDPOINTS[chain];
  
  const response = await fetch(
    `${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=${apiKey}`
  );

  const data = await response.json();
  
  if (data.status === "0") {
    throw new Error(data.message || "Failed to fetch transactions");
  }

  return data.result.filter((tx: Transaction) => 
    parseInt(tx.timeStamp) > oneYearAgo
  );
};

export const calculateScore = (transactions: Transaction[]) => {
  if (transactions.length === 0) {
    return null;
  }

  const hasNaughtyNFTs = transactions.some(tx => 
    Object.values(NAUGHTY_CONTRACTS).includes(tx.to)
  );

  if (hasNaughtyNFTs) {
    return {
      score: -100,
      explanation: "Ho ho ho! Looks like someone's been trading degen NFTs! Straight to the naughty list! 😈",
      metrics: {
        totalTransactions: transactions.length,
        naughtyReason: "NFT trader detected"
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