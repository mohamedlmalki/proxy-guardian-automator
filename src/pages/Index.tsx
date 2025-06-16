import { useState, useRef, useEffect } from "react";
import { ProxyChecker } from "@/components/ProxyChecker";
import { ProxySwitcher } from "@/components/ProxySwitcher";
import { AutoFillForm } from "@/components/AutoFillForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, RotateCcw, FormInput } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ValidProxy {
  proxy: string;
  isValid: boolean;
  apiType?: string;
  portType?: string;
  latency?: number;
  anonymity?: string;
  location?: string;
  city?: string;
  country?: string;
  isp?: string;
  fraud_score?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const Index = () => {
  const [validProxies, setValidProxies] = useState<ValidProxy[]>([]);
  const [activeProxy, setActiveProxy] = useState<ValidProxy | null>(null);

  const [proxyInput, setProxyInput] = useState("");
  const [checkerResults, setCheckerResults] = useState<ValidProxy[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  
  const isCheckingRef = useRef(isChecking);
  useEffect(() => {
    isCheckingRef.current = isChecking;
  }, [isChecking]);

  const handleProxiesValidated = (proxies: ValidProxy[]) => {
    setValidProxies(proxies.filter(p => p.isValid));
  };

  const handleProxyChanged = (proxy: ValidProxy | null) => {
    setActiveProxy(proxy);
  };
  
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
      return { 
        proxy, 
        isValid: false, 
        apiType: 'Error',
        portType: 'Error',
      };
    }
  };

  const handleCheckProxies = async (rateLimit: string) => {
    isCheckingRef.current = true;
    setIsChecking(true);
    
    if (!proxyInput.trim()) {
      toast({ title: "No proxies to check", description: "Please enter some proxy addresses first.", variant: "destructive" });
      setIsChecking(false);
      isCheckingRef.current = false;
      return;
    }
    
    setProgress(0);
    setCheckerResults([]);

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
      setCheckerResults([...newResults]);
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
  };
  
  const handleAbort = () => {
    isCheckingRef.current = false;
    setIsChecking(false);
  };
  
  const handleClearResults = () => {
    setCheckerResults([]);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Proxy Guardian Automator
          </h1>
          <p className="text-gray-300 text-lg">
            Professional proxy management, validation, and automation suite
          </p>
        </div>

        {activeProxy && (
          <Card className="mb-6 bg-green-900/20 border-green-500/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">Active Proxy:</span>
                  <span className="text-white">{activeProxy.proxy}</span>
                  <span className="text-blue-400">({activeProxy.portType})</span>
                </div>
                <div className="text-sm text-gray-400">
                  Valid Proxies: {validProxies.length}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="checker" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="checker" className="flex items-center space-x-2 data-[state=active]:bg-blue-600">
              <Shield className="w-4 h-4" />
              <span>Proxy Checker</span>
            </TabsTrigger>
            <TabsTrigger value="switcher" className="flex items-center space-x-2 data-[state=active]:bg-purple-600">
              <RotateCcw className="w-4 h-4" />
              <span>Proxy Switcher</span>
            </TabsTrigger>
            <TabsTrigger value="autofill" className="flex items-center space-x-2 data-[state=active]:bg-green-600">
              <FormInput className="w-4 h-4" />
              <span>Auto Fill</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checker" className="space-y-6">
            <ProxyChecker 
              onProxiesValidated={handleProxiesValidated}
              proxyInput={proxyInput}
              onProxyInputChange={setProxyInput}
              results={checkerResults}
              isChecking={isChecking}
              progress={progress}
              onCheckProxies={handleCheckProxies}
              onAbort={handleAbort}
              onClearResults={handleClearResults}
            />
          </TabsContent>

          <TabsContent value="switcher" className="space-y-6">
            <ProxySwitcher 
              validProxies={validProxies} 
              onProxyChanged={handleProxyChanged}
            />
          </TabsContent>

          <TabsContent value="autofill" className="space-y-6">
            <AutoFillForm activeProxy={activeProxy} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;