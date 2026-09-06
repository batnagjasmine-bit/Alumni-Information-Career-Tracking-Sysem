"use client";
// components/alumni/CareerRecordDialog.tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Loader2, X, Briefcase, Building2, MapPin, Calendar, 
  DollarSign, Globe, Sparkles, CheckCircle2, Award, 
  GraduationCap, Plane, UserCheck, ShieldAlert
} from "lucide-react";
import { careerRecordSchema, type CareerRecordInput } from "@/lib/validations/career.schema";
import { INDUSTRIES } from "@/lib/constants/courses";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface CareerRecordDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CareerRecordInput, id?: string) => Promise<void>;
  editData?: Partial<CareerRecordInput & { id: string }>;
}

const EMPLOYMENT_STATUSES = [
  { value: "employed", label: "Employed", icon: Briefcase, color: "text-emerald-500", desc: "Working for an organization" },
  { value: "self_employed", label: "Self-Employed / Business", icon: Sparkles, color: "text-sky-500", desc: "Freelance, founder, or entrepreneur" },
  { value: "ofw", label: "Overseas Filipino Worker (OFW)", icon: Plane, color: "text-amber-500", desc: "Working outside the Philippines" },
  { value: "further_study", label: "Further Studies", icon: GraduationCap, color: "text-purple-500", desc: "Enrolled in masteral/higher education" },
  { value: "unemployed", label: "Currently Seeking Opportunity", icon: ShieldAlert, color: "text-rose-500", desc: "In-transition or job searching" },
  { value: "retired", label: "Retired / Other", icon: Award, color: "text-slate-500", desc: "Retired from formal career" },
];

const EMP_TYPES = [
  { value: "full_time", label: "Full-time (Regular)" },
  { value: "part_time", label: "Part-time" },
  { value: "contractual", label: "Contractual / Project-based" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Internship / Apprenticeship" },
];

const SALARY_RANGES = [
  { value: "below_15k", label: "Below ₱15,000 / month" },
  { value: "15k_25k", label: "₱15,000 – ₱25,000 / month" },
  { value: "25k_35k", label: "₱25,000 – ₱35,000 / month" },
  { value: "35k_50k", label: "₱35,000 – ₱50,000 / month" },
  { value: "50k_75k", label: "₱50,000 – ₱75,000 / month" },
  { value: "above_75k", label: "Above ₱75,000 / month" },
];

export function CareerRecordDialog({ open, onClose, onSave, editData }: CareerRecordDialogProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CareerRecordInput, any, CareerRecordInput>({
    resolver: zodResolver(careerRecordSchema) as any,
    defaultValues: {
      employment_status: "employed",
      employer_name: "",
      job_title: "",
      industry: "",
      employment_type: undefined,
      salary_range: undefined,
      start_date: "",
      end_date: "",
      is_current: true,
      country: "Philippines",
      city: "",
      job_description: "",
    },
  });

  const status = form.watch("employment_status");
  const isCurrent = form.watch("is_current");
  const description = form.watch("job_description") || "";
  const needsEmployer = !["unemployed", "further_study", "retired"].includes(status);

  useEffect(() => {
    if (editData) {
      // Format ISO string or Date to YYYY-MM-DD for date inputs
      const formatDateForInput = (val?: string | Date) => {
        if (!val) return "";
        try {
          const d = new Date(val);
          return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
        } catch {
          return "";
        }
      };

      form.reset({
        employment_status: (editData.employment_status as CareerRecordInput["employment_status"]) ?? "employed",
        employer_name: editData.employer_name ?? "",
        job_title: editData.job_title ?? "",
        industry: editData.industry ?? "",
        employment_type: editData.employment_type as CareerRecordInput["employment_type"],
        salary_range: editData.salary_range as CareerRecordInput["salary_range"],
        start_date: formatDateForInput(editData.start_date),
        end_date: formatDateForInput(editData.end_date),
        is_current: editData.is_current ?? true,
        country: editData.country ?? "Philippines",
        city: editData.city ?? "",
        job_description: editData.job_description ?? "",
      });
    } else {
      form.reset({ 
        employment_status: "employed", 
        employer_name: "",
        job_title: "",
        industry: "",
        employment_type: undefined,
        salary_range: undefined,
        start_date: "",
        end_date: "",
        is_current: true, 
        country: "Philippines",
        city: "",
        job_description: "",
      });
    }
  }, [editData, open, form]);

  const onSubmit = async (data: CareerRecordInput) => {
    await onSave(data, editData?.id);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden">
        {/* Header with Institutional Branding */}
        <div className="flex items-center justify-between p-5 border-b border-border/70 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Briefcase size={20} />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                {editData ? "Update Career Record" : "Add Career Milestone"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Polytechnic College of La Union • Alumni Career Tracker
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          <Form {...form}>
            <form id="career-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Section 1: Employment Status & Current Role Switch */}
              <div className="space-y-4 rounded-xl p-4 bg-muted/20 border border-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <UserCheck size={14} className="text-pclu-sky-500" />
                  <span>1. Employment Status</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <FormField control={form.control} name="employment_status" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-foreground">Current Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 bg-background border-border">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-72">
                          {EMPLOYMENT_STATUSES.map(s => {
                            const Icon = s.icon;
                            return (
                              <SelectItem key={s.value} value={s.value} className="py-2">
                                <div className="flex items-center gap-2">
                                  <Icon size={14} className={s.color} />
                                  <span className="font-medium text-xs">{s.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Modern Radix Switch */}
                  <FormField control={form.control} name="is_current" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-foreground">Role Duration</FormLabel>
                      <div className="flex items-center justify-between h-10 px-3.5 rounded-lg border border-border bg-background">
                        <span className="text-xs font-medium text-foreground flex items-center gap-2">
                          {field.value ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Currently Active Position
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                              Past Position
                            </>
                          )}
                        </span>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          aria-label="Toggle active position"
                        />
                      </div>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Section 2: Role & Employer Details */}
              {needsEmployer && (
                <div className="space-y-4 rounded-xl p-4 bg-muted/20 border border-border/60">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Building2 size={14} className="text-pclu-sky-500" />
                    <span>2. Role & Employer Information</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="employer_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-foreground">Company / Organization *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 size={14} className="absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                            <Input {...field} placeholder="e.g. San Miguel Corp / Accenture" className="pl-9 h-10 bg-background" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="job_title" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-foreground">Job Title *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Briefcase size={14} className="absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                            <Input {...field} placeholder="e.g. Full Stack Developer" className="pl-9 h-10 bg-background" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="employment_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-foreground">Employment Classification</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger className="h-10 bg-background border-border">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EMP_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value} className="text-xs">
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="salary_range" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-foreground">Salary Band (Confidential)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger className="h-10 bg-background border-border">
                              <SelectValue placeholder="Select compensation band" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SALARY_RANGES.map(s => (
                              <SelectItem key={s.value} value={s.value} className="text-xs">
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* Section 3: Industry & Location */}
              <div className="space-y-4 rounded-xl p-4 bg-muted/20 border border-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPin size={14} className="text-pclu-sky-500" />
                  <span>{needsEmployer ? "3. Industry & Workplace Location" : "2. Scope & Location"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <FormField control={form.control} name="industry" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-foreground">Industry Sector</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger className="h-10 bg-background border-border">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {INDUSTRIES.map(i => (
                              <SelectItem key={i} value={i} className="text-xs">
                                {i}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="sm:col-span-1">
                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-foreground">Country</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Globe size={14} className="absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                            <Input {...field} placeholder="Philippines" className="pl-9 h-10 bg-background" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="sm:col-span-1">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-foreground">City / Municipality</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                            <Input {...field} placeholder="e.g. San Fernando, LU" className="pl-9 h-10 bg-background" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>

              {/* Section 4: Timeline & Responsibilities */}
              <div className="space-y-4 rounded-xl p-4 bg-muted/20 border border-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Calendar size={14} className="text-pclu-sky-500" />
                  <span>{needsEmployer ? "4. Timeline & Key Responsibilities" : "3. Timeline & Notes"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="start_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-foreground">Start Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-10 bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {!isCurrent ? (
                    <FormField control={form.control} name="end_date" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-foreground">End Date *</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="h-10 bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ) : (
                    <div className="flex flex-col justify-end">
                      <div className="h-10 px-3.5 rounded-lg border border-border/60 bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>Ongoing tenure (Present)</span>
                      </div>
                    </div>
                  )}
                </div>

                <FormField control={form.control} name="job_description" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs font-medium text-foreground">
                        Description & Achievements <span className="text-muted-foreground text-[11px]">(optional)</span>
                      </FormLabel>
                      <span className={cn(
                        "text-[10px]",
                        description.length > 950 ? "text-rose-500 font-bold" : "text-muted-foreground"
                      )}>
                        {description.length} / 1000
                      </span>
                    </div>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        rows={3} 
                        placeholder="Briefly describe your key responsibilities, technologies used, or noteworthy career achievements..." 
                        className="resize-none bg-background text-xs" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </form>
          </Form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-border/70 bg-muted/20">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button 
            type="submit" 
            form="career-form"
            size="sm"
            disabled={form.formState.isSubmitting} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 px-5"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin mr-1.5" />
                Saving Record...
              </>
            ) : editData ? (
              "Save Changes"
            ) : (
              "Add Career Record"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
