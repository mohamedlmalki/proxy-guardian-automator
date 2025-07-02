import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, Building, MapPin, Network, Server, Send, ChevronDown, Zap, UserCheck, Trash2, X, ArrowDownUp, Filter, Copy, FileDown, RefreshCw, Pin, PinOff } from "lucide-react";
import { ValidProxy } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";

interface ProxyCheckerProps {
  onProxiesValidated: (proxies: ValidProxy[]) => void;
  proxyInput: string;
  onProxyInputChange: (value: string) => void;
  results: ValidProxy[];
  isChecking: boolean;
  progress: number;
  onCheckProxies: (rateLimit: string, targetUrl: string, checkCount: number, provider: string, apiKey: string, contentCheckString: string) => void;
  onAbort: () => void;
  onClearResults: () => void;
  onRemoveResults: (proxiesToRemove: string[]) => void;
  onRecheckProxies: (proxiesToRecheck: string[], targetUrl: string, checkCount: number, provider: string, apiKey: string) => void;
  onSetPinned: (proxiesToPin: string[], pinStatus: boolean) => void;
}

const API_PROVIDERS = ['Cloudflare', 'ip-api.com', 'ipinfo.io'];
const PROTOCOL_TYPES = ['HTTP', 'HTTPS', 'SOCKS4', 'SOCKS5'];
const ANONYMITY_LEVELS = ['Elite', 'Anonymous', 'Transparent'];

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
  onRemoveResults,
  onRecheckProxies,
  onSetPinned,
}: ProxyCheckerProps) => {
  const { toast } = useToast();

  const [countryFilter, setCountryFilter] = useState('');
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);
  const [anonymityFilter, setAnonymityFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('default');
  const [selectedProxies, setSelectedProxies] = useState<string[]>([]);
  
  const [targetUrl, setTargetUrl] = useState('');
  const [contentCheckString, setContentCheckString] = useState('');
  const [checkCount, setCheckCount] = useState(1); // Changed default value from 3 to 1
  const [rateLimit, setRateLimit] = useState('25');
  const [apiProvider, setApiProvider] = useState('Cloudflare');
  const [apiKey, setApiKey] = useState('');

  const displayResults = useMemo(() => {
    let filtered = [...results];

    filtered = filtered.filter(r => {
      const countryMatch = !countryFilter || (r.location && r.location.toLowerCase().includes(countryFilter.toLowerCase()));
      const protocolMatch = selectedProtocols.length === 0 || (r.portType && selectedProtocols.includes(r.portType.toUpperCase()));
      const anonymityMatch = anonymityFilter.length === 0 || (r.anonymity && anonymityFilter.includes(r.anonymity));
      return countryMatch && protocolMatch && anonymityMatch;
    });

    filtered.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        if (sortBy === 'latency') {
            return (a.latency ?? Infinity) - (b.latency ?? Infinity);
        } else if (sortBy === 'health') {
            return (b.healthScore ?? 0) - (a.healthScore ?? 0);
        }
        return 0;
    });

    return filtered;
  }, [results, countryFilter, selectedProtocols, anonymityFilter, sortBy]);
  
  const handleApplyFiltersAndSend = () => {
    const proxiesToSend = displayResults.filter(proxy => proxy.isValid);
    onProxiesValidated(proxiesToSend);
    toast({
      title: "Filters Applied",
      description: `${proxiesToSend.length} proxies sent to the switcher tab.`,
    });
  };
  
  const handleSendSelected = () => {
    const selectedProxyObjects = results.filter(r => selectedProxies.includes(r.proxy));
    const validSelectedProxies = selectedProxyObjects.filter(p => p.isValid);

    if (validSelectedProxies.length === 0) {
        toast({ title: "No valid proxies selected", description: "Please select at least one valid proxy to send.", variant: "destructive" });
        return;
    }
    onProxiesValidated(validSelectedProxies);
    toast({ title: "Sent to Switcher", description: `${validSelectedProxies.length} selected proxies have been sent.` });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedProxies.join('\n'));
    toast({ title: "Copied!", description: `${selectedProxies.length} proxies copied to clipboard.` });
  };

  const handleExport = () => {
    const selectedData = results.filter(r => selectedProxies.includes(r.proxy));
    const headers = "proxy,isValid,portType,anonymity,latency,healthScore,country,city,isp,apiType";
    const csvContent = [ headers, ...selectedData.map(p => `${p.proxy},${p.isValid},${p.portType},${p.anonymity},${p.latency},${p.healthScore},${p.country},${p.city},${p.isp},${p.apiType}`) ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "proxies.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    toast({ title: "Exported!", description: `Exported ${selectedData.length} proxies.` });
  };

  const handleRemove = () => {
    onRemoveResults(selectedProxies);
    setSelectedProxies([]);
  };

  const handleRecheck = () => {
    onRecheckProxies(selectedProxies, targetUrl, checkCount, apiProvider, apiKey);
    setSelectedProxies([]);
  };
  
  const handlePin = () => {
    onSetPinned(selectedProxies, true);
    toast({ title: "Pinned", description: `${selectedProxies.length} proxies have been pinned.` });
  };

  const handleUnpin = () => {
    onSetPinned(selectedProxies, false);
    toast({ title: "Unpinned", description: `${selectedProxies.length} proxies have been unpinned.` });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedProxies(displayResults.map(r => r.proxy));
    } else {
      setSelectedProxies([]);
    }
  };

  const validCount = results.filter(r => r.isValid).length;
  const invalidCount = results.length - validCount;

  const getResultsDescription = () => {
    let base = `${validCount} valid / ${invalidCount} invalid`;
    if (countryFilter || selectedProtocols.length > 0 || anonymityFilter.length > 0) {
      base += ` - Showing: ${displayResults.length}`;
    }
    if (selectedProxies.length > 0) {
        base += ` - Selected: ${selectedProxies.length}`
    }
    return base;
  };
  
  const proxyCount = proxyInput.split('\n').filter(line => line.trim().length > 0).length;

  const areAnySelectedPinned = useMemo(() => {
    return selectedProxies.some(p => results.find(r => r.proxy === p)?.isPinned);
  }, [selectedProxies, results]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white"><Shield className="w-5 h-5 text-blue-400" /><span>Proxy Checker</span></CardTitle>
          <CardDescription className="text-gray-400">Enter proxies to validate. Optionally provide a target URL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
             <Textarea
                placeholder="Enter proxies here (format: ip:port)"
                className="min-h-[150px] bg-slate-900/50 border-slate-600 text-white placeholder-gray-500"
                value={proxyInput}
                onChange={(e) => onProxyInputChange(e.target.value)}
                disabled={isChecking}
              />
              <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => onProxyInputChange('')}>
                  <X className="w-4 h-4"/>
              </Button>
          </div>
           <div className="flex justify-end text-sm text-gray-400 -mt-2">
            Total Proxies: {proxyCount}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider" className="text-white">API Provider</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-slate-900/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white">
                    {apiProvider} <ChevronDown className="w-4 h-4 opacity-50"/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                  <DropdownMenuRadioGroup value={apiProvider} onValueChange={setApiProvider}>
                    {API_PROVIDERS.map(p => <DropdownMenuRadioItem key={p} value={p}>{p}</DropdownMenuRadioItem>)}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-white">API Key (if required)</Label>
              <Input id="apiKey" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="bg-slate-900/50 border-slate-600 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetUrl" className="text-white">Target URL for Validation</Label>
            <Input
              id="targetUrl"
              type="text"
              placeholder="e.g. your-worker.dev/log"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              disabled={isChecking}
              className="bg-slate-900/50 border-slate-600 text-white"
            />
            {apiProvider === 'Cloudflare' && (
                <p className="text-xs text-sky-400">Enter your Cloudflare Worker URL ending in /log</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contentCheck" className="text-white">Content Check String (Optional)</Label>
            <Input
              id="contentCheck"
              type="text"
              placeholder="e.g., 'Welcome' or a unique footer text"
              value={contentCheckString}
              onChange={(e) => setContentCheckString(e.target.value)}
              disabled={isChecking}
              className="bg-slate-900/50 border-slate-600 text-white"
            />
          </div>

           <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="checkCount" className="text-white">Check Count</Label>
                <Input
                    id="checkCount"
                    type="number"
                    min="1"
                    max="10"
                    value={checkCount}
                    onChange={(e) => setCheckCount(parseInt(e.target.value) || 1)}
                    disabled={isChecking}
                    className="bg-slate-900/50 border-slate-600 text-white"
                />
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
          </div>


          {isChecking && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-400"><Clock className="w-4 h-4 animate-spin" /><span>Checking proxies...</span></div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <div className="flex space-x-2">
            {!isChecking ? (
              <Button onClick={() => onCheckProxies(rateLimit, targetUrl, checkCount, apiProvider, apiKey, contentCheckString)} className="w-full bg-blue-600 hover:bg-blue-700">Check Proxies</Button>
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
                    {getResultsDescription()}
                  </CardDescription>
              </div>
               <div className="flex items-center space-x-1">
                <Checkbox 
                  id="select-all"
                  checked={selectedProxies.length > 0 && selectedProxies.length === displayResults.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
                <Label htmlFor="select-all" className="text-sm text-gray-400">All</Label>
               </div>
            </div>
             <div className="flex items-center space-x-2 pt-4 border-b border-slate-700 pb-4">
                <Input
                    id="countryFilter"
                    type="text"
                    placeholder="Filter by Country Code..."
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="bg-slate-900/50 border-slate-600 text-white"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="flex-shrink-0 bg-slate-900/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white"><Filter className="w-4 h-4 mr-2" /><span>Protocols</span></Button></DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                    {PROTOCOL_TYPES.map(protocol => (
                        <DropdownMenuCheckboxItem key={protocol} checked={selectedProtocols.includes(protocol)} onCheckedChange={checked => setSelectedProtocols(p => checked ? [...p, protocol] : p.filter(i => i !== protocol))}>{protocol}</DropdownMenuCheckboxItem>
                    ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="flex-shrink-0 bg-slate-900/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white"><UserCheck className="w-4 h-4 mr-2" /><span>Anonymity</span></Button></DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                    {ANONYMITY_LEVELS.map(level => (
                        <DropdownMenuCheckboxItem key={level} checked={anonymityFilter.includes(level)} onCheckedChange={checked => setAnonymityFilter(p => checked ? [...p, level] : p.filter(i => i !== level))}>{level}</DropdownMenuCheckboxItem>
                    ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="flex-shrink-0 bg-slate-900/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white"><ArrowDownUp className="w-4 h-4 mr-2" /><span>Sort By</span></Button></DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                    <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                        <DropdownMenuRadioItem value="default">Default</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="health">Health Score</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="latency">Fastest</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
             {selectedProxies.length > 0 && (
                <div className="flex items-center space-x-2 pt-4 flex-wrap gap-y-2">
                    {areAnySelectedPinned ? 
                        <Button size="sm" variant="outline" className="border-orange-500 text-orange-400" onClick={handleUnpin}><PinOff className="w-4 h-4 mr-2"/>Unpin</Button>
                        :
                        <Button size="sm" variant="outline" className="border-orange-500 text-orange-400" onClick={handlePin}><Pin className="w-4 h-4 mr-2"/>Pin</Button>
                    }
                    <Button size="sm" variant="outline" className="border-sky-500 text-sky-400" onClick={handleCopy}><Copy className="w-4 h-4 mr-2"/>Copy</Button>
                    <Button size="sm" variant="outline" className="border-green-500 text-green-400" onClick={handleExport}><FileDown className="w-4 h-4 mr-2"/>Export</Button>
                    <Button size="sm" variant="outline" className="border-yellow-500 text-yellow-400" onClick={handleRecheck}><RefreshCw className="w-4 h-4 mr-2"/>Re-check</Button>
                    <Button size="sm" variant="destructive" onClick={handleRemove}><Trash2 className="w-4 h-4 mr-2"/>Remove</Button>
                    <Button size="sm" variant="outline" className="border-purple-500 text-purple-400" onClick={handleSendSelected}><Send className="w-4 h-4 mr-2"/>Send Selected</Button>
                </div>
             )}
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-500"><AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No results yet. Enter proxies and click "Check".</p></div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {displayResults.map((result, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Checkbox 
                    id={`select-${result.proxy}`} 
                    checked={selectedProxies.includes(result.proxy)}
                    onCheckedChange={(checked) => {
                      setSelectedProxies(prev => 
                        checked ? [...prev, result.proxy] : prev.filter(p => p !== result.proxy)
                      )
                    }}
                  />
                  <div className={`flex-1 p-3 rounded-lg border ${result.isPinned ? 'border-orange-400' : result.isValid ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                    {result.isValid ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between font-medium text-white">
                          <div className="flex items-center">
                            {result.isPinned ? <Pin className="w-4 h-4 text-orange-400 mr-2" /> : <CheckCircle className="w-4 h-4 text-green-500 mr-2" />}
                            <span>{result.proxy}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-green-400 border-green-400">{result.healthScore?.toFixed(0)}% Health</Badge>
                            <Badge variant="outline" className="text-purple-400 border-purple-400">{result.portType}</Badge>
                          </div>
                        </div>
                        <div className="pl-6 text-gray-300 space-y-1 text-xs">
                          <div className="flex justify-between">
                              <div className="flex items-center space-x-1.5"><UserCheck className="w-3 h-3"/><span>Anonymity: {result.anonymity}</span></div>
                              <div className="flex items-center space-x-1.5"><Zap className="w-3 h-3"/><span>{result.latency}ms</span></div>
                          </div>
                          <div className="flex items-center space-x-1.5"><Server className="w-3 h-3"/><span>API Type: {result.apiType}</span></div>
                          <div className="flex items-center space-x-1.5"><Building className="w-3 h-3"/><span>{result.isp}</span></div>
                          <div className="flex items-center space-x-1.5"><MapPin className="w-3 h-3"/><span>{result.city}, {result.country} ({result.location})</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        {result.isPinned ? <Pin className="w-4 h-4 text-orange-400 mr-2" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-gray-400 font-mono text-sm">{result.proxy}</span>
                        <Badge variant="destructive">{result.portType || 'Error'}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};