import { useState } from "react";
import { ProxyChecker } from "@/components/ProxyChecker";
import { ProxySwitcher } from "@/components/ProxySwitcher";
import { AutoFillForm } from "@/components/AutoFillForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, RotateCcw, FormInput } from "lucide-react";

// Add the new fields we want to store
export interface ValidProxy {
  proxy: string;
  type: string;
  isValid: boolean;
  responseTime?: number;
  location?: string;
  city?: string;
  isp?: string;
  fraud_score?: number;
}

const Index = () => {
  const [validProxies, setValidProxies] = useState<ValidProxy[]>([]);
  const [activeProxy, setActiveProxy] = useState<ValidProxy | null>(null);
  
  // --- NEW STATE LIFTED FROM PROXYCHECKER ---
  const [proxyInput, setProxyInput] = useState("");
  const [checkerResults, setCheckerResults] = useState<ValidProxy[]>([]);
  // ------------------------------------------

  const handleProxiesValidated = (proxies: ValidProxy[]) => {
    setValidProxies(proxies.filter(p => p.isValid));
    setCheckerResults(proxies); // Keep all results for the checker UI
    console.log("Validated proxies updated:", proxies);
  };

  const handleProxyChanged = (proxy: ValidProxy | null) => {
    setActiveProxy(proxy);
    console.log("Active proxy changed:", proxy);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Proxy Guardian Automator
          </h1>
          <p className="text-gray-300 text-lg">
            Professional proxy management, validation, and automation suite
          </p>
        </div>

        {/* Status Bar */}
        {activeProxy && (
          <Card className="mb-6 bg-green-900/20 border-green-500/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">Active Proxy:</span>
                  <span className="text-white">{activeProxy.proxy}</span>
                  <span className="text-blue-400">({activeProxy.type})</span>
                </div>
                <div className="text-sm text-gray-400">
                  Valid Proxies: {validProxies.length}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
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
              // Pass all the state and setters down as props
              proxyInput={proxyInput}
              onProxyInputChange={setProxyInput}
              results={checkerResults}
              setResults={setCheckerResults}
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