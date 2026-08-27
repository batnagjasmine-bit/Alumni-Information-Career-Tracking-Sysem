// app/api/alumni/career/[id]/restore/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";

// POST /api/alumni/career/[id]/restore
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: existing } = await db.from("career_records").select("alumni_id").eq("id", id).single();
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
    if (existing.alumni_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await db.from("career_records").update({
      is_archived: false,
      archived_at: null
    }).eq("id", id);
    if (error) throw error;

    await logAudit({ userId: user.id, action: AUDIT_ACTIONS.UPDATE_CAREER_RECORD, tableName: "career_records", recordId: id, newValues: { is_archived: false } });
    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error("[POST /api/alumni/career/[id]/restore]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
