"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse = {
  ok: boolean;
  email?: string;
  isAdmin?: boolean;
};

export default function AppHeader() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    let alive = true;

    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setMe(d))
      .catch(() => alive && setMe({ ok: false }));

    return () => {
      alive = false;
    };
  }, []);

  const isAdmin = !!me?.isAdmin;
  const email = me?.email;

  const linkStyle = {
    color: "#1f1f1f",
    textDecoration: "none",
    fontWeight: 700,
    padding: "6px 10px",
    borderRadius: 10,
  } as const;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(6px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "10px 16px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ ...linkStyle, fontWeight: 900 }}>
            DCZ • Redação
          </Link>

          <Link href="/reports" style={linkStyle}>
            Relatórios
          </Link>

          {isAdmin && (
            <Link href="/admin/reports" style={linkStyle}>
              Admin
            </Link>
          )}
        </div>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {email ? `Logado: ${email}` : ""}
        </div>
      </div>
    </div>
  );
}