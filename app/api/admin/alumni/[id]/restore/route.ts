import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";
import { prisma } from "@/lib/prisma";

// POST /api/admin/alumni/[id]/restore — restore archived alumni account
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Verify admin role
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single<{ role: string }>();
    if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    // 1. Restore by updating is_active to true and re-enabling public profile
    await prisma.$transaction([
      prisma.profile.update({
        where: { id },
        data: { is_active: true }
      }),
      prisma.alumni.updateMany({
        where: { id },
        data: { is_profile_public: true }
      })
    ]);

    // 2. Log audit trail
    await logAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.RESTORE_ALUMNI,
      tableName: "profiles",
      recordId: id,
      newValues: { role: "alumni", is_active: true },
    });

    return Response.json({ data: { success: true, message: "Alumni account restored successfully" } });
  } catch (error) {
    console.error("[POST /api/admin/alumni/[id]/restore]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
