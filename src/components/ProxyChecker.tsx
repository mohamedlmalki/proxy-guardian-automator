import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, Building, MapPin, Network, Server, Send, ChevronDown, Zap, UserCheck, Trash2, X } from "lucide-react";
import { ValidProxy } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ProxyCheckerProps {
  onProxiesValidated: (proxies: ValidProxy[]) => void;
  proxyInput: string;
  onProxyInputChange: (value: string) => void;
  results: ValidProxy[];
  isChecking: boolean;
  progress: number;
  onCheckProxies: (rateLimit: string) => void;
  onAbort: () => void;
  onClearResults: () => void;
}

const PROTOCOL_TYPES = ['HTTP', 'HTTPS', 'SOCKS4', 'SOCKS5'];

export const ProxyChecker = ({
  onProxiesValidated,
  proxyInput,
  onProxyInputChange,
  results,
  isChecking,
  progress,
  onCheckProxies,
  onAbort,
  onClearResults,
}: ProxyCheckerProps) => {
  const { toast } = useToast();

  const [countryFilter, setCountryFilter] = useState('');
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);
  const [rateLimit, setRateLimit] = useState('25');

  const handleApplyFiltersAndSend = () => {
    const validProxies = results.filter(r => r.isValid);

    const filteredProxies = validProxies.filter(proxy => {
      const countryMatch = !countryFilter || (proxy.location && proxy.location.toLowerCase().includes(countryFilter.toLowerCase()));
      const protocolMatch = selectedProtocols.length === 0 || (proxy.portType && selectedProtocols.includes(proxy.portType.toUpperCase()));
      return countryMatch && protocolMatch;
    });

    onProxiesValidated(filteredProxies);
    toast({
      title: "Filters Applied",
      description: `${filteredProxies.length} proxies sent to the switcher tab.`,
    });
  };

  const validCount = results.filter(r => r.isValid).length;
  const invalidCount = results.length - validCount;

  const displayResults = results.filter(r => {
    const countryMatch = !countryFilter || (r.location && r.location.toLowerCase().includes(countryFilter.toLowerCase()));
    const protocolMatch = selectedProtocols.length === 0 || (r.portType && selectedProtocols.includes(r.portType.toUpperCase()));
    return countryMatch && protocolMatch;
  });

  const getResultsDescription = () => {
    let base = `${validCount} valid / ${invalidCount} invalid`;
    if (countryFilter || selectedProtocols.length > 0) {
      base += ` - Found: ${displayResults.length}`;
    }
    return base;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white"><Shield className="w-5 h-5 text-blue-400" /><span>Proxy Checker</span></CardTitle>
          <CardDescription className="text-gray-400">Enter proxies to validate using IP-API.com.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
             <Textarea
                placeholder="Enter proxies here (format: ip:port)"
                className="min-h-[200px] bg-slate-900/50 border-slate-600 text-white placeholder-gray-500"
                value={proxyInput}
                onChange={(e) => onProxyInputChange(e.target.value)}
                disabled={isChecking}
              />
              <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => onProxyInputChange('')}>
                  <X className="w-4 h-4"/>
              </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="countryFilter" className="text-white">Filter by Country Code</Label>
              <Input
                id="countryFilter"
                type="text"
                placeholder="e.g., US, DE"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protocolFilter" className="text-white">Filter by Protocol</Label>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-slate-900/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white">
                    {selectedProtocols.length > 0 ? selectedProtocols.join(', ') : "Select protocols..."}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700 text-white">
                  {PROTOCOL_TYPES.map(protocol => (
                    <DropdownMenuCheckboxItem
                      key={protocol}
                      checked={selectedProtocols.includes(protocol)}
                      onCheckedChange={(checked) => {
                        setSelectedProtocols(prev =>
                          checked ? [...prev, protocol] : prev.filter(p => p !== protocol)
                        );
                      }}
                    >
                      {protocol}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

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

          {isChecking && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-400"><Clock className="w-4 h-4 animate-spin" /><span>Checking proxies...</span></div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <div className="flex space-x-2">
            {!isChecking ? (
              <Button onClick={() => onCheckProxies(rateLimit)} className="w-full bg-blue-600 hover:bg-blue-700">Check Proxies</Button>
            ) : (
              <Button onClick={onAbort} variant="destructive" className="w-full">Abort</Button>
            )}
             <Button onClick={handleApplyFiltersAndSend} disabled={isChecking || results.length === 0} className="w-full bg-purple-600 hover:bg-purple-700">
              <Send className="w-4 h-4 mr-2" />
              Apply & Send
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                  <CardTitle className="text-white">Validation Results</CardTitle>
                  <CardDescription className="text-gray-400">
                    {results.length > 0 ? getResultsDescription() : 'No results yet.'}
                  </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClearResults} disabled={results.length === 0}>
                  <Trash2 className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-500"><AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No results yet. Enter proxies and click "Check".</p></div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {displayResults.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg border ${result.isValid ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                  {result.isValid ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between font-medium text-white">
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          <span>{result.proxy}</span>
                        </div>
                        <Badge variant="outline" className="text-purple-400 border-purple-400">{result.portType}</Badge>
                      </div>
                      <div className="pl-6 text-gray-300 space-y-1 text-xs">
                         <div className="flex justify-between">
                            <div className="flex items-center space-x-1.5">
                               <UserCheck className="w-3 h-3"/>
                               <span>Anonymity: {result.anonymity}</span>
                            </div>
                             <div className="flex items-center space-x-1.5">
                               <Zap className="w-3 h-3"/>
                               <span>{result.latency}ms</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1.5">
                           <Server className="w-3 h-3"/>
                           <span>API Type: {result.apiType}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Building className="w-3 h-3"/>
                          <span>{result.isp}</span>
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
                      <Badge variant="destructive">{result.portType || 'Error'}</Badge>
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