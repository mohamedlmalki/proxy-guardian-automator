
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, Timer, Wifi, WifiOff } from "lucide-react";
import { ValidProxy } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";

interface ProxySwitcherProps {
  validProxies: ValidProxy[];
  onProxyChanged: (proxy: ValidProxy | null) => void;
}

export const ProxySwitcher = ({ validProxies, onProxyChanged }: ProxySwitcherProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentProxyIndex, setCurrentProxyIndex] = useState(0);
  const [timer, setTimer] = useState(30); // seconds
  const [remainingTime, setRemainingTime] = useState(0);
  const [switchCount, setSwitchCount] = useState(0);
  const { toast } = useToast();

  const validOnlyProxies = validProxies.filter(p => p.isValid);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && validOnlyProxies.length > 0) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            // Switch to next proxy
            const nextIndex = (currentProxyIndex + 1) % validOnlyProxies.length;
            setCurrentProxyIndex(nextIndex);
            setSwitchCount(prev => prev + 1);
            onProxyChanged(validOnlyProxies[nextIndex]);
            
            console.log(`Switched to proxy: ${validOnlyProxies[nextIndex].proxy}`);
            
            toast({
              title: "Proxy switched",
              description: `Now using: ${validOnlyProxies[nextIndex].proxy}`,
            });
            
            return timer;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, currentProxyIndex, timer, validOnlyProxies, onProxyChanged, toast]);

  const handleStart = () => {
    if (validOnlyProxies.length === 0) {
      toast({
        title: "No valid proxies",
        description: "Please check some proxies first to get valid ones.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setRemainingTime(timer);
    setSwitchCount(0);
    onProxyChanged(validOnlyProxies[currentProxyIndex]);
    
    console.log("Proxy switcher started");
    
    toast({
      title: "Proxy switcher started",
      description: `Switching every ${timer} seconds`,
    });
  };

  const handleStop = () => {
    setIsRunning(false);
    setRemainingTime(0);
    onProxyChanged(null);
    
    console.log("Proxy switcher stopped");
    
    toast({
      title: "Proxy switcher stopped",
      description: `Total switches: ${switchCount}`,
    });
  };

  const handleManualSwitch = () => {
    if (validOnlyProxies.length === 0) return;
    
    const nextIndex = (currentProxyIndex + 1) % validOnlyProxies.length;
    setCurrentProxyIndex(nextIndex);
    setSwitchCount(prev => prev + 1);
    onProxyChanged(validOnlyProxies[nextIndex]);
    setRemainingTime(timer);
    
    toast({
      title: "Manual switch",
      description: `Switched to: ${validOnlyProxies[nextIndex].proxy}`,
    });
  };

  const progress = remainingTime > 0 ? ((timer - remainingTime) / timer) * 100 : 0;
  const currentProxy = validOnlyProxies[currentProxyIndex];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Control Panel */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <RotateCcw className="w-5 h-5 text-purple-400" />
            <span>Proxy Switcher</span>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Automatically rotate through valid proxies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timer" className="text-white">Switch Interval (seconds)</Label>
            <Input
              id="timer"
              type="number"
              min="5"
              max="300"
              value={timer}
              onChange={(e) => setTimer(parseInt(e.target.value) || 30)}
              disabled={isRunning}
              className="bg-slate-900/50 border-slate-600 text-white"
            />
          </div>

          <div className="flex space-x-2">
            {!isRunning ? (
              <Button 
                onClick={handleStart}
                disabled={validOnlyProxies.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
            ) : (
              <Button 
                onClick={handleStop}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Pause className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}
            
            <Button
              onClick={handleManualSwitch}
              disabled={validOnlyProxies.length === 0}
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Next switch in:</span>
                <span className="text-white font-mono">{remainingTime}s</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Proxy Status */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            {isRunning ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-gray-400" />}
            <span>Current Proxy</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentProxy && isRunning ? (
            <div className="space-y-3">
              <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="font-mono text-green-400 text-sm mb-2">
                  {currentProxy.proxy}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-purple-600 text-white">
                    {currentProxy.type}
                  </Badge>
                  {currentProxy.responseTime && (
                    <span className="text-xs text-gray-400">
                      {currentProxy.responseTime}ms
                    </span>
                  )}
                  {currentProxy.location && (
                    <span className="text-xs text-blue-400">
                      {currentProxy.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-400">
                Switches: {switchCount}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No active proxy</p>
              <p className="text-xs mt-1">Start the switcher to activate</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proxy List */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Available Proxies</CardTitle>
          <CardDescription className="text-gray-400">
            {validOnlyProxies.length} valid proxies ready
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validOnlyProxies.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Timer className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No valid proxies available</p>
              <p className="text-xs mt-1">Check some proxies first</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {validOnlyProxies.map((proxy, index) => (
                <div
                  key={index}
                  className={`p-2 rounded border transition-all duration-200 ${
                    index === currentProxyIndex && isRunning
                      ? 'bg-purple-900/30 border-purple-500/50'
                      : 'bg-slate-900/30 border-slate-600/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-mono text-xs">
                      {proxy.proxy}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {proxy.type}
                    </Badge>
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
