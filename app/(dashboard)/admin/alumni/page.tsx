"use client";
// app/(dashboard)/admin/alumni/page.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Download,
  Archive,
  RotateCcw,
  GraduationCap,
  Clock,
  FileCheck,
  ShieldCheck,
  Check,
  XCircle,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PCLU_COURSES, BATCH_YEARS } from "@/lib/constants/courses";
import { exportToCSV, exportToExcel } from "@/lib/utils/export";
import { ClearanceSlip, type ClearanceSlipData } from "@/components/alumni/ClearanceSlip";

interface AlumniRecord {
  id: string;
  student_id?: string | null;
  studentIdNumber?: string | null;
  course: string;
  major?: string | null;
  batch_year: number;
  graduation_year: number;
  city?: string | null;
  province?: string | null;
  is_profile_public: boolean;
  clearanceStatus?: "PENDING" | "SUBMITTED" | "CLEARED" | "REJECTED" | string;
  profileCompleteness?: number;
  clearanceRemarks?: string | null;
  clearanceToken?: string | null;
  submittedAt?: string | null;
  clearedAt?: string | null;
  clearedById?: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    phone?: string | null;
    is_verified: boolean;
    is_active: boolean;
  };
  career_records: Array<{
    employment_status: string;
    job_title?: string;
    employer_name?: string;
    is_current: boolean;
  }>;
}

const FILTER_TABS = ["active", "archived", "all"] as const;

