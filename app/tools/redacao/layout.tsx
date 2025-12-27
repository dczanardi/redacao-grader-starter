// app/tools/redacao/layout.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/app/lib/auth";

export default function RedacaoLayout({ children }: { children: React.ReactNode }) {
  const cookieHeader = headers().get("cookie") || "";
  const email = verifySession(cookieHeader);

  if (!email) redirect("/login");

  return <>{children}</>;
}