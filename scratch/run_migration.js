const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log("Applying database migration to career_records...");
  
  await pool.query(`
    ALTER TABLE career_records 
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE career_records 
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_career_records_is_archived 
    ON career_records(is_archived);

    CREATE INDEX IF NOT EXISTS idx_career_records_alumni_id_is_archived 
    ON career_records(alumni_id, is_archived);
  `);

  console.log("Migration applied successfully!");

  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'career_records'
    ORDER BY ordinal_position;
  `);
  console.log("Updated career_records columns:", cols.rows.map(c => `${c.column_name} (${c.data_type})`));

  const records = await pool.query(`
    SELECT id, alumni_id, job_title, employer_name, is_current, is_archived, archived_at
    FROM career_records;
  `);
  console.log("Existing records in career_records:", records.rows);

  await pool.end();
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