export default function AdminAlumniPage() {
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [clearanceFilter, setClearanceFilter] = useState("all");
  const [tab, setTab] = useState<typeof FILTER_TABS[number]>("active");
  const [counts, setCounts] = useState({ all: 0, active: 0, archived: 0 });
  const [kpiData, setKpiData] = useState({
    total: 0,
    pending: 0,
    submitted: 0,
    cleared: 0,
    rejected: 0,
  });

  // Selection for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog targets
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ ids: string[]; name: string } | null>(null);
  const [approveConfirm, setApproveConfirm] = useState<{ ids: string[]; name: string } | null>(null);
  const [previewSlipTarget, setPreviewSlipTarget] = useState<ClearanceSlipData | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const fetchAlumni = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      status: tab,
    });
    if (search) params.set("search", search);
    if (course) params.set("course", course);
    if (batchYear) params.set("batch_year", batchYear);
    if (clearanceFilter && clearanceFilter !== "all") {
      params.set("clearance_status", clearanceFilter);
    }

    try {
      const res = await fetch(`/api/admin/alumni?${params}`);
      const json = await res.json();
      setAlumni(json.data ?? []);
      setTotal(json.count ?? 0);
      if (json.counts) {
        setCounts(json.counts);
      }
      if (json.clearanceKPIs) {
        setKpiData(json.clearanceKPIs);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load alumni records");
    } finally {
      setLoading(false);
    }
  }, [page, search, course, batchYear, tab, clearanceFilter]);

  useEffect(() => {
    fetchAlumni();
  }, [fetchAlumni]);

  // Bulk selection toggles
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(alumni.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export cleared list to CSV
  const handleExportClearedCSV = async () => {
    try {
      toast.loading("Preparing cleared batch list...");
      // Fetch full cleared list
      const res = await fetch("/api/admin/alumni?clearance_status=CLEARED&pageSize=1000");
      const json = await res.json();
      const clearedRecords: AlumniRecord[] = json.data ?? [];

      if (clearedRecords.length === 0) {
        toast.dismiss();
        toast.info("No cleared alumni records found to export.");
        return;
      }

      const rows = clearedRecords.map((a) => ({
        "Student ID Number": a.studentIdNumber || a.student_id || "N/A",
        "Full Name": a.profiles?.full_name ?? "",
        Email: a.profiles?.email ?? "",
        Phone: a.profiles?.phone ?? "",
        Course: a.course ?? "",
        Major: a.major ?? "",
        "Batch Year": a.batch_year ?? "",
        "Graduation Year": a.graduation_year ?? "",
        "Clearance Status": a.clearanceStatus ?? "CLEARED",
        "Clearance Token": a.clearanceToken ?? "",
        "Date Cleared": a.clearedAt ? format(new Date(a.clearedAt), "yyyy-MM-dd HH:mm") : "",
      }));

      exportToCSV(
        rows,
        `PCLU_Cleared_Graduating_Batch_${batchYear || "All"}_${format(new Date(), "yyyyMMdd")}`
      );
      toast.dismiss();
      toast.success(`Exported ${rows.length} cleared alumni records to CSV!`);
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Failed to export cleared list");
    }
  };

  // Export full table to Excel
  const handleExportExcel = () => {
    const rows = alumni.map((a) => ({
      "Student ID": a.studentIdNumber || a.student_id || "",
      "Full Name": a.profiles?.full_name,
      Email: a.profiles?.email,
      Status: a.profiles?.is_active === false ? "Archived" : "Active",
      Course: a.course,
      "Batch Year": a.batch_year,
      "Graduation Year": a.graduation_year,
      "Completeness (%)": a.profileCompleteness ?? 0,
      "Clearance Status": a.clearanceStatus ?? "PENDING",
      "Clearance Token": a.clearanceToken ?? "",
      Employment: a.career_records?.find((c) => c.is_current)?.employment_status ?? "Unknown",
      "Job Title": a.career_records?.find((c) => c.is_current)?.job_title ?? "",
      Verified: a.profiles?.is_verified ? "Yes" : "No",
      Registered: format(new Date(a.created_at), "yyyy-MM-dd"),
    }));

    exportToExcel(
      rows,
      `PCLU_Alumni_${tab}_${format(new Date(), "yyyyMMdd")}`,
      "Alumni"
    );
    toast.success("Excel sheet downloaded!");
  };

  // Clearance Actions
  const handleApproveClearance = async (ids: string[]) => {
    try {
      const res = await fetch("/api/admin/alumni/clearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE", ids }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to approve clearance");
      }
      toast.success(
        ids.length > 1
          ? `Successfully approved clearance for ${ids.length} candidates!`
          : "Alumni clearance approved and token generated!"
      );
      setSelectedIds([]);
      fetchAlumni();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to approve clearance");
    } finally {
      setApproveConfirm(null);
    }
  };

  const handleRejectClearance = async (ids: string[], remarks?: string) => {
    try {
      const res = await fetch("/api/admin/alumni/clearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", ids, remarks }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to reject clearance");
      }
      toast.success(
        ids.length > 1
          ? `Returned/rejected clearance for ${ids.length} candidates.`
          : "Clearance returned with remarks."
      );
      setSelectedIds([]);
      fetchAlumni();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to reject clearance");
    } finally {
      setRejectDialog(null);
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    const selectedRecords = alumni.filter((a) => selectedIds.includes(a.id));
    const incomplete = selectedRecords.filter((a) => (a.profileCompleteness ?? 0) < 100);

    if (incomplete.length > 0) {
      toast.error(
        `Cannot approve batch: ${incomplete.length} selected student(s) have incomplete profiles (<100%).`
      );
      return;
    }

    setApproveConfirm({
      ids: selectedIds,
      name: `${selectedIds.length} candidate(s)`,
    });
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) return;
    setRejectDialog({
      ids: selectedIds,
      name: `${selectedIds.length} candidate(s)`,
    });
  };

  // Archive & Restore
  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      const res = await fetch(`/api/admin/alumni/${archiveTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to archive");
      toast.success(`Alumni "${archiveTarget.name}" has been archived successfully`);
      fetchAlumni();
    } catch (err) {
      console.error(err);
      toast.error("Failed to archive alumni account");
    } finally {
      setArchiveTarget(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      const res = await fetch(`/api/admin/alumni/${restoreTarget.id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to restore");
      toast.success(`Alumni "${restoreTarget.name}" account restored successfully!`);
      fetchAlumni();
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore alumni account");
    } finally {
      setRestoreTarget(null);
    }
  };

  const currentStatus = (records: AlumniRecord["career_records"]) =>
    records?.find((r) => r.is_current)?.employment_status;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Alumni & Pre-Graduation Clearance Management"
        description={`${counts.active} active alumni registered • ${kpiData.cleared} cleared for graduation`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleExportClearedCSV}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm font-semibold"
          >
            <Download size={14} /> Export Cleared List (CSV)
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-1.5">
            <FileSpreadsheet size={14} /> Export Excel
          </Button>
        </div>
      </PageHeader>

      {/* Graduating Batch Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Graduating */}
        <div
          onClick={() => {
            setClearanceFilter("all");
            setPage(1);
          }}
          className={`cursor-pointer rounded-2xl border p-5 transition-all hover:shadow-md ${
            clearanceFilter === "all"
              ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
              : "border-border bg-card hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Graduating Batch
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <GraduationCap size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-foreground tabular-nums">{kpiData.total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Active candidates for graduation</p>
        </div>

        {/* Pending */}
        <div
          onClick={() => {
            setClearanceFilter("PENDING");
            setPage(1);
          }}
          className={`cursor-pointer rounded-2xl border p-5 transition-all hover:shadow-md ${
            clearanceFilter === "PENDING"
              ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/20 shadow-sm"
              : "border-border bg-card hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending (&lt;100%)
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-500 tabular-nums">{kpiData.pending}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Incomplete clearance form</p>
        </div>

        {/* Submitted */}
        <div
          onClick={() => {
            setClearanceFilter("SUBMITTED");
            setPage(1);
          }}
          className={`cursor-pointer rounded-2xl border p-5 transition-all hover:shadow-md ${
            clearanceFilter === "SUBMITTED"
              ? "border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/20 shadow-sm"
              : "border-border bg-card hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Submitted (Review)
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <FileCheck size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-black text-sky-500 tabular-nums">{kpiData.submitted}</p>
            {kpiData.submitted > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">
                Ready for Review
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">100% complete, awaiting sign-off</p>
        </div>

        {/* Cleared */}
        <div
          onClick={() => {
            setClearanceFilter("CLEARED");
            setPage(1);
          }}
          className={`cursor-pointer rounded-2xl border p-5 transition-all hover:shadow-md ${
            clearanceFilter === "CLEARED"
              ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20 shadow-sm"
              : "border-border bg-card hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cleared
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-500 tabular-nums">{kpiData.cleared}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Officially cleared for graduation</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {FILTER_TABS.map((t) => {
          const label =
            t === "active" ? "Active Alumni" : t === "archived" ? "Recently Archived" : "All Accounts";
          const countVal = counts[t];
          return (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setPage(1);
                setSelectedIds([]);
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label} <span className="ml-1.5 text-xs opacity-60">({countVal})</span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student ID, name, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9"
          />
        </div>

        {/* Clearance Status Filter */}
        <Select
          value={clearanceFilter}
          onValueChange={(v) => {
            setClearanceFilter(v || "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[190px] h-9">
            <SelectValue placeholder="Clearance Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clearance Status</SelectItem>
            <SelectItem value="PENDING">Pending (&lt;100%)</SelectItem>
            <SelectItem value="SUBMITTED">Submitted (Review)</SelectItem>
            <SelectItem value="CLEARED">Cleared</SelectItem>
            <SelectItem value="REJECTED">Action Required / Rejected</SelectItem>
          </SelectContent>
        </Select>

        {/* Course Filter */}
        <Select
          value={course}
          onValueChange={(v) => {
            setCourse(v === "all" ? "" : v || "");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {PCLU_COURSES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Batch Year Filter */}
        <Select
          value={batchYear}
          onValueChange={(v) => {
            setBatchYear(v === "all" ? "" : v || "");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Batch Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {BATCH_YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Sticky Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-3.5 bg-primary/10 border border-primary/30 rounded-xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle2Icon size={18} />
            <span>{selectedIds.length} candidate(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleBulkApprove}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 gap-1.5"
            >
              <Check size={14} /> Approve Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkReject}
              className="border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs h-8 gap-1.5"
            >
              <XCircle size={14} /> Return / Reject Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="text-xs h-8 text-muted-foreground"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Alumni Records Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : alumni.length === 0 ? (
        <EmptyState
          icon={Users}
          title={tab === "archived" ? "No Archived Alumni" : "No Alumni Found"}
          description={
            tab === "archived"
              ? "There are no archived alumni accounts at this time."
              : "No alumni match your current search and clearance filter criteria."
          }
        />
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === alumni.length && alumni.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                    Course & Batch
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Completion
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Clearance Status
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alumni.map((a) => {
                  const isArchived = a.profiles?.is_active === false;
                  const completeness = a.profileCompleteness ?? 0;
                  const studentId = a.studentIdNumber || a.student_id || "—";
                  const isCleared = a.clearanceStatus === "CLEARED";
                  const isSelected = selectedIds.includes(a.id);

                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isArchived ? "bg-muted/10 opacity-75" : ""
                      } ${isSelected ? "bg-primary/5" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(a.id)}
                          className="rounded border-border"
                        />
                      </td>

                      {/* Name & Email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{a.profiles?.full_name}</p>
                          {isArchived && (
                            <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              Archived
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{a.profiles?.email}</p>
                        {a.profiles?.is_verified && (
                          <span className="text-[11px] text-emerald-500 font-medium">✓ Email Verified</span>
                        )}
                      </td>

                      {/* Student ID */}
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                        {studentId}
                      </td>

                      {/* Course & Batch */}
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        <p className="text-xs font-medium text-foreground">{a.course}</p>
                        <p className="text-[11px] text-muted-foreground">Batch {a.batch_year}</p>
                      </td>

                      {/* Profile Completion */}
                      <td className="px-4 py-3">
                        <div className="w-24 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground tabular-nums">
                              {completeness}%
                            </span>
                          </div>
                          <Progress value={completeness} className="h-1.5 w-full">
                            <ProgressTrack className="h-1.5 w-full rounded-full bg-muted">
                              <ProgressIndicator
                                className={`h-full rounded-full transition-all ${
                                  completeness === 100 ? "bg-emerald-500" : "bg-primary"
                                }`}
                              />
                            </ProgressTrack>
                          </Progress>
                        </div>
                      </td>

                      {/* Clearance Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={a.clearanceStatus || "PENDING"} />
                        {a.clearanceToken && (
                          <p className="font-mono text-[10px] text-muted-foreground mt-1">
                            {a.clearanceToken}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isCleared ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPreviewSlipTarget({
                                  full_name: a.profiles?.full_name,
                                  studentIdNumber: a.studentIdNumber,
                                  student_id: a.student_id,
                                  course: a.course,
                                  major: a.major,
                                  batch_year: a.batch_year,
                                  graduation_year: a.graduation_year,
                                  clearanceStatus: a.clearanceStatus,
                                  clearedAt: a.clearedAt,
                                  clearanceToken: a.clearanceToken,
                                })
                              }
                              className="h-8 gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                              title="View & Print Clearance Slip"
                            >
                              <Printer size={13} /> View Slip
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                disabled={completeness < 100}
                                onClick={() =>
                                  setApproveConfirm({
                                    ids: [a.id],
                                    name: a.profiles?.full_name,
                                  })
                                }
                                className={`h-8 gap-1 text-xs font-semibold ${
                                  completeness === 100
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    : "opacity-40 cursor-not-allowed"
                                }`}
                                title={
                                  completeness === 100
                                    ? "Approve Graduation Clearance"
                                    : "Requires 100% profile completeness to approve"
                                }
                              >
                                <Check size={13} /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setRejectDialog({
                                    ids: [a.id],
                                    name: a.profiles?.full_name,
                                  })
                                }
                                className="h-8 gap-1 text-xs font-semibold border-red-500/30 text-red-500 hover:bg-red-500/10"
                                title="Reject or return clearance"
                              >
                                <XCircle size={13} /> Reject
                              </Button>
                            </>
                          )}

                          {isArchived ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 p-1.5 text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() =>
                                setRestoreTarget({
                                  id: a.id,
                                  name: a.profiles?.full_name || "Unknown",
                                })
                              }
                              title="Restore Alumni Account"
                            >
                              <RotateCcw size={14} />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                              onClick={() =>
                                setArchiveTarget({
                                  id: a.id,
                                  name: a.profiles?.full_name || "Unknown",
                                })
                              }
                              title="Archive Alumni Account"
                            >
                              <Archive size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * PAGE_SIZE >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Clearance Approval Confirmation Dialog */}
      <ConfirmDialog
        open={!!approveConfirm}
        onClose={() => setApproveConfirm(null)}
        onConfirm={async () => {
          if (approveConfirm) {
            await handleApproveClearance(approveConfirm.ids);
          }
        }}
        title="Approve Graduation Clearance"
        description={`Are you sure you want to approve clearance for ${approveConfirm?.name}? This will mark the candidate as CLEARED, assign an official electronic verification token (CLR-YYYY-XXXXXX), and notify the student.`}
        confirmLabel="Approve & Clear"
        confirmVariant="default"
      />

      {/* Clearance Rejection Remarks Dialog */}
      <ConfirmDialog
        open={!!rejectDialog}
        onClose={() => setRejectDialog(null)}
        onConfirm={async (reason) => {
          if (rejectDialog) {
            await handleRejectClearance(rejectDialog.ids, reason);
          }
        }}
        title="Return / Reject Clearance"
        description={`Provide remarks explaining why clearance is being returned or rejected for ${rejectDialog?.name}. The student will receive an in-app notification with these instructions.`}
        confirmLabel="Confirm Rejection"
        confirmVariant="destructive"
        requireReason={true}
        reasonLabel="Clearance Remarks / Instructions"
        reasonPlaceholder="e.g., Please upload your current career record or update your contact phone number..."
      />

      {/* View Clearance Slip Preview Modal Dialog */}
      <Dialog
        open={!!previewSlipTarget}
        onOpenChange={(open) => {
          if (!open) setPreviewSlipTarget(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-heading text-lg font-bold">
              Official Clearance Slip Preview
            </DialogTitle>
          </DialogHeader>
          {previewSlipTarget && (
            <ClearanceSlip data={previewSlipTarget} showBackButton={false} />
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Modal */}
      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Archive Alumni Account"
        description={`Are you sure you want to archive alumni: ${archiveTarget?.name}? The account will be deactivated and moved to the "Recently Archived" tab.`}
        confirmLabel="Archive Account"
        confirmVariant="destructive"
      />

      {/* Restore Confirmation Modal */}
      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        title="Restore Alumni Account"
        description={`Are you sure you want to restore alumni: ${restoreTarget?.name}? Their account will be reactivated immediately.`}
        confirmLabel="Restore Account"
      />
    </div>
  );
}

function CheckCircle2Icon(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 18, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
