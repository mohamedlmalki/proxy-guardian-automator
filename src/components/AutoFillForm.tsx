
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FormInput, Play, Pause, Mail, Globe, AlertTriangle } from "lucide-react";
import { ValidProxy } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";

interface AutoFillFormProps {
  activeProxy: ValidProxy | null;
}

export const AutoFillForm = ({ activeProxy }: AutoFillFormProps) => {
  const [emailData, setEmailData] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [currentEmail, setCurrentEmail] = useState("");
  const [delay, setDelay] = useState(2); // seconds between submissions
  const { toast } = useToast();

  const emails = emailData
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.includes('@'));

  const handleStartAutoFill = async () => {
    if (!activeProxy) {
      toast({
        title: "No active proxy",
        description: "Please start the proxy switcher first.",
        variant: "destructive"
      });
      return;
    }

    if (emails.length === 0) {
      toast({
        title: "No valid emails",
        description: "Please enter some email addresses first.",
        variant: "destructive"
      });
      return;
    }

    if (!targetUrl) {
      toast({
        title: "No target URL",
        description: "Please enter a target URL for form submission.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setProcessedCount(0);

    console.log(`Starting auto-fill with ${emails.length} emails using proxy: ${activeProxy.proxy}`);

    toast({
      title: "Auto-fill started",
      description: `Processing ${emails.length} emails with active proxy`,
    });

    // Simulate form filling process
    for (let i = 0; i < emails.length; i++) {
      if (!isRunning) break; // Allow stopping mid-process

      setCurrentEmail(emails[i]);
      setProgress(((i + 1) / emails.length) * 100);

      // Simulate form submission
      console.log(`Submitting form for: ${emails[i]} via proxy: ${activeProxy.proxy}`);
      
      // Mock API call - in real implementation, this would use the proxy to submit forms
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
      
      setProcessedCount(i + 1);

      // Show progress toast every 10 submissions
      if ((i + 1) % 10 === 0) {
        toast({
          title: "Progress update",
          description: `Processed ${i + 1}/${emails.length} emails`,
        });
      }
    }

    setIsRunning(false);
    setCurrentEmail("");
    
    toast({
      title: "Auto-fill completed",
      description: `Successfully processed ${processedCount} emails`,
    });
  };

  const handleStop = () => {
    setIsRunning(false);
    setCurrentEmail("");
    
    toast({
      title: "Auto-fill stopped",
      description: `Processed ${processedCount} emails before stopping`,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <FormInput className="w-5 h-5 text-green-400" />
            <span>Auto Fill Configuration</span>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure automatic form filling with proxy rotation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetUrl" className="text-white">Target URL</Label>
            <Input
              id="targetUrl"
              placeholder="https://example.com/signup"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              disabled={isRunning}
              className="bg-slate-900/50 border-slate-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delay" className="text-white">Delay between submissions (seconds)</Label>
            <Input
              id="delay"
              type="number"
              min="1"
              max="30"
              value={delay}
              onChange={(e) => setDelay(parseInt(e.target.value) || 2)}
              disabled={isRunning}
              className="bg-slate-900/50 border-slate-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emails" className="text-white">Email Addresses</Label>
            <Textarea
              id="emails"
              placeholder="Enter email addresses (one per line)&#10;example1@email.com&#10;example2@email.com&#10;example3@email.com"
              className="min-h-[150px] bg-slate-900/50 border-slate-600 text-white placeholder-gray-500"
              value={emailData}
              onChange={(e) => setEmailData(e.target.value)}
              disabled={isRunning}
            />
            {emails.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-green-400">
                <Mail className="w-4 h-4" />
                <span>{emails.length} valid emails loaded</span>
              </div>
            )}
          </div>

          {/* Proxy Status */}
          {activeProxy ? (
            <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Active Proxy</span>
              </div>
              <div className="font-mono text-xs text-white">{activeProxy.proxy}</div>
              <Badge className="mt-2 bg-purple-600 text-white text-xs">
                {activeProxy.type}
              </Badge>
            </div>
          ) : (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">No active proxy</span>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Start the proxy switcher to enable auto-fill
              </p>
            </div>
          )}

          <div className="flex space-x-2">
            {!isRunning ? (
              <Button 
                onClick={handleStartAutoFill}
                disabled={!activeProxy || emails.length === 0 || !targetUrl}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Auto Fill
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
          </div>
        </CardContent>
      </Card>

      {/* Progress & Status */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Auto Fill Progress</CardTitle>
          <CardDescription className="text-gray-400">
            Real-time status and progress tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRunning ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-400 font-medium">Processing...</span>
                </div>
                
                {currentEmail && (
                  <div className="mb-3">
                    <span className="text-gray-400 text-sm">Current email:</span>
                    <div className="font-mono text-white text-sm mt-1">
                      {currentEmail}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Progress:</span>
                    <span className="text-white">{processedCount}/{emails.length}</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-slate-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{processedCount}</div>
                  <div className="text-xs text-gray-400">Processed</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{emails.length - processedCount}</div>
                  <div className="text-xs text-gray-400">Remaining</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              {processedCount > 0 ? (
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-green-400">{processedCount}</div>
                  <div className="text-gray-400">Emails processed in last run</div>
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    Completed
                  </Badge>
                </div>
              ) : (
                <div className="space-y-3 text-gray-500">
                  <FormInput className="w-12 h-12 mx-auto opacity-50" />
                  <p>Ready to start auto-fill</p>
                  <p className="text-xs">Configure settings and click Start</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
