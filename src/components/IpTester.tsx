import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TestTube2, AlertTriangle } from "lucide-react";
import { ValidProxy } from "@/pages/Index";

interface IpTesterProps {
    activeProxy: ValidProxy | null;
    onTestEndpoint: (workerUrl: string) => void;
}

export const IpTester = ({ activeProxy, onTestEndpoint }: IpTesterProps) => {
    const [workerUrl, setWorkerUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleTestClick = async () => {
        if (!activeProxy || !workerUrl) return;

        setIsLoading(true);
        await onTestEndpoint(workerUrl);
        setIsLoading(false);
    };

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                    <TestTube2 className="w-5 h-5 text-lime-400" />
                    <span>IP Tester</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                    Verify the switcher by sending a request from the active proxy to your own endpoint (e.g., a Cloudflare Worker). Results will appear in the main Connection Log.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="workerUrl" className="text-white">Your Worker/Endpoint URL</Label>
                    <Input 
                        id="workerUrl" 
                        placeholder="https://...workers.dev/log" 
                        value={workerUrl} 
                        onChange={(e) => setWorkerUrl(e.target.value)} 
                        disabled={isLoading}
                        className="bg-slate-900/50 border-slate-600 text-white" 
                    />
                </div>
                <Button 
                    onClick={handleTestClick} 
                    disabled={!activeProxy || !workerUrl || isLoading}
                    className="w-full bg-lime-600 hover:bg-lime-700"
                >
                    {isLoading ? "Testing..." : "Send Test Request"}
                </Button>
                
                 {!activeProxy && !isLoading && (
                     <div className="p-3 mt-4 text-center text-sm text-red-400 bg-red-900/20 border-red-500/30 rounded-lg flex items-center justify-center space-x-2">
                        <AlertTriangle className="w-4 h-4" />
                        <p>The Proxy Switcher must be running to use the IP Tester.</p>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
};