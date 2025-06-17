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

export interface FormSelectors {
  emailSelector: string;
  submitSelector: string;
  nameSelector?: string;
  phoneSelector?: string;
}

interface AutoFillFormProps {
  activeProxy: ValidProxy | null;
  onStartAutoFill: (emails: string[], targetUrl: string, delay: number, selectors: FormSelectors) => void;
  onStopAutoFill: () => void;
  isRunning: boolean;
  progress: number;
  processedCount: number;
  currentEmail: string;
}

export const AutoFillForm = ({
  activeProxy,
  onStartAutoFill,
  onStopAutoFill,
  isRunning,
  progress,
  processedCount,
  currentEmail
}: AutoFillFormProps) => {
  const [emailData, setEmailData] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [delay, setDelay] = useState(2);
  const [selectors, setSelectors] = useState<FormSelectors>({
    emailSelector: 'input[type="email"], input[name="email"], #email',
    submitSelector: 'button[type="submit"], input[type="submit"], .submit-btn',
    nameSelector: 'input[name="name"], input[name="first_name"], #name',
    phoneSelector: 'input[name="phone"], input[type="tel"], #phone'
  });

  const emails = emailData
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.includes('@'));
  
  const handleStartClick = () => {
    onStartAutoFill(emails, targetUrl, delay, selectors);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <Label className="text-white">Form Selectors</Label>
            <div className="grid grid-cols-1 gap-2">
              <Input
                placeholder="Email field selector"
                value={selectors.emailSelector}
                onChange={(e) => setSelectors({...selectors, emailSelector: e.target.value})}
                disabled={isRunning}
                className="bg-slate-900/50 border-slate-600 text-white text-xs"
              />
              <Input
                placeholder="Submit button selector"
                value={selectors.submitSelector}
                onChange={(e) => setSelectors({...selectors, submitSelector: e.target.value})}
                disabled={isRunning}
                className="bg-slate-900/50 border-slate-600 text-white text-xs"
              />
              <Input
                placeholder="Name field selector (optional)"
                value={selectors.nameSelector || ''}
                onChange={(e) => setSelectors({...selectors, nameSelector: e.target.value})}
                disabled={isRunning}
                className="bg-slate-900/50 border-slate-600 text-white text-xs"
              />
              <Input
                placeholder="Phone field selector (optional)"
                value={selectors.phoneSelector || ''}
                onChange={(e) => setSelectors({...selectors, phoneSelector: e.target.value})}
                disabled={isRunning}
                className="bg-slate-900/50 border-slate-600 text-white text-xs"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="emails" className="text-white">Email Addresses</Label>
            <Textarea 
              id="emails" 
              placeholder="Enter email addresses (one per line)..." 
              className="min-h-[150px] bg-slate-900/50 border-slate-600 text-white" 
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
          
          {activeProxy ? (
            <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Active Proxy</span>
              </div>
              <div className="font-mono text-xs text-white">{activeProxy.proxy}</div>
              <Badge className="mt-2 bg-purple-600 text-white text-xs">{activeProxy.portType}</Badge>
            </div>
          ) : (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">No active proxy</span>
              </div>
              <p className="text-gray-400 text-xs mt-1">Start the proxy switcher to enable auto-fill</p>
            </div>
          )}
          
          <div className="flex space-x-2">
            {!isRunning ? (
              <Button 
                onClick={handleStartClick} 
                disabled={!activeProxy || emails.length === 0 || !targetUrl} 
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Auto Fill
              </Button>
            ) : (
              <Button 
                onClick={onStopAutoFill} 
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Pause className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Auto Fill Progress</CardTitle>
          <CardDescription className="text-gray-400">Real-time status and progress tracking</CardDescription>
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
                    <div className="font-mono text-white text-sm mt-1">{currentEmail}</div>
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
                  <Badge variant="outline" className="text-green-400 border-green-400">Completed</Badge>
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