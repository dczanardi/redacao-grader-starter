// app/layout.tsx

import AppHeader from "./components/AppHeader";
export const metadata = {
  title: "Correção de Redação",
  description: "Ferramenta simples para corrigir redações",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          backgroundColor: "#978b3fb9", // cor das faixas laterais
        }}
      >
        <AppHeader />
        {children}
      </body>
    </html>
  );
}