import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, Trophy, Clock, BarChart, CheckCircle, XCircle } from "lucide-react";

// This interface defines the structure of the data our component will receive
export interface SessionSummaryData {
  totalRunTime: string;
  totalProcessed: number;
  totalSuccess: number;
  totalFail: number;
  successRate: number;
  bestProxy: { name: string; successes: number } | null;
  worstProxy: { name: string; fails: number } | null;
}

interface SessionSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  summary: SessionSummaryData | null;
}

export const SessionSummaryDialog = ({ isOpen, onOpenChange, summary }: SessionSummaryDialogProps) => {
  if (!summary) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="text-yellow-400" />
            Session Summary Report
          </DialogTitle>
          <DialogDescription>
            Here is a summary of the completed auto-fill session.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4 text-center">
            <Card className="bg-slate-900/50 pt-6">
                <CardContent>
                    <Clock className="mx-auto h-8 w-8 text-blue-400 mb-2" />
                    {/* MODIFIED: Changed text color to white */}
                    <p className="text-2xl font-bold text-white">{summary.totalRunTime}</p>
                    <p className="text-sm text-slate-300">Total Run Time</p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900/50 pt-6">
                 <CardContent>
                    <BarChart className="mx-auto h-8 w-8 text-purple-400 mb-2" />
                     {/* MODIFIED: Changed text color to white */}
                    <p className="text-2xl font-bold text-white">{summary.successRate.toFixed(1)}%</p>
                    <p className="text-sm text-slate-300">Success Rate</p>
                </CardContent>
            </Card>
             <Card className="bg-slate-900/50 pt-6">
                 <CardContent>
                    <CheckCircle className="mx-auto h-8 w-8 text-green-400 mb-2" />
                     {/* MODIFIED: Changed text color to white */}
                    <p className="text-2xl font-bold text-white">{summary.totalSuccess} / {summary.totalProcessed}</p>
                    <p className="text-sm text-slate-300">Successful Submissions</p>
                </CardContent>
            </Card>
             <Card className="bg-slate-900/50 pt-6">
                 <CardContent>
                    <XCircle className="mx-auto h-8 w-8 text-red-400 mb-2" />
                     {/* MODIFIED: Changed text color to white */}
                    <p className="text-2xl font-bold text-white">{summary.totalFail}</p>
                    <p className="text-sm text-slate-300">Failed Submissions</p>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-4">
            {summary.bestProxy && (
                 <Card className="bg-slate-900 border-green-500">
                    <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
                        <ThumbsUp className="w-8 h-8 text-green-500" />
                        <div>
                            <CardTitle className="text-base text-white">Top Performing Proxy</CardTitle>
                            <p className="font-mono text-white">{summary.bestProxy.name}</p>
                            <p className="text-sm text-slate-300">{summary.bestProxy.successes} successes</p>
                        </div>
                    </CardHeader>
                </Card>
            )}
             {summary.worstProxy && (
                 <Card className="bg-slate-900 border-orange-500">
                    <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
                        <ThumbsDown className="w-8 h-8 text-orange-500" />
                        <div>
                            <CardTitle className="text-base text-white">Worst Performing Proxy</CardTitle>
                             <p className="font-mono text-white">{summary.worstProxy.name}</p>
                            <p className="text-sm text-slate-300">{summary.worstProxy.fails} failures</p>
                        </div>
                    </CardHeader>
                </Card>
            )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="bg-blue-600 hover:bg-blue-700">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};