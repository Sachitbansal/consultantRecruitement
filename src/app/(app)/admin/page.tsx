import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminDashboard } from "@/components/AdminDashboard";

export const runtime = "nodejs";

// Server-side auth gate: this Server Component reads and verifies the
// session cookie on every request (no caching of this page — Next.js
// treats a component that reads `cookies()` as dynamic by default). An
// unauthenticated request is redirected before any application data is
// fetched or rendered. The dashboard's own data requests are additionally
// guarded server-side by requireAdmin() in the API routes, so a stolen/
// forged client state can never read data — only a valid session cookie
// can.
export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return <AdminDashboard adminEmail={session.email} />;
}
