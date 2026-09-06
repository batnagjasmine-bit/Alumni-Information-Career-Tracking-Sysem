const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'career_records'
    ORDER BY ordinal_position;
  `);

  console.log("career_records columns:", cols.rows);

  const alumniCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns
    WHERE table_name = 'alumni'
    ORDER BY ordinal_position;
  `);
  console.log("alumni columns:", alumniCols.rows);

  const alumniRows = await pool.query(`
    SELECT a.id, a.batch_year, a.graduation_year, p.full_name, p.is_active
    FROM alumni a
    JOIN profiles p ON a.id = p.id;
  `);
  console.log("alumni rows:", alumniRows.rows);

  await pool.end();
}

main().catch(console.error);
