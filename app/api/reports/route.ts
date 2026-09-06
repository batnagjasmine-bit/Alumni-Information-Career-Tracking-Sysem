// app/api/reports/route.ts
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single() as { data: { role: string } | null };

    if (profile?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const nowIso = new Date().toISOString();

    // ── Run all queries in parallel with strict soft-delete and temporal filters ──
    const [
      alumniCountRes,
      employersRes,
      activeJobsRes,
      applicationsRes,
      careerRecordsRes,
      allAlumniRes,
      topEmployersRes,
    ] = await Promise.all([
      // 1. Total ACTIVE registered alumni
      (adminClient as any)
        .from("alumni")
        .select("id, profiles!inner(is_active)", { count: "exact", head: true })
        .eq("profiles.is_active", true),

      // 2. Approved and ACTIVE employers count (disambiguated by employers_id_fkey)
      (adminClient as any)
        .from("employers")
        .select("id, profiles!employers_id_fkey!inner(is_active)", { count: "exact", head: true })
        .eq("approval_status", "approved")
        .eq("profiles.is_active", true),

      // 3. Active, unexpired job postings from approved and active employers (Year 2026)
      (adminClient as any)
        .from("job_postings")
        .select("id, employers!inner(approval_status, profiles!employers_id_fkey!inner(is_active))", { count: "exact", head: true })
        .eq("status", "active")
        .gt("expires_at", nowIso)
        .eq("employers.approval_status", "approved")
        .eq("employers.profiles.is_active", true),

      // 4. Total job applications
      (adminClient as any)
        .from("job_applications")
        .select("id", { count: "exact", head: true }),

      // 5. Active career records belonging to active alumni
      (adminClient as any)
        .from("career_records")
        .select(`
          alumni_id, employment_status, industry, employer_name, is_current,
          alumni!inner(batch_year, profiles!inner(is_active))
        `)
        .eq("is_current", true)
        .eq("alumni.profiles.is_active", true),

      // 6. All active alumni with batch_year for cohort analytics
      (adminClient as any)
        .from("alumni")
        .select("id, batch_year, course, profiles!inner(is_active)")
        .eq("profiles.is_active", true)
        .order("batch_year", { ascending: true }),

      // 7. Top employers for active career records
      (adminClient as any)
        .from("career_records")
        .select("employer_name, alumni!inner(profiles!inner(is_active))")
        .eq("is_current", true)
        .eq("alumni.profiles.is_active", true)
        .not("employer_name", "is", null),
    ]);

    // ── Active Alumni & Career Collections ──────────────────────────────────
    const allAlumniData: Array<{ id: string; batch_year: number; course: string }> = allAlumniRes.data ?? [];
    const careerData: Array<{
      alumni_id: string;
      employment_status: string;
      industry: string | null;
      employer_name: string | null;
      alumni?: { batch_year: number };
    }> = careerRecordsRes.data ?? [];

    const totalActiveAlumni = allAlumniData.length;

    // ── Unique Deduplicated Alumni Employment Calculation ───────────────────
    const alumniToBatch = new Map<string, number>();
    for (const a of allAlumniData) {
      if (a.batch_year) alumniToBatch.set(a.id, a.batch_year);
    }

    // Cohort data structures: Set<string> guarantees each alumnus is counted exactly ONCE per batch
    interface CohortMetrics {
      allAlumniIds: Set<string>;
      employedAlumniIds: Set<string>;
      reportedAlumniIds: Set<string>;
    }
    const cohortMap = new Map<number, CohortMetrics>();

    for (const a of allAlumniData) {
      if (!a.batch_year) continue;
      if (!cohortMap.has(a.batch_year)) {
        cohortMap.set(a.batch_year, {
          allAlumniIds: new Set<string>(),
          employedAlumniIds: new Set<string>(),
          reportedAlumniIds: new Set<string>(),
        });
      }
      cohortMap.get(a.batch_year)!.allAlumniIds.add(a.id);
    }

    // Sequence modern contemporary cohorts up to active calendar year (2026)
    const currentYear = new Date().getFullYear();
    const contemporaryStartYear = Math.max(2021, currentYear - 5);
    for (let yr = contemporaryStartYear; yr <= currentYear; yr++) {
      if (!cohortMap.has(yr)) {
        cohortMap.set(yr, {
          allAlumniIds: new Set<string>(),
          employedAlumniIds: new Set<string>(),
          reportedAlumniIds: new Set<string>(),
        });
      }
    }

    const uniqueEmployedAlumni = new Set<string>();
    const uniqueReportedAlumni = new Set<string>();

    for (const r of careerData) {
      if (!r.alumni_id) continue;
      uniqueReportedAlumni.add(r.alumni_id);

      const by = r.alumni?.batch_year ?? alumniToBatch.get(r.alumni_id);
      if (by && cohortMap.has(by)) {
        cohortMap.get(by)!.reportedAlumniIds.add(r.alumni_id);
      }

      if (["employed", "self_employed", "ofw"].includes(r.employment_status)) {
        uniqueEmployedAlumni.add(r.alumni_id);
        if (by && cohortMap.has(by)) {
          cohortMap.get(by)!.employedAlumniIds.add(r.alumni_id);
        }
      }
    }

    // ── Format Employment Rate by Batch Year ────────────────────────────────
    const employmentByBatchYear = Array.from(cohortMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([batch_year, metrics]) => {
        const total = metrics.allAlumniIds.size;
        const employed = metrics.employedAlumniIds.size;
        const reported = metrics.reportedAlumniIds.size;
        return {
          batch_year: String(batch_year),
          total,
          reported,
          employed,
          employed_pct: total > 0 ? Math.round((employed / total) * 100) : 0,
          reported_employed_pct: reported > 0 ? Math.round((employed / reported) * 100) : 0,
          unemployed_pct: total > 0 ? Math.round((Math.max(0, reported - employed) / total) * 100) : 0,
        };
      });

    // ── Overall Employment Rate ─────────────────────────────────────────────
    // Deduplicated: Unique employed active graduates divided by total active graduates
    const overallRate = totalActiveAlumni > 0
      ? Math.round((uniqueEmployedAlumni.size / totalActiveAlumni) * 100)
      : 0;

    const reportedEmploymentRate = uniqueReportedAlumni.size > 0
      ? Math.round((uniqueEmployedAlumni.size / uniqueReportedAlumni.size) * 100)
      : 0;

    const summaryStats = {
      totalAlumni: alumniCountRes.count ?? totalActiveAlumni,
      approvedEmployers: employersRes.count ?? 0,
      activeJobPostings: activeJobsRes.count ?? 0,
      totalApplications: applicationsRes.count ?? 0,
      overallEmploymentRate: overallRate,
      reportedEmploymentRate,
      totalReportedAlumni: uniqueReportedAlumni.size,
    };

    // ── Industry Distribution ───────────────────────────────────────────────
    const industryCount = new Map<string, number>();
    for (const r of careerData) {
      if (!r.industry) continue;
      industryCount.set(r.industry, (industryCount.get(r.industry) ?? 0) + 1);
    }
    const totalWithIndustry = Array.from(industryCount.values()).reduce((a, b) => a + b, 0);
    const industryDistribution = Array.from(industryCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([industry, count]) => ({
        industry,
        count,
        percentage: totalWithIndustry > 0 ? Math.round((count / totalWithIndustry) * 100) : 0,
      }));

    // ── Alumni Registered per Batch Year ───────────────────────────────────
    const alumniPerBatchYear = Array.from(cohortMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([batch_year, metrics]) => ({
        batch_year: String(batch_year),
        count: metrics.allAlumniIds.size,
      }));

    // ── Employment Status Breakdown ─────────────────────────────────────────
    const statusCount = new Map<string, number>();
    for (const r of careerData) {
      statusCount.set(r.employment_status, (statusCount.get(r.employment_status) ?? 0) + 1);
    }
    const employmentStatusBreakdown = [
      "employed", "self_employed", "unemployed", "ofw", "further_study", "retired"
    ].map(status => ({
      status,
      label: status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      count: statusCount.get(status) ?? 0,
    }));

    // ── Top Hiring Employers ────────────────────────────────────────────────
    const employerCount = new Map<string, number>();
    for (const r of (topEmployersRes.data ?? [])) {
      if (!r.employer_name) continue;
      employerCount.set(r.employer_name, (employerCount.get(r.employer_name) ?? 0) + 1);
    }
    const topHiringEmployers = Array.from(employerCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([employer, count]) => ({ employer, count }));

    return Response.json({
      summaryStats,
      employmentByBatchYear,
      industryDistribution,
      alumniPerBatchYear,
      employmentStatusBreakdown,
      topHiringEmployers,
      temporalContext: {
        year: 2026,
        academicYear: "AY 2025–2026",
        generatedAt: nowIso,
      },
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
