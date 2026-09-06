"use client";
// app/(dashboard)/admin/alumni/page.tsx
import { useState, useEffect, useCallback } from "react";
import { Users, Search, Download, Trash2, Archive, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PCLU_COURSES, BATCH_YEARS } from "@/lib/constants/courses";

interface AlumniRecord {
  id: string;
  course: string;
  batch_year: number;
  graduation_year: number;
  city?: string;
  province?: string;
  is_profile_public: boolean;
  created_at: string;
  profiles: { full_name: string; email: string; is_verified: boolean; is_active: boolean };
  career_records: Array<{ employment_status: string; job_title?: string; is_current: boolean }>;
}

const FILTER_TABS = ["active", "archived", "all"] as const;

export default function AdminAlumniPage() {
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [tab, setTab] = useState<typeof FILTER_TABS[number]>("active");
  const [counts, setCounts] = useState({ all: 0, active: 0, archived: 0 });

  // Dialog targets
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; name: string } | null>(null);

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

    try {
      const res = await fetch(`/api/admin/alumni?${params}`);
      const json = await res.json();
      setAlumni(json.data ?? []);
      setTotal(json.count ?? 0);
      if (json.counts) {
        setCounts(json.counts);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load alumni records");
    } finally {
      setLoading(false);
    }
  }, [page, search, course, batchYear, tab]);

  useEffect(() => {
    fetchAlumni();
  }, [fetchAlumni]);

  const exportToExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const rows = alumni.map(a => ({
      "Full Name": a.profiles?.full_name,
      "Email": a.profiles?.email,
      "Status": a.profiles?.is_active === false ? "Archived" : "Active",
      "Course": a.course,
      "Batch Year": a.batch_year,
      "Graduation Year": a.graduation_year,
      "City": a.city ?? "",
      "Province": a.province ?? "",
      "Employment Status": a.career_records?.find(c => c.is_current)?.employment_status ?? "Unknown",
      "Current Job Title": a.career_records?.find(c => c.is_current)?.job_title ?? "",
      "Verified": a.profiles?.is_verified ? "Yes" : "No",
      "Registered": format(new Date(a.created_at), "yyyy-MM-dd"),
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Alumni");
    writeFile(wb, `PCLU_Alumni_${tab}_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const currentStatus = (records: AlumniRecord["career_records"]) =>
    records?.find(r => r.is_current)?.employment_status;

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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Alumni Management"
        description={`${counts.active} active alumni registered • ${counts.archived} archived`}
      >
        <Button size="sm" variant="outline" onClick={exportToExcel} className="gap-1.5">
          <Download size={14} /> Export Excel
        </Button>
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {FILTER_TABS.map(t => {
          const label = t === "active" ? "Active Alumni" : t === "archived" ? "Recently Archived" : "All Accounts";
          const countVal = counts[t];
          return (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label} <span className="ml-1.5 text-xs opacity-60">({countVal})</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={course} onValueChange={v => { setCourse(v === "all" ? "" : (v || "")); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {PCLU_COURSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={batchYear} onValueChange={v => { setBatchYear(v === "all" ? "" : (v || "")); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Batch Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {BATCH_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : alumni.length === 0 ? (
        <EmptyState
          icon={Users}
          title={tab === "archived" ? "No Archived Alumni" : "No Alumni Found"}
          description={
            tab === "archived"
              ? "There are no archived alumni accounts at this time."
              : "No alumni match your current search and filter criteria."
          }
        />
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Alumni</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Course</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Batch</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employment</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Registered</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alumni.map(a => {
                  const status = currentStatus(a.career_records);
                  const jobTitle = a.career_records?.find(r => r.is_current)?.job_title;
                  const isArchived = a.profiles?.is_active === false;

                  return (
                    <tr key={a.id} className={`hover:bg-muted/30 transition-colors ${isArchived ? "bg-muted/10 opacity-75" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{a.profiles?.full_name}</p>
                          {isArchived && (
                            <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              Archived
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{a.profiles?.email}</p>
                        {a.profiles?.is_verified && (
                          <span className="text-xs text-emerald-500">✓ Verified</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        <span className="text-xs">{a.course}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{a.batch_year}</td>
                      <td className="px-4 py-3">
                        {status ? <StatusBadge status={status} /> : <span className="text-xs text-muted-foreground">Not set</span>}
                        {jobTitle && <p className="text-xs text-muted-foreground mt-0.5">{jobTitle}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                        {[a.city, a.province].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">
                        {format(new Date(a.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isArchived ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                            onClick={() => setRestoreTarget({ id: a.id, name: a.profiles?.full_name || "Unknown" })}
                            title="Restore Alumni Account"
                          >
                            <RotateCcw size={14} /> Restore
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                            onClick={() => setArchiveTarget({ id: a.id, name: a.profiles?.full_name || "Unknown" })}
                            title="Archive Alumni Account"
                          >
                            <Archive size={14} /> Archive
                          </Button>
                        )}
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
              <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * PAGE_SIZE >= total}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Archive Confirmation Modal */}
      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Archive Alumni Account"
        description={`Are you sure you want to archive alumni: ${archiveTarget?.name}? The account will be deactivated and moved to the "Recently Archived" tab. All career history, applications, and profile records are preserved and can be restored at any time.`}
        confirmLabel="Archive Account"
        confirmVariant="destructive"
      />

      {/* Restore Confirmation Modal */}
      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        title="Restore Alumni Account"
        description={`Are you sure you want to restore alumni: ${restoreTarget?.name}? Their account will be reactivated immediately with full platform access and all career records preserved.`}
        confirmLabel="Restore Account"
      />
    </div>
  );
}
