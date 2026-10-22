// app/api/alumni/profile/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { alumniProfileSchema } from "@/lib/validations/alumni.schema";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";
import { calculateAlumniCompleteness } from "@/lib/utils/clearance";
import { prisma } from "@/lib/prisma";

// GET /api/alumni/profile — fetch own profile + alumni data
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, alumni, careerCount] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          full_name: true,
          email: true,
          phone: true,
          profile_photo_url: true,
          cover_photo_url: true,
          role: true,
          is_verified: true,
          created_at: true,
        },
      }),
      prisma.alumni.findUnique({
        where: { id: user.id },
      }),
      prisma.careerRecord.count({
        where: { alumni_id: user.id, is_archived: false },
      }),
    ]);

    if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });

    const completeness = calculateAlumniCompleteness({ ...profile, ...(alumni || {}) }, careerCount);

    return Response.json({
      data: {
        ...profile,
        ...(alumni || {}),
        profileCompleteness: alumni?.profileCompleteness ?? completeness.percentage,
        missingFields: completeness.missingFields,
        isComplete: completeness.isComplete,
      },
    });
  } catch (error) {
    console.error("[GET /api/alumni/profile]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Internal update handler for PUT and PATCH
async function handleUpdateProfile(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = alumniProfileSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });

    const {
      full_name,
      phone,
      student_id,
      studentIdNumber,
      address,
      city,
      province,
      bio,
      linkedin_url,
      resume_url,
      major,
      is_profile_public,
      course,
    } = parsed.data;

    // Fetch current profile, alumni record, and career records count via Prisma
    const [oldProfile, oldAlumni, careerCount] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: user.id },
        select: { full_name: true, email: true, phone: true },
      }),
      prisma.alumni.findUnique({
        where: { id: user.id },
      }),
      prisma.careerRecord.count({
        where: { alumni_id: user.id, is_archived: false },
      }),
    ]);

    const updatedFullName = full_name ?? oldProfile?.full_name ?? "";
    const updatedPhone = phone !== undefined ? phone : (oldProfile?.phone ?? null);
    const updatedStudentId = studentIdNumber || student_id || oldAlumni?.studentIdNumber || oldAlumni?.student_id || null;
    const updatedAddress = address !== undefined ? address : (oldAlumni?.address ?? null);
    const updatedCity = city !== undefined ? city : (oldAlumni?.city ?? null);
    const updatedProvince = province !== undefined ? province : (oldAlumni?.province ?? null);
    const updatedBio = bio !== undefined ? bio : null;
    const updatedLinkedin = linkedin_url !== undefined ? linkedin_url : (oldAlumni?.linkedin_url ?? null);
    const updatedCourse = course ?? oldAlumni?.course;
    const batchYear = oldAlumni?.batch_year;
    const graduationYear = oldAlumni?.graduation_year;

    // Recalculate profileCompleteness using calculateAlumniCompleteness from lib/utils/clearance.ts
    const completenessInput = {
      full_name: updatedFullName,
      email: oldProfile?.email,
      phone: updatedPhone,
      studentIdNumber: updatedStudentId,
      student_id: updatedStudentId,
      course: updatedCourse,
      batch_year: batchYear,
      graduation_year: graduationYear,
      address: updatedAddress,
      city: updatedCity,
      province: updatedProvince,
      bio: updatedBio,
      linkedin_url: updatedLinkedin,
    };

    const completeness = calculateAlumniCompleteness(completenessInput, careerCount);

    // Gatekeeper Rules:
    const currentStatus = (oldAlumni?.clearanceStatus ?? "PENDING") as
      | "PENDING"
      | "SUBMITTED"
      | "CLEARED"
      | "REJECTED";
    let newStatus = currentStatus;
    let newSubmittedAt = oldAlumni?.submittedAt ? oldAlumni.submittedAt.toISOString() : null;
    let newClearanceRemarks = oldAlumni?.clearanceRemarks ?? null;

    if (completeness.isComplete) {
      // If isComplete is true (100%) and current clearanceStatus is PENDING or REJECTED,
      // automatically transition clearanceStatus to SUBMITTED, set submittedAt = new Date(), and clear old remarks.
      if (currentStatus === "PENDING" || currentStatus === "REJECTED") {
        newStatus = "SUBMITTED";
        newSubmittedAt = new Date().toISOString();
        newClearanceRemarks = null;
      }
    } else {
      // If isComplete is false (< 100%) and status is SUBMITTED, revert clearanceStatus to PENDING.
      // (Never downgrade an already CLEARED account).
      if (currentStatus === "SUBMITTED") {
        newStatus = "PENDING";
      }
    }

    // Update profiles table
    const { error: profileErr } = await (supabase.from("profiles") as any)
      .update({
        full_name: updatedFullName,
        phone: updatedPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (profileErr) {
      console.error("Profile Update Error:", profileErr);
      throw profileErr;
    }

    // Update alumni table with completeness and clearance state
    const { error: alumniErr } = await (supabase.from("alumni") as any)
      .update({
        address: updatedAddress,
        city: updatedCity,
        province: updatedProvince,
        linkedin_url: updatedLinkedin,
        resume_url: resume_url !== undefined ? resume_url : (oldAlumni?.resume_url ?? null),
        major: major !== undefined ? major : (oldAlumni?.major ?? null),
        is_profile_public: is_profile_public !== undefined ? is_profile_public : (oldAlumni?.is_profile_public ?? true),
        course: updatedCourse || undefined,
        student_id: updatedStudentId,
        studentIdNumber: updatedStudentId,
        profileCompleteness: completeness.percentage,
        profile_completeness: completeness.percentage,
        clearanceStatus: newStatus,
        clearance_status: newStatus,
        clearanceRemarks: newClearanceRemarks,
        clearance_remarks: newClearanceRemarks,
        submittedAt: newSubmittedAt,
        submitted_at: newSubmittedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (alumniErr) {
      console.error("Alumni Update Error:", alumniErr);
      throw alumniErr;
    }

    // Audit logs
    await logAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.UPDATE_PROFILE,
      tableName: "profiles",
      recordId: user.id,
      oldValues: oldProfile ?? undefined,
      newValues: { full_name: updatedFullName, phone: updatedPhone },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    if (newStatus !== currentStatus) {
      await logAudit({
        userId: user.id,
        action: newStatus === "SUBMITTED" ? AUDIT_ACTIONS.SUBMIT_CLEARANCE : AUDIT_ACTIONS.REVERT_CLEARANCE,
        tableName: "alumni",
        recordId: user.id,
        oldValues: { clearanceStatus: currentStatus },
        newValues: { clearanceStatus: newStatus, profileCompleteness: completeness.percentage },
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      });
    }

    return Response.json({
      data: {
        success: true,
        profileCompleteness: completeness.percentage,
        clearanceStatus: newStatus,
        isComplete: completeness.isComplete,
        missingFields: completeness.missingFields,
      },
    });
  } catch (error: any) {
    console.error("[PATCH /api/alumni/profile] ERROR DETAILS:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  return handleUpdateProfile(request);
}

export async function PUT(request: NextRequest) {
  return handleUpdateProfile(request);
}
