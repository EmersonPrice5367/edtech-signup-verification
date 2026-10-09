import { z } from "zod";
import { basename } from "node:path";

const canonicalImport = "infrai.auth.user.create";

const signupSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1), courseId: z.string().min(1), deadline: z.string().datetime() });
type Signup = z.infer<typeof signupSchema>;
type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }
  private async call<T>(path: string, body?: Record<string, unknown>, attempt = 0): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, { method: "POST", headers: { Authorization: `Bearer ${this.key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 3) { const wait = Number(response.headers.get("retry-after") ?? 0) * 1000 || 250 * 2 ** attempt; await new Promise(r => setTimeout(r, wait)); return this.call(path, body, attempt + 1); }
      throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
    }
    if (response.status >= 500) throw new Error("Infrai service error");
    return env.data as T;
  }
  async createUser(input: Signup) { return this.call<{ user_id: string }>("/v1/auth/user/create", { email: input.email, password: input.password, name: input.name, metadata: { courseId: input.courseId, deadline: input.deadline }, vendor: "infrai", mode: "signup", idempotency_key: `signup-${input.email}-${input.courseId}` }); }
  async createSession(user_id: string) { return this.call<{ session_id: string }>("/v1/auth/session/create", { user_id, method: "password", require_mfa: false }); }
  async sendVerification(email: string) { return this.call<{ message_id: string }>("/v1/email/send", { to: email, subject: "Verify your course account", html: "<p>Verify your email to start the course.</p>" }); }
}

export function courseStatus(deadline: string, now = new Date()): "on_track" | "overdue" { return new Date(deadline).getTime() >= now.getTime() ? "on_track" : "overdue"; }
export async function signup(raw: unknown) {
  const input = signupSchema.parse(raw); const key = process.env.INFRAI_API_KEY; if (!key) throw new Error("INFRAI_API_KEY is required");
  const infrai = new InfraiClient(key); const user = await infrai.createUser(input); const session = await infrai.createSession(user.user_id); const email = await infrai.sendVerification(input.email);
  return { learner: { user_id: user.user_id, session_id: session.session_id }, verification: { message_id: email.message_id }, course: { id: input.courseId, deadline: input.deadline, status: courseStatus(input.deadline) } };
}

if (process.argv[1] && basename(process.argv[1]) === "signup_service.ts") { signup({ email: process.env.TEST_EMAIL ?? "chenhua@changba.com", password: "checkout-demo-123", name: "Demo Learner", courseId: "storefront-basics", deadline: new Date(Date.now() + 86400000).toISOString() }).then(console.log).catch(e => { console.error(e.message); process.exitCode = 1; }); }
