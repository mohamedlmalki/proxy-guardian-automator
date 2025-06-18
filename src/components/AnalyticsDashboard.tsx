import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useMemo } from 'react';
import { ValidProxy, SessionStat, ConnectionLogEntry } from "@/pages/Index";

interface AnalyticsDashboardProps {
  validProxies: ValidProxy[];
  sessionStats: Record<string, SessionStat>;
  connectionLog: ConnectionLogEntry[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#FF6B6B', '#4ECDC4', '#556270', '#C7F464'];

const CustomPieChart = ({ data, title, description }: { data: {name: string, value: number}[], title: string, description: string }) => (
    <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
            <CardTitle className="text-white">{title}</CardTitle>
            <CardDescription className="text-gray-400">{description}</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {data.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}/>
                </PieChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
);


export const AnalyticsDashboard = ({ validProxies, sessionStats, connectionLog }: AnalyticsDashboardProps) => {
  
  const processDataForPieChart = (key: keyof ValidProxy) => {
    const counts: Record<string, number> = {};
    validProxies.forEach(p => {
        if(p.isValid && p[key]) {
            const value = p[key] as string;
            counts[value] = (counts[value] || 0) + 1;
        }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }

  const countryData = useMemo(() => processDataForPieChart('country'), [validProxies]);
  const ispData = useMemo(() => processDataForPieChart('isp'), [validProxies]);
  const anonymityData = useMemo(() => processDataForPieChart('anonymity'), [validProxies]);

  const performanceData = useMemo(() => {
    return Object.entries(sessionStats)
      .map(([proxy, stats]) => ({ proxy, ...stats }))
      .sort((a, b) => (b.success + b.fail) - (a.success + a.fail))
      .slice(0, 10);
  }, [sessionStats]);
  
  const latencyData = useMemo(() => {
    return connectionLog
      .filter(log => log.success && log.latency)
      .map(log => ({ time: log.timestamp, latency: log.latency }))
      .reverse();
  }, [connectionLog]);
  
  const totalSuccesses = Object.values(sessionStats).reduce((acc, stat) => acc + stat.success, 0);
  const totalFails = Object.values(sessionStats).reduce((acc, stat) => acc + stat.fail, 0);
  const totalTests = totalSuccesses + totalFails;
  const successRate = totalTests > 0 ? (totalSuccesses / totalTests) * 100 : 0;

  if (validProxies.length === 0) {
    return (
        <div className="flex items-center justify-center h-96 text-gray-500">
            <p>No proxy data to analyze. Please check some proxies first.</p>
        </div>
    )
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader><CardTitle className="text-white">Total Successes</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-green-400">{totalSuccesses}</p></CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader><CardTitle className="text-white">Total Fails</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-red-400">{totalFails}</p></CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader><CardTitle className="text-white">Session Success Rate</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-sky-400">{successRate.toFixed(1)}%</p></CardContent>
            </Card>
        </div>

      <div className="grid gap-6 md:grid-cols-3">
        <CustomPieChart data={countryData} title="Proxies by Country" description="Geographic distribution of your proxies." />
        <CustomPieChart data={ispData} title="Proxies by ISP" description="Distribution by Internet Service Provider." />
        <CustomPieChart data={anonymityData} title="Proxies by Anonymity" description="Privacy level distribution." />
      </div>
      
       <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white">Session Performance</CardTitle>
                <CardDescription className="text-gray-400">Success vs. Fail counts for the most used proxies.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData} layout="vertical" margin={{ right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                        <XAxis type="number" stroke="#888888" />
                        <YAxis type="category" dataKey="proxy" width={110} stroke="#888888" fontSize={10} interval={0} />
                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }} />
                        <Legend />
                        <Bar dataKey="success" stackId="a" fill="#22C55E" name="Successes" />
                        <Bar dataKey="fail" stackId="a" fill="#EF4444" name="Fails" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white">Latency Over Time</CardTitle>
                <CardDescription className="text-gray-400">Connection speed of successful tests during the session.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={latencyData}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                        <XAxis dataKey="time" stroke="#888888" />
                        <YAxis stroke="#888888" label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }} />
                        <Legend />
                        <Line type="monotone" dataKey="latency" stroke="#38BDF8" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
            </Card>
       </div>
    </div>
  );
};