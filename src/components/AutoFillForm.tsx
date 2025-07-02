import { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FormInput, Play, Pause, Mail, Globe, AlertTriangle, GitBranch, Share2, Server, Key, Shield, HardDrive, Cookie, Trash2 } from "lucide-react";
import { ValidProxy, SessionData } from "@/pages/Index";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Switch } from "./ui/switch";

export interface FormSelectors {
  emailSelector: string;
  submitSelector: string;
  nameSelector?: string;
  phoneSelector?: string;
  cookieSelector?: string;
}

export interface AntiDetectSettings {
  randomizeTimings: boolean;
  simulateMouse: boolean;
  disguiseFingerprint: boolean;
  showBrowser: boolean;
  persistentSession: boolean;
  disableWebRTC: boolean;
}

interface AutoFillFormProps {
  activeProxy: ValidProxy | null;
  onStartAutoFill: (selectors: FormSelectors) => void;
  onStopAutoFill: () => void;
  isRunning: boolean;
  progress: number;
  processedCount: number;
  currentEmail: string;
  autoFillMode: 'direct' | 'switcher';
  setAutoFillMode: (mode: 'direct' | 'switcher') => void;
  emailData: string;
  setEmailData: Dispatch<SetStateAction<string>>;
  targetUrl: string;
  setTargetUrl: Dispatch<SetStateAction<string>>;
  delay: number;
  setDelay: Dispatch<SetStateAction<number>>;
  selectors: FormSelectors;
  setSelectors: Dispatch<SetStateAction<FormSelectors>>;
  successKeyword: string;
  setSuccessKeyword: Dispatch<SetStateAction<string>>;
  antiDetect: AntiDetectSettings;
  setAntiDetect: Dispatch<SetStateAction<AntiDetectSettings>>;
  sessionData: SessionData | null;
  setSessionData: Dispatch<SetStateAction<SessionData | null>>;
}

export const AutoFillForm = ({
  activeProxy,
  onStartAutoFill,
  onStopAutoFill,
  isRunning,
  progress,
  processedCount,
  currentEmail,
  autoFillMode,
  setAutoFillMode,
  emailData,
  setEmailData,
  targetUrl,
  setTargetUrl,
  delay,
  setDelay,
  selectors,
  setSelectors,
  successKeyword,
  setSuccessKeyword,
  antiDetect,
  setAntiDetect,
  sessionData,
  setSessionData,
}: AutoFillFormProps) => {

  const emails = emailData
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.includes('@'));

  const handleStartClick = () => {
    onStartAutoFill(selectors);
  }

  const isStartDisabled = () => {
    if (isRunning) return true;
    if (emails.length === 0 || !targetUrl) return true;
    if (autoFillMode === 'switcher' && !activeProxy) return true;
    return false;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <FormInput className="w-5 h-5 text-green-400" />
              <span>Auto Fill Configuration</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configure automatic form filling with proxy rotation and keyword verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="space-y-3">
              <Label className="text-white">Proxy Mode</Label>
              <RadioGroup value={autoFillMode} onValueChange={setAutoFillMode as (value: string) => void} className="flex space-x-4 pt-2" disabled={isRunning}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="switcher" id="switcher" />
                  <Label htmlFor="switcher" className="text-white flex items-center gap-2"><GitBranch className="w-4 h-4"/>Switcher Mode</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="direct" id="direct" />
                  <Label htmlFor="direct" className="text-white flex items-center gap-2"><Share2 className="w-4 h-4"/>Direct Mode</Label>
                </div>
              </RadioGroup>
            </div>

            {autoFillMode === 'switcher' ? (
              activeProxy ? (
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Globe className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">Using Active Proxy from Switcher</span>
                  </div>
                  <div className="font-mono text-xs text-white">{activeProxy.proxy}</div>
                  <Badge className="mt-2 bg-purple-600 text-white text-xs">{activeProxy.portType}</Badge>
                </div>
              ) : (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">No active proxy. Start the switcher first.</span>
                  </div>
                </div>
              )
            ) : (
              <div className="p-3 bg-sky-900/20 border border-sky-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-sky-400" />
                  <span className="text-sky-400 text-sm font-medium">Using Direct Connection</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">Submissions will be sent from the server's original IP address (no proxy).</p>
              </div>
            )}

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
              <Label htmlFor="successKeyword" className="text-white flex items-center space-x-2">
                <Key className="w-4 h-4"/>
                <span>Success Keyword (Optional)</span>
              </Label>
              <Input
                id="successKeyword"
                placeholder="e.g., 'Thank you for your submission'"
                value={successKeyword}
                onChange={(e) => setSuccessKeyword(e.target.value)}
                disabled={isRunning}
                className="bg-slate-900/50 border-slate-600 text-white"
              />
               <CardDescription className="text-gray-400 text-xs">
                  Checks for text in the page UI or network response to confirm success.
              </CardDescription>
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
              <Label className="text-white">Form & Page Selectors</Label>
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
                  placeholder="Cookie Accept button selector (optional)"
                  value={selectors.cookieSelector}
                  onChange={(e) => setSelectors({...selectors, cookieSelector: e.target.value})}
                  disabled={isRunning}
                  className="bg-slate-900/50 border-slate-600 text-white text-xs"
                />
                 <Input
                  placeholder="Name field selector (optional)"
                  value={selectors.nameSelector}
                  onChange={(e) => setSelectors({...selectors, nameSelector: e.target.value})}
                  disabled={isRunning}
                  className="bg-slate-900/50 border-slate-600 text-white text-xs"
                />
                 <Input
                  placeholder="Phone field selector (optional)"
                  value={selectors.phoneSelector}
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

            <div className="flex space-x-2">
              {!isRunning ? (
                <Button
                  onClick={handleStartClick}
                  disabled={isStartDisabled()}
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
      </div>

      <div className="space-y-6">
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

        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                    <Shield className="w-5 h-5 text-teal-400" />
                    <span>Anti-Detect Settings</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                    Enable these options to make automation appear more human-like. May slow down submissions.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
                    <div className="space-y-0.5">
                        <Label htmlFor="show-browser" className="text-base text-white">Show Browser</Label>
                        <p className="text-xs text-gray-400">Run in a visible window for debugging.</p>
                    </div>
                    <Switch
                        id="show-browser"
                        checked={antiDetect.showBrowser}
                        onCheckedChange={(checked) => setAntiDetect(prev => ({ ...prev, showBrowser: checked }))}
                        disabled={isRunning}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
                    <div className="space-y-0.5">
                        <Label htmlFor="persistent-session" className="text-base text-white">Persistent Session</Label>
                        <p className="text-xs text-gray-400">Reuse cookies, local and session storage.</p>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSessionData(null)}
                            disabled={!sessionData || isRunning}
                            className="h-7 w-7 text-red-400 hover:bg-red-900/50"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <Switch
                            id="persistent-session"
                            checked={antiDetect.persistentSession}
                            onCheckedChange={(checked) => setAntiDetect(prev => ({ ...prev, persistentSession: checked }))}
                            disabled={isRunning}
                        />
                    </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
                    <div className="space-y-0.5">
                        <Label htmlFor="randomize-timings" className="text-base text-white">Randomize Timings</Label>
                        <p className="text-xs text-gray-400">Simulate human typing speed and pauses.</p>
                    </div>
                    <Switch
                        id="randomize-timings"
                        checked={antiDetect.randomizeTimings}
                        onCheckedChange={(checked) => setAntiDetect(prev => ({ ...prev, randomizeTimings: checked }))}
                        disabled={isRunning}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
                    <div className="space-y-0.5">
                        <Label htmlFor="simulate-mouse" className="text-base text-white">Simulate Mouse Movement</Label>
                        <p className="text-xs text-gray-400">Move the cursor realistically before clicking.</p>
                    </div>
                    <Switch
                        id="simulate-mouse"
                        checked={antiDetect.simulateMouse}
                        onCheckedChange={(checked) => setAntiDetect(prev => ({ ...prev, simulateMouse: checked }))}
                        disabled={isRunning}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
                    <div className="space-y-0.5">
                        <Label htmlFor="disguise-fingerprint" className="text-base text-white">Disguise Browser Fingerprint</Label>
                        <p className="text-xs text-gray-400">Use random User-Agents and viewports.</p>
                    </div>
                    <Switch
                        id="disguise-fingerprint"
                        checked={antiDetect.disguiseFingerprint}
                        onCheckedChange={(checked) => setAntiDetect(prev => ({ ...prev, disguiseFingerprint: checked }))}
                        disabled={isRunning}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
                    <div className="space-y-0.5">
                        <Label htmlFor="disable-webrtc" className="text-base text-white">Disable WebRTC</Label>
                        <p className="text-xs text-gray-400">Prevent potential IP leaks via WebRTC.</p>
                    </div>
                    <Switch
                        id="disable-webrtc"
                        checked={antiDetect.disableWebRTC}
                        onCheckedChange={(checked) => setAntiDetect(prev => ({ ...prev, disableWebRTC: checked }))}
                        disabled={isRunning}
                    />
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};