/**
 * سكربت محلي لمرة واحدة: إنشاء أو تحديث حساب المسؤول الوحيد مباشرة في
 * public.admin_credentials — بلا المرور بصفحة /admin/setup على الويب،
 * وبلا أي علاقة بـSupabase Auth (لا signUp، لا auth.users). يُشغَّل محلياً
 * فقط عبر: npm run create-admin
 *
 * يقرأ NEXT_PUBLIC_SUPABASE_URL وSUPABASE_SERVICE_ROLE_KEY من .env.local
 * المحلي حصراً — لا يُشغَّل على Vercel، ولا يطبع كلمة المرور أو المفتاح في
 * أي وقت مهما حدث (لا نجاح، لا خطأ).
 */

import { createInterface } from "node:readline";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { hashPassword } from "../src/lib/admin/password";

const TABLE = "admin_credentials";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  for (const rawLine of readFileSync(envPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (answer) => { rl.close(); res(answer.trim()); }));
}

/** إدخال بلا صدى في الطرفية (كلمة المرور) — بلا أي حزمة خارجية جديدة، عبر
 * وضع raw مباشر على stdin. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolvePromise) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = Boolean(stdin.isRaw);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let input = "";
    const onData = (chunk: string) => {
      const char = chunk.toString();
      if (char === "\n" || char === "\r" || char === "") {
        stdin.setRawMode?.(wasRaw);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolvePromise(input);
        return;
      }
      if (char === "") {
        process.stdout.write("\n");
        process.exit(1);
      }
      if (char === "" || char === "\b") {
        input = input.slice(0, -1);
        return;
      }
      input += char;
    };
    stdin.on("data", onData);
  });
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local — cannot continue.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: readError } = await supabase.from(TABLE).select("id, username, email").limit(1).maybeSingle();
  if (readError) {
    console.error(`Failed to read admin_credentials table: ${readError.message}`);
    process.exit(1);
  }

  if (existing) {
    console.log(`An admin account already exists (username: "${existing.username}", email: "${existing.email}").`);
    const confirm = await ask("Update this account's credentials instead of creating a new one? (yes/no): ");
    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("Aborted — no changes made.");
      process.exit(0);
    }
  }

  const username = await ask("Username: ");
  const email = await ask("Email: ");
  const password = await askHidden("Password: ");
  const confirmPassword = await askHidden("Confirm Password: ");

  if (!username || !email || !password) {
    console.error("All fields are required.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }
  if (password !== confirmPassword) {
    console.error("Passwords do not match.");
    process.exit(1);
  }

  const passwordHash = hashPassword(password);

  if (existing) {
    const { error } = await supabase
      .from(TABLE)
      .update({ username, email, password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) {
      console.error(`Failed to update admin credential: ${error.message}`);
      process.exit(1);
    }
  } else {
    const { error } = await supabase.from(TABLE).insert({ username, email, password_hash: passwordHash });
    if (error) {
      console.error(`Failed to create admin credential: ${error.message}`);
      process.exit(1);
    }
  }

  console.log("Admin created successfully");
  process.exit(0);
}

main();
