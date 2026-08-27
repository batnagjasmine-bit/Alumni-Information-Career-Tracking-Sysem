import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET /api/announcements — published, non-expired announcements
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = 10;
    const from = (page - 1) * pageSize;

    const whereClause: any = {
      is_published: true,
      OR: [
        { expires_at: null },
        { expires_at: { gte: new Date() } }
      ]
    };
    if (category) {
      whereClause.category = category;
    }

    const [announcements, count] = await Promise.all([
      prisma.announcement.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          content: true,
          category: true,
          image_url: true,
          published_at: true,
          expires_at: true,
          admin: {
            select: { full_name: true }
          }
        },
        orderBy: { published_at: 'desc' },
        skip: from,
        take: pageSize,
      }),
      prisma.announcement.count({ where: whereClause })
    ]);

    // Map Prisma's 'admin' relation to 'profiles' to match what the frontend expects
    const data = announcements.map(ann => ({
      ...ann,
      profiles: ann.admin
    }));

    return Response.json({ data, count, page, pageSize });
  } catch (error) {
    console.error("[GET /api/alumni/announcements]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
