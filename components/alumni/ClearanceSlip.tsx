"use client";
// components/alumni/ClearanceSlip.tsx
import { Printer, ShieldCheck, CheckCircle2, Award, Calendar, Hash, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ClearanceSlipData {
  full_name: string;
  studentIdNumber?: string | null;
  student_id?: string | null;
  course?: string | null;
  major?: string | null;
  batch_year?: number | null;
  graduation_year?: number | null;
  clearanceStatus?: string | null;
  clearedAt?: string | Date | null;
  clearanceToken?: string | null;
  clearanceRemarks?: string | null;
}

interface ClearanceSlipProps {
  data: ClearanceSlipData;
  showBackButton?: boolean;
}

export function ClearanceSlip({ data, showBackButton = true }: ClearanceSlipProps) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = data.clearedAt
    ? new Date(data.clearedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const studentId = data.studentIdNumber || data.student_id || "NOT RECORDED";
  const year = data.graduation_year || data.batch_year || new Date().getFullYear();
  const token = data.clearanceToken || `CLR-${new Date().getFullYear()}-XXXXXX`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar (hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card/60 backdrop-blur-md border border-border p-4 rounded-xl print:hidden">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Link
              href="/alumni/profile"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex items-center gap-1.5")}
            >
              <ArrowLeft size={16} /> Back to Profile
            </Link>
          )}
          <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm">
            <CheckCircle2 size={18} />
            <span>Graduation Clearance Verified</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md flex items-center gap-2"
          >
            <Printer size={16} />
            Print Clearance Slip
          </Button>
        </div>
      </div>

      {/* Printable Certificate Slip Sheet */}
      <div
        id="clearance-slip"
        className="relative bg-card border-2 border-border/80 print:border-2 print:border-slate-800 rounded-2xl p-8 sm:p-12 shadow-xl print:shadow-none print:bg-white print:text-black print:p-8 print:m-0 print:rounded-none overflow-hidden"
      >
        {/* Subtle Watermark in background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] print:opacity-[0.05] pointer-events-none select-none">
          <img src="/logo.png" alt="Watermark" className="w-96 h-96 object-contain" />
        </div>

        {/* Certificate Border Accents */}
        <div className="absolute top-3 left-3 right-3 bottom-3 border border-border/40 pointer-events-none rounded-xl print:border-slate-400 print:top-2 print:left-2 print:right-2 print:bottom-2" />

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b-2 border-border print:border-slate-800 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="PCLU Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0"
              />
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground print:text-slate-600 font-semibold">
                  Republic of the Philippines
                </p>
                <h1 className="font-heading text-xl sm:text-2xl font-black text-foreground print:text-black tracking-tight">
                  POLYTECHNIC COLLEGE OF LA UNION
                </h1>
                <p className="text-xs sm:text-sm font-medium text-primary print:text-slate-800">
                  Alumni Affairs & Career Tracking Office
                </p>
                <p className="text-[11px] text-muted-foreground print:text-slate-600">
                  Office of Student Affairs & Services • Office of the Registrar
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center sm:items-end justify-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 print:text-black print:border-black rounded-full text-xs font-bold uppercase tracking-wider mb-1.5">
                <ShieldCheck size={14} className="text-emerald-500 print:text-black" />
                <span>Verified Clear</span>
              </div>
              <p className="text-[11px] font-mono font-semibold text-muted-foreground print:text-slate-700">
                Token: <span className="text-foreground print:text-black font-bold">{token}</span>
              </p>
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center space-y-2 py-2">
            <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-wide uppercase text-foreground print:text-black">
              Alumni Pre-Graduation Clearance Slip
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground print:text-slate-700 max-w-2xl mx-auto leading-relaxed">
              This official document certifies that the graduand named below has fulfilled all mandatory
              institutional alumni registration, career registry tracking, and academic onboarding requirements
              pursuant to college graduation clearance policies.
            </p>
          </div>

          {/* Graduand Details Card */}
          <div className="rounded-xl border border-border print:border-slate-700 bg-muted/20 print:bg-slate-50/50 p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground print:text-slate-600 tracking-wider block mb-1">
                  Student Full Name
                </span>
                <p className="font-heading text-lg font-bold text-foreground print:text-black uppercase tracking-tight">
                  {data.full_name || "—"}
                </p>
              </div>

              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground print:text-slate-600 tracking-wider block mb-1">
                  Student ID Number
                </span>
                <p className="font-mono text-base font-bold text-primary print:text-black">
                  {studentId}
                </p>
              </div>

              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground print:text-slate-600 tracking-wider block mb-1">
                  Degree / Program
                </span>
                <p className="font-medium text-foreground print:text-black">
                  {data.course || "General Degree Program"}
                </p>
                {data.major && (
                  <p className="text-xs text-muted-foreground print:text-slate-600">Major: {data.major}</p>
                )}
              </div>

              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground print:text-slate-600 tracking-wider block mb-1">
                  Batch / Graduation Year
                </span>
                <p className="font-medium text-foreground print:text-black">
                  Class of {year}
                </p>
              </div>

              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground print:text-slate-600 tracking-wider block mb-1">
                  Clearance Status
                </span>
                <div className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
                  <CheckCircle2 size={16} /> CLEARED FOR GRADUATION
                </div>
              </div>

              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground print:text-slate-600 tracking-wider block mb-1">
                  Date of Official Clearance
                </span>
                <p className="font-medium text-foreground print:text-black flex items-center gap-1.5">
                  <Calendar size={14} className="text-muted-foreground print:text-black" />
                  {formattedDate}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Barcode & Token Box */}
          <div className="border border-border print:border-slate-600 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card print:bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary print:text-black flex items-center justify-center shrink-0">
                <Hash size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground print:text-slate-700">
                  Electronic Verification Token
                </p>
                <p className="font-mono text-sm sm:text-base font-bold text-foreground print:text-black tracking-wider">
                  {token}
                </p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-[11px] text-muted-foreground print:text-slate-600">
                Alumni Information Career Tracking System
              </p>
              <p className="text-[10px] text-muted-foreground print:text-slate-600">
                Cryptographically logged • Tamper-evident record
              </p>
            </div>
          </div>

          {/* Signatures Section */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs">
            {/* Graduand Signature */}
            <div className="space-y-2">
              <div className="h-14 border-b border-muted-foreground/40 print:border-black flex items-end justify-center pb-1">
                <span className="font-heading font-medium text-sm text-foreground/80 print:text-black uppercase">
                  {data.full_name}
                </span>
              </div>
              <p className="font-semibold text-foreground print:text-black">Candidate for Graduation</p>
              <p className="text-[10px] text-muted-foreground print:text-slate-600">Student Signature over Printed Name</p>
            </div>

            {/* Alumni Coordinator Signature */}
            <div className="space-y-2">
              <div className="h-14 border-b border-muted-foreground/40 print:border-black flex items-end justify-center pb-1">
                <span className="font-serif italic text-sm text-primary print:text-black font-semibold">
                  Alumni Affairs Coordinator
                </span>
              </div>
              <p className="font-semibold text-foreground print:text-black">Alumni & Placement Officer</p>
              <p className="text-[10px] text-muted-foreground print:text-slate-600">Verified & Approved</p>
            </div>

            {/* Registrar Signature */}
            <div className="space-y-2">
              <div className="h-14 border-b border-muted-foreground/40 print:border-black flex items-end justify-center pb-1">
                <span className="font-serif italic text-sm text-primary print:text-black font-semibold">
                  University Registrar
                </span>
              </div>
              <p className="font-semibold text-foreground print:text-black">College Registrar</p>
              <p className="text-[10px] text-muted-foreground print:text-slate-600">Noted for Graduation File</p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-6 border-t border-border print:border-slate-400 text-center">
            <p className="text-[10px] text-muted-foreground print:text-slate-500 leading-normal">
              Notice: This clearance slip is issued electronically via the Polytechnic College of La Union AICTS Portal.
              Alteration, falsification, or unauthorized duplication of this certificate constitutes academic fraud.
              Present this signed document to the Registrar during final commencement credential release.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
