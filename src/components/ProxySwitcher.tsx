import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, Timer, Wifi, WifiOff, Zap, CheckCircle, XCircle, ListChecks } from "lucide-react";
import { ValidProxy, TestResult, ConnectionLogEntry } from "@/pages/Index";

interface ProxySwitcherProps {
  validProxies: ValidProxy[];
  onTestConnection: () => void;
  testResult: TestResult | null;
  connectionLog: ConnectionLogEntry[];
  isRunning: boolean;
  switchInterval: number;
  setSwitchInterval: (interval: number) => void;
  remainingTime: number;
  switchCount: number;
  onStart: () => void;
  onStop: () => void;
  onManualSwitch: () => void;
  currentProxyIndex: number;
}

export const ProxySwitcher = ({
  validProxies,
  onTestConnection,
  testResult,
  connectionLog,
  isRunning,
  switchInterval,
  setSwitchInterval,
  remainingTime,
  switchCount,
  onStart,
  onStop,
  onManualSwitch,
  currentProxyIndex,
}: ProxySwitcherProps) => {
  const validOnlyProxies = validProxies.filter(p => p.isValid);
  const progress = remainingTime > 0 && switchInterval > 0 ? ((switchInterval - remainingTime) / switchInterval) * 100 : 0;
  const currentProxy = validOnlyProxies[currentProxyIndex];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white"><RotateCcw className="w-5 h-5 text-purple-400" /><span>Proxy Switcher</span></CardTitle>
            <CardDescription className="text-gray-400">Automatically rotate through valid proxies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timer" className="text-white">Switch Interval (seconds)</Label>
              <Input id="timer" type="number" min="5" max="300" value={switchInterval} onChange={(e) => setSwitchInterval(parseInt(e.target.value) || 30)} disabled={isRunning} className="bg-slate-900/50 border-slate-600 text-white" />
            </div>
            <div className="flex space-x-2">
              {!isRunning ? (
                <Button onClick={onStart} disabled={validOnlyProxies.length === 0} className="flex-1 bg-green-600 hover:bg-green-700"><Play className="w-4 h-4 mr-2" />Start</Button>
              ) : (
                <Button onClick={onStop} className="flex-1 bg-red-600 hover:bg-red-700"><Pause className="w-4 h-4 mr-2" />Stop</Button>
              )}
              <Button onClick={onManualSwitch} disabled={validOnlyProxies.length === 0 || !isRunning} variant="outline" className="border-slate-600 text-white hover:bg-slate-700"><RotateCcw className="w-4 h-4" /></Button>
            </div>
            {isRunning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm"><span className="text-gray-400">Next switch in:</span><span className="text-white font-mono">{remainingTime}s</span></div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">{isRunning ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-gray-400" />}<span>Current Proxy</span></CardTitle>
          </CardHeader>
          <CardContent>
            {currentProxy && isRunning ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <div className="font-mono text-green-400 text-sm mb-2">{currentProxy.proxy}</div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-purple-600 text-white">{currentProxy.portType}</Badge>
                    <span className="text-xs text-gray-400">{currentProxy.latency}ms</span>
                    <span className="text-xs text-blue-400">{currentProxy.location}</span>
                  </div>
                </div>
                <Button onClick={onTestConnection} className="w-full bg-sky-600 hover:bg-sky-700"><Zap className="w-4 h-4 mr-2" />Manual Test</Button>
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
                                {log.success && (
                                    <div className="pl-6 pt-1 text-gray-300">
                                        {log.latency}ms - {log.location} - {log.anonymity}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Available Proxies</CardTitle>
            <CardDescription className="text-gray-400">{validOnlyProxies.length} valid proxies ready</CardDescription>
          </CardHeader>
          <CardContent>
            {validOnlyProxies.length === 0 ? (
              <div className="text-center py-6 text-gray-500"><Timer className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No valid proxies available</p></div>
            ) : (
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {validOnlyProxies.map((proxy, index) => (
                  <div key={index} className={`p-2 rounded border transition-all duration-200 ${index === currentProxyIndex && isRunning ? 'bg-purple-900/30 border-purple-500/50' : 'bg-slate-900/30 border-slate-600/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-mono text-xs">{proxy.proxy}</span>
                      <Badge variant="outline" className="text-xs">{proxy.portType}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};