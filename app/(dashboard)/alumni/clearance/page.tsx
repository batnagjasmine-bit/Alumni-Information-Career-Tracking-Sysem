"use client";
// app/(dashboard)/alumni/clearance/page.tsx
import { useState, useEffect } from "react";
import Link from "next/link";
import { Award, ShieldAlert, ArrowRight, CheckCircle2, Clock, FileWarning, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ClearanceSlip, type ClearanceSlipData } from "@/components/alumni/ClearanceSlip";

interface FullProfileData extends ClearanceSlipData {
  id: string;
  email: string;
  phone?: string | null;
  profileCompleteness?: number;
  missingFields?: string[];
  isComplete?: boolean;
}

export default function AlumniClearancePage() {
  const [data, setData] = useState<FullProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alumni/profile")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setData(json.data);
        }
      })
      .catch((err) => console.error("Failed to load clearance data", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Award}
          title="Graduation Clearance"
          description="View and print your official Pre-Graduation Clearance Slip"
        />
        <div className="flex flex-col items-center justify-center p-16 space-y-4">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading clearance credentials...</p>
        </div>
      </div>
    );
  }

  const isCleared = data?.clearanceStatus === "CLEARED";
  const status = data?.clearanceStatus || "PENDING";
  const completeness = data?.profileCompleteness ?? 0;
  const missingFields = data?.missingFields || [];

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          icon={Award}
          title="Pre-Graduation Clearance Slip"
          description="Official institutional clearance credential for graduating students and alumni"
        />
      </div>

      {isCleared ? (
        <ClearanceSlip data={data!} />
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Status Header Card */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Award size={24} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Clearance Slip Locked
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your official certificate will unlock once your clearance is approved by the Alumni Coordinator.
                  </p>
                </div>
              </div>
              <StatusBadge status={status} />
            </div>

            {/* Rejection Alert */}
            {status === "REJECTED" && (
              <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 text-red-300">
                <FileWarning className="h-5 w-5 text-red-400" />
                <div className="ml-2">
                  <AlertTitle className="text-red-400 font-bold">Action Required: Clearance Not Approved</AlertTitle>
                  <AlertDescription className="text-red-200 mt-1">
                    Coordinator Remarks:{" "}
                    <span className="font-semibold text-white">
                      {data?.clearanceRemarks || "Please complete all mandatory criteria and update your record."}
                    </span>
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Submission Pending Alert */}
            {status === "SUBMITTED" && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 flex items-start gap-3">
                <Clock className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-sky-300">Submission Under Review</p>
                  <p className="text-sky-200/80 text-xs mt-0.5">
                    Your 100% profile submission has been sent to the Alumni Coordinator & Registrar. Once verified, your printable clearance slip will appear here automatically.
                  </p>
                </div>
              </div>
            )}

            {/* Progress Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Graduation Profile Completeness</span>
                <span className="font-bold text-primary tabular-nums">{completeness}%</span>
              </div>
              <Progress value={completeness} className="h-2.5">
                <ProgressTrack className="h-2.5 rounded-full bg-muted">
                  <ProgressIndicator
                    className={`h-full rounded-full transition-all ${
                      completeness === 100 ? "bg-emerald-500" : "bg-primary"
                    }`}
                  />
                </ProgressTrack>
              </Progress>
            </div>

            {/* Missing Fields Checklist */}
            {missingFields.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-amber-500" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Items Required to Reach 100% Clearance:
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {missingFields.map((field) => (
                    <div
                      key={field}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="capitalize font-medium text-foreground">{field}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2 flex justify-end">
              <Link
                href="/alumni/profile"
                className={cn(buttonVariants(), "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2")}
              >
                Complete Profile Requirements <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
