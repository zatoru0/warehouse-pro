import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";

async function getJobs() {
  return prisma.receivingJob.findMany({
    include: {
      receiver: { select: { full_name: true } },
      supplier: { select: { name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400",
  COMPLETED: "bg-green-500/10 text-green-400",
  CANCELLED: "bg-muted text-muted-foreground",
};

const TYPE_LABELS: Record<string, string> = {
  NEW_GOODS: "New Goods",
  CLAIM: "Claim",
  REPAIR: "Repair",
  PARTS: "Parts",
  RETURN: "Return",
};

export default async function ReceivingPage() {
  const jobs = await getJobs();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Receiving Jobs</h2>
        <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Link href="/receiving/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Receiving
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Job #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Supplier</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lines</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Received By</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/receiving/${job.id}`}
                        className="font-mono text-xs font-medium text-amber-400 hover:underline"
                      >
                        {job.job_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TYPE_LABELS[job.receiving_type]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{job.supplier?.name ?? "—"}</td>
                    <td className="px-4 py-3">{job._count.lines}</td>
                    <td className="px-4 py-3 text-muted-foreground">{job.receiver.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(job.created_at), "dd MMM yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[job.status] ?? ""}`}
                      >
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No receiving jobs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
