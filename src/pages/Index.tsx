import { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { ProxyChecker } from "@/components/ProxyChecker";
import { ProxySwitcher, RotationStrategy, SessionStat } from "@/components/ProxySwitcher";
import { AutoFillForm, FormSelectors, AntiDetectSettings } from "@/components/AutoFillForm";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { IpTester } from "@/components/IpTester";
import { SessionSummaryDialog, SessionSummaryData } from "@/components/SessionSummaryDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, RotateCcw, FormInput, Save, FolderOpen, Trash2, Bell, PieChart, Upload, Download, TestTube2, Hourglass, ListTodo, Timer as TimerIcon, X, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type SwitchMode = 'time' | 'requests';
type FilterMode = 'whitelist' | 'blacklist';

let logIdCounter = 0;
const genLogId = () => `log-${logIdCounter++}`;

export interface ValidProxy {
  proxy: string;
  isValid: boolean;
  apiType?: string;
  portType?: string;
  latency?: number;
  anonymity?: string;
  location?: string;
  city?: string;
  country?: string;
  isp?: string;
  fraud_score?: number;
  healthScore?: number;
  isPinned?: boolean;
  lastChecked?: number;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface SessionData {
  id?: string;
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export interface TestResult {
    success: boolean;
    message: string;
    ip?: string;
    country?: string;
    anonymity?: string;
    location?: string;
    latency?: number;
    statusCode?: number;
    sourceContent?: string;
    sessionData?: SessionData;
}

export interface ConnectionLogEntry extends TestResult {
  id: string;
  timestamp: string;
  proxy: string;
  status?: 'pending' | 'success' | 'fail';
}

interface ProfileData {
    proxyInput: string;
    switchMode: SwitchMode;
    rotationStrategy: RotationStrategy;
    switchInterval: number;
    switchRequestCount: number;
    emailData: string;
    targetUrl: string;
    delay: number;
    selectors: FormSelectors;
    successKeyword: string;
    antiDetect: AntiDetectSettings;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const PINNED_PROXIES_KEY = 'proxy-guardian-pinned';
const PROFILES_KEY = 'proxy-guardian-profiles';
const NOTIFICATIONS_KEY = 'proxy-guardian-notifications-enabled';
const MAX_REASONABLE_LATENCY = 3000;

const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const Index = () => {
  const [validProxies, setValidProxies] = useState<ValidProxy[]>([]);
  const [activeProxy, setActiveProxy] = useState<ValidProxy | null>(null);
  const [connectionLog, setConnectionLog] = useState<ConnectionLogEntry[]>([]);
  const [proxyInput, setProxyInput] = useState("");
  const [checkerResults, setCheckerResults] = useState<ValidProxy[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const [pinnedProxies, setPinnedProxies] = useState<string[]>([]);
  const [switcherStatus, setSwitcherStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [currentProxyIndex, setCurrentProxyIndex] = useState(0);
  const [switchInterval, setSwitchInterval] = useState(30);
  const [remainingTime, setRemainingTime] = useState(0);
  const [switchCount, setSwitchCount] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const [initialValidCount, setInitialValidCount] = useState(0);
  const [downedProxies, setDownedProxies] = useState<Map<string, number>>(new Map());
  const [manualRemovals, setManualRemovals] = useState<Set<string>>(new Set());
  const [cooldownMinutes, setCooldownMinutes] = useState(5);
  const [retestOnStart, setRetestOnStart] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('whitelist');
  const [countryFilterList, setCountryFilterList] = useState('');
  const [ispFilterList, setIspFilterList] = useState('');
  const [switchMode, setSwitchMode] = useState<SwitchMode>('time');
  const [rotationStrategy, setRotationStrategy] = useState<RotationStrategy>('sequential');
  const [successfulRequests, setSuccessfulRequests] = useState(0);
  const [switchRequestCount, setSwitchRequestCount] = useState(10);
  const [sessionStats, setSessionStats] = useState<Record<string, SessionStat>>({});
  const [isAutoFillRunning, setIsAutoFillRunning] = useState(false);
  const [autoFillProgress, setAutoFillProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [currentEmail, setCurrentEmail] = useState("");
  const [autoFillMode, setAutoFillMode] = useState<'direct' | 'switcher'>('switcher');
  const [emailData, setEmailData] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [delay, setDelay] = useState(2);
  const [selectors, setSelectors] = useState<FormSelectors>({ emailSelector: 'input[type="email"], input[name="email"], #email', submitSelector: 'button[type="submit"], input[type="submit"], .submit-btn', nameSelector: 'input[name="name"], input[name="first_name"], #name', phoneSelector: 'input[name="phone"], input[type="tel"], #phone', cookieSelector: '' });
  const [successKeyword, setSuccessKeyword] = useState("");
  const [profiles, setProfiles] = useState<Record<string, ProfileData>>({});
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSwitchingProxy, setIsSwitchingProxy] = useState(false);
  const [switcherStartedByAutoFill, setSwitcherStartedByAutoFill] = useState(false);
  const [autoFillStartTime, setAutoFillStartTime] = useState<number | null>(null);
  const [autoFillElapsedTime, setAutoFillElapsedTime] = useState('00:00:00');
  const [autoFillETR, setAutoFillETR] = useState('Calculating...');
  const [showAutoFillDashboard, setShowAutoFillDashboard] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryData | null>(null);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [isAutoFillComplete, setIsAutoFillComplete] = useState(false);
  const [antiDetect, setAntiDetect] = useState<AntiDetectSettings>({ randomizeTimings: false, simulateMouse: false, disguiseFingerprint: false, showBrowser: false, persistentSession: false, disableWebRTC: false, useMyScreenResolution: false, spoofTimezone: false, spoofGeolocation: false, spoofCanvas: false });
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  useEffect(() => { if (isAutoFillComplete) { calculateAndShowSummary(); setIsAutoFillComplete(false); } }, [isAutoFillComplete]);

  const isSwitchingRef = useRef(false);
  const isAutoFillRunningRef = useRef(isAutoFillRunning);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const activeProxyRef = useRef<ValidProxy | null>(null);
  const isSwitchingProxyRef = useRef(isSwitchingProxy);

  useEffect(() => { isAutoFillRunningRef.current = isAutoFillRunning }, [isAutoFillRunning]);
  useEffect(() => { activeProxyRef.current = activeProxy; }, [activeProxy]);
  useEffect(() => { isSwitchingProxyRef.current = isSwitchingProxy; }, [isSwitchingProxy]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAutoFillRunning && autoFillStartTime) {
        interval = setInterval(() => {
            const elapsed = Date.now() - autoFillStartTime;
            setAutoFillElapsedTime(formatTime(elapsed));
            if (processedCount > 1) {
                const avgTimePerEmail = elapsed / processedCount;
                const totalEmails = emailData.split('\n').map(line => line.trim()).filter(line => line.length > 0 && line.includes('@')).length;
                const remainingEmails = totalEmails - processedCount;
                const etrMs = remainingEmails * avgTimePerEmail;
                setAutoFillETR(formatTime(etrMs));
            } else { setAutoFillETR('Calculating...'); }
        }, 1000);
    }
    return () => { if(interval) clearInterval(interval); };
  }, [isAutoFillRunning, autoFillStartTime, processedCount, emailData]);

  const notify = useCallback((title: string, options?: NotificationOptions) => { if (!notificationsEnabled || Notification.permission !== 'granted') return; new Notification(title, { ...options, silent: true }); }, [notificationsEnabled]);
  useEffect(() => { const savedPref = localStorage.getItem(NOTIFICATIONS_KEY); if (savedPref === 'true' && Notification.permission === 'granted') { setNotificationsEnabled(true); } }, []);
  const handleNotificationToggle = (enabled: boolean) => { if (enabled && Notification.permission !== 'granted') { Notification.requestPermission().then(permission => { if (permission === 'granted') { setNotificationsEnabled(true); localStorage.setItem(NOTIFICATIONS_KEY, 'true'); toast({ title: "Notifications Enabled" }); notify("Notifications are now active!"); } else { toast({ title: "Notifications Denied", description: "You can enable them in your browser settings.", variant: "destructive" }); } }); } else { setNotificationsEnabled(enabled); localStorage.setItem(NOTIFICATIONS_KEY, enabled ? 'true' : 'false'); if (!enabled) toast({ title: "Notifications Disabled" }); } };
  useEffect(() => { try { const savedProfiles = localStorage.getItem(PROFILES_KEY); if (savedProfiles) setProfiles(JSON.parse(savedProfiles)); } catch (error) { console.error("Could not load profiles", error); toast({ title: "Error", description: "Could not load saved profiles.", variant: "destructive" }); } }, [toast]);

  const handleSaveProfile = () => {
    const profileName = prompt("Enter a name for this profile:");
    if (!profileName) return;
    const newProfileData: ProfileData = { proxyInput, switchMode, rotationStrategy, switchInterval, switchRequestCount, emailData, targetUrl, delay, selectors, successKeyword, antiDetect };
    const updatedProfiles = { ...profiles, [profileName]: newProfileData };
    setProfiles(updatedProfiles);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(updatedProfiles));
    setSelectedProfile(profileName);
    toast({ title: "Profile Saved", description: `Configuration saved as "${profileName}".` });
  };

  const handleLoadProfile = (profileName: string) => {
    const profileData = profiles[profileName];
    if (!profileData) return;
    setProxyInput(profileData.proxyInput);
    setSwitchMode(profileData.switchMode);
    setRotationStrategy(profileData.rotationStrategy);
    setSwitchInterval(profileData.switchInterval);
    setSwitchRequestCount(profileData.switchRequestCount);
    setEmailData(profileData.emailData ?? "");
    setTargetUrl(profileData.targetUrl ?? "");
    setDelay(profileData.delay ?? 2);
    setSelectors(profileData.selectors ?? { emailSelector: '', submitSelector: '' });
    setSuccessKeyword(profileData.successKeyword ?? "");
    setAntiDetect(profileData.antiDetect ?? { randomizeTimings: false, simulateMouse: false, disguiseFingerprint: false, showBrowser: false, persistentSession: false, disableWebRTC: false, useMyScreenResolution: false, spoofTimezone: false, spoofGeolocation: false, spoofCanvas: false });
    setSelectedProfile(profileName);
    toast({ title: "Profile Loaded", description: `Loaded profile "${profileName}".` });
  };

  const handleDeleteProfile = (profileName: string) => {
    if (!window.confirm(`Are you sure you want to delete the profile "${profileName}"?`)) return;
    const updatedProfiles = { ...profiles };
    delete updatedProfiles[profileName];
    setProfiles(updatedProfiles);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(updatedProfiles));
    if (selectedProfile === profileName) setSelectedProfile("");
    toast({ title: "Profile Deleted", description: `Profile "${profileName}" has been deleted.` });
  };

  const handleExportProfiles = () => {
    if(Object.keys(profiles).length === 0) { toast({ title: "No Profiles to Export", description: "Save a profile before exporting.", variant: "destructive" }); return; }
    const dataStr = JSON.stringify(profiles, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'proxy-guardian-profiles.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportProfiles = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File is not readable");
            const importedProfiles = JSON.parse(text);
            if (typeof importedProfiles !== 'object' || importedProfiles === null) { throw new Error("Invalid file format"); }
            const updatedProfiles = { ...profiles, ...importedProfiles };
            setProfiles(updatedProfiles);
            localStorage.setItem(PROFILES_KEY, JSON.stringify(updatedProfiles));
            toast({ title: "Import Successful", description: `${Object.keys(importedProfiles).length} profiles were imported/updated.`});
        } catch (error) { toast({ title: "Import Failed", description: "The selected file is not a valid profile JSON file.", variant: "destructive" }); }
    };
    reader.readAsText(file);
    if(importFileInputRef.current) importFileInputRef.current.value = "";
  };

  const handleResetDowned = () => { setDownedProxies(new Map()); setManualRemovals(new Set()); toast({ title: "Downed & Removed Proxies Cleared", description: "All temporarily ignored proxies have been reset." }); };
  const handleStopSwitcher = useCallback(() => { setSwitcherStatus('stopped'); setRemainingTime(0); setSuccessfulRequests(0); setActiveProxy(null); notify("Proxy Switcher Stopped"); toast({ title: "Proxy switcher stopped" }); }, [notify, toast]);

  const switchProxy = useCallback(async (isInitialStart = false, initialDownedProxies?: Map<string, number>) => {
    if (isSwitchingRef.current) return;
    isSwitchingRef.current = true;
    if (!isInitialStart && loopCount > 0) { if (initialValidCount > 0 && switchCount >= (loopCount * initialValidCount) -1) { handleStopSwitcher(); toast({ title: "Loop Limit Reached", description: `Switcher stopped after completing ${loopCount} loop(s).` }); isSwitchingRef.current = false; return; } }
    const findNextWorkingProxy = async (): Promise<{ proxy: ValidProxy; newLatency: number } | null> => {
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const now = Date.now();
        const currentDowned = isInitialStart ? initialDownedProxies : downedProxies;
        let availableProxies = validProxies.filter(p => { if (!p.isValid) return false; if (manualRemovals.has(p.proxy)) return false; const failureTimestamp = currentDowned?.get(p.proxy); if (!failureTimestamp) return true; return (now - failureTimestamp) >= cooldownMs; });
        const countryList = countryFilterList.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
        const ispList = ispFilterList.split(',').map(i => i.trim().toLowerCase()).filter(i => i);
        if (filterMode === 'whitelist') { if (countryList.length > 0 || ispList.length > 0) { availableProxies = availableProxies.filter(p => { const countryMatch = countryList.length > 0 && p.country && countryList.includes(p.country.toUpperCase()); const ispMatch = ispList.length > 0 && p.isp && ispList.some(isp => p.isp!.toLowerCase().includes(isp)); return countryMatch || ispMatch; }); } } else { if (countryList.length > 0) { availableProxies = availableProxies.filter(p => !p.country || !countryList.includes(p.country.toUpperCase())); } if (ispList.length > 0) { availableProxies = availableProxies.filter(p => !p.isp || !ispList.some(isp => p.isp!.toLowerCase().includes(isp))); } }
        if (availableProxies.length === 0) { if (((currentDowned && currentDowned.size > 0) || manualRemovals.size > 0) && validProxies.some(p => p.isValid)) { notify("Proxy Rotation Reset", { body: "All proxies failed or were removed. Resetting lists." }); setDownedProxies(new Map()); setManualRemovals(new Set()); availableProxies = validProxies.filter(p => p.isValid); } else { return null; } }
        let basePool = availableProxies;
        let effectiveStrategy: RotationStrategy = rotationStrategy;
        if (rotationStrategy === 'prioritize-pinned') { const pinnedAndWorking = availableProxies.filter(p => p.isPinned); if (pinnedAndWorking.length > 0) { basePool = pinnedAndWorking; } effectiveStrategy = 'sequential'; }
        let rotationOrder: ValidProxy[] = [];
        switch(effectiveStrategy) {
            case 'random': rotationOrder = [...basePool].sort(() => Math.random() - 0.5); break;
            case 'health-based': rotationOrder = [...basePool].sort((a, b) => (b.healthScore ?? 0) - (a.healthScore ?? 0)); break;
            case 'latency-based': rotationOrder = [...basePool].sort((a, b) => (a.latency ?? 9999) - (b.latency ?? 9999)); break;
            case 'adaptive': rotationOrder = [...basePool].sort((a, b) => { const calculateScore = (p: ValidProxy) => { const stats = sessionStats[p.proxy] || { success: 1, fail: 0 }; const sessionScore = (stats.success + 1) / (stats.success + stats.fail + 2); const initialHealth = (p.healthScore ?? 50) / 100; const latency = p.latency ?? MAX_REASONABLE_LATENCY; const latencyScore = 1 - (Math.min(latency, MAX_REASONABLE_LATENCY) / MAX_REASONABLE_LATENCY); return (sessionScore * 0.5) + (latencyScore * 0.3) + (initialHealth * 0.2); }; return calculateScore(b) - calculateScore(a); }); break;
            case 'sequential': case 'aggressive': default: rotationOrder = [...basePool]; break;
        }
        const candidatePool: ValidProxy[] = [];
        const lastProxyIndex = activeProxy ? rotationOrder.findIndex(p => p.proxy === activeProxy.proxy) : -1;
        for(let i = 0; i < rotationOrder.length; i++) { const idx = (lastProxyIndex + 1 + i) % rotationOrder.length; candidatePool.push(rotationOrder[idx]); }
        for (const candidate of candidatePool) {
            if (candidate.proxy === activeProxy?.proxy && availableProxies.length > 1) continue;
            let result: TestResult;
            try { const response = await fetch('/api/test-connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proxy: candidate.proxy }) }); result = await response.json(); } catch (error) { result = { success: false, message: "Request failed." }; }
            if (result.success) { if (downedProxies.has(candidate.proxy)) { setDownedProxies(prev => { const newMap = new Map(prev); newMap.delete(candidate.proxy); return newMap; }); } return { proxy: candidate, newLatency: result.latency as number }; } else { notify("Proxy Failed Pre-Test", { body: `${candidate.proxy} is unresponsive.` }); setDownedProxies(prev => new Map(prev).set(candidate.proxy, Date.now())); }
        }
        return null;
    };
    const findProxyResult = await findNextWorkingProxy();
    if (findProxyResult) {
        const { proxy: nextProxy, newLatency } = findProxyResult;
        setValidProxies(currentProxies => {
            const proxyIndex = currentProxies.findIndex(p => p.proxy === nextProxy.proxy);
            if (proxyIndex === -1) return currentProxies;
            const newProxies = [...currentProxies];
            newProxies[proxyIndex] = { ...newProxies[proxyIndex], latency: newLatency, lastChecked: Date.now() };
            return newProxies;
        });
        const globalIndex = validProxies.findIndex(p => p.proxy === nextProxy.proxy);
        setCurrentProxyIndex(globalIndex);
        setActiveProxy(nextProxy);
        if (!isInitialStart) {
            const newSwitchCount = switchCount + 1;
            setSwitchCount(newSwitchCount);
            if (initialValidCount > 0 && newSwitchCount % initialValidCount === 0) { if (manualRemovals.size > 0) { setManualRemovals(new Set()); toast({ title: "Manual Removals Reset", description: "Proxies you removed are now back in the rotation." }); } }
        }
        setRemainingTime(switchInterval);
        if (!isInitialStart) { notify("Proxy Switched", { body: `Now using: ${nextProxy.proxy}` }); }
    } else {
        notify("No Working Proxies", { body: "Could not find a working proxy. Stopping switcher." });
        handleStopSwitcher();
    }
    isSwitchingRef.current = false;
  }, [validProxies, downedProxies, manualRemovals, activeProxy, switchInterval, rotationStrategy, notify, switchCount, loopCount, initialValidCount, cooldownMinutes, filterMode, countryFilterList, ispFilterList, handleStopSwitcher, toast, sessionStats]);

  const savedSwitchCallback = useRef<() => void>();
  useEffect(() => { savedSwitchCallback.current = () => switchProxy(false); });
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;
    let switcherInterval: NodeJS.Timeout | null = null;
    if (switcherStatus === 'running' && switchMode === 'time') {
      countdownInterval = setInterval(() => setRemainingTime(prev => Math.max(0, prev - 1)), 1000);
      switcherInterval = setInterval(() => { if (savedSwitchCallback.current) { savedSwitchCallback.current(); } }, switchInterval * 1000);
    }
    return () => { if (countdownInterval) clearInterval(countdownInterval); if (switcherInterval) clearInterval(switcherInterval); };
  }, [switcherStatus, switchInterval, switchMode]);

  const handleRequestSuccess = useCallback(() => { if (activeProxyRef.current) { const proxyKey = activeProxyRef.current.proxy; setSessionStats(prev => { const stats = prev[proxyKey] ?? { success: 0, fail: 0 }; return { ...prev, [proxyKey]: { ...stats, success: stats.success + 1 } }; }); } }, []);
  const handleRequestFailure = useCallback(() => { if (activeProxyRef.current) { const proxyKey = activeProxyRef.current.proxy; setSessionStats(prev => { const stats = prev[proxyKey] ?? { success: 0, fail: 0 }; return { ...prev, [proxyKey]: { ...stats, fail: stats.fail + 1 } }; }); } if (switcherStatus === 'running' && rotationStrategy === 'aggressive') { toast({ title: "Request Failed", description: "Aggressive mode: switching proxy.", variant: "destructive" }); switchProxy(false); } }, [switcherStatus, rotationStrategy, switchProxy, toast]);
  
  const handleStartSwitcher = async () => {
    let proxiesToUse = validProxies.filter(p => p.isValid);
    if (proxiesToUse.length === 0) { toast({ title: "No valid proxies", description: "Please check some proxies first.", variant: "destructive" }); return; }
    setConnectionLog([]);
    const newDownedProxies = new Map<string, number>();
    if (retestOnStart) {
        toast({ title: "Pre-testing all proxies..." });
        for (const proxy of proxiesToUse) {
            try { const response = await fetch('/api/test-connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proxy: proxy.proxy }) }); const result = await response.json(); if (!result.success) { newDownedProxies.set(proxy.proxy, Date.now()); } } catch (error) { newDownedProxies.set(proxy.proxy, Date.now()); }
        }
        const onlineCount = proxiesToUse.length - newDownedProxies.size;
        if (onlineCount === 0) { toast({ title: "No proxies passed the pre-test", description: "All valid proxies failed the initial check. Please check your proxies or network.", variant: "destructive" }); return; }
        toast({ title: "Pre-test complete", description: `${onlineCount} of ${proxiesToUse.length} proxies are online.` });
    }
    setDownedProxies(newDownedProxies);
    setManualRemovals(new Set());
    setInitialValidCount(proxiesToUse.length);
    setSwitchCount(0);
    setSuccessfulRequests(0);
    setSessionStats({});
    setSwitcherStatus('running');
    notify("Proxy Switcher Started");
    await switchProxy(true, newDownedProxies); // Added await here to ensure it finishes
  };

  const handlePauseSwitcher = () => setSwitcherStatus('paused');
  const handleResumeSwitcher = () => setSwitcherStatus('running');
  const handleManualSwitch = () => { if (switcherStatus !== 'running' || isSwitchingRef.current) return; switchProxy(false); };
  const handleSendToTop = (proxyToMoveString: string) => { setValidProxies(currentProxies => { const proxyToMove = currentProxies.find(p => p.proxy === proxyToMoveString); if (!proxyToMove) return currentProxies; const otherProxies = currentProxies.filter(p => p.proxy !== proxyToMoveString); const newOrder = [proxyToMove, ...otherProxies]; if (activeProxy) { const newIndexOfActiveProxy = newOrder.findIndex(p => p.proxy === activeProxy.proxy); if (newIndexOfActiveProxy !== -1) setCurrentProxyIndex(newIndexOfActiveProxy); } toast({ title: "Queue Updated", description: `${proxyToMove.proxy} is now at the top.` }); return newOrder; }); };
  const handleTestConnection = async (proxyToTest?: string) => {
    const proxy = proxyToTest || activeProxy?.proxy;
    if (!proxy) { toast({ title: "No active proxy to test", variant: "destructive" }); return; }
    const logId = genLogId();
    const pendingLog: ConnectionLogEntry = { id: logId, proxy, timestamp: new Date().toLocaleTimeString(), success: false, message: 'Testing...', status: 'pending' };
    setConnectionLog(prev => [pendingLog, ...prev].slice(0, 50));
    let result: TestResult;
    try { const response = await fetch('/api/test-connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proxy }) }); result = await response.json(); } catch (error) { result = { success: false, message: "Request failed." }; }
    setConnectionLog(prev => prev.map(l => l.id === logId ? { ...l, ...result, status: result.success ? 'success' : 'fail' } as ConnectionLogEntry : l ));
  };

  const handleTestCustomEndpoint = async (workerUrl: string) => {
    const proxy = activeProxy?.proxy;
    if (!proxy) { toast({ title: "No active proxy to test", variant: "destructive" }); return; }
    const logId = genLogId();
    const pendingLog: ConnectionLogEntry = { id: logId, proxy, timestamp: new Date().toLocaleTimeString(), success: false, message: `Testing against ${workerUrl}...`, status: 'pending' };
    setConnectionLog(prev => [pendingLog, ...prev].slice(0, 50));
    let result: TestResult;
    try { const response = await fetch('/api/custom-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proxy, targetUrl: workerUrl }) }); result = await response.json(); } catch (error) { result = { success: false, message: "Request failed to backend." }; }
    setConnectionLog(prev => prev.map(l => l.id === logId ? { ...l, ...result, status: result.success ? 'success' : 'fail' } as ConnectionLogEntry : l ));
  };

  const handleReTestProxy = useCallback(async (proxyToTest: string) => {
    const proxyIndex = validProxies.findIndex(p => p.proxy === proxyToTest);
    if (proxyIndex === -1) return;
    try {
        const response = await fetch('/api/test-connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proxy: proxyToTest }) });
        const result = await response.json();
        setValidProxies(currentProxies => {
            const updatedProxies = [...currentProxies];
            const pIndex = updatedProxies.findIndex(p => p.proxy === proxyToTest);
            if (pIndex === -1) return updatedProxies;
            updatedProxies[pIndex] = { ...updatedProxies[pIndex], lastChecked: Date.now() };
            if (result.success) {
                updatedProxies[pIndex].latency = result.latency;
                if (downedProxies.has(proxyToTest)) { const newDowned = new Map(downedProxies); newDowned.delete(proxyToTest); setDownedProxies(newDowned); }
                if (manualRemovals.has(proxyToTest)) { const newManual = new Set(manualRemovals); newManual.delete(proxyToTest); setManualRemovals(newManual); }
            } else { setDownedProxies(prev => new Map(prev).set(proxyToTest, Date.now())); }
            return updatedProxies;
        });
    } catch (error) { toast({ title: "Error during re-test", description: `Failed to connect to backend for ${proxyToTest}`, variant: "destructive" }); }
  }, [validProxies, downedProxies, manualRemovals, toast]);

  const handleTempRemove = (proxyToRemove: string) => { setManualRemovals(prev => new Set(prev).add(proxyToRemove)); toast({ title: "Proxy Removed for One Cycle", description: `${proxyToRemove} will be skipped for one full rotation.` }); };
  const handleReenableProxy = (proxyToReenable: string) => { if (manualRemovals.has(proxyToReenable)) { const newManualRemovals = new Set(manualRemovals); newManualRemovals.delete(proxyToReenable); setManualRemovals(newManualRemovals); toast({ title: "Proxy Re-enabled", description: `${proxyToReenable} is now back in the rotation.` }); } };
  useEffect(() => { if (isSwitchingProxy) { const performSwitch = async () => { await switchProxy(false); setSuccessfulRequests(0); setIsSwitchingProxy(false); }; performSwitch(); } }, [isSwitchingProxy, switchProxy]);
  useEffect(() => { if (!isSwitchingProxy && isAutoFillRunning && switcherStatus === 'running' && switchMode === 'requests' && rotationStrategy !== 'aggressive' && successfulRequests > 0 && successfulRequests >= switchRequestCount) { setIsSwitchingProxy(true); } }, [successfulRequests, isAutoFillRunning, switcherStatus, switchMode, switchRequestCount, rotationStrategy, isSwitchingProxy]);
  const handleClearAutoFillDashboard = () => { setShowAutoFillDashboard(false); setProcessedCount(0); setAutoFillProgress(0); setAutoFillStartTime(null); setAutoFillElapsedTime('00:00:00'); setAutoFillETR('Calculating...'); };

  const calculateAndShowSummary = () => {
    const totalSuccess = Object.values(sessionStats).reduce((acc, stat) => acc + stat.success, 0);
    const totalFail = Object.values(sessionStats).reduce((acc, stat) => acc + stat.fail, 0);
    const totalProcessed = totalSuccess + totalFail;
    const successRate = totalProcessed > 0 ? (totalSuccess / totalProcessed) * 100 : 0;
    const sortedBySuccess = Object.entries(sessionStats).sort(([, a], [, b]) => b.success - a.success);
    const sortedByFail = Object.entries(sessionStats).sort(([, a], [, b]) => b.fail - a.fail);
    setSessionSummary({ totalRunTime: autoFillElapsedTime, totalProcessed: processedCount, totalSuccess, totalFail, successRate, bestProxy: sortedBySuccess.length > 0 ? { name: sortedBySuccess[0][0], successes: sortedBySuccess[0][1].success } : null, worstProxy: sortedByFail.length > 0 ? { name: sortedByFail[0][0], fails: sortedByFail[0][1].fail } : null });
    setIsSummaryDialogOpen(true);
  };

  const handleStartAutoFill = async () => {
    const emails = emailData.split('\n').map(line => line.trim()).filter(line => line.length > 0 && line.includes('@'));
    if (emails.length === 0) {
      toast({ title: "No emails to process", variant: "destructive" });
      return;
    }

    handleClearAutoFillDashboard();
    setShowAutoFillDashboard(true);
    setSessionData(null);

    if (autoFillMode === 'switcher' && switcherStatus === 'stopped') {
      toast({ title: "Auto-starting Proxy Switcher..." });
      await handleStartSwitcher(); 
      setSwitcherStartedByAutoFill(true);
    } else {
      setSwitcherStartedByAutoFill(false);
    }

    setIsAutoFillRunning(true);
    isAutoFillRunningRef.current = true;
    setConnectionLog([]);
    setAutoFillStartTime(Date.now());
    toast({ title: "Auto-fill started", description: `Processing ${emails.length} emails.` });
    
    const processEmailAtIndex = async (index: number) => {
      if (!isAutoFillRunningRef.current || index >= emails.length) {
        if (isAutoFillRunningRef.current) { toast({ title: "Auto-fill completed" }); setIsAutoFillComplete(true); }
        setIsAutoFillRunning(false);
        isAutoFillRunningRef.current = false;
        setCurrentEmail("");
        if (switcherStartedByAutoFill) { handleStopSwitcher(); setSwitcherStartedByAutoFill(false); }
        return;
      }
      if (autoFillMode === 'switcher' && switcherStatus !== 'running') { toast({ title: "Auto-fill Paused", description: "Proxy switcher is not running.", variant: "destructive" }); setIsAutoFillRunning(false); isAutoFillRunningRef.current = false; setIsAutoFillComplete(true); return; }
      while (isSwitchingProxyRef.current) { await sleep(50); }
      const currentProxyForRequest = autoFillMode === 'switcher' ? activeProxyRef.current?.proxy : null;
      if (autoFillMode === 'switcher' && !currentProxyForRequest) {
        toast({ title: "Proxy became unavailable", description: "Waiting for a new proxy...", variant: "destructive" });
        await sleep(2000);
        if(!activeProxyRef.current) { setIsAutoFillRunning(false); isAutoFillRunningRef.current = false; if (switcherStartedByAutoFill) { handleStopSwitcher(); setSwitcherStartedByAutoFill(false); } setIsAutoFillComplete(true); return; }
        processEmailAtIndex(index);
        return;
      }
      setCurrentEmail(emails[index]);
      const logId = genLogId();
      const pendingLog: ConnectionLogEntry = { id: logId, proxy: currentProxyForRequest || "Direct", timestamp: new Date().toLocaleTimeString(), success: false, message: `Submitting for ${emails[index]}...`, status: 'pending' };
      setConnectionLog(prev => [pendingLog, ...prev].slice(0, 50));
      let requestSucceeded = false;
      let finalMessage = '';
      let sourceContent = null;
      try {
        const currentActiveProxy = validProxies.find(p => p.proxy === activeProxyRef.current?.proxy);
        const requestBody: any = { 
            email: emails[index], 
            targetUrl, 
            proxy: currentProxyForRequest, 
            selectors, 
            successKeyword, 
            antiDetect, 
            sessionData, 
            timezone: currentActiveProxy?.timezone,
            latitude: currentActiveProxy?.latitude,
            longitude: currentActiveProxy?.longitude
        };
        
        if (antiDetect.useMyScreenResolution) { requestBody.screen = { width: window.screen.width, height: window.screen.height }; }
        const response = await fetch('/api/auto-fill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        const result = await response.json();
        finalMessage = result.message || (response.ok ? 'Submission successful.' : 'Submission failed.');
        sourceContent = result.sourceContent;
        if (result.sessionData) { setSessionData(result.sessionData); }
        if (!response.ok) { throw new Error(JSON.stringify(result)); }
        requestSucceeded = true;
      } catch (error: any) {
        let errorMessage = error.message;
        try { const errorResult = JSON.parse(error.message); errorMessage = errorResult.message; if(errorResult.sourceContent) { sourceContent = errorResult.sourceContent; } } catch (e) { /* Not a JSON error */ }
        finalMessage = errorMessage;
        toast({ title: "Submission Error", description: errorMessage, variant: "destructive" });
      }
      setConnectionLog(prev => prev.map(l => l.id === logId ? { ...l, success: requestSucceeded, status: requestSucceeded ? 'success' : 'fail', message: finalMessage, sourceContent } : l));
      setProcessedCount(prev => prev + 1);
      setAutoFillProgress(((index + 1) / emails.length) * 100);
      if (autoFillMode === 'switcher') { if (requestSucceeded) { handleRequestSuccess(); setSuccessfulRequests(prev => prev + 1); } else { handleRequestFailure(); } }
      if (index < emails.length - 1) { await sleep(delay * 1000); processEmailAtIndex(index + 1); } else { processEmailAtIndex(index + 1); }
    };
    processEmailAtIndex(0);
  };

  const handleStopAutoFill = () => { isAutoFillRunningRef.current = false; setIsAutoFillRunning(false); setIsAutoFillComplete(true); toast({ title: "Auto-fill stopping..." }); };
  const handleClearConnectionLog = () => { setConnectionLog([]); toast({ title: "Connection log cleared" }); };
  const handleClearResults = () => { setCheckerResults(prev => prev.filter(r => r.isPinned)); toast({ title: "Cleared unpinned results." }); }
  useEffect(() => { try { const savedPinned = localStorage.getItem(PINNED_PROXIES_KEY); if (savedPinned) { setPinnedProxies(JSON.parse(savedPinned)); } } catch (error) { console.error("Could not load pinned proxies", error); } }, []);
  const handleSetPinned = (proxiesToPin: string[], pinStatus: boolean) => { const newPinnedSet = new Set(pinnedProxies); if (pinStatus) { proxiesToPin.forEach(p => newPinnedSet.add(p)); } else { proxiesToPin.forEach(p => newPinnedSet.delete(p)); } const newPinnedArray = Array.from(newPinnedSet); setPinnedProxies(newPinnedArray); localStorage.setItem(PINNED_PROXIES_KEY, JSON.stringify(newPinnedArray)); };
  useEffect(() => { const pinnedStrings = new Set(pinnedProxies); setCheckerResults(prevResults => prevResults.map(r => ({ ...r, isPinned: pinnedStrings.has(r.proxy) }))); }, [pinnedProxies]);
  const isCheckingRef = useRef(isChecking);
  useEffect(() => { isCheckingRef.current = isChecking; }, [isChecking]);
  const handleProxiesValidated = (proxies: ValidProxy[]) => { 
    // We remove the debug log now that we know the data is arriving correctly
    setValidProxies(proxies); 
    if(switcherStatus !== 'stopped') { 
      toast({ title: "Proxy List Updated", description: "The list of proxies for the switcher has been updated." }); 
    } 
  };

  const checkProxy = async (proxy: string, targetUrl: string, checkCount: number, provider: string, apiKey: string, contentCheckString: string): Promise<ValidProxy> => { try { const response = await fetch('/api/check-proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proxy, targetUrl, checkCount, provider, apiKey, expectedString: contentCheckString }) }); if (!response.ok) { throw new Error(`API request failed with status ${response.status}`); } const data = await response.json(); return { ...data, isPinned: pinnedProxies.includes(proxy), lastChecked: Date.now() }; } catch (error: any) { return { proxy, isValid: false, apiType: 'Error', portType: 'Error', healthScore: 0, isPinned: pinnedProxies.includes(proxy), lastChecked: Date.now() }; } };
  const handleCheckProxies = async (rateLimit: string, targetUrl: string, checkCount: number, provider: string, apiKey: string, contentCheckString: string) => {
    isCheckingRef.current = true; setIsChecking(true);
    if (!proxyInput.trim()) { toast({ title: "No proxies to check", variant: "destructive" }); setIsChecking(false); isCheckingRef.current = false; return; }
    handleClearAutoFillDashboard();
    setProgress(0);
    const pinned = checkerResults.filter(r => r.isPinned);
    const pinnedStrings = pinned.map(p => p.proxy);
    const proxiesToCheck = proxyInput.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !pinnedStrings.includes(line));
    setCheckerResults(pinned);
    const newResults: ValidProxy[] = [];
    const requestsPerMinute = parseInt(rateLimit, 10);
    const delay = requestsPerMinute > 0 ? 60000 / requestsPerMinute : 0;
    for (let i = 0; i < proxiesToCheck.length; i++) {
      if (!isCheckingRef.current) { toast({ title: "Process Aborted", description: `Checked ${i} of ${proxiesToCheck.length} proxies.` }); break; }
      const result = await checkProxy(proxiesToCheck[i], targetUrl, checkCount, provider, apiKey, contentCheckString);
      newResults.push(result);
      setCheckerResults([...pinned, ...newResults]);
      setProgress(((i + 1) / proxiesToCheck.length) * 100);
      if (i < proxiesToCheck.length - 1 && delay > 0) { await sleep(delay); }
    }
    if (isCheckingRef.current) { const finalResults = [...pinned, ...newResults]; const validCount = finalResults.filter(r => r.isValid).length; toast({ title: "Proxy check completed", description: `${validCount}/${finalResults.length} proxies are valid.` }); }
    isCheckingRef.current = false; setIsChecking(false);
  };

  const handleRecheckProxies = async (proxiesToRecheck: string[], targetUrl: string, checkCount: number, provider: string, apiKey: string) => { setIsChecking(true); toast({ title: "Re-checking selected proxies..." }); for (let i = 0; i < proxiesToRecheck.length; i++) { const proxy = proxiesToRecheck[i]; const result = await checkProxy(proxy, targetUrl, checkCount, provider, apiKey, ''); setCheckerResults(prevResults => prevResults.map(p => p.proxy === proxy ? result : p)); } setIsChecking(false); toast({ title: "Re-check complete!" }); };
  const handleRemoveResults = (proxiesToRemove: string[]) => { const pinnedStrings = checkerResults.filter(r => r.isPinned).map(r => r.proxy); const unpinnedToRemove = proxiesToRemove.filter(p => !pinnedStrings.includes(p)); if (proxiesToRemove.length > 0 && unpinnedToRemove.length === 0) { toast({ title: "Cannot remove pinned proxies.", variant: "destructive"}); return; } setCheckerResults(prev => prev.filter(r => !unpinnedToRemove.includes(r.proxy))); toast({ title: `Removed ${unpinnedToRemove.length} proxies from results.` }); };
  const handleAbort = () => { isCheckingRef.current = false; setIsChecking(false); };
  useEffect(() => { const BATCH_SIZE = 5; const CHECK_INTERVAL_MS = 3 * 60 * 1000; const intervalId = setInterval(() => { if (validProxies.length > 0 && !isCheckingRef.current && switcherStatus === 'stopped' && !isAutoFillRunningRef.current) { const sortedByOldest = [...validProxies].sort((a, b) => (a.lastChecked || 0) - (b.lastChecked || 0)); const proxiesToRecheck = sortedByOldest.slice(0, BATCH_SIZE); if (proxiesToRecheck.length > 0) { console.log(`Performing background health check on ${proxiesToRecheck.length} proxies...`); proxiesToRecheck.forEach(proxy => { handleReTestProxy(proxy.proxy); }); } } }, CHECK_INTERVAL_MS); return () => clearInterval(intervalId); }, [validProxies, switcherStatus, handleReTestProxy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <SessionSummaryDialog isOpen={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen} summary={sessionSummary} />
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Proxy Guardian Automator</h1>
          <p className="text-gray-300 text-lg">Professional proxy management, validation, and automation suite</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader><CardTitle className="text-white">Profile Management</CardTitle></CardHeader>
                <CardContent className="flex items-center space-x-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" className="flex-1 bg-slate-900/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white"><FolderOpen className="w-4 h-4 mr-2"/>{selectedProfile || "Load Profile"}</Button></DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                            <DropdownMenuLabel>Select a profile</DropdownMenuLabel><DropdownMenuSeparator />
                            {Object.keys(profiles).length > 0 ? Object.keys(profiles).map(name => (<DropdownMenuItem key={name} onSelect={() => handleLoadProfile(name)} className="flex justify-between items-center">{name}<Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-900/50" onClick={(e) => {e.stopPropagation(); handleDeleteProfile(name);}}><Trash2 className="w-4 h-4" /></Button></DropdownMenuItem>)) : <DropdownMenuItem disabled>No profiles saved</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={handleSaveProfile} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2"/>Save</Button>
                    <div className="flex items-center space-x-2 border-l pl-2 ml-2">
                        <Button onClick={() => importFileInputRef.current?.click()} variant="outline" size="icon" className="bg-slate-900/50 border-slate-600 text-white hover:bg-slate-700"><Upload className="w-4 h-4" /></Button>
                        <input type="file" ref={importFileInputRef} onChange={handleImportProfiles} accept=".json" className="hidden"/>
                        <Button onClick={handleExportProfiles} variant="outline" size="icon" className="bg-slate-900/50 border-slate-600 text-white hover:bg-slate-700"><Download className="w-4 h-4" /></Button>
                    </div>
                </CardContent>
            </Card>
             <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader><CardTitle className="text-white">Settings</CardTitle></CardHeader>
                <CardContent className="flex items-center space-x-2 justify-center pt-6">
                   <div className="flex items-center space-x-2">
                        <Bell className="text-white"/>
                        <Label htmlFor="notifications-switch" className="text-white">Desktop Notifications</Label>
                        <Switch id="notifications-switch" checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} />
                    </div>
                </CardContent>
            </Card>
        </div>
        <Tabs defaultValue="checker" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="checker" className="flex items-center space-x-2 data-[state=active]:bg-blue-600"><Shield className="w-4 h-4" /><span>Proxy Checker</span></TabsTrigger>
            <TabsTrigger value="switcher" className="flex items-center space-x-2 data-[state=active]:bg-purple-600"><RotateCcw className="w-4 h-4" /><span>Proxy Switcher</span></TabsTrigger>
            <TabsTrigger value="autofill" className="flex items-center space-x-2 data-[state=active]:bg-green-600"><FormInput className="w-4 h-4" /><span>Auto Fill</span></TabsTrigger>
            <TabsTrigger value="ip-tester" className="flex items-center space-x-2 data-[state=active]:bg-lime-600"><TestTube2 className="w-4 h-4" /><span>IP Tester</span></TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2 data-[state=active]:bg-orange-600"><PieChart className="w-4 h-4" /><span>Analytics</span></TabsTrigger>
          </TabsList>
          {showAutoFillDashboard && (
            <Card className="bg-slate-800/50 border-slate-700 relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white" onClick={handleClearAutoFillDashboard}>
                    <X className="h-4 w-4" />
                </Button>
                <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                            <CardDescription className="flex items-center justify-center gap-2"><ListTodo className="w-4 h-4"/><span>Progress</span></CardDescription>
                            <p className="text-2xl font-bold text-white">{processedCount} / {emailData.split('\n').map(line => line.trim()).filter(line => line.length > 0 && line.includes('@')).length}</p>
                        </div>
                        <div className="space-y-1">
                            <CardDescription className="flex items-center justify-center gap-2"><TimerIcon className="w-4 h-4"/><span>Time Elapsed</span></CardDescription>
                            <p className="text-2xl font-bold text-white font-mono">{autoFillElapsedTime}</p>
                        </div>
                        <div className="space-y-1">
                            <CardDescription className="flex items-center justify-center gap-2"><Hourglass className="w-4 h-4"/><span>{isAutoFillRunning ? 'Est. Time Remaining' : 'Total Time Taken'}</span></CardDescription>
                            <p className="text-2xl font-bold text-white font-mono">{isAutoFillRunning ? autoFillETR : autoFillElapsedTime}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
          )}
          <TabsContent value="checker" className="space-y-6">
            <ProxyChecker onProxiesValidated={handleProxiesValidated} proxyInput={proxyInput} onProxyInputChange={setProxyInput} results={checkerResults} isChecking={isChecking} progress={progress} onCheckProxies={handleCheckProxies} onAbort={handleAbort} onClearResults={handleClearResults} onRemoveResults={handleRemoveResults} onRecheckProxies={handleRecheckProxies} onSetPinned={handleSetPinned}/>
          </TabsContent>
          <TabsContent value="switcher" className="space-y-6">
            <ProxySwitcher validProxies={validProxies} onTestConnection={handleTestConnection} onReTestProxy={handleReTestProxy} onTempRemove={handleTempRemove} onReenableProxy={handleReenableProxy} testResult={null} connectionLog={connectionLog} onClearLog={handleClearConnectionLog} sessionStats={sessionStats} switcherStatus={switcherStatus} switchInterval={switchInterval} setSwitchInterval={setSwitchInterval} remainingTime={remainingTime} switchCount={switchCount} successfulRequests={successfulRequests} switchRequestCount={switchRequestCount} setSwitchRequestCount={setSwitchRequestCount} loopCount={loopCount} setLoopCount={setLoopCount} cooldownMinutes={cooldownMinutes} setCooldownMinutes={setCooldownMinutes} retestOnStart={retestOnStart} setRetestOnStart={setRetestOnStart} filterMode={filterMode} setFilterMode={setFilterMode} countryFilterList={countryFilterList} setCountryFilterList={setCountryFilterList} ispFilterList={ispFilterList} setIspFilterList={setIspFilterList} switchMode={switchMode} setSwitchMode={setSwitchMode} rotationStrategy={rotationStrategy} setRotationStrategy={setRotationStrategy} onStart={handleStartSwitcher} onStop={handleStopSwitcher} onPause={handlePauseSwitcher} onResume={handleResumeSwitcher} onManualSwitch={handleManualSwitch} onSendToTop={handleSendToTop} onResetDowned={handleResetDowned} currentProxyIndex={currentProxyIndex} downedProxies={downedProxies} manualRemovals={manualRemovals} />
          </TabsContent>
          <TabsContent value="autofill" className="space-y-6">
            <AutoFillForm activeProxy={activeProxy} onStartAutoFill={handleStartAutoFill} onStopAutoFill={handleStopAutoFill} isRunning={isAutoFillRunning} progress={autoFillProgress} processedCount={processedCount} currentEmail={currentEmail} autoFillMode={autoFillMode} setAutoFillMode={setAutoFillMode} emailData={emailData} setEmailData={setEmailData} targetUrl={targetUrl} setTargetUrl={setTargetUrl} delay={delay} setDelay={setDelay} selectors={selectors} setSelectors={setSelectors} successKeyword={successKeyword} setSuccessKeyword={setSuccessKeyword} antiDetect={antiDetect} setAntiDetect={setAntiDetect} sessionData={sessionData} setSessionData={setSessionData} />
          </TabsContent>
          <TabsContent value="ip-tester" className="space-y-6">
            <IpTester activeProxy={activeProxy} onTestEndpoint={handleTestCustomEndpoint} />
           </TabsContent>
           <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard validProxies={validProxies} sessionStats={sessionStats} connectionLog={connectionLog} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;