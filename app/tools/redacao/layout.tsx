import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionPayload } from "@/app/lib/auth";

export default function RedacaoLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get("dcz_session")?.value || "";

  // A função aceita tanto header inteiro quanto token puro.
  const payload = verifySessionPayload(token);

  if (!payload?.e) redirect("/login");

  const products = payload.products || [];
  if (!products.includes("redacao")) redirect("/no-access");

  return <>{children}</>;
}