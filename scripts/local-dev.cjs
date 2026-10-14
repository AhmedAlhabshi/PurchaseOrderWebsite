const fs = require("node:fs");
const path = require("node:path");
const { spawnSync, spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const localDir = path.join(root, ".local");
fs.mkdirSync(localDir, { recursive: true });
const databaseFile = path.join(localDir, "purchase-orders.db");
if (!fs.existsSync(databaseFile)) fs.closeSync(fs.openSync(databaseFile, "wx"));
const databaseUrl = "file:../.local/purchase-orders.db";
const envFile = path.join(root, ".env.local");
if (fs.existsSync(envFile)) {
  const current = fs.readFileSync(envFile, "utf8");
  const configured = /^DATABASE_URL="?([^"\r\n]+)"?$/m.exec(current)?.[1];
  if (configured !== databaseUrl) {
    throw new Error(".env.local already exists with another database. Preserve it and configure the local database explicitly before continuing.");
  }
} else {
  fs.writeFileSync(envFile, `# Isolated local development only. Never deploy this file.\nDATABASE_URL="${databaseUrl}"\nDIRECT_URL="${databaseUrl}"\nAPP_PASSWORD=""\nSMTP_HOST=""\nSMTP_USER=""\nSMTP_PASSWORD=""\n`);
}
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
  .replace('provider  = "postgresql"', 'provider  = "sqlite"')
  .replace(/^\s*directUrl = env\("DIRECT_URL"\)\r?\n/m, "");
if (!schema.includes('provider  = "sqlite"')) throw new Error("Local schema must use SQLite.");
const schemaFile = path.join(root, "prisma/schema.local.prisma");
fs.writeFileSync(schemaFile, schema);
const env = { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl, APP_PASSWORD: "", SMTP_HOST: "", SMTP_USER: "", SMTP_PASSWORD: "" };
for (const action of ["generate", "db push"]) {
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", ...action.split(" "), "--schema", schemaFile], { cwd: root, env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log("Local SQLite database ready. Production database and SMTP are not used.");
if (!process.argv.includes("--setup-only")) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", process.env.LOCAL_PORT || "3000"], { cwd: root, env, stdio: "inherit" });
  child.on("exit", code => process.exit(code || 0));
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}
