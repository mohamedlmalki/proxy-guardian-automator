import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TestTube2, AlertTriangle } from "lucide-react";
import { ValidProxy } from "@/pages/Index";

interface IpTesterProps {
    activeProxy: ValidProxy | null;
}

export const IpTester = ({ activeProxy }: IpTesterProps) => {
    const [workerUrl, setWorkerUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [resultMessage, setResultMessage] = useState("");
    const [resultSuccess, setResultSuccess] = useState<boolean | null>(null);
    const [responseData, setResponseData] = useState<any | null>(null);


    const handleTestClick = async () => {
        if (!activeProxy || !workerUrl) return;

        setIsLoading(true);
        setResultMessage("");
        setResponseData(null);
        setResultSuccess(null);

        try {
            const response = await fetch('http://localhost:3001/api/custom-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // *** FIX: Send the workerUrl directly as the targetUrl ***
                body: JSON.stringify({
                    proxy: activeProxy.proxy,
                    targetUrl: workerUrl,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setResultSuccess(true);
                setResultMessage(`Success! Request logged by the worker. Latency: ${data.latency}ms.`);
                setResponseData(data.data);
            } else {
                setResultSuccess(false);
                setResultMessage(`Error: ${data.message || 'An unknown error occurred.'}`);
                setResponseData(data.data); // Also show data on error if available
            }

        } catch (error) {
            setResultSuccess(false);
            setResultMessage("Failed to connect to the backend. Is it running?");
            console.error("Failed to fetch:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getResultClasses = () => {
        if (resultSuccess === null) return "text-yellow-300 bg-yellow-900/20 border-yellow-500/30";
        return resultSuccess 
            ? "text-green-300 bg-green-900/20 border-green-500/30" 
            : "text-red-300 bg-red-900/20 border-red-500/30";
    }

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                    <TestTube2 className="w-5 h-5 text-lime-400" />
                    <span>IP Tester</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                    Verify the switcher by sending a request from the active proxy to your own endpoint (e.g., a Cloudflare Worker).
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
                
                {resultMessage && (
                    <div className={`p-3 mt-4 text-center text-sm rounded-lg border ${getResultClasses()}`}>
                        <p>{resultMessage}</p>
                    </div>
                )}

                {responseData && (
                    <div className="p-4 mt-2 bg-slate-900 rounded-lg">
                        <Label className="text-white">Response from Worker:</Label>
                        <pre className="text-xs text-slate-300 mt-2 p-3 bg-slate-950 rounded-md overflow-x-auto">
                            {JSON.stringify(responseData, null, 2)}
                        </pre>
                    </div>
                )}

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