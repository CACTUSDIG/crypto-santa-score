import { useState } from "react";
import { getTransactions, calculateScore } from "@/lib/etherscan";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const WalletChecker = () => {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const checkWallet = async () => {
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const transactions = await getTransactions(address);
      if (transactions.length === 0) {
        setResult({ inactive: true });
      } else {
        const scoreResult = calculateScore(transactions);
        setResult(scoreResult);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch wallet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Snowfall effect */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full animate-snowfall"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      <div className="container max-w-2xl py-8">
        <Card className="p-6 bg-christmas-paper border-christmas-gold border-2">
          <h1 className="text-4xl font-bold text-christmas-red text-center mb-8">
            Crypto Naughty or Nice List
          </h1>
          
          <div className="flex gap-4 mb-8">
            <Input
              placeholder="Enter wallet address (0x...)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={checkWallet}
              disabled={loading}
              className="bg-christmas-green hover:bg-christmas-green/90 text-white"
            >
              {loading ? "Checking..." : "Check List"}
            </Button>
          </div>

          {result && (
            <div className="text-center animate-fade-in">
              {result.inactive ? (
                <p className="text-2xl text-gray-600">
                  This wallet hasn't been active in the last 365 days!
                  <br />
                  Not on the list this year...
                </p>
              ) : (
                <div>
                  <h2 className="text-3xl font-bold mb-4">
                    {result.score > 0 ? (
                      <span className="text-christmas-green">Nice List! 🎄</span>
                    ) : (
                      <span className="text-christmas-red">Naughty List! 😈</span>
                    )}
                  </h2>
                  <div className="space-y-2 text-left">
                    <p>Total Transactions: {result.metrics.totalTransactions}</p>
                    <p>Failed Transactions: {result.metrics.failedTransactions}</p>
                    <p>Failure Rate: {result.metrics.failedRatio}%</p>
                    <p>Average Gas Used: {result.metrics.avgGasUsed}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default WalletChecker;