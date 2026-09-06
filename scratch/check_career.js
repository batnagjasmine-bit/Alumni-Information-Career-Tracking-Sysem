const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query(`SELECT * FROM career_records`);
  console.log("career_records count:", res.rows.length);
  console.log("career_records rows:", res.rows);
  await pool.end();
}

main().catch(console.error);
