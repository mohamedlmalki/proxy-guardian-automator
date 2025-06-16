import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, Building, MapPin } from "lucide-react";
import { ValidProxy } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";

interface ProxyCheckerProps {
  onProxiesValidated: (proxies: ValidProxy[]) => void;
  proxyInput: string;
  onProxyInputChange: (value: string) => void;
  results: ValidProxy[];
  setResults: (results: ValidProxy[]) => void;
}

export const ProxyChecker = ({ 
  onProxiesValidated, 
  proxyInput, 
  onProxyInputChange,
  results,
  setResults
}: ProxyCheckerProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  
  const [fraudFilter, setFraudFilter] = useState('100');
  // --- NEW: State for our country filter ---
  const [countryFilter, setCountryFilter] = useState('');
  // ------------------------------------------

  const checkProxy = async (proxy: string): Promise<ValidProxy> => {
    try {
      const response = await fetch('/api/check-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxy }),
      });
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      return { proxy, ...data };
    } catch (error) {
      console.error(`Error checking proxy ${proxy}:`, error);
      return { proxy, type: 'Unknown', isValid: false, location: 'Unknown' };
    }
  };

  const handleCheckProxies = async () => {
    if (!proxyInput.trim()) {
      toast({ title: "No proxies to check", description: "Please enter some proxy addresses first.", variant: "destructive" });
      return;
    }
    setIsChecking(true);
    setProgress(0);
    setResults([]);

    const proxies = proxyInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const newResults: ValidProxy[] = [];
    
    for (let i = 0; i < proxies.length; i++) {
      const result = await checkProxy(proxies[i]);
      newResults.push(result);
      setResults([...newResults]);
      setProgress(((i + 1) / proxies.length) * 100);
    }
    setIsChecking(false);
    onProxiesValidated(newResults);
    
    const validCount = newResults.filter(r => r.isValid).length;
    toast({ title: "Proxy check completed", description: `${validCount}/${newResults.length} proxies are online and valid.` });
  };
  
  // --- NEW: Update filter logic to include country ---
  const filteredResults = useMemo(() => {
    const maxScore = parseInt(fraudFilter, 10);
    const scoreFilter = isNaN(maxScore) ? 101 : maxScore; // Default to show all if not a number
    const country = countryFilter.trim().toLowerCase();

    return results.filter(result => {
      const passesFraudFilter = !result.isValid || (result.fraud_score ?? 0) <= scoreFilter;
      const passesCountryFilter = !country || result.location?.toLowerCase().includes(country);
      
      return passesFraudFilter && passesCountryFilter;
    });
  }, [results, fraudFilter, countryFilter]);
  // ----------------------------------------------------

  const getStatusIcon = (proxy: ValidProxy) => proxy.isValid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />;
  const getFraudScoreColor = (score: number = 0) => score > 75 ? 'bg-red-500' : score > 50 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white"><Shield className="w-5 h-5 text-blue-400" /><span>Proxy Checker</span></CardTitle>
          <CardDescription className="text-gray-400">Enter proxies to validate using IPQualityScore.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter proxies here (format: ip:port)"
            className="min-h-[200px] bg-slate-900/50 border-slate-600 text-white placeholder-gray-500"
            value={proxyInput}
            onChange={(e) => onProxyInputChange(e.target.value)}
            disabled={isChecking}
          />
          
          {/* --- NEW: Container for filters --- */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fraudFilter" className="text-white">Max Fraud Score</Label>
              <Input
                id="fraudFilter"
                type="number"
                placeholder="e.g., 75"
                value={fraudFilter}
                onChange={(e) => setFraudFilter(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="countryFilter" className="text-white">Country Code</Label>
              <Input
                id="countryFilter"
                type="text"
                placeholder="e.g., US, DE"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-white"
              />
            </div>
          </div>
          {/* ---------------------------------- */}
          
          {isChecking && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-400"><Clock className="w-4 h-4 animate-spin" /><span>Checking proxies...</span></div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
          <Button onClick={handleCheckProxies} disabled={isChecking} className="w-full bg-blue-600 hover:bg-blue-700">{isChecking ? "Checking..." : "Check Proxies"}</Button>
        </CardContent>
      </Card>
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Validation Results</CardTitle>
          <CardDescription className="text-gray-400">{results.length > 0 && <span>Showing {filteredResults.length} of {results.length} total</span>}</CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-500"><AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No results yet.</p></div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredResults.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg border ${result.isValid ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(result)}
                      <span className="text-white font-mono text-sm">{result.proxy}</span>
                    </div>
                    <Badge className={`${result.isValid ? 'bg-purple-600' : 'bg-gray-600'} text-white`}>{result.type}</Badge>
                  </div>
                  {result.isValid && (
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-400">
                      <div className="flex items-center space-x-1"><MapPin className="w-3 h-3"/><span>{result.city}, {result.location}</span></div>
                      <div className="flex items-center space-x-1"><Building className="w-3 h-3"/><span>{result.isp}</span></div>
                      <div className="flex items-center space-x-1">
                        <Badge className={`${getFraudScoreColor(result.fraud_score)} text-white`}>
                          Fraud: {result.fraud_score}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};