import { useState } from "react";
import { getTransactions, calculateScore } from "@/lib/etherscan";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WalletChecker = () => {
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState<"ethereum" | "arbitrum">("ethereum");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const checkWallet = async () => {
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const transactions = await getTransactions(address, chain);
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

      <div className="container max-w-2xl pt-24 pb-8">
        <h1>🎅 </h1>
      <h1 className="text-6xl font-['Berkshire_Swash'] text-christmas-red text-center mb-4">
      Santa's Blockchain List
        </h1>
        <p className="text-lg text-gray-700 text-center mb-8 font-['Inter']">
          Have your crypto trades been naughty or nice this year? Enter your wallet address to find out if you're getting presents or coal!
        </p>
        <Card className="p-6 bg-christmas-paper border-christmas-green border-2">
          <h1 className="text-3xl font-['Berkshire_Swash'] text-christmas-red text-center mb-8">
            Are you on the Naughty or Nice List?
          </h1>
          
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-[1fr,auto] gap-4">
              <div className="space-y-2">
                <label htmlFor="wallet-address" className="block text-sm font-medium text-christmas-green">
                  Input Wallet Address
                </label>
                <Input
                  id="wallet-address"
                  placeholder="Enter wallet address (0x...)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full font-['Inter'] border-christmas-green/50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="chain-select" className="block text-sm font-medium text-christmas-green">
                  Choose Chain
                </label>
                <Select 
                  value={chain} 
                  onValueChange={(value: "ethereum" | "arbitrum") => setChain(value)}
                >
                  <SelectTrigger 
                    id="chain-select"
                    className="w-[180px] font-['Inter'] border-christmas-green/50"
                  >
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={checkWallet}
              disabled={loading}
              className="w-full bg-christmas-green hover:bg-christmas-green/90 text-christmas-cream font-['Inter']"
            >
              {loading ? "Checking..." : "Check List"}
            </Button>
          </div>

          {result && (
            <div className="text-center animate-fade-in">
              {result.inactive ? (
                <p className="text-2xl font-['Inter'] text-gray-600">
                  This wallet hasn't been active in the last 365 days!
                  <br />
                  Not on the list this year...
                </p>
              ) : (
                <div className="space-y-6 p-6 border-2 border-christmas-green/30 rounded-lg bg-christmas-cream/50">
                  <h2 className="text-3xl font-['Berkshire_Swash']">
                  {result.score >= 50 ? (
                      <span className="text-christmas-green">You're on the Nice List! 🎄</span>
                    ) : (
                      <span className="text-christmas-red">You're on the Naughty List! </span>
                    )}
                  </h2>
                  <div className="font-['Inter'] space-y-2 text-left">
                    <p className="text-lg text-gray-700 mb-4">{result.explanation}</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {result.points?.map((point: string, index: number) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
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