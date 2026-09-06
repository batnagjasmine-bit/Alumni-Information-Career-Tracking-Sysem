const { PrismaClient } = require("../generated/prisma");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const alumni = await prisma.alumni.findMany({
    include: {
      profile: { select: { full_name: true, email: true, is_active: true } },
      career_records: true,
    }
  });

  console.log("Alumni count:", alumni.length);
  alumni.forEach(a => {
    console.log({
      id: a.id,
      name: a.profiles?.full_name,
      email: a.profiles?.email,
      batch_year: a.batch_year,
      graduation_year: a.graduation_year,
      course: a.course,
      isActive: a.profiles?.is_active,
      careers: a.career_records.length
    });
  });

  await pool.end();
}

main().catch(console.error);
