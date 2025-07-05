import { Dispatch, SetStateAction, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FormInput as FormInputIcon,
  Play,
  Pause,
  Mail,
  Globe,
  AlertTriangle,
  GitBranch,
  Share2,
  Server,
  Key,
  Shield,
  Trash2,
  Clock,
  Globe2,
  Fingerprint,
  Beaker,
  PlusCircle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { ValidProxy, SessionData } from "@/pages/Index";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Switch } from "./ui/switch";

export interface FormInput {
  selector: string;
  value: string;
}

export interface AutomationStep {
  targetUrl: string;
  fields: FormInput[];
  buttonSelector: string;
}
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
  useMyScreenResolution?: boolean;
  spoofTimezone: boolean;
  spoofGeolocation: boolean;
  spoofCanvas: boolean;
}

interface AutoFillFormProps {
  activeProxy: ValidProxy | null;
  onStartAutoFill: () => void;
  onStopAutoFill: () => void;
  isRunning: boolean;
  progress: number;
  processedCount: number;
  currentEmail: string;
  autoFillMode: "direct" | "switcher";
  setAutoFillMode: (mode: "direct" | "switcher") => void;
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
  steps: AutomationStep[];
  setSteps: Dispatch<SetStateAction<AutomationStep[]>>;
}

const FIELD_TYPES = [
  { label: 'Email', value: 'input[type="email"], input[name="email"], #email', placeholder: '{email}' },
  { label: 'First Name', value: 'input[name="fname"], input[name="first_name"], #fname', placeholder: '' },
  { label: 'Last Name', value: 'input[name="lname"], input[name="last_name"], #lname', placeholder: '' },
  { label: 'Full Name', value: 'input[name="name"], #name', placeholder: '' },
  { label: 'Phone Number', value: 'input[type="tel"], input[name="phone"], #phone', placeholder: '' },
  { label: 'Custom...', value: 'custom', placeholder: '' },
];

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
  steps,
  setSteps,
}: AutoFillFormProps) => {
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const emails = emailData
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.includes("@"));

  const handleStartClick = () => {
    onStartAutoFill();
  };

  const handleTestClick = async () => {
    setIsTesting(true);
    setTestResponse(null);
    try {
      const firstEmail = emails[0];
      if (!firstEmail) {
        setTestResponse("Error: No valid email available for testing.");
        return;
      }

      const response = await fetch('/api/test-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: firstEmail,
          proxy: autoFillMode === 'switcher' ? activeProxy?.proxy : null,
          antiDetect,
          steps,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setTestResponse(result.sourceContent);
      } else {
        setTestResponse(`Error: ${result.message}\n\n--- Page Source ---\n${result.sourceContent || 'Not available.'}`);
      }
    } catch (error: any) {
      setTestResponse(`Error: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const isStartDisabled = () => {
    if (isRunning || isTesting) return true;
    if (emails.length === 0 || !steps.some(step => step.targetUrl)) return true;
    if (autoFillMode === "switcher" && !activeProxy) return true;
    return false;
  };
  
  const addStep = () => {
    setSteps([...steps, { targetUrl: "", fields: [{ selector: "", value: "" }], buttonSelector: "" }]);
  };

  const removeStep = (stepIndex: number) => {
    const newSteps = steps.filter((_, index) => index !== stepIndex);
    setSteps(newSteps);
  };

  const addField = (stepIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].fields.push({ selector: "", value: "" });
    setSteps(newSteps);
  };

  const removeField = (stepIndex: number, fieldIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].fields = newSteps[stepIndex].fields.filter((_, index) => index !== fieldIndex);
    setSteps(newSteps);
  };

  const handleStepChange = (stepIndex: number, field: keyof AutomationStep, value: any) => {
    const newSteps = [...steps];
    newSteps[stepIndex] = { ...newSteps[stepIndex], [field]: value };
    setSteps(newSteps);
  };

  const handleFieldChange = (stepIndex: number, fieldIndex: number, field: keyof FormInput, value: string) => {
    const newSteps = [...steps];
    newSteps[stepIndex].fields[fieldIndex] = { ...newSteps[stepIndex].fields[fieldIndex], [field]: value };
    setSteps(newSteps);
  };

  const handleFieldTypeChange = (stepIndex: number, fieldIndex: number, selectorValue: string) => {
    const newSteps = [...steps];
    const fieldType = FIELD_TYPES.find(f => f.value === selectorValue);
    newSteps[stepIndex].fields[fieldIndex] = {
      ...newSteps[stepIndex].fields[fieldIndex],
      selector: selectorValue,
      value: fieldType?.placeholder || '',
    };
    setSteps(newSteps);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <FormInputIcon className="w-5 h-5 text-green-400" />
              <span>Auto-Fill Configuration</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configure automatic form filling with proxy rotation and keyword
              verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-white">Proxy Mode</Label>
              <RadioGroup
                value={autoFillMode}
                onValueChange={setAutoFillMode as (value: string) => void}
                className="flex space-x-4 pt-2"
                disabled={isRunning || isTesting}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="switcher" id="switcher" />
                  <Label
                    htmlFor="switcher"
                    className="text-white flex items-center gap-2"
                  >
                    <GitBranch className="w-4 h-4" />
                    Switcher Mode
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="direct" id="direct" />
                  <Label
                    htmlFor="direct"
                    className="text-white flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Direct Mode
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {autoFillMode === "switcher" ? (
              activeProxy ? (
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Globe className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">
                      Using Active Proxy from Switcher
                    </span>
                  </div>
                  <div className="font-mono text-xs text-white">
                    {activeProxy.proxy}
                  </div>
                  <Badge className="mt-2 bg-purple-600 text-white text-xs">
                    {activeProxy.portType}
                  </Badge>
                </div>
              ) : (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">
                      No active proxy. Start the switcher first.
                    </span>
                  </div>
                </div>
              )
            ) : (
              <div className="p-3 bg-sky-900/20 border border-sky-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-sky-400" />
                  <span className="text-sky-400 text-sm font-medium">
                    Using Direct Connection
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  Submissions will be sent from the server's original IP
                  address (no proxy).
                </p>
              </div>
            )}

            <div className="space-y-4">
              <Label className="text-white">Automation Steps</Label>
              {steps.map((step, stepIndex) => (
                <div key={stepIndex} className="p-4 border border-slate-600 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-white">Step {stepIndex + 1}</Label>
                    <Button variant="ghost" size="icon" className="text-red-400" onClick={() => removeStep(stepIndex)}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Target URL for this step (optional)"
                    value={step.targetUrl}
                    onChange={(e) => handleStepChange(stepIndex, 'targetUrl', e.target.value)}
                    disabled={isRunning || isTesting}
                    className="bg-slate-900/50 border-slate-600 text-white text-xs"
                  />
                  {step.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between bg-slate-900/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white">
                            {FIELD_TYPES.find(f => f.value === field.selector)?.label || 'Select Field'} <ChevronDown className="w-4 h-4 opacity-50"/>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                          <DropdownMenuRadioGroup value={field.selector} onValueChange={(value) => handleFieldTypeChange(stepIndex, fieldIndex, value)}>
                            {FIELD_TYPES.map(f => <DropdownMenuRadioItem key={f.value} value={f.value}>{f.label}</DropdownMenuRadioItem>)}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {field.selector === 'custom' && (
                        <Input
                            placeholder="Custom Selector"
                            onChange={(e) => handleFieldChange(stepIndex, fieldIndex, 'selector', e.target.value)}
                            disabled={isRunning || isTesting}
                            className="bg-slate-900/50 border-slate-600 text-white text-xs"
                        />
                      )}
                      <Input
                        placeholder="Value (use {email})"
                        value={field.value}
                        onChange={(e) => handleFieldChange(stepIndex, fieldIndex, 'value', e.target.value)}
                        disabled={isRunning || isTesting}
                        className="bg-slate-900/50 border-slate-600 text-white text-xs"
                      />
                      <Button variant="ghost" size="icon" className="text-red-400" onClick={() => removeField(stepIndex, fieldIndex)}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addField(stepIndex)}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Add Field
                  </Button>
                  <Input
                    placeholder="Button selector to click (e.g. #next, #submit)"
                    value={step.buttonSelector}
                    onChange={(e) => handleStepChange(stepIndex, 'buttonSelector', e.target.value)}
                    disabled={isRunning || isTesting}
                    className="bg-slate-900/50 border-slate-600 text-white text-xs"
                  />
                </div>
              ))}
              <Button variant="outline" onClick={addStep}>
                <PlusCircle className="w-4 h-4 mr-2" /> Add Step
              </Button>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="successKeyword"
                className="text-white flex items-center space-x-2"
              >
                <Key className="w-4 h-4" />
                <span>Success Keyword (Optional)</span>
              </Label>
              <Input
                id="successKeyword"
                placeholder="e.g., 'Thank you for your submission'"
                value={successKeyword}
                onChange={(e) => setSuccessKeyword(e.target.value)}
                disabled={isRunning || isTesting}
                className="bg-slate-900/50 border-slate-600 text-white"
              />
              <CardDescription className="text-gray-400 text-xs">
                Checks for text in the page UI or network response to confirm
                success.
              </CardDescription>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delay" className="text-white">
                Delay between submissions (seconds)
              </Label>
              <Input
                id="delay"
                type="number"
                min="1"
                max="30"
                value={delay}
                onChange={(e) => setDelay(parseInt(e.target.value) || 2)}
                disabled={isRunning || isTesting}
                className="bg-slate-900/50 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emails" className="text-white">
                Email Addresses
              </Label>
              <Textarea
                id="emails"
                placeholder="Enter email addresses (one per line)..."
                className="min-h-[150px] bg-slate-900/50 border-slate-600 text-white"
                value={emailData}
                onChange={(e) => setEmailData(e.target.value)}
                disabled={isRunning || isTesting}
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
                  Start Auto-Fill
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
               <Button
                onClick={handleTestClick}
                disabled={isStartDisabled() || isRunning || isTesting}
                variant="outline"
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Beaker className="w-4 h-4 mr-2" />
                {isTesting ? "Testing..." : "Test"}
              </Button>
            </div>

            {testResponse && (
              <div className="space-y-2 pt-4">
                <Label htmlFor="test-response" className="text-white">Test Response</Label>
                <Textarea
                  id="test-response"
                  readOnly
                  value={testResponse}
                  className="mt-2 h-64 font-mono text-sm bg-slate-900/80 border-slate-600 text-green-400"
                  placeholder="Test response will appear here..."
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

       {/* ... existing Progress and Anti-Detect cards ... */}
      <div className="space-y-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Auto-Fill Progress</CardTitle>
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
                    <span className="text-blue-400 font-medium">
                      Processing...
                    </span>
                  </div>
                  {currentEmail && (
                    <div className="mb-3">
                      <span className="text-gray-400 text-sm">
                        Current email:
                      </span>
                      <div className="font-mono text-white text-sm mt-1">
                        {currentEmail}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Progress:</span>
                      <span className="text-white">
                        {processedCount}/{emails.length}
                      </span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-slate-900/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">
                      {processedCount}
                    </div>
                    <div className="text-xs text-gray-400">Processed</div>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">
                      {emails.length - processedCount}
                    </div>
                    <div className="text-xs text-gray-400">Remaining</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                {processedCount > 0 ? (
                  <div className="space-y-3">
                    <div className="text-3xl font-bold text-green-400">
                      {processedCount}
                    </div>
                    <div className="text-gray-400">
                      Emails processed in last run
                    </div>
                    <Badge
                      variant="outline"
                      className="text-green-400 border-green-400"
                    >
                      Completed
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-3 text-gray-500">
                    <FormInputIcon className="w-12 h-12 mx-auto opacity-50" />
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
              Enable these options to make automation appear more human-like.
              May slow down submissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
              <div className="space-y-0.5">
                <Label htmlFor="show-browser" className="text-base text-white">
                  Show Browser
                </Label>
                <p className="text-xs text-gray-400">
                  Run in a visible window for debugging.
                </p>
              </div>
              <Switch
                id="show-browser"
                checked={antiDetect.showBrowser}
                onCheckedChange={(checked) =>
                  setAntiDetect((prev) => ({ ...prev, showBrowser: checked }))
                }
                disabled={isRunning || isTesting}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
              <div className="space-y-0.5">
                <Label
                  htmlFor="use-my-screen-resolution"
                  className="text-base text-white"
                >
                  Use My Screen Resolution
                </Label>
                <p className="text-xs text-gray-400">
                  Use your actual screen size instead of a random one.
                </p>
              </div>
              <Switch
                id="use-my-screen-resolution"
                checked={antiDetect.useMyScreenResolution}
                onCheckedChange={(checked) =>
                  setAntiDetect((prev) => ({
                    ...prev,
                    useMyScreenResolution: checked,
                  }))
                }
                disabled={isRunning || isTesting}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
              <div className="space-y-0.5">
                <Label
                  htmlFor="persistent-session"
                  className="text-base text-white"
                >
                  Persistent Session
                </Label>
                <p className="text-xs text-gray-400">
                  Reuse cookies, local and session storage.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSessionData(null)}
                  disabled={!sessionData || isRunning || isTesting}
                  className="h-7 w-7 text-red-400 hover:bg-red-900/50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Switch
                  id="persistent-session"
                  checked={antiDetect.persistentSession}
                  onCheckedChange={(checked) =>
                    setAntiDetect((prev) => ({
                      ...prev,
                      persistentSession: checked,
                    }))
                  }
                  disabled={isRunning || isTesting}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
              <div className="space-y-0.5">
                <Label
                  htmlFor="spoof-timezone"
                  className="text-base text-white flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Spoof Timezone
                </Label>
                <p className="text-xs text-gray-400">
                  Match browser timezone to the proxy's location.
                </p>
              </div>
              <Switch
                id="spoof-timezone"
                checked={antiDetect.spoofTimezone}
                onCheckedChange={(checked) =>
                  setAntiDetect((prev) => ({
                    ...prev,
                    spoofTimezone: checked,
                  }))
                }
                disabled={isRunning || isTesting}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
              <div className="space-y-0.5">
                <Label
                  htmlFor="spoof-geolocation"
                  className="text-base text-white flex items-center gap-2"
                >
                  <Globe2 className="w-4 h-4" />
                  Spoof Geolocation
                </Label>
                <p className="text-xs text-gray-400">
                  Match browser coordinates to the proxy's location.
                </p>
              </div>
              <Switch
                id="spoof-geolocation"
                checked={antiDetect.spoofGeolocation}
                onCheckedChange={(checked) =>
                  setAntiDetect((prev) => ({
                    ...prev,
                    spoofGeolocation: checked,
                  }))
                }
                disabled={isRunning || isTesting}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
              <div className="space-y-0.5">
                <Label
                  htmlFor="spoof-canvas"
                  className="text-base text-white flex items-center gap-2"
                >
                  <Fingerprint className="w-4 h-4" />
                  Spoof Canvas
                </Label>
                <p className="text-xs text-gray-400">
                  Adds random noise to canvas rendering to prevent
                  fingerprinting.
                </p>
              </div>
              <Switch
                id="spoof-canvas"
                checked={antiDetect.spoofCanvas}
                onCheckedChange={(checked) =>
                  setAntiDetect((prev) => ({ ...prev, spoofCanvas: checked }))
                }
                disabled={isRunning || isTesting}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
              <div className="space-y-0.5">
                <Label
                  htmlFor="randomize-timings"
                  className="text-base text-white"
                >
                  Randomize Timings
                </Label>
                <p className="text-xs text-gray-400">
                  Simulate human typing speed and pauses.
                </p>
              </div>
              <Switch
                id="randomize-timings"
                checked={antiDetect.randomizeTimings}
                onCheckedChange={(checked) =>
                  setAntiDetect((prev) => ({
                    ...prev,
                    randomizeTimings: checked,
                  }))
                }
                disabled={isRunning || isTesting}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
              <div className="space-y-0.5">
                <Label
                  htmlFor="simulate-mouse"
                  className="text-base text-white"
                >
                  Simulate Mouse Movement
                </Label>
                <p className="text-xs text-gray-400">
                  Move the cursor realistically before clicking.
                </p>
              </div>
              <Switch
                id="simulate-mouse"
                checked={antiDetect.simulateMouse}
                onCheckedChange={(checked) =>
                  setAntiDetect((prev) => ({ ...prev, simulateMouse: checked }))
                }
                disabled={isRunning || isTesting}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
              <div className="space-y-0.5">
                <Label
                  htmlFor="disguise-fingerprint"
                  className="text-base text-white"
                >
                  Disguise Browser Fingerprint
                </Label>
                <p className="text-xs text-gray-400">
                  Use random User-Agents and viewports.
                </p>
              </div>
              <Switch
                id="disguise-fingerprint"
                checked={antiDetect.disguiseFingerprint}
                onCheckedChange={(checked) =>
                  setAntiDetect((prev) => ({
                    ...prev,
                    disguiseFingerprint: checked,
                  }))
                }
                disabled={isRunning || isTesting}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-900/50">
              <div className="space-y-0.5">
                <Label htmlFor="disable-webrtc" className="text-base text-white">
                  Disable WebRTC
                </Label>
                <p className="text-xs text-gray-400">
                  Prevent potential IP leaks via WebRTC.
                </p>
              </div>
              <Switch
                id="disable-webrtc"
                checked={antiDetect.disableWebRTC}
                onCheckedChange={(checked) =>
                  setAntiDetect((prev) => ({ ...prev, disableWebRTC: checked }))
                }
                disabled={isRunning || isTesting}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};