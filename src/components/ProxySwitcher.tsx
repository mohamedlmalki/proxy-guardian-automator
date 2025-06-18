import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Play, Pause, RotateCcw, Timer, Wifi, WifiOff, Zap, CheckCircle, XCircle, ListChecks, Power, ArrowUp, ShieldX, Repeat, Clock, ArrowDownUp, HeartPulse, MapPin, ThumbsUp, ThumbsDown } from "lucide-react";
import { ValidProxy, TestResult, ConnectionLogEntry } from "@/pages/Index";

type SwitchMode = 'time' | 'requests';
export type RotationStrategy = 'sequential' | 'random' | 'health-based' | 'latency-based' | 'aggressive';

export interface SessionStat {
  success: number;
  fail: number;
}

interface ProxySwitcherProps {
  validProxies: ValidProxy[];
  onTestConnection: (proxy: string) => void;
  testResult: TestResult | null;
  connectionLog: ConnectionLogEntry[];
  sessionStats: Record<string, SessionStat>;
  switcherStatus: 'stopped' | 'running' | 'paused';
  switchInterval: number;
  setSwitchInterval: (interval: number) => void;
  remainingTime: number;
  switchCount: number;
  successfulRequests: number;
  switchRequestCount: number;
  setSwitchRequestCount: (count: number) => void;
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
  currentProxyIndex: number;
  downedProxies: Set<string>;
}

export const ProxySwitcher = (props: ProxySwitcherProps) => {
  const {
    validProxies,
    onTestConnection,
    connectionLog,
    sessionStats,
    switcherStatus,
    switchInterval,
    setSwitchInterval,
    remainingTime,
    switchCount,
    successfulRequests,
    switchRequestCount,
    setSwitchRequestCount,
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
    currentProxyIndex,
    downedProxies,
  } = props;

  const activeProxies = validProxies.filter(p => p.isValid && !downedProxies.has(p.proxy));
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
                    <RadioGroup value={switchMode} onValueChange={(value: SwitchMode) => setSwitchMode(value)} className="flex space-x-4 pt-2" disabled={isRunningOrPaused}>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="time" id="time" /><Label htmlFor="time" className="text-white">Time</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="requests" id="requests" /><Label htmlFor="requests" className="text-white">Requests</Label></div>
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
                 <Button onClick={onStop} variant="destructive" size="icon" title="Stop and Reset"><Power className="w-4 h-4" /></Button>
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
                <CardTitle className="flex items-center space-x-2 text-white"><ListChecks className="w-5 h-5 text-yellow-400" /><span>Connection Log</span></CardTitle>
                <CardDescription className="text-gray-400">Status of recent connections.</CardDescription>
            </CardHeader>
            <CardContent>
                {connectionLog.length === 0 ? (
                    <div className="text-center py-6 text-gray-500"><p>No connection history yet.</p></div>
                ) : (
                    <div className="space-y-2 max-h-[240px] overflow-y-auto">
                        {connectionLog.map((log, index) => (
                            <div key={index} className={`p-2 rounded-lg text-xs border ${log.success ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        {log.success ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                        <span className="font-mono text-white">{log.proxy}</span>
                                    </div>
                                    <span className="text-gray-400">{log.timestamp}</span>
                                </div>
                                {log.success ? (
                                    <div className="pl-6 pt-1 text-gray-300">
                                        {log.latency}ms - {log.location} - {log.anonymity}
                                    </div>
                                ) : <div className="pl-6 pt-1 text-gray-400">{log.message}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Available Proxies</CardTitle>
            <CardDescription className="text-gray-400">{activeProxies.length} active / {downedProxies.size} temporarily down</CardDescription>
          </CardHeader>
          <CardContent>
            {validProxies.filter(p => p.isValid).length === 0 ? (
              <div className="text-center py-6 text-gray-500"><Timer className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No valid proxies available</p></div>
            ) : (
              <TooltipProvider>
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {validProxies.filter(p => p.isValid).map((proxy, index) => {
                    const isDown = downedProxies.has(proxy.proxy);
                    const isActive = currentProxy?.proxy === proxy.proxy && isRunningOrPaused;
                    const stats = sessionStats[proxy.proxy] ?? { success: 0, fail: 0 };
                    return (
                        <div key={proxy.proxy} className={`p-3 rounded-lg border transition-all duration-200 ${isDown ? 'opacity-50 bg-red-900/10 border-red-500/20' : ''} ${isActive ? 'bg-purple-900/30 border-purple-500/50' : 'bg-slate-900/30 border-slate-600/50'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                {isDown ? <ShieldX className="h-4 w-4 text-red-500" /> : (
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
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-6 w-6 text-gray-400 hover:text-white" 
                                        onClick={() => onSendToTop(proxy.proxy)}
                                        disabled={index === 0 || isDown}
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
                            {!isDown && (
                                <div className="mt-2 flex items-center space-x-3 text-xs text-gray-400">
                                    <div className="flex items-center space-x-1" title="Initial Health Score"><HeartPulse className="w-3 h-3 text-green-400"/><span>{proxy.healthScore?.toFixed(0) ?? 'N/A'}%</span></div>
                                    <div className="flex items-center space-x-1" title="Initial Latency"><Zap className="w-3 h-3 text-yellow-400"/><span>{proxy.latency ?? 'N/A'}ms</span></div>
                                    <div className="flex items-center space-x-1" title="Location"><MapPin className="w-3 h-3 text-blue-400"/><span>{proxy.location ?? '??'}</span></div>
                                    { (stats.success > 0 || stats.fail > 0) &&
                                        <div className="flex items-center space-x-2 ml-auto">
                                            <div className="flex items-center space-x-1 text-green-500" title="Session Successes"><ThumbsUp className="w-3 h-3"/><span>{stats.success}</span></div>
                                            <div className="flex items-center space-x-1 text-red-500" title="Session Fails"><ThumbsDown className="w-3 h-3"/><span>{stats.fail}</span></div>
                                        </div>
                                    }
                                </div>
                            )}
                        </div>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};