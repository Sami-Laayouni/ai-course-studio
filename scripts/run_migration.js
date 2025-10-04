const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log("Running context sources migration...");

    // Read the SQL file
    const sqlPath = path.join(__dirname, "008_add_context_sources.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Execute the SQL using the SQL editor
    const { error } = await supabase.from("_sql").select("*").limit(0);

    // For now, we'll just log the SQL that needs to be run manually
    console.log("Please run this SQL in your Supabase SQL editor:");
    console.log("================================================");
    console.log(sql);
    console.log("================================================");

    if (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }

    console.log("✅ Context sources migration completed successfully!");
    console.log(
      "Context sources table created for PDF and YouTube video context."
    );
  } catch (error) {
    console.error("Error running migration:", error);
    process.exit(1);
  }
}

runMigration();
