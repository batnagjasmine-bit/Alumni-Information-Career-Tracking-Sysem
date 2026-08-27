import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/utils/audit";
import { prisma } from "@/lib/prisma";

// POST /api/admin/employers/[id]/restore — restore employer account
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

    // 1. Restore by updating is_active to true
    await prisma.profile.update({
      where: { id },
      data: { is_active: true }
    });

    // Log audit
    await logAudit({
      userId: user.id,
      action: "RESTORE_USER" as any, 
      tableName: "profiles",
      recordId: id,
      newValues: { role: "employer", is_active: true },
    });

    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error("[POST /api/admin/employers/[id]/restore]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
