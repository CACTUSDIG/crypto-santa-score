const ETHERSCAN_API_KEY = "IVV7ETIR2NRWJTXI5XEN8PKPIY6ZJ7617I";
const BASE_URL = "https://api.etherscan.io/api";

export interface Transaction {
  isError: string;
  gasUsed: string;
  gasPrice: string;
  value: string;
  timeStamp: string;
  to: string;
  from: string;
}

export const getTransactions = async (address: string): Promise<Transaction[]> => {
  const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
  
  const response = await fetch(
    `${BASE_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=${ETHERSCAN_API_KEY}`
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

  let score = 0;
  const totalGasUsed = transactions.reduce((sum, tx) => 
    sum + (parseInt(tx.gasUsed) * parseInt(tx.gasPrice)), 0);
  const avgGasUsed = totalGasUsed / transactions.length;
  const failedTxs = transactions.filter(tx => tx.isError === "1").length;
  const failedRatio = failedTxs / transactions.length;

  // Nice metrics
  score += Math.min(transactions.length / 10, 20); // Up to +20 for activity
  score += failedRatio < 0.1 ? 15 : 0; // +15 for low failed tx ratio
  score -= avgGasUsed > 1000000 ? 10 : 0; // -10 for high gas usage

  // Naughty metrics
  score -= failedRatio > 0.2 ? 20 : 0; // -20 for high failed tx ratio
  score -= transactions.length < 5 ? 10 : 0; // -10 for very low activity

  return {
    score,
    metrics: {
      totalTransactions: transactions.length,
      failedTransactions: failedTxs,
      failedRatio: failedRatio.toFixed(2),
      avgGasUsed: Math.floor(avgGasUsed),
    }
  };
};