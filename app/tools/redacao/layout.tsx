// app/tools/redacao/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/app/lib/auth";

export default function RedacaoLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get("dcz_session")?.value ?? "";
  const email = verifySession(token);

  if (!email) {
    redirect("/login");
  }

  return <>{children}</>;
}