import { useState, useMemo } from "react"; // <-- Import useMemo
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // <-- Import Tabs components
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CooldownTimer } from "@/components/CooldownTimer";
import { AlertTriangle, Play, Pause, RotateCcw, Timer, Wifi, WifiOff, Zap, CheckCircle, XCircle, ListChecks, Power, ArrowUp, ShieldX, Repeat, Clock, ArrowDownUp, HeartPulse, MapPin, ThumbsUp, ThumbsDown, Filter, RefreshCw, Loader, Ban, PauseCircle, Undo2, Trash2 } from "lucide-react";
import { ValidProxy, TestResult, ConnectionLogEntry } from "@/pages/Index";
import { toast } from "sonner";

type SwitchMode = 'time' | 'requests';
type FilterMode = 'whitelist' | 'blacklist';
type LogFilter = 'all' | 'success' | 'fail'; // <-- New type for log filter

export type RotationStrategy = 'sequential' | 'random' | 'health-based' | 'latency-based' | 'aggressive' | 'prioritize-pinned' | 'adaptive';

export interface SessionStat {
  success: number;
  fail: number;
}

interface ProxySwitcherProps {
  validProxies: ValidProxy[];
  onTestConnection: (proxy: string) => void;
  onReTestProxy: (proxy: string) => Promise<void>;
  onTempRemove: (proxy: string) => void;
  onReenableProxy: (proxy: string) => void;
  testResult: TestResult | null;
  connectionLog: ConnectionLogEntry[];
  onClearLog: () => void;
  sessionStats: Record<string, SessionStat>;
  switcherStatus: 'stopped' | 'running' | 'paused';
  switchInterval: number;
  setSwitchInterval: (interval: number) => void;
  remainingTime: number;
  switchCount: number;
  successfulRequests: number;
  switchRequestCount: number;
  setSwitchRequestCount: (count: number) => void;
  loopCount: number;
  setLoopCount: (count: number) => void;
  cooldownMinutes: number;
  setCooldownMinutes: (minutes: number) => void;
  retestOnStart: boolean;
  setRetestOnStart: (retest: boolean) => void;
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  countryFilterList: string;
  setCountryFilterList: (list: string) => void;
  ispFilterList: string;
  setIspFilterList: (list: string) => void;
  switchMode: SwitchMode;
  setSwitchMode: (mode: SwitchMode) => void;
  rotationStrategy: RotationStrategy;
  setRotationStrategy: (strategy: RotationStrategy) => void;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onManualSwitch: () => void;
  onSendToTop: (proxy: string) => void;
  onResetDowned: () => void;
  currentProxyIndex: number;
  downedProxies: Map<string, number>;
  manualRemovals: Set<string>;
}

export const ProxySwitcher = (props: ProxySwitcherProps) => {
  const {
    validProxies,
    onTestConnection,
    onReTestProxy,
    onTempRemove,
    onReenableProxy,
    connectionLog,
    onClearLog,
    sessionStats,
    switcherStatus,
    switchInterval,
    setSwitchInterval,
    remainingTime,
    switchCount,
    successfulRequests,
    switchRequestCount,
    setSwitchRequestCount,
    loopCount,
    setLoopCount,
    cooldownMinutes,
    setCooldownMinutes,
    retestOnStart,
    setRetestOnStart,
    filterMode,
    setFilterMode,
    countryFilterList,
    setCountryFilterList,
    ispFilterList,
    setIspFilterList,
    switchMode,
    setSwitchMode,
    rotationStrategy,
    setRotationStrategy,
    onStart,
    onStop,
    onPause,
    onResume,
    onManualSwitch,
    onSendToTop,
    onResetDowned,
    currentProxyIndex,
    downedProxies,
    manualRemovals
  } = props;

  const [testingProxy, setTestingProxy] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ConnectionLogEntry | null>(null);
  const [logFilter, setLogFilter] = useState<LogFilter>('all'); // <-- State for the active filter

  // Filter logs based on the current filter state
  const filteredLogs = useMemo(() => {
    if (logFilter === 'success') {
      return connectionLog.filter(log => log.status === 'success');
    }
    if (logFilter === 'fail') {
      return connectionLog.filter(log => log.status === 'fail');
    }
    return connectionLog; // 'all'
  }, [connectionLog, logFilter]);


  const allValidProxies = validProxies.filter(p => p.isValid);

  const handleReTestClick = async (proxy: string) => {
    setTestingProxy(proxy);
    await onReTestProxy(proxy);
    setTestingProxy(null);
  }

  const activeProxies = validProxies.filter(p => {
    if (!p.isValid) return false;
    if (manualRemovals.has(p.proxy)) return false;
    const failureTimestamp = downedProxies.get(p.proxy);
    if (!failureTimestamp) return true;
    return (Date.now() - failureTimestamp) >= (cooldownMinutes * 60 * 1000);
  });

  const timeProgress = remainingTime > 0 && switchInterval > 0 ? ((switchInterval - remainingTime) / switchInterval) * 100 : 0;
  const requestProgress = successfulRequests > 0 && switchRequestCount > 0 ? (successfulRequests / switchRequestCount) * 100 : 0;

  const currentProxy = validProxies[currentProxyIndex];
  const isRunningOrPaused = switcherStatus === 'running' || switcherStatus === 'paused';

  const getHealthIndicatorClass = (healthScore?: number) => {
    if (healthScore === undefined) return 'bg-gray-500';
    if (healthScore >= 80) return 'bg-green-500';
    if (healthScore >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const strategyLabels: Record<RotationStrategy, string> = {
    sequential: 'Sequential',
    random: 'Random',
    'health-based': 'Health-Based',
    'latency-based': 'Latency-Based',
    aggressive: 'Aggressive (Switch on Fail)',
    'prioritize-pinned': 'Prioritize Pinned',
    adaptive: 'Adaptive (Smart)',
  };
  
  const handleSwitchModeChange = (value: SwitchMode) => {
    if (value === 'time') {
      toast.warning("Time mode is currently under development.", {
        duration: 5000,
      });
    } else {
      setSwitchMode(value);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white"><RotateCcw className="w-5 h-5 text-purple-400" /><span>Proxy Switcher</span></CardTitle>
            <CardDescription className="text-gray-400">Automatically rotate through valid proxies with a kill switch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-white">Switch Mode</Label>
                    <RadioGroup value={switchMode} onValueChange={handleSwitchModeChange} className="flex space-x-4 pt-2" disabled={isRunningOrPaused}>
                        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleSwitchModeChange('time')}>
                            <RadioGroupItem value="time" id="time" />
                            <Label htmlFor="time" className="text-white cursor-pointer">Time</Label>
                        </div>
                        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleSwitchModeChange('requests')}>
                            <RadioGroupItem value="requests" id="requests" />
                            <Label htmlFor="requests" className="text-white cursor-pointer">Requests</Label>
                        </div>
                    </RadioGroup>
                </div>
                 <div className="space-y-2">
                    <Label className="text-white">Rotation Strategy</Label>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={isRunningOrPaused}>
                          <Button variant="outline" className="w-full justify-between bg-slate-900/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white">
                            {strategyLabels[rotationStrategy]} <ArrowDownUp className="w-4 h-4 opacity-50"/>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white w-[--radix-dropdown-menu-trigger-width]">
                          <DropdownMenuRadioGroup value={rotationStrategy} onValueChange={(value) => setRotationStrategy(value as RotationStrategy)}>
                            <DropdownMenuRadioItem value="sequential">Sequential</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="random">Random</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="health-based">Health-Based</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="latency-based">Latency-Based</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="aggressive">Aggressive (Switch on Fail)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="prioritize-pinned">Prioritize Pinned</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="adaptive">Adaptive (Smart)</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                </div>
            </div>

            {switchMode === 'time' ? (
              <div className="space-y-2">
                <Label htmlFor="timer" className="text-white flex items-center"><Clock className="w-4 h-4 mr-2"/>Switch Interval (seconds)</Label>
                <Input id="timer" type="number" min="5" max="300" value={switchInterval} onChange={(e) => setSwitchInterval(parseInt(e.target.value) || 30)} disabled={isRunningOrPaused} className="bg-slate-900/50 border-slate-600 text-white" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="request-count" className="text-white flex items-center"><Repeat className="w-4 h-4 mr-2"/>Switch After (successful requests)</Label>
                <Input id="request-count" type="number" min="1" max="100" value={switchRequestCount} onChange={(e) => setSwitchRequestCount(parseInt(e.target.value) || 10)} disabled={isRunningOrPaused || rotationStrategy === 'aggressive'} className="bg-slate-900/50 border-slate-600 text-white" />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="loop-count" className="text-white flex items-center"><Repeat className="w-4 h-4 mr-2"/>Number of loops (0 for infinite)</Label>
                    <Input id="loop-count" type="number" min="0" value={loopCount} onChange={(e) => setLoopCount(parseInt(e.target.value, 10) || 0)} disabled={isRunningOrPaused} className="bg-slate-900/50 border-slate-600 text-white" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="cooldown-minutes" className="text-white flex items-center"><Timer className="w-4 h-4 mr-2"/>Cooldown (minutes)</Label>
                    <Input id="cooldown-minutes" type="number" min="0" value={cooldownMinutes} onChange={(e) => setCooldownMinutes(parseInt(e.target.value, 10) || 0)} disabled={isRunningOrPaused} className="bg-slate-900/50 border-slate-600 text-white" />
                </div>
            </div>

            <Separator className="my-4 bg-slate-700"/>

            <div className="space-y-3">
                <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-cyan-400"/>
                    <Label className="text-white text-base">Proxy Filtering</Label>
                </div>
                <RadioGroup value={filterMode} onValueChange={(value: FilterMode) => setFilterMode(value)} className="flex space-x-4" disabled={isRunningOrPaused}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="whitelist" id="whitelist" /><Label htmlFor="whitelist" className="text-white">Whitelist (Only Use)</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="blacklist" id="blacklist" /><Label htmlFor="blacklist" className="text-white">Blacklist (Avoid)</Label></div>
                </RadioGroup>
                 <div className="space-y-2">
                    <Label htmlFor="country-list" className="text-gray-400 text-xs">Countries (e.g. US, GB, DE)</Label>
                    <Input id="country-list" placeholder="Comma-separated country codes" value={countryFilterList} onChange={(e) => setCountryFilterList(e.target.value)} disabled={isRunningOrPaused} className="bg-slate-900/50 border-slate-600 text-white" />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="isp-list" className="text-gray-400 text-xs">ISPs (e.g. Comcast, Google)</Label>
                    <Input id="isp-list" placeholder="Comma-separated ISP names" value={ispFilterList} onChange={(e) => setIspFilterList(e.target.value)} disabled={isRunningOrPaused} className="bg-slate-900/50 border-slate-600 text-white" />
                 </div>
            </div>

            <Separator className="my-4 bg-slate-700"/>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Switch id="retest-switch" checked={retestOnStart} onCheckedChange={setRetestOnStart} disabled={isRunningOrPaused} />
                <Label htmlFor="retest-switch" className="text-white text-xs">Re-test all before starting</Label>
              </div>
            </div>

            <div className="flex space-x-2">
              {switcherStatus === 'stopped' && (
                <Button onClick={onStart} disabled={validProxies.filter(p => p.isValid).length === 0} className="flex-1 bg-green-600 hover:bg-green-700"><Play className="w-4 h-4 mr-2" />Start</Button>
              )}
              {switcherStatus === 'running' && (
                <Button onClick={onPause} className="flex-1 bg-yellow-600 hover:bg-yellow-700"><Pause className="w-4 h-4 mr-2" />Pause</Button>
              )}
              {switcherStatus === 'paused' && (
                <Button onClick={onResume} className="flex-1 bg-green-600 hover:bg-green-700"><Play className="w-4 h-4 mr-2" />Resume</Button>
              )}
               <Button onClick={onManualSwitch} disabled={switcherStatus !== 'running'} variant="outline" className="border-slate-600 text-white hover:bg-slate-700"><RotateCcw className="w-4 h-4" /></Button>
              {isRunningOrPaused && (
                <>
                 <Button onClick={onStop} variant="destructive" size="icon" title="Stop and Reset"><Power className="w-4 h-4" /></Button>
                 <Button onClick={onResetDowned} variant="outline" size="icon" title="Reset Downed Proxies" disabled={downedProxies.size === 0 && manualRemovals.size === 0}><ShieldX className="w-4 h-4" /></Button>
                </>
              )}
            </div>

            {isRunningOrPaused && (
              <div className="space-y-2">
                {switchMode === 'time' ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Next switch in:</span>
                      <span className="text-white font-mono">{remainingTime}s</span>
                    </div>
                    <Progress value={timeProgress} className="w-full" />
                  </>
                ) : (
                  <>
                     <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Requests on current proxy:</span>
                      <span className="text-white font-mono">{ rotationStrategy === 'aggressive' ? 'N/A' : `${successfulRequests} / ${switchRequestCount}` }</span>
                    </div>
                    <Progress value={rotationStrategy === 'aggressive' ? 0 : requestProgress} className="w-full" />
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">{isRunningOrPaused && currentProxy ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-gray-400" />}<span>Current Proxy</span></CardTitle>
          </CardHeader>
          <CardContent>
            {currentProxy && isRunningOrPaused ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <div className="font-mono text-green-400 text-sm mb-2">{currentProxy.proxy}</div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-purple-600 text-white">{currentProxy.portType}</Badge>
                    <span className="text-xs text-gray-400">{currentProxy.latency}ms</span>
                    <span className="text-xs text-blue-400">{currentProxy.location}</span>
                  </div>
                </div>
                <Button onClick={() => onTestConnection(currentProxy.proxy)} className="w-full bg-sky-600 hover:bg-sky-700"><Zap className="w-4 h-4 mr-2" />Manual Test</Button>
                <div className="text-sm text-gray-400 mt-2">Total Switches: {switchCount}</div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500"><WifiOff className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No active proxy</p><p className="text-xs mt-1">Start the switcher to activate</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center space-x-2 text-white"><ListChecks className="w-5 h-5 text-yellow-400" /><span>Connection Log</span></CardTitle>
                        <CardDescription className="text-gray-400">Status of recent connections. Click an entry for details.</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearLog}
                        disabled={connectionLog.length === 0}
                        className="bg-slate-900/50 border-slate-600 text-white hover:bg-slate-700"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                 {/* START: TABS ADDED HERE */}
                <Tabs value={logFilter} onValueChange={(value) => setLogFilter(value as LogFilter)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-9">
                        <TabsTrigger value="all">All ({connectionLog.length})</TabsTrigger>
                        <TabsTrigger value="success" className="data-[state=active]:bg-green-600/80">Success ({connectionLog.filter(l => l.status === 'success').length})</TabsTrigger>
                        <TabsTrigger value="fail" className="data-[state=active]:bg-red-600/80">Fail ({connectionLog.filter(l => l.status === 'fail').length})</TabsTrigger>
                    </TabsList>
                </Tabs>
                 {/* END: TABS ADDED HERE */}

                {filteredLogs.length === 0 ? (
                    <div className="text-center py-6 text-gray-500"><p>No connection history for this filter.</p></div>
                ) : (
                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2">
                        {filteredLogs.map((log) => {
                          let statusClass = '';
                          let StatusIcon = <Loader className="w-4 h-4 animate-spin text-blue-400" />;

                          if (log.status === 'success') {
                            statusClass = 'bg-green-900/20 border-green-500/30';
                            StatusIcon = <CheckCircle className="w-4 h-4 text-green-500" />;
                          } else if (log.status === 'fail') {
                            statusClass = 'bg-red-900/20 border-red-500/30';
                            StatusIcon = <XCircle className="w-4 h-4 text-red-500" />;
                          } else if (log.status === 'pending') {
                            statusClass = 'bg-blue-900/20 border-blue-500/30';
                          }

                          return (
                            <div key={log.id} onClick={() => setSelectedLog(log)} className={`p-2 rounded-lg text-xs border cursor-pointer hover:border-slate-400 ${statusClass}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        {StatusIcon}
                                        <span className="font-mono text-white">{log.proxy}</span>
                                    </div>
                                    <span className="text-gray-400">{log.timestamp}</span>
                                </div>
                                <div className="pl-6 pt-1 text-gray-300 truncate">
                                  {log.message}
                                </div>
                            </div>
                          );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-white">Available Proxies</CardTitle>
                    <CardDescription className="text-gray-400">{activeProxies.length} active / {downedProxies.size} on cooldown / {manualRemovals.size} removed</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {allValidProxies.length === 0 ? (
              <div className="text-center py-6 text-gray-500"><Timer className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No valid proxies available</p></div>
            ) : (
              <TooltipProvider>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {allValidProxies.map((proxy) => {
                      const isDown = downedProxies.has(proxy.proxy);
                      const isManuallyRemoved = manualRemovals.has(proxy.proxy);
                      const isActive = currentProxy?.proxy === proxy.proxy && isRunningOrPaused;
                      const stats = sessionStats[proxy.proxy] ?? { success: 0, fail: 0 };
                      const failureTimestamp = downedProxies.get(proxy.proxy);

                      let itemClass;
                      if (isActive) {
                          itemClass = 'bg-purple-900/30 border-purple-500/50';
                      } else if (isManuallyRemoved) {
                          itemClass = 'opacity-60 bg-yellow-900/10 border-yellow-500/20';
                      } else if (isDown) {
                          itemClass = 'opacity-50 bg-red-900/10 border-red-500/20';
                      } else {
                          itemClass = 'bg-slate-900/30 border-slate-600/50';
                      }
                      
                      return (
                          <div key={proxy.proxy} className={`p-3 rounded-lg border transition-all duration-200 ${itemClass}`}>
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                  {isDown ? <ShieldX className="h-4 w-4 text-red-500" /> : 
                                   isManuallyRemoved ? <PauseCircle className="h-4 w-4 text-yellow-400" /> :
                                   (
                                      <Tooltip>
                                          <TooltipTrigger>
                                          <span className={`h-2.5 w-2.5 rounded-full ${getHealthIndicatorClass(proxy.healthScore)}`}></span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                          <p>Health: {proxy.healthScore?.toFixed(0) ?? 'N/A'}%</p>
                                          </TooltipContent>
                                      </Tooltip>
                                  )}
                                  <span className="text-white font-mono text-xs">{proxy.proxy}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                  {isManuallyRemoved ? (
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                          <Button 
                                              size="icon" 
                                              variant="ghost" 
                                              className="h-6 w-6 text-yellow-400 hover:text-white" 
                                              onClick={() => onReenableProxy(proxy.proxy)}
                                          >
                                              <Undo2 className="h-4 w-4" />
                                          </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                          <p>Re-enable Proxy</p>
                                          </TooltipContent>
                                      </Tooltip>
                                  ) : (
                                      <>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                              <Button 
                                                  size="icon" 
                                                  variant="ghost" 
                                                  className="h-6 w-6 text-gray-400 hover:text-white" 
                                                  onClick={() => handleReTestClick(proxy.proxy)}
                                                  disabled={testingProxy === proxy.proxy || isDown}
                                              >
                                                  {testingProxy === proxy.proxy ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                              </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                              <p>Re-test Proxy</p>
                                              </TooltipContent>
                                          </Tooltip>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Button 
                                                      size="icon" 
                                                      variant="ghost" 
                                                      className="h-6 w-6 text-gray-400 hover:text-red-500" 
                                                      onClick={() => onTempRemove(proxy.proxy)}
                                                      disabled={isDown}
                                                  >
                                                      <Ban className="h-4 w-4" />
                                                  </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                  <p>Temporarily Remove</p>
                                              </TooltipContent>
                                          </Tooltip>
                                      </>
                                  )}
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                      <Button 
                                          size="icon" 
                                          variant="ghost" 
                                          className="h-6 w-6 text-gray-400 hover:text-white" 
                                          onClick={() => onSendToTop(proxy.proxy)}
                                          disabled={allValidProxies.indexOf(proxy) === 0 || isDown || isManuallyRemoved}
                                      >
                                          <ArrowUp className="h-4 w-4" />
                                      </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                      <p>Send to Top</p>
                                      </TooltipContent>
                                  </Tooltip>
                                  <Badge variant="outline" className="text-xs">{proxy.portType}</Badge>
                                  </div>
                              </div>
                              <div className="mt-2 flex items-center space-x-3 text-xs text-gray-400">
                                  {isDown && failureTimestamp && !isManuallyRemoved ? (
                                      <div className="flex items-center space-x-1.5 w-full">
                                          <Timer className="w-3 h-3 text-red-400" />
                                          <CooldownTimer cooldownEndTime={failureTimestamp + cooldownMinutes * 60 * 1000} />
                                      </div>
                                  ) : !(isDown || isManuallyRemoved) ? (
                                      <>
                                          <div className="flex items-center space-x-1" title="Initial Health Score"><HeartPulse className="w-3 h-3 text-green-400"/><span>{proxy.healthScore?.toFixed(0) ?? 'N/A'}%</span></div>
                                          <div className="flex items-center space-x-1" title="Initial Latency"><Zap className="w-3 h-3 text-yellow-400"/><span>{proxy.latency ?? 'N/A'}ms</span></div>
                                          <div className="flex items-center space-x-1" title="Location"><MapPin className="w-3 h-3 text-blue-400"/><span>{proxy.location ?? '??'}</span></div>
                                          { (stats.success > 0 || stats.fail > 0) &&
                                              <div className="flex items-center space-x-2 ml-auto">
                                                  <div className="flex items-center space-x-1 text-green-500" title="Session Successes"><ThumbsUp className="w-3 h-3"/><span>{stats.success}</span></div>
                                                  <div className="flex items-center space-x-1 text-red-500" title="Session Fails"><ThumbsDown className="w-3 h-3"/><span>{stats.fail}</span></div>
                                              </div>
                                          }
                                      </>
                                  ) : null}
                              </div>
                          </div>
                      );
                    })}
                  </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
        
        <Dialog open={selectedLog !== null} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}>
            <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-2xl">
                <DialogHeader>
                <DialogTitle>Log Entry Details</DialogTitle>
                <DialogDescription>
                    Detailed information for the connection attempt at {selectedLog?.timestamp}.
                </DialogDescription>
                </DialogHeader>
                {selectedLog && (
                    <div className="text-sm space-y-2">
                        <p><strong className="text-slate-400">Proxy:</strong> <span className="font-mono">{selectedLog.proxy}</span></p>
                        <p><strong className="text-slate-400">Status:</strong> {selectedLog.success ? <span className="text-green-400">Success</span> : <span className="text-red-400">Failure</span>}</p>
                        {selectedLog.success ? (
                            <>
                             <p><strong className="text-slate-400">Latency:</strong> {selectedLog.latency}ms</p>
                             <p><strong className="text-slate-400">IP Address:</strong> {selectedLog.ip}</p>
                             <p><strong className="text-slate-400">Location:</strong> {selectedLog.location}</p>
                             <p><strong className="text-slate-400">Anonymity:</strong> {selectedLog.anonymity}</p>
                            </>
                        ) : (
                            selectedLog.statusCode && <p><strong className="text-slate-400">Status Code:</strong> <span className="font-mono text-red-400">{selectedLog.statusCode}</span></p>
                        )}
                        <p><strong className="text-slate-400">Details:</strong></p>
                        <pre className="p-2 bg-slate-900 rounded-md text-slate-300 text-xs whitespace-pre-wrap">{selectedLog.message}</pre>
                        {selectedLog.sourceContent && (
                            <div className="space-y-1 pt-2">
                                <Label className="text-slate-400">Response Source:</Label>
                                <div className="p-2 bg-slate-900 rounded-md max-h-60 overflow-auto">
                                    <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono">
                                        {selectedLog.sourceContent}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};