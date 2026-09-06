"use client";
// app/(dashboard)/admin/dashboard/page.tsx
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  Users, Building2, Briefcase, TrendingUp, AlertCircle,
  Clock, LayoutDashboard, ChevronRight, ScrollText, UserPlus, FileEdit, Trash2, Mail,
  Calendar, CheckCircle2, Award
} from "lucide-react";
import { StatsCard } from "@/components/admin/StatsCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts";

interface CustomBatchTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomBatchTooltip = ({ active, payload, label }: CustomBatchTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const data = item?.payload;
  if (!data) return null;

  const total = Number(data.total ?? 0);
  const employed = Number(data.employed ?? 0);
  const employedPct = Number(data.employed_pct ?? 0);
  const reported = Number(data.reported ?? 0);

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/80 rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-[200px]">
      <div className="flex items-center justify-between border-b border-border/50 pb-1.5 gap-2">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <Award size={13} className="text-pclu-sky-500" />
          Batch Cohort {label}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          Academic Track
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Employment Rate:</span>
          <span className="font-bold text-pclu-sky-500">{employedPct}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Employed Graduates:</span>
          <span className="font-medium text-foreground">{employed} of {total}</span>
        </div>
        {reported > 0 && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-0.5 border-t border-border/30">
            <span>Survey Submissions:</span>
            <span>{reported} alumni</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface SummaryStats {
  totalAlumni: number;
  approvedEmployers: number;
  activeJobPostings: number;
  totalApplications: number;
  overallEmploymentRate: number;
  reportedEmploymentRate?: number;
  totalReportedAlumni?: number;
}

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  profiles: { full_name: string; role: string };
}

interface ChartData {
  employmentStatusBreakdown: Array<{ status: string; label: string; count: number }>;
  employmentByBatchYear: Array<{
    batch_year: string;
    total: number;
    reported: number;
    employed: number;
    employed_pct: number;
    reported_employed_pct?: number;
    unemployed_pct: number;
  }>;
}

const PIE_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#64748b"];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [cohortRange, setCohortRange] = useState<"recent" | "all">("recent");

  // Active current date in 2026
  const currentDate = new Date();
  const formattedCurrentDate = format(currentDate, "EEEE, MMMM d, yyyy");

  useEffect(() => {
    Promise.all([
      fetch("/api/reports").then(r => r.json()),
      fetch("/api/admin/audit-logs?limit=5").then(r => r.json())
    ]).then(([reportsData, auditData]) => {
      setStats(reportsData.summaryStats);
      setCharts({
        employmentStatusBreakdown: reportsData.employmentStatusBreakdown ?? [],
        employmentByBatchYear: reportsData.employmentByBatchYear ?? []
      });
      setAuditLogs(auditData.data || []);
      setLoading(false);
    }).catch(error => {
      console.error("Dashboard fetch error:", error);
      setLoading(false);
    });
  }, []);

  const quickActions = [
    { href: "/admin/employers", label: "Review Employers", icon: Building2, color: "text-amber-500", glow: "group-hover:bg-amber-500/10" },
    { href: "/admin/jobs", label: "Moderate Jobs", icon: Briefcase, color: "text-violet-500", glow: "group-hover:bg-violet-500/10" },
    { href: "/admin/alumni", label: "Manage Alumni", icon: Users, color: "text-cyan-500", glow: "group-hover:bg-cyan-500/10" },
    { href: "/admin/announcements/new", label: "New Announcement", icon: AlertCircle, color: "text-emerald-500", glow: "group-hover:bg-emerald-500/10" },
  ];

  const getActionIcon = (action: string) => {
    if (action.includes("CREATE") || action.includes("APPROVE") || action.includes("RESTORE")) return <UserPlus size={14} className="text-emerald-500" />;
    if (action.includes("UPDATE") || action.includes("EDIT")) return <FileEdit size={14} className="text-amber-500" />;
    if (action.includes("DELETE") || action.includes("REVOKE") || action.includes("REJECT") || action.includes("ARCHIVE")) return <Trash2 size={14} className="text-rose-500" />;
    if (action.includes("MESSAGE") || action.includes("EMAIL")) return <Mail size={14} className="text-blue-500" />;
    return <ScrollText size={14} className="text-muted-foreground" />;
  };

  const getActionFormat = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const hasStatusData = (charts?.employmentStatusBreakdown ?? []).some(d => d.count > 0);
  const batchData = charts?.employmentByBatchYear ?? [];
  const displayedBatches = cohortRange === "recent"
    ? batchData.filter(b => Number(b.batch_year) >= 2021)
    : batchData;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner with 2026 Temporal Awareness */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-border/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Command Center</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live 2026 System
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              Polytechnic College of La Union • AICTS Administrative Center
            </p>
          </div>
        </div>

        {/* Temporal & Action Widgets */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex flex-col sm:items-end text-xs text-muted-foreground bg-muted/40 px-3.5 py-2 rounded-xl border border-border/50">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Calendar size={13} className="text-pclu-sky-500" />
              <span>{formattedCurrentDate}</span>
            </div>
            <span className="text-[11px] opacity-75">Academic Year 2025–2026 • 1st Semester</span>
          </div>

          <Link href="/admin/reports" className={cn(buttonVariants({ size: "default" }), "bg-pclu-sky-600 hover:bg-pclu-sky-700 shadow-md shadow-pclu-sky-500/20 shrink-0")}>
            <TrendingUp size={16} className="mr-2" /> Full Analytics
          </Link>
        </div>
      </div>

      {/* High-End Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Active Alumni"
          value={loading ? "—" : stats?.totalAlumni ?? 0}
          icon={Users}
          color="blue"
          description="Excludes archived profiles"
          loading={loading}
        />
        <StatsCard
          title="Approved Employers"
          value={loading ? "—" : stats?.approvedEmployers ?? 0}
          icon={Building2}
          color="green"
          description="Active corporate partners"
          loading={loading}
        />
        <StatsCard
          title="Active Job Posts"
          value={loading ? "—" : stats?.activeJobPostings ?? 0}
          icon={Briefcase}
          color="amber"
          description="Live & unexpired for 2026"
          loading={loading}
        />
        <StatsCard
          title="Employment Rate"
          value={loading ? "—" : `${stats?.overallEmploymentRate ?? 0}%`}
          icon={TrendingUp}
          color="purple"
          description={
            stats?.reportedEmploymentRate !== undefined && stats.totalReportedAlumni
              ? `${stats.reportedEmploymentRate}% of reported (${stats.totalReportedAlumni})`
              : "Deduplicated active cohort"
          }
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Live Analytics (Charts) - Spans 2 Columns */}
        <div className="xl:col-span-2 space-y-6">
          <div className="glass p-6 rounded-2xl border border-white/10 shadow-sm relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pclu-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 relative z-10">
              <h2 className="text-xl font-heading font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="text-pclu-sky-500" size={20} /> System Analytics Overview
              </h2>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-pclu-sky-500/10 text-pclu-sky-500 border border-pclu-sky-500/20 flex items-center gap-1.5 w-fit">
                <Calendar size={12} /> Active Tracking (2026)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              {/* Pie Chart: Employment Status */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">Employment Status</h3>
                {loading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <Skeleton className="w-[200px] h-[200px] rounded-full" />
                  </div>
                ) : !hasStatusData ? (
                  <div className="h-[250px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl bg-muted/20">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                      <Briefcase size={20} />
                    </div>
                    <p className="text-sm font-medium text-foreground">Awaiting 2026 Career Data</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                      No active alumni career status records submitted yet for this period.
                    </p>
                  </div>
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={charts?.employmentStatusBreakdown?.filter(d => d.count > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="label"
                          stroke="none"
                        >
                          {charts?.employmentStatusBreakdown?.filter(d => d.count > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {/* Custom Legend */}
                {hasStatusData && (
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {charts?.employmentStatusBreakdown?.filter(d => d.count > 0).map((entry, index) => (
                      <div key={entry.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                        {entry.label} ({entry.count})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bar Chart: Employment Rate by Batch */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Employment by Batch</h3>
                  <div className="flex items-center p-0.5 rounded-lg bg-muted/60 text-[11px] font-medium border border-border/50 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setCohortRange("recent")}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                        cohortRange === "recent" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Recent (2021–2026)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCohortRange("all")}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                        cohortRange === "all" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All Recorded Batches
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="h-[250px] w-full flex items-end gap-2 pb-4">
                    <Skeleton className="w-full h-1/2" /><Skeleton className="w-full h-full" /><Skeleton className="w-full h-3/4" /><Skeleton className="w-full h-1/4" />
                  </div>
                ) : displayedBatches.length === 0 ? (
                  <div className="h-[250px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl bg-muted/20">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                      <Award size={20} />
                    </div>
                    <p className="text-sm font-medium text-foreground">No Graduate Batches</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                      No active alumni registered for this selected batch range.
                    </p>
                  </div>
                ) : (
                  <ClientOnly fallback={<div className="h-[250px] w-full bg-muted/20 animate-pulse rounded-xl" />}>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={displayedBatches}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="batch_year" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                          <RechartsTooltip 
                            content={<CustomBatchTooltip />}
                            cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                          />
                          <Bar dataKey="employed_pct" name="Employed %" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ClientOnly>
                )}
                {displayedBatches.length > 0 && (
                  <p className="text-[11px] text-center text-muted-foreground mt-2">
                    {cohortRange === "recent"
                      ? "Displaying active 2021–2026 trajectory (deduplicated cohorts)"
                      : "Displaying all recorded historical alumni batches"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Command Center Actions & Feed */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="glass p-6 rounded-2xl border border-white/10 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3">
              {quickActions.map(({ href, label, icon: Icon, color, glow }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group relative flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 overflow-hidden",
                    glow
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Icon size={24} className={cn("transition-transform group-hover:scale-110 relative z-10", color)} />
                  <span className="text-xs font-semibold text-foreground text-center relative z-10">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Live System Activity (Audit Logs) */}
          <div className="glass p-6 rounded-2xl border border-white/10 shadow-sm relative overflow-hidden flex flex-col h-[350px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pclu-yellow-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} /> Live System Feed
              </h2>
              <Link href="/admin/audit-logs" className="text-xs text-pclu-sky-500 hover:underline flex items-center">
                View all <ChevronRight size={12} />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 relative z-10 custom-scrollbar">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-3/4 bg-muted rounded" />
                      <div className="h-2 w-1/2 bg-muted rounded" />
                    </div>
                  </div>
                ))
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                  <ScrollText size={32} className="mb-2" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                auditLogs.map((log, index) => (
                  <div key={log.id} className="relative flex gap-3 group">
                    {/* Timeline connecting line */}
                    {index !== auditLogs.length - 1 && (
                      <div className="absolute top-8 left-4 w-px h-full bg-border -ml-px group-hover:bg-primary/20 transition-colors" />
                    )}
                    
                    <div className="relative z-10 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                      {getActionIcon(log.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0 pb-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {log.profiles?.full_name || "System"} <span className="font-normal text-muted-foreground">performed</span> {getActionFormat(log.action)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                        <span className="opacity-40">•</span>
                        <span className="text-[11px] opacity-75">{format(new Date(log.created_at), "MMM d, yyyy • h:mm a")}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
