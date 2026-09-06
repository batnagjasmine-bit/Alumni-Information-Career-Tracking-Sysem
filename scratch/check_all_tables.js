const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const tables = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  const schemaMap = {};
  for (const row of tables.rows) {
    if (!schemaMap[row.table_name]) schemaMap[row.table_name] = [];
    schemaMap[row.table_name].push(row.column_name);
  }

  console.log("All DB tables & columns:", JSON.stringify(schemaMap, null, 2));

  await pool.end();
}

main().catch(console.error);
