import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/alumni/[id] — archive alumni account (soft delete)
export async function DELETE(
  request: NextRequest,
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

    // Ensure we aren't archiving ourselves
    if (id === user.id) return Response.json({ error: "Cannot archive your own account" }, { status: 400 });

    // 1. Soft delete by updating is_active to false and hiding public profile
    await prisma.$transaction([
      prisma.profile.update({
        where: { id },
        data: { is_active: false }
      }),
      prisma.alumni.updateMany({
        where: { id },
        data: { is_profile_public: false }
      })
    ]);

    // 2. Log audit trail
    await logAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.ARCHIVE_ALUMNI,
      tableName: "profiles",
      recordId: id,
      newValues: { role: "alumni", is_active: false },
    });

    return Response.json({ data: { success: true, message: "Alumni account archived successfully" } });
  } catch (error) {
    console.error("[DELETE /api/admin/alumni/[id]]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
