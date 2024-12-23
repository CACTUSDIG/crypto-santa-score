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
  input?: string;
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

interface ScoreBreakdown {
  successScore: number;
  gasScore: number;
  activityScore: number;
  consistencyBonus: number;
  valueBonus: number;
  complexityBonus: number;
}

export const calculateScore = (transactions: Transaction[]) => {
  try {
    if (!transactions || transactions.length === 0) return null;

    // Naughty check first
    const naughtyTx = transactions.find(tx => {
      const addressesToCheck = [
        tx.to?.toLowerCase(),
        tx.from?.toLowerCase(),
        tx.contractAddress?.toLowerCase()
      ].filter(Boolean);
      return addressesToCheck.some(addr => 
        Object.values(NAUGHTY_CONTRACTS).includes(addr)
      );
    });

    if (naughtyTx) {
      return {
        score: 0,
        explanation: "Ho ho ho! Straight to the naughty list for those NFTs!",
        points: ["🚫 Degen NFT interaction detected"],
        metrics: { totalTransactions: transactions.length }
      };
    }

    const points: string[] = [];
    const scoreBreakdown: ScoreBreakdown = {
      successScore: 0,
      gasScore: 0,
      activityScore: 0,
      consistencyBonus: 0,
      valueBonus: 0,
      complexityBonus: 0
    };

    // Safe calculations with fallbacks
    const failedTxs = transactions.filter(tx => tx.isError === "1").length || 0;
    const failedRatio = transactions.length ? failedTxs / transactions.length : 0;
    const avgGasUsed = transactions.length ? 
      transactions.reduce((sum, tx) => {
        const gas = parseInt(tx.gasUsed) || 0;
        return sum + gas;
      }, 0) / transactions.length : 0;

    // Time-based metrics
    const oneMonthAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const recentTxs = transactions.filter(tx => 
      parseInt(tx.timeStamp) > oneMonthAgo
    );

    // Success Score (35 points) - slightly reduced
    scoreBreakdown.successScore = Math.floor((1 - failedRatio) * 35);
    points.push(
      failedRatio === 0 ? "🎯 Perfect success rate! (+35)" :
      failedRatio < 0.1 ? "✅ High success rate (+25)" :
      "❌ Room for improvement (+10)"
    );

    // Gas Score (45 points) - increased weight and stricter thresholds
    if (avgGasUsed < 60000) {
      scoreBreakdown.gasScore = 45;
      points.push("🌟 Gas efficiency master! (+45)");
    } else if (avgGasUsed < 100000) {
      scoreBreakdown.gasScore = 35;
      points.push("💰 Very efficient gas usage (+35)");
    } else if (avgGasUsed < 200000) {
      scoreBreakdown.gasScore = 20;
      points.push("👍 Average gas usage (+20)");
    } else {
      scoreBreakdown.gasScore = 0;  // Stricter penalty
      points.push("🔥 High gas consumption (+0)");
    }

    // Activity Score (10 points) - reduced weight
    if (transactions.length > 50 && recentTxs.length > 5) {
      scoreBreakdown.activityScore = 10;
      points.push("📈 Highly active trader (+10)");
    } else if (transactions.length > 20) {
      scoreBreakdown.activityScore = 7;
      points.push("👌 Regular activity (+7)");
    } else {
      scoreBreakdown.activityScore = 3;
      points.push("🐌 Limited activity (+3)");
    }

    // Consistency Bonus (5 points)
    if (recentTxs.length > 0) {
      scoreBreakdown.consistencyBonus = 5;
      points.push("⭐ Recent activity bonus! (+5)");
    }

    // Value Efficiency (5 points)
    const highValueTxs = transactions.filter(tx => {
      try {
        return parseInt(tx.value) > 0;
      } catch {
        return false;
      }
    }).length;
    
    if (highValueTxs / transactions.length > 0.7) {
      scoreBreakdown.valueBonus = 5;
      points.push("💎 Efficient value transfers (+5)");
    }

    const totalScore = Math.min(100, Object.values(scoreBreakdown)
      .reduce((sum, score) => sum + score, 0));

    return {
      score: totalScore,
      explanation: totalScore >= 50
        ? `Congratulations! You've made Santa's Nice list with ${totalScore} points! 🎄`
        : `Oh dear... ${totalScore} points puts you on the naughty list! Try improving your gas usage and success rate! 😈`,
      points,
      metrics: {
        ...scoreBreakdown,
        totalScore,
        totalTransactions: transactions.length,
        recentTransactions: recentTxs.length,
        failedTransactions: failedTxs,
        failedRatio: (failedRatio * 100).toFixed(1),
        avgGasUsed: Math.floor(avgGasUsed)
      }
    };
  } catch (error) {
    console.error("Score calculation error:", error);
    return {
      score: 0,
      explanation: "Oops! Something went wrong checking this wallet 😅",
      points: ["Error calculating score"],
      metrics: { error: true }
    };
  }
};