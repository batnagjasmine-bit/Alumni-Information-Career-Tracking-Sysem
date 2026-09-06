const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const rls = await pool.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'career_records';
  `);
  console.log("RLS enabled:", rls.rows);

  const policies = await pool.query(`
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'career_records';
  `);
  console.log("career_records policies:", policies.rows);

  await pool.end();
}

main().catch(console.error);
