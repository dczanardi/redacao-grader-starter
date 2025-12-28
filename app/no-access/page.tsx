// app/no-access/page.tsx
export default function NoAccessPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Sem acesso</h1>
      <p>
        Seu usuário não tem acesso a esta ferramenta no momento.
      </p>
      <p>
        Se você acabou de comprar, atualize a página em alguns segundos e tente novamente.
      </p>
      <p>
        <a href="/login">Voltar para o login</a>
      </p>
    </main>
  );
}