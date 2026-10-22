"use client";
// app/(dashboard)/alumni/profile/page.tsx
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Camera, Loader2, Save, Globe, Phone, MapPin, Link2, Eye, EyeOff, GraduationCap, ShieldCheck, FileWarning, AlertTriangle, Award } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { alumniProfileSchema, type AlumniProfileInput } from "@/lib/validations/alumni.schema";
import { PCLU_COURSES } from "@/lib/constants/courses";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatInitials } from "@/lib/utils/format";

interface ProfileData {
  id: string; full_name: string; email: string; phone?: string | null;
  profile_photo_url?: string | null; cover_photo_url?: string | null; is_verified: boolean;
  student_id?: string | null; studentIdNumber?: string | null; course?: string | null; major?: string | null;
  batch_year?: number | null; graduation_year?: number | null;
  address?: string | null; city?: string | null; province?: string | null;
  linkedin_url?: string | null; is_profile_public: boolean;
  resume_url?: string | null;
  clearanceStatus?: string | null;
  profileCompleteness?: number;
  clearanceRemarks?: string | null;
  clearanceToken?: string | null;
  submittedAt?: string | null;
  clearedAt?: string | null;
  clearedById?: string | null;
  missingFields?: string[];
  isComplete?: boolean;
}

export default function AlumniProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const resumeRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<AlumniProfileInput, any, AlumniProfileInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(alumniProfileSchema) as any,
    defaultValues: { full_name: "", phone: "", studentIdNumber: "", student_id: "", address: "", city: "", province: "", linkedin_url: "", major: "", is_profile_public: true },
  });

  useEffect(() => {
    fetch("/api/alumni/profile")
      .then(r => r.json())
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          form.reset({
            full_name: data.full_name ?? "",
            phone: data.phone ?? "",
            student_id: data.student_id ?? "",
            studentIdNumber: data.studentIdNumber || data.student_id || "",
            address: data.address ?? "",
            city: data.city ?? "",
            province: data.province ?? "",
            linkedin_url: data.linkedin_url ?? "",
            major: data.major ?? "",
            is_profile_public: data.is_profile_public ?? true,
            course: data.course ?? undefined,
            resume_url: data.resume_url ?? undefined,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [form]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Only JPG, PNG, WebP allowed"); return; }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop();
      const path = `avatars/${user!.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const freshUrl = `${publicUrl}?t=${Date.now()}`;
      await (supabase as any).from("profiles").update({ profile_photo_url: freshUrl }).eq("id", user!.id);
      setProfile(prev => prev ? { ...prev, profile_photo_url: freshUrl } : prev);
      toast.success("Photo updated!");
      router.refresh();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Only JPG, PNG, WebP allowed"); return; }

    setUploadingCover(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop();
      const path = `avatars/${user!.id}/cover.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const freshUrl = `${publicUrl}?t=${Date.now()}`;
      await (supabase as any).from("profiles").update({ cover_photo_url: freshUrl }).eq("id", user!.id);
      setProfile(prev => prev ? { ...prev, cover_photo_url: freshUrl } : prev);
      toast.success("Cover photo updated!");
      router.refresh();
    } catch {
      toast.error("Cover upload failed. Please try again.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    if (![".pdf", ".doc", ".docx"].some(ext => file.name.toLowerCase().endsWith(ext))) { toast.error("Only PDF, DOC, DOCX allowed"); return; }

    setUploadingResume(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop();
      const path = `applications/default_${user!.id}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("resumes").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("resumes").getPublicUrl(path);
      
      const currentProfileData = form.getValues();
      const res = await fetch("/api/alumni/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentProfileData, resume_url: publicUrl }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error("API Error Response:", errorData);
        throw new Error(errorData?.error || "Failed to save resume URL");
      }

      setProfile(prev => prev ? { ...prev, resume_url: publicUrl } : prev);
      toast.success("Resume updated!");
    } catch (error) {
      console.error(error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploadingResume(false);
      if (resumeRef.current) resumeRef.current.value = "";
    }
  };

  const handleDeleteResume = async () => {
    try {
      const currentProfileData = form.getValues();
      const res = await fetch("/api/alumni/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentProfileData, resume_url: "" }),
      });
      if (!res.ok) throw new Error("Failed to remove resume");
      
      setProfile(prev => prev ? { ...prev, resume_url: undefined } : prev);
      toast.success("Resume removed");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove resume");
    }
  };

  const onSubmit = async (data: AlumniProfileInput) => {
    const res = await fetch("/api/alumni/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Failed to save"); return; }
    toast.success("Profile saved successfully!");
    
    // Refresh full profile data from API to get updated completeness, gatekeeper status & missing fields
    try {
      const freshRes = await fetch("/api/alumni/profile");
      const freshJson = await freshRes.json();
      if (freshJson.data) {
        setProfile(freshJson.data);
      }
    } catch {
      setProfile(prev => prev ? { ...prev, ...data } : prev);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={User} title="My Profile" description="Manage your alumni profile" />
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={User} title="My Profile" description="Update your personal and academic information">
        <Button form="profile-form" type="submit" disabled={form.formState.isSubmitting} size="sm" className="bg-primary hover:bg-primary/90">
          {form.formState.isSubmitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Saving…</> : <><Save size={14} className="mr-1.5" />Save Changes</>}
        </Button>
      </PageHeader>

      {/* Graduation Clearance Status Banner */}
      <div
        className={`rounded-2xl border p-6 transition-all shadow-sm ${
          profile?.clearanceStatus === "CLEARED"
            ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-card border-emerald-500/30"
            : profile?.clearanceStatus === "SUBMITTED"
            ? "bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-card border-sky-500/30"
            : profile?.clearanceStatus === "REJECTED"
            ? "bg-gradient-to-r from-red-500/10 via-amber-500/5 to-card border-red-500/30"
            : "bg-gradient-to-r from-amber-500/10 via-primary/5 to-card border-amber-500/30"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                profile?.clearanceStatus === "CLEARED"
                  ? "bg-emerald-500/20 text-emerald-500 ring-2 ring-emerald-500/30"
                  : profile?.clearanceStatus === "SUBMITTED"
                  ? "bg-sky-500/20 text-sky-500"
                  : profile?.clearanceStatus === "REJECTED"
                  ? "bg-red-500/20 text-red-500"
                  : "bg-amber-500/20 text-amber-500"
              }`}
            >
              {profile?.clearanceStatus === "CLEARED" ? (
                <ShieldCheck size={26} />
              ) : profile?.clearanceStatus === "SUBMITTED" ? (
                <Award size={26} />
              ) : profile?.clearanceStatus === "REJECTED" ? (
                <FileWarning size={26} />
              ) : (
                <GraduationCap size={26} />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-heading text-lg font-bold text-foreground">
                  Pre-Graduation Clearance Status
                </h2>
                <StatusBadge status={profile?.clearanceStatus || "PENDING"} />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {profile?.clearanceStatus === "CLEARED" &&
                  "Congratulations! Your graduation clearance has been verified by the Registrar."}
                {profile?.clearanceStatus === "SUBMITTED" &&
                  "Your 100% profile submission is under review by the Alumni Coordinator / Registrar."}
                {profile?.clearanceStatus === "REJECTED" &&
                  "Your clearance submission requires revision before it can be approved."}
                {(!profile?.clearanceStatus || profile?.clearanceStatus === "PENDING") &&
                  "100% profile & career form completion is mandatory to submit for graduation clearance."}
              </p>
            </div>
          </div>

          {/* If CLEARED, unlock and display View & Print Clearance Slip button */}
          {profile?.clearanceStatus === "CLEARED" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => router.push("/alumni/clearance")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md flex items-center gap-2"
              >
                <Award size={16} />
                View & Print Clearance Slip
              </Button>
            </div>
          )}
        </div>

        {/* If REJECTED, display clearanceRemarks in destructive alert box */}
        {profile?.clearanceStatus === "REJECTED" && (
          <div className="mt-4">
            <Alert variant="destructive" className="border-red-500/40 bg-red-500/10 text-red-300">
              <FileWarning className="h-5 w-5 text-red-400" />
              <div className="ml-2">
                <AlertTitle className="text-red-400 font-bold">Clearance Action Required</AlertTitle>
                <AlertDescription className="text-red-200 mt-1">
                  Coordinator Remarks:{" "}
                  <span className="font-semibold text-white">
                    {profile.clearanceRemarks || "Please complete any missing graduation fields and update your profile."}
                  </span>
                </AlertDescription>
              </div>
            </Alert>
          </div>
        )}

        {/* Progress Bar & Completeness */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-medium text-foreground">Clearance Form Completeness</span>
            <span className="font-bold text-primary tabular-nums">
              {profile?.profileCompleteness ?? 0}%
            </span>
          </div>
          <Progress value={profile?.profileCompleteness ?? 0} className="h-2.5">
            <ProgressTrack className="h-2.5 rounded-full bg-muted">
              <ProgressIndicator
                className={`h-full rounded-full transition-all ${
                  (profile?.profileCompleteness ?? 0) === 100
                    ? "bg-emerald-500"
                    : "bg-primary"
                }`}
              />
            </ProgressTrack>
          </Progress>
        </div>

        {/* Missing Fields Checklist */}
        {profile?.missingFields && profile.missingFields.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" />
              Missing Graduation Clearance Items ({profile.missingFields.length} remaining):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {profile.missingFields.map((field) => (
                <div
                  key={field}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="capitalize font-medium text-foreground truncate">{field}</span>
                  </div>
                  {field.includes("employment") || field.includes("career") ? (
                    <Link
                      href="/alumni/career"
                      className="text-[10px] text-primary hover:underline font-semibold shrink-0 ml-1"
                    >
                      Add &rarr;
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Photo Card */}
        <div className="rounded-xl border border-border bg-card p-0 flex flex-col items-center overflow-hidden h-fit">
          {/* Cover Photo */}
          <div className="w-full h-64 sm:h-80 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent relative group">
            {profile?.cover_photo_url && (
              <img src={profile.cover_photo_url} alt="Cover" className="w-full h-full object-cover object-[center_25%]" />
            )}
            <button
              onClick={() => coverRef.current?.click()}
              disabled={uploadingCover}
              className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-sm font-medium backdrop-blur-[2px]"
            >
              {uploadingCover ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Camera size={16} /> Edit Cover Photo</>}
            </button>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </div>

          <div className="px-6 pb-6 -mt-12 flex flex-col items-center w-full gap-4">
            <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-border">
              <AvatarImage src={profile?.profile_photo_url || undefined} alt={profile?.full_name} />
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                {formatInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            {profile?.is_verified && (
              <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                ✓ Verified
              </span>
            )}
          </div>

          {/* Academic info (read-only) */}
          <div className="w-full space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Academic Info</p>
            {(profile?.studentIdNumber || profile?.student_id) && (
              <p className="text-xs text-muted-foreground">ID: {profile.studentIdNumber || profile.student_id}</p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><GraduationCap size={12} />{profile?.course ?? "—"}</p>
            {profile?.batch_year && <p className="text-xs text-muted-foreground">Batch: {profile.batch_year}</p>}
            {profile?.graduation_year && <p className="text-xs text-muted-foreground">Graduated: {profile.graduation_year}</p>}
          </div>

          {/* Career Documents */}
          <div className="w-full space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Career Documents</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Saved Resume</p>
              {!profile?.resume_url ? (
                <label className="relative border-2 border-dashed border-border rounded-xl p-4 hover:bg-muted/50 hover:border-primary/50 transition-colors text-center cursor-pointer group block">
                  <input
                    ref={resumeRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    className="hidden"
                    disabled={uploadingResume}
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      {uploadingResume ? <Loader2 size={14} className="animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>}
                    </div>
                    <p className="text-xs font-medium text-foreground mt-0.5">{uploadingResume ? "Uploading..." : "Upload Resume"}</p>
                    <p className="text-[10px] text-muted-foreground">PDF, DOC, DOCX</p>
                  </div>
                </label>
              ) : (
                <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">Saved_Resume</p>
                      <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">View Document</a>
                    </div>
                  </div>
                  <button onClick={handleDeleteResume} className="text-muted-foreground hover:text-destructive p-1.5 shrink-0 transition-colors bg-muted hover:bg-destructive/10 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <Form {...form}>
            <form id="profile-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Personal Info */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <User size={15} className="text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="full_name" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl><Input {...field} placeholder="Juan dela Cruz" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel><span className="flex items-center gap-1.5"><Phone size={12} />Phone</span></FormLabel>
                      <FormControl><Input {...field} placeholder="+63 9XX XXX XXXX" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="linkedin_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel><span className="flex items-center gap-1.5"><Link2 size={12} />LinkedIn</span></FormLabel>
                      <FormControl><Input {...field} placeholder="https://linkedin.com/in/..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Location */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <MapPin size={15} className="text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">Location</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Street Address</FormLabel>
                      <FormControl><Input {...field} placeholder="123 Sample Street, Barangay" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City / Municipality</FormLabel>
                      <FormControl><Input {...field} placeholder="San Fernando" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="province" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <FormControl><Input {...field} placeholder="La Union" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Academic & Privacy */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <GraduationCap size={15} className="text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">Academic & Privacy</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="studentIdNumber" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>
                        Student ID Number <span className="text-primary text-xs font-normal">(Required for 100% Clearance)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="e.g. 2020-00123"
                          onChange={(e) => {
                            field.onChange(e);
                            form.setValue("student_id", e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="major" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Major / Specialization</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Web Development" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="course" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PCLU_COURSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="is_profile_public" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="flex items-center gap-3">
                          {field.value ? <Eye size={16} className="text-primary" /> : <EyeOff size={16} className="text-muted-foreground" />}
                          <div>
                            <p className="text-sm font-medium text-foreground">Public Profile</p>
                            <p className="text-xs text-muted-foreground">Visible to employers and other users when enabled</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => field.onChange(!field.value)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${field.value ? "bg-primary" : "bg-muted"}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${field.value ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
