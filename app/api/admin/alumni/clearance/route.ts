// app/api/admin/alumni/clearance/route.ts
import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";

function generateRandomAlphanumeric(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateUniqueClearanceToken(): Promise<string> {
  const year = new Date().getFullYear();
  for (let i = 0; i < 5; i++) {
    const token = `CLR-${year}-${generateRandomAlphanumeric(6)}`;
    const existing = await prisma.alumni.findUnique({
      where: { clearanceToken: token },
      select: { id: true },
    });
    if (!existing) return token;
  }
  return `CLR-${year}-${generateRandomAlphanumeric(6)}`;
}

// GET /api/admin/alumni/clearance — list clearance queue with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single<{ role: string }>();
    if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status) {
      where.clearanceStatus = status;
    }
    if (search) {
      where.profile = {
        full_name: { contains: search, mode: "insensitive" },
      };
    }

    const records = await prisma.alumni.findMany({
      where,
      include: {
        profile: {
          select: {
            full_name: true,
            email: true,
            phone: true,
            profile_photo_url: true,
          },
        },
        career_records: {
          where: { is_archived: false },
          select: {
            employment_status: true,
            employer_name: true,
            job_title: true,
            is_current: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return Response.json({ data: records });
  } catch (error) {
    console.error("[GET /api/admin/alumni/clearance]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST and PATCH handler for Single and Bulk clearance verification
async function handleClearanceVerification(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single<{ role: string }>();
    if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const action = body.action as "APPROVE" | "REJECT" | undefined;

    if (action !== "APPROVE" && action !== "REJECT") {
      return Response.json(
        { error: "Invalid action. Must be 'APPROVE' or 'REJECT'." },
        { status: 400 }
      );
    }

    // Support single (id: string) and bulk (ids: string[])
    let ids: string[] = [];
    if (Array.isArray(body.ids)) {
      ids = (body.ids as unknown[]).filter(
        (id: unknown): id is string => typeof id === "string" && id.trim().length > 0
      );
    } else if (typeof body.id === "string" && body.id.trim().length > 0) {
      ids = [body.id.trim()];
    }

    if (ids.length === 0) {
      return Response.json(
        { error: "At least one valid alumni ID must be provided." },
        { status: 400 }
      );
    }

    const remarks = typeof body.remarks === "string" ? body.remarks.trim() : null;

    // Fetch matching alumni records with profile info
    const alumniRecords = await prisma.alumni.findMany({
      where: { id: { in: ids } },
      include: {
        profile: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    if (alumniRecords.length === 0) {
      return Response.json(
        { error: "No matching alumni records found." },
        { status: 404 }
      );
    }

    // Route Guard: If action === 'APPROVE', verify that profileCompleteness === 100
    if (action === "APPROVE") {
      const incompleteRecords = alumniRecords.filter(
        (a) => (a.profileCompleteness ?? 0) < 100
      );

      if (incompleteRecords.length > 0) {
        const names = incompleteRecords
          .map((a) => a.profile?.full_name || a.id)
          .join(", ");

        return Response.json(
          {
            error: `Cannot approve clearance for incomplete profile(s): ${names}. Profile completeness must be 100% to qualify for graduation clearance.`,
            incompleteIds: incompleteRecords.map((a) => a.id),
          },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const adminClient = createAdminClient();
    const results = [];

    for (const record of alumniRecords) {
      if (action === "APPROVE") {
        const token = await generateUniqueClearanceToken();

        // 1. Update Alumni via Prisma
        await prisma.alumni.update({
          where: { id: record.id },
          data: {
            clearanceStatus: "CLEARED",
            clearedAt: now,
            clearedById: user.id,
            clearanceToken: token,
          },
        });

        // 2. Also mirror to Supabase postgres columns
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminClient.from("alumni") as any)
          .update({
            clearanceStatus: "CLEARED",
            clearance_status: "CLEARED",
            clearedAt: now.toISOString(),
            cleared_at: now.toISOString(),
            clearedById: user.id,
            cleared_by_id: user.id,
            clearanceToken: token,
            clearance_token: token,
          })
          .eq("id", record.id);

        // 3. Create In-App Notification
        await prisma.notification.create({
          data: {
            user_id: record.id,
            title: "Pre-Graduation Clearance Approved! 🎉",
            message: `Congratulations! Your graduation clearance has been approved. Your verified clearance certificate token is ${token}.`,
            type: "account",
            action_url: "/alumni/profile",
            is_read: false,
          },
        });

        // 4. Record Audit Log
        await logAudit({
          userId: user.id,
          action: AUDIT_ACTIONS.APPROVE_CLEARANCE,
          tableName: "alumni",
          recordId: record.id,
          oldValues: {
            clearanceStatus: record.clearanceStatus,
            clearanceToken: record.clearanceToken,
          },
          newValues: {
            clearanceStatus: "CLEARED",
            clearedAt: now.toISOString(),
            clearedById: user.id,
            clearanceToken: token,
          },
          ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
          userAgent: request.headers.get("user-agent") ?? undefined,
        });

        results.push({
          id: record.id,
          status: "CLEARED",
          clearanceToken: token,
          clearedAt: now.toISOString(),
        });
      } else {
        // REJECT
        const rejectionRemarks = remarks || "Clearance requirements not met.";

        // 1. Update Alumni via Prisma
        await prisma.alumni.update({
          where: { id: record.id },
          data: {
            clearanceStatus: "REJECTED",
            clearanceRemarks: rejectionRemarks,
          },
        });

        // 2. Mirror to Supabase columns
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminClient.from("alumni") as any)
          .update({
            clearanceStatus: "REJECTED",
            clearance_status: "REJECTED",
            clearanceRemarks: rejectionRemarks,
            clearance_remarks: rejectionRemarks,
          })
          .eq("id", record.id);

        // 3. Create In-App Notification
        await prisma.notification.create({
          data: {
            user_id: record.id,
            title: "Pre-Graduation Clearance Update",
            message: `Your graduation clearance submission was not approved. Remarks: ${rejectionRemarks}. Please complete any missing fields and resubmit.`,
            type: "account",
            action_url: "/alumni/profile",
            is_read: false,
          },
        });

        // 4. Record Audit Log
        await logAudit({
          userId: user.id,
          action: AUDIT_ACTIONS.REJECT_CLEARANCE,
          tableName: "alumni",
          recordId: record.id,
          oldValues: {
            clearanceStatus: record.clearanceStatus,
            clearanceRemarks: record.clearanceRemarks,
          },
          newValues: {
            clearanceStatus: "REJECTED",
            clearanceRemarks: rejectionRemarks,
          },
          ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
          userAgent: request.headers.get("user-agent") ?? undefined,
        });

        results.push({
          id: record.id,
          status: "REJECTED",
          clearanceRemarks: rejectionRemarks,
        });
      }
    }

    return Response.json({
      data: {
        success: true,
        action,
        count: results.length,
        results,
      },
    });
  } catch (error: any) {
    console.error("[POST/PATCH /api/admin/alumni/clearance]", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleClearanceVerification(request);
}

export async function PATCH(request: NextRequest) {
  return handleClearanceVerification(request);
}
