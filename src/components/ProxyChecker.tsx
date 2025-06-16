import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, Building, MapPin, Network } from "lucide-react";
import { ValidProxy } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  
  const [countryFilter, setCountryFilter] = useState('');
  const [rateLimit, setRateLimit] = useState('25');

  const isCheckingRef = useRef(isChecking);
  useEffect(() => {
    isCheckingRef.current = isChecking;
  }, [isChecking]);

  const checkProxy = async (proxy: string): Promise<ValidProxy> => {
    try {
      const response = await fetch('/api/check-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxy }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error(`Error checking proxy ${proxy}:`, error);
      return { 
        proxy, 
        type: 'Error', 
        isValid: false, 
      };
    }
  };

  const handleCheckProxies = async () => {
    isCheckingRef.current = true;
    setIsChecking(true);
    
    if (!proxyInput.trim()) {
      toast({ title: "No proxies to check", description: "Please enter some proxy addresses first.", variant: "destructive" });
      setIsChecking(false);
      isCheckingRef.current = false;
      return;
    }
    
    setProgress(0);
    setResults([]);

    const proxies = proxyInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const newResults: ValidProxy[] = [];
    
    const requestsPerMinute = parseInt(rateLimit, 10);
    const delay = requestsPerMinute > 0 ? 60000 / requestsPerMinute : 0;

    for (let i = 0; i < proxies.length; i++) {
      if (!isCheckingRef.current) {
        toast({ title: "Process Aborted", description: `Checked ${i} of ${proxies.length} proxies.` });
        break; 
      }

      const result = await checkProxy(proxies[i]);
      newResults.push(result);
      setResults([...newResults]);
      setProgress(((i + 1) / proxies.length) * 100);

      if (i < proxies.length - 1 && delay > 0) {
        await sleep(delay);
      }
    }
    
    if (isCheckingRef.current) {
        const validCount = newResults.filter(r => r.isValid).length;
        toast({ title: "Proxy check completed", description: `${validCount}/${newResults.length} proxies are valid.` });
    }
    
    isCheckingRef.current = false;
    setIsChecking(false);
    onProxiesValidated(newResults);
  };
  
  const handleAbort = () => {
    isCheckingRef.current = false;
    setIsChecking(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white"><Shield className="w-5 h-5 text-blue-400" /><span>Proxy Checker</span></CardTitle>
          <CardDescription className="text-gray-400">Enter proxies to validate using IP-API.com.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter proxies here (format: ip:port)"
            className="min-h-[200px] bg-slate-900/50 border-slate-600 text-white placeholder-gray-500"
            value={proxyInput}
            onChange={(e) => onProxyInputChange(e.target.value)}
            disabled={isChecking}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rateLimit" className="text-white">Requests per Minute</Label>
              <Input
                id="rateLimit"
                type="number"
                placeholder="e.g., 25"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                disabled={isChecking}
                className="bg-slate-900/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="countryFilter" className="text-white">Filter by Country Code</Label>
              <Input
                id="countryFilter"
                type="text"
                placeholder="e.g., US, DE"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value.toUpperCase())}
                disabled={isChecking}
                className="bg-slate-900/50 border-slate-600 text-white"
              />
            </div>
          </div>
          
          {isChecking && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-400"><Clock className="w-4 h-4 animate-spin" /><span>Checking proxies...</span></div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {!isChecking ? (
            <Button onClick={handleCheckProxies} className="w-full bg-blue-600 hover:bg-blue-700">Check Proxies</Button>
          ) : (
            <Button onClick={handleAbort} variant="destructive" className="w-full">Abort</Button>
          )}
        </CardContent>
      </Card>
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Validation Results</CardTitle>
          <CardDescription className="text-gray-400">
            {results.length > 0 ? `Showing results for ${results.length} proxies` : 'No results yet.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-500"><AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No results yet. Enter proxies and click "Check".</p></div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.filter(r => !countryFilter || r.location?.includes(countryFilter)).map((result, index) => (
                <div key={index} className={`p-3 rounded-lg border ${result.isValid ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                  {result.isValid ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center font-medium text-white">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <span>{result.proxy}</span>
                      </div>
                      {/* --- UPDATED: New layout based on your screenshot --- */}
                      <div className="pl-6 text-gray-300 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Building className="w-3 h-3"/>
                            <span>{result.isp}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Network className="w-3 h-3"/>
                            <span>{result.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3 h-3"/>
                          <span>{result.city}, {result.country} ({result.location})</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-gray-400 font-mono text-sm">{result.proxy}</span>
                      <Badge variant="destructive">{result.type || 'Invalid'}</Badge>
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