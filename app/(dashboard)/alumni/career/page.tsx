"use client";
// app/(dashboard)/alumni/career/page.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Briefcase, Plus, Pencil, Trash2, Loader2, CheckCircle2, 
  Archive, ArchiveRestore, Building2, MapPin, Calendar, 
  DollarSign, Sparkles, TrendingUp, Layers, Award,
  Clock, ShieldCheck, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceStrict, differenceInMonths, differenceInYears } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CareerRecordDialog } from "@/components/alumni/CareerRecordDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CareerRecordInput } from "@/lib/validations/career.schema";

interface CareerRecord {
  id: string;
  employment_status: "employed" | "self_employed" | "unemployed" | "ofw" | "further_study" | "retired";
  employer_name?: string;
  job_title?: string;
  industry?: string;
  employment_type?: string;
  salary_range?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  country: string;
  city?: string;
  job_description?: string;
  created_at: string;
  is_archived?: boolean;
  archived_at?: string;
}

const SALARY_LABELS: Record<string, string> = {
  below_15k: "Below ₱15k",
  "15k_25k": "₱15k–₱25k",
  "25k_35k": "₱25k–₱35k",
  "35k_50k": "₱35k–₱50k",
  "50k_75k": "₱50k–₱75k",
  above_75k: "Above ₱75k",
};

const EMP_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contractual: "Contractual",
  freelance: "Freelance",
  internship: "Internship",
};

export default function AlumniCareerPage() {
  const [records, setRecords] = useState<CareerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<CareerRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "archived">("active");

  const [activeCount, setActiveCount] = useState<number>(0);
  const [archivedCount, setArchivedCount] = useState<number>(0);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel fetch to keep counts accurate across both tabs
      const [currRes, archRes] = await Promise.all([
        fetch("/api/alumni/career?archived=false"),
        fetch("/api/alumni/career?archived=true"),
      ]);

      const [currJson, archJson] = await Promise.all([
        currRes.json(),
        archRes.json(),
      ]);

      const activeList: CareerRecord[] = currJson.data ?? [];
      const archivedList: CareerRecord[] = archJson.data ?? [];

      setActiveCount(activeList.length);
      setArchivedCount(archivedList.length);

      setRecords(tab === "active" ? activeList : archivedList);
    } catch (err) {
      console.error("Error loading career records:", err);
      toast.error("Failed to load career records");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { 
    fetchRecords(); 
  }, [fetchRecords]);

  const handleSave = async (data: CareerRecordInput, id?: string) => {
    try {
      const res = await fetch(id ? `/api/alumni/career/${id}` : "/api/alumni/career", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { 
        const errorMsg = typeof json.error === "string" 
          ? json.error 
          : "Please review form fields and try again.";
        toast.error(`Failed to save record: ${errorMsg}`); 
        throw new Error(JSON.stringify(json.error)); 
      }
      toast.success(id ? "Career milestone updated successfully!" : "New career milestone logged!");
      await fetchRecords();
    } catch (err) {
      console.error("Save career error:", err);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/alumni/career/${deleteId}`, { method: "DELETE" });
      if (!res.ok) { 
        toast.error("Failed to archive career record"); 
        return; 
      }
      toast.success("Career record moved to archive");
      setDeleteId(null);
      await fetchRecords();
    } catch (err) {
      console.error("Archive error:", err);
      toast.error("Network error while archiving");
    }
  };

  const handleRestore = async () => {
    if (!restoreId) return;
    try {
      const res = await fetch(`/api/alumni/career/${restoreId}/restore`, { method: "POST" });
      if (!res.ok) { 
        toast.error("Failed to restore career record"); 
        return; 
      }
      toast.success("Career record restored to active timeline");
      setRestoreId(null);
      await fetchRecords();
    } catch (err) {
      console.error("Restore error:", err);
      toast.error("Network error while restoring");
    }
  };

  // Compute Current Position / Headline
  const currentPosition = useMemo(() => {
    return records.find(r => r.is_current) || null;
  }, [records]);

  // Helper to format tenure duration
  const getTenureString = (startDate?: string, endDate?: string, isCurrent?: boolean) => {
    if (!startDate) return null;
    try {
      const start = new Date(startDate);
      const end = isCurrent ? new Date() : (endDate ? new Date(endDate) : new Date());
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

      const totalMonths = Math.max(1, differenceInMonths(end, start));
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;

      if (years > 0 && months > 0) return `${years} yr${years > 1 ? "s" : ""} ${months} mo${months > 1 ? "s" : ""}`;
      if (years > 0) return `${years} yr${years > 1 ? "s" : ""}`;
      return `${months} mo${months > 1 ? "s" : ""}`;
    } catch {
      return null;
    }
  };

  // Helper for initial avatars
  const getInitials = (name?: string) => {
    if (!name) return "PCLU";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join("");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <PageHeader 
        icon={Briefcase} 
        title="Career Journey" 
        description="Track your professional milestones, current employment status, and career progression at PCLU."
      >
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20"
          onClick={() => { setEditRecord(null); setDialogOpen(true); }}
        >
          <Plus size={15} className="mr-1.5" /> Log Milestone
        </Button>
      </PageHeader>

      {/* Career Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Active Status */}
        <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Status</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            {currentPosition ? (
              <div className="flex items-center gap-2">
                <StatusBadge status={currentPosition.employment_status} />
              </div>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">Status not specified</span>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              {currentPosition?.is_current ? "Active Verified Employment" : "Pending update"}
            </p>
          </div>
        </div>

        {/* Card 2: Current Position */}
        <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Headline Role</span>
            <div className="w-8 h-8 rounded-lg bg-pclu-sky-500/10 text-pclu-sky-500 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="mt-3 truncate">
            <p className="text-base font-bold text-foreground truncate">
              {currentPosition?.job_title ?? "No current role"}
            </p>
            <p className="text-xs text-primary font-medium mt-0.5 truncate">
              {currentPosition?.employer_name ?? "Update your current company"}
            </p>
          </div>
        </div>

        {/* Card 3: Milestones Count */}
        <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Career Depth</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{activeCount}</span>
              <span className="text-xs text-muted-foreground">active milestones</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {archivedCount > 0 ? `${archivedCount} archived items preserved` : "Complete employment trace"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs with Live Numeric Pills */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              tab === "active" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Briefcase size={13} />
            <span>Active Timeline</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              tab === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("archived")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              tab === "archived" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Archive size={13} />
            <span>Archived History</span>
            {archivedCount > 0 && (
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                tab === "archived" ? "bg-rose-500/10 text-rose-500" : "bg-muted text-muted-foreground"
              )}>
                {archivedCount}
              </span>
            )}
          </button>
        </div>

        {tab === "active" && records.length > 0 && (
          <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
            <Clock size={12} /> Ordered chronologically
          </span>
        )}
      </div>

      {/* Main List / Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted/30 border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={tab === "active" ? "No Career Records Logged" : "No Archived Records"}
          description={
            tab === "active"
              ? "Share your career milestones to help PCLU understand graduate career outcomes and unlock personalized opportunities."
              : "You do not have any archived career positions. Archived records can always be restored."
          }
          action={
            tab === "active" ? (
              <Button 
                size="sm" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20"
                onClick={() => { setEditRecord(null); setDialogOpen(true); }}
              >
                <Plus size={14} className="mr-1.5" /> Log Your First Milestone
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="relative">
          {/* Vertical Timeline Rail on Left */}
          <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary/30 via-border to-transparent hidden md:block" />

          <div className="space-y-4">
            {records.map((record) => {
              const tenure = getTenureString(record.start_date, record.end_date, record.is_current);
              const initials = getInitials(record.employer_name);

              return (
                <div key={record.id} className="relative md:pl-16 group">
                  {/* Timeline Node Badge */}
                  <div className={cn(
                    "absolute left-0 top-6 hidden md:flex w-12 h-12 rounded-2xl border items-center justify-center font-bold text-xs shadow-sm transition-transform duration-300 group-hover:scale-105",
                    record.is_current
                      ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                      : "bg-card text-muted-foreground border-border/80"
                  )}>
                    {record.is_current ? (
                      <CheckCircle2 size={20} className="text-primary-foreground" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  {/* Career Record Card */}
                  <div className={cn(
                    "bg-card/70 backdrop-blur-md rounded-2xl border p-5 sm:p-6 transition-all duration-200 hover:shadow-lg hover:border-primary/30 relative overflow-hidden",
                    record.is_current 
                      ? "border-primary/40 shadow-sm ring-1 ring-primary/10" 
                      : "border-border/80 shadow-xs"
                  )}>
                    {/* Top Row: Status Badges & Quick Actions */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <StatusBadge status={record.employment_status} />

                          {record.is_current && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Current Position
                            </span>
                          )}

                          {record.employment_type && (
                            <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border/60 px-2 py-0.5 rounded-md">
                              {EMP_TYPE_LABELS[record.employment_type] || record.employment_type}
                            </span>
                          )}

                          {record.salary_range && (
                            <span className="text-[11px] font-medium text-pclu-sky-600 dark:text-pclu-sky-400 bg-pclu-sky-500/10 border border-pclu-sky-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <DollarSign size={11} />
                              {SALARY_LABELS[record.salary_range] || record.salary_range}
                            </span>
                          )}
                        </div>

                        {/* Title & Employer */}
                        <h3 className="text-lg font-bold text-foreground">
                          {record.job_title ?? record.employment_status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </h3>

                        {record.employer_name && (
                          <p className="text-sm font-semibold text-primary mt-0.5 flex items-center gap-1.5">
                            <Building2 size={14} className="shrink-0" />
                            <span>{record.employer_name}</span>
                          </p>
                        )}

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                          {/* Dates */}
                          <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                            <Calendar size={13} className="text-pclu-sky-500 shrink-0" />
                            <span>
                              {record.start_date ? format(new Date(record.start_date), "MMM yyyy") : "Date not specified"}
                              {" — "}
                              {record.is_current ? "Present" : (record.end_date ? format(new Date(record.end_date), "MMM yyyy") : "—")}
                            </span>
                            {tenure && (
                              <span className="text-[11px] text-muted-foreground font-normal">
                                ({tenure})
                              </span>
                            )}
                          </div>

                          {/* Location */}
                          {(record.city || record.country) && (
                            <div className="flex items-center gap-1">
                              <MapPin size={13} className="text-muted-foreground shrink-0" />
                              <span>
                                {[record.city, record.country].filter(Boolean).join(", ")}
                              </span>
                            </div>
                          )}

                          {/* Industry */}
                          {record.industry && (
                            <span className="text-muted-foreground/80">
                              • {record.industry}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {record.job_description && (
                          <p className="text-xs text-muted-foreground/90 mt-3 pt-3 border-t border-border/40 leading-relaxed max-w-3xl whitespace-pre-line">
                            {record.job_description}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {tab === "active" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
                              onClick={() => { setEditRecord(record); setDialogOpen(true); }}
                              title="Edit Record"
                            >
                              <Pencil size={13} className="mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                              onClick={() => setDeleteId(record.id)}
                              title="Archive Record"
                            >
                              <Archive size={13} className="mr-1" /> Archive
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                            onClick={() => setRestoreId(record.id)}
                            title="Restore Record"
                          >
                            <ArchiveRestore size={13} className="mr-1.5" /> Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit / Create Dialog */}
      <CareerRecordDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSave={handleSave}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editData={(editRecord as any) ?? undefined}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Archive Career Record"
        description="Are you sure you want to archive this career record? It will be safely moved to your Archived History tab without permanent data loss."
        confirmLabel="Archive Record"
        confirmVariant="default"
      />

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        open={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={handleRestore}
        title="Restore Career Record"
        description="Are you sure you want to restore this record? It will reappear on your active timeline and be calculated in active career analytics."
        confirmLabel="Restore Record"
        confirmVariant="default"
      />
    </div>
  );
}
