// app/tools/redacao/page.tsx
"use client";
import N8nTranscriber from "./transcricao/N8nTranscriber";
import N8nHelpWidget from "./components/N8nHelpWidget";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
type MeResponse = {
  ok: boolean;
  email?: string;
  products?: string[];
  credits?: Record<string, number>;
};

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/me", { credentials: "include" });

  // Se não está logado, a rota pode responder 401
  if (res.status === 401) return { ok: false };

  // Se der outro erro, também tratamos como ok=false
  if (!res.ok) return { ok: false };

  return res.json();
}

type RubricListResp = { items?: { id: string; file: string }[]; error?: string };
type GradeResp = { ok?: boolean; report_html?: string; total?: number; error?: string };


export default function Redacao() {

  const [rubrics, setRubrics] = useState<string[]>([]);
  const [rubric, setRubric] = useState("");
  const [student, setStudent] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [proposalText, setProposalText] = useState("");
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [score, setScore] = useState<number | undefined>(undefined);
  const [allowedToShare, setAllowedToShare] = useState<boolean | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [creditsRedacao, setCreditsRedacao] = useState<number | null>(null);
  const [creditsTranscricao, setCreditsTranscricao] = useState<number | null>(null);
const [meLoading, setMeLoading] = useState(true);
const [isNarrow, setIsNarrow] = useState(false);
useEffect(() => {
  (async () => {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));

    if (data?.ok && data?.email) {
      setUserEmail(String(data.email));

      const redacaoCredits = data?.credits?.redacao;
      if (typeof redacaoCredits === "number") setCreditsRedacao(redacaoCredits);
      const transcricaoCredits = data?.credits?.transcricao;
      if (typeof transcricaoCredits === "number") setCreditsTranscricao(transcricaoCredits);
    }

    setMeLoading(false);
  })();
}, []);

useEffect(() => {
  if (typeof window === "undefined") return;

  const mq = window.matchMedia("(max-width: 900px)");

  const apply = () => setIsNarrow(mq.matches);
  apply();

  // compat: alguns browsers antigos
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  } else {
    // @ts-ignore
    mq.addListener(apply);
    // @ts-ignore
    return () => mq.removeListener(apply);
  }
}, []);


// --- créditos ---
const redacaoValue = typeof creditsRedacao === "number" ? creditsRedacao : 0;
const transcricaoValue = typeof creditsTranscricao === "number" ? creditsTranscricao : 0;

const hasCreditsRedacao = redacaoValue > 0;
const hasCreditsTranscricao = transcricaoValue > 0;


async function reloadCredits() {
  setMeLoading(true);
  try {
    const me = await fetchMe();
    const c = me?.credits?.redacao;
    setCreditsRedacao(typeof c === "number" ? c : 0);
    const t = me?.credits?.transcricao;
    setCreditsTranscricao(typeof t === "number" ? t : 0);

  } finally {
    setMeLoading(false);
  }
}

useEffect(() => {
  reloadCredits();
}, []);

async function startCheckout(qty: 1 | 3 | 5) {
  try {
    const res = await fetch("/api/mp/create-preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ qty }),
    });

    const data = await res.json().catch(() => ({}));

    const url = data?.init_point || data?.sandbox_init_point;
    if (!res.ok || !url) {
      alert(
        "Não consegui abrir o pagamento. " +
          (data?.error ? `Detalhe: ${data.error}` : "")
      );
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  } catch (e: any) {
    alert("Erro ao iniciar pagamento: " + (e?.message || String(e)));
  }
}


  // --------------------------------------------------
  // 1) Carrega lista de rubricas
  // --------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/rubrics");
        const data: RubricListResp = await res.json();
        const list = (data.items || []).map((x) => x.id);
        setRubrics(list);
        if (!rubric && list.length) {
          setRubric(list.includes("ENEM") ? "ENEM" : list[0]);
        }
      } catch {
        // fallback se a API de rubricas der erro
        const fallback = [
            "ENEM",
            "FUVEST",
            "UNICAMP",
            "VUNESP",
            "PUC",
            "MACKENZIE",
            "FGV",
        ];
        setRubrics(fallback);
        if (!rubric) setRubric("ENEM");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(
    () => !!essay.trim() && !!rubric,
    [essay, rubric]
  );
  const canSubmitFinal = canSubmit && hasCreditsRedacao && !meLoading;

  // --------------------------------------------------
  // 2) Enviar redação para correção
  // --------------------------------------------------
  async function avaliar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) {
      alert("Selecione a rubrica e cole o texto da redação.");
      return;
    }
      if (allowedToShare === null) {
    setConsentError(
      "Por favor, selecione se você autoriza ou não a divulgação da sua redação."
    );
    return;
  }
    setLoading(true);
    setReport("");
    setScore(undefined);

    const fd = new FormData();
    fd.append("rubric", rubric);
    fd.append("student_name", student);
    fd.append("proposal_text", proposalText);
    if (proposalFile) fd.append("proposal_file", proposalFile);
    fd.append("essay_text_override", essay);
    fd.append("allowed_to_share", allowedToShare === true ? "true" : "false");

    try {
      const res = await fetch("/api/grade2", { method: "POST", body: fd, credentials: "include" });
      const txt = await res.text();
      // Se sessão expirou ou não está logado
if (res.status === 401) {
  alert("Sua sessão expirou (ou você não está logado). Faça login novamente.");
  await reloadCredits();
  return;
}

// Sem crédito
if (res.status === 402) {
  alert("Sem cotas de correção disponíveis. Compre créditos para liberar uma correção.");
  await reloadCredits();
  return;
}

      let data: GradeResp | null = null;
try {
  data = JSON.parse(txt);
} catch {
  // Se não veio JSON, evita estourar HTML inteiro no alert
  throw new Error(`Falha na avaliação (HTTP ${res.status}).`);
}

if (!res.ok || !data) {
  throw new Error(data?.error || `Falha na avaliação (HTTP ${res.status}).`);
}

      await reloadCredits();
      setReport(String(data.report_html || ""));
      setScore(data.total);
      

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    } catch (err: any) {
      alert(`Falha na avaliação: ${err?.message || String(err)}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // 3) Download do relatório em HTML
  // (PDF foi removido de propósito)
  // --------------------------------------------------
  function baixarHTML() {
    if (!report) return;
    const blob = new Blob([report], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (student || "aluno").replace(/\s+/g, "_");
    a.href = url;
    a.download = `relatorio-${rubric}-${safeName}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // --------------------------------------------------
  // 4) Layout da página
  // --------------------------------------------------
const isMobile = isNarrow;


return (
  
    <div
  style={{
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "center", // ✅ não centraliza mais
    gap: 16,                      // ✅ dá respiro entre colunas
    background: "#b5ad74",
    width: "100%",                // ✅ ocupa a tela toda
    padding: "0 18px",            // ✅ margem interna pequena
    boxSizing: "border-box",
    overflowX: "visible",
    maxWidth: "100%",
  }}
>
     {/* LATERAL ESQUERDA (faixa marrom) */}
<div
  style={{
    width: isMobile ? "100%" : 380,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,

    // ✅ fica no topo (não desce pro meio)
    justifyContent: "flex-start",
    alignItems: "stretch",

    // ✅ “gruda” no topo quando rolar a página
    position: isMobile ? "relative" : "sticky",
    top: 16,
    height: "fit-content",
  }}
>
  <button
    type="button"
    disabled={meLoading}
    onClick={() => window.open("/reports", "_blank")}
    style={{
  width: "100%",
  padding: "18px 14px",                 // ✅ botão mais alto
  borderRadius: 14,
  border: "4px solid rgba(255,255,255,0.55)",
  background: "rgba(255,255,255,0.25)",
  fontWeight: 900,
  fontSize: 30,                          // ✅ fonte maior
  letterSpacing: 0.2,
  cursor: "pointer",
}}
  >
    Meus relatórios
  </button>
  <div>
  <N8nHelpWidget />
</div>

{/* ✅ BOX CRÉDITOS + EMAIL (foi do miolo para a lateral) */}

<div
  style={{
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(0,0,0,0.08)",
  }}
>

{/* E-mail do usuário (sempre visível) */}
<div style={{ marginBottom: 12 }}>
  <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
    Seu e-mail
  </label>
  <input
    type="email"
    value={userEmail}
    readOnly
    placeholder="seuemail@email.com"
    style={{
      width: "100%",
      padding: "10px 10px",
      borderRadius: 10,
      border: "1px solid rgba(0,0,0,0.18)",
      outline: "none",
      boxSizing: "border-box",
    }}
  />
</div>

{/* Créditos disponíveis (sempre visível) */}
<div style={{ opacity: meLoading ? 0.7 : 1, fontWeight: 700 }}>
  Cotas de correção:{" "}
  <span style={{ fontWeight: 800 }}>
    {meLoading ? "carregando..." : (creditsRedacao ?? 0)}
  </span>
</div>

<div style={{ marginTop: 6, opacity: meLoading ? 0.7 : 1, fontWeight: 700 }}>
  Cotas de transcrição:{" "}
  <span style={{ fontWeight: 800 }}>
    {meLoading ? "carregando..." : (creditsTranscricao ?? 0)}
  </span>
</div>


{typeof creditsRedacao === "number" && creditsRedacao <= 0 && (
  <div
    style={{
      marginTop: 12,
      padding: 12,
      border: "1px solid #ddd",
      borderRadius: 8,
      background: "#fff",
    }}
  >
    <div style={{ marginBottom: 10, fontWeight: 600 }}>
      Você está sem cotas de correção.
    </div>

    <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    marginTop: 10,
  }}
>
  <button
    type="button"
    onClick={() => startCheckout(1)}
    style={{
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: "none",
      background: "#0f766e",
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
    }}
  >
    Comprar 1 crédito — R$ 9,90
  </button>

  <button
    type="button"
    onClick={() => startCheckout(3)}
    style={{
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: "none",
      background: "#0f766e",
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
    }}
  >
    Comprar 3 créditos — R$ 26,90
  </button>

  <button
    type="button"
    onClick={() => startCheckout(5)}
    style={{
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: "none",
      background: "#0f766e",
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
    }}
  >
    Comprar 5 créditos — R$ 41,90
  </button>

  {/* Em breve */}
  <button
    type="button"
    disabled
    style={{
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#e5e7eb",
      color: "#6b7280",
      fontWeight: 800,
      cursor: "not-allowed",
    }}
  >
    Comprar 10 créditos (em breve)
  </button>

  <button
    type="button"
    disabled
    style={{
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#e5e7eb",
      color: "#6b7280",
      fontWeight: 800,
      cursor: "not-allowed",
    }}
  >
    Comprar 50 créditos (em breve)
  </button>

  <button
    type="button"
    disabled
    style={{
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#e5e7eb",
      color: "#6b7280",
      fontWeight: 800,
      cursor: "not-allowed",
    }}
  >
    Comprar 100 créditos (em breve)
  </button>

  {/* Botão atualizar abaixo de tudo */}
  <button
    type="button"
    onClick={reloadCredits}
    style={{
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid #bbb",
      background: "#fff",
      fontWeight: 900,
      cursor: "pointer",
      marginTop: 6,
    }}
  >
    Já comprei — atualizar
  </button>
</div>

  </div>

)}

</div>  
</div>

      {/* CARTÃO CENTRAL (o conteúdo que já existe hoje) */}
      <div
  style={{
    flex: 1,                 // ✅ deixa o centro ocupar o espaço disponível
    maxWidth: 1280,          // ✅ mais largo (empurra pra direita)
    width: "100%",
    margin: 0,               // ✅ não centraliza com auto
    padding: 16,
    backgroundColor: "#eef4f7ff",
    position: "relative",
    overflow: "hidden",
    borderRadius: 12,
  }}
>

    {/* BANNER SUPERIOR --------------------------------------------------- */}
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        marginBottom: 16,
      }}
    >

      <div style={{ flex: "0 0 320px" }}>
        {/* Troque o caminho da imagem se precisar */}
       
  <img
  src="/logo-dcz.png"
  alt="DCZ Pensando Educação"
  style={{
    width: isMobile ? "100%" : "120%",
    height: "130px",
    borderRadius: 8,
    border: "1px solid #ccccccc1",
    objectFit: "contain",
    display: "block",
  }}
/>

      </div>

      {/* BOX DO TÍTULO (CORRETOR DE REDAÇÃO) */}
      <div
        style={{
          flex: "0 1 520px",        // fica mais estreito e não ocupa tudo
          maxWidth: 520,            // largura máxima do box
          marginLeft: "auto",       // empurra o box pra direita
          borderRadius: 8,
          padding: "12px 16px",
          border: "1px solid #ccc",
          backgroundColor: "#978b3fb9", // verde oliva do cabeçalho
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h1 
          style={{ 
            margin: "0 0 4px", 
            fontSize: 37,
            color: "#FFFFFF",      // título branco
            textAlign: "center",   // centralizado no box
             }}
             >
          CORRETOR DE REDAÇÃO
        </h1>
        <p style={{ 
          margin: 0, 
          color: "#FFFFFF",      // texto branco
          fontWeight: 600,
          fontSize: 24,          // um pouco maior que antes
          textAlign: "center",   // centralizado no box 
          }}
          >
          Ferramenta IA de correção de redações
        </p>
      </div>
    </div>

      {/* INSTRUÇÕES RETRÁTEIS --------------------------------------------- */}
      <details
        open
        style={{
          marginBottom: 16,
          borderRadius: 8,
          border: "1px solid #ccc",
          background: "rgba(255,255,255,0.9)",
          padding: "8px 12px",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          INSTRUÇÕES (clique para abrir/fechar)
        </summary>
        <ol style={{ marginTop: 8, paddingLeft: 20, fontSize: 14 }}>
          <li>
            <b>Escolha a grade de correção</b> (vestibular / rubrica).
          </li>

          <li>
            <b>Digite seu nome ou identificação</b> (opcional).
          </li>

          <li>
            <b>Proposta da redação</b>:
            <ul>
              <li>Digite ou cole o texto da proposta no campo apropriado.</li>
              <li>
                <i>ou</i>
              </li>
              <li>Envie um arquivo em imagem PNG com a proposta.</li>
            </ul>
          </li>

          <li>
            <b>Redação</b>:
            <ul>
              <li>Digite diretamente a redação.</li>
              <li>
                <i>ou</i>
              </li>
              <li>Cole o texto já digitado.</li>
              <li>
                <i>ou</i>
              </li>
              <li>
                Use o botão de <b>Transcrição de Redação</b> para transformar
                texto manuscrito em texto digitado.
              </li>
            </ul>
          </li>

          <li>
            <b>Avaliar</b>:
            <ul>
              <li>
                Clique em <b>Avaliar</b> e aguarde a correção.
              </li>
              <li>
                Depois de corrigida a redação (entre 2 e 3 minutos), o relatório
                com a correção, as notas por critério, a nota final e as sugestões de
                melhoria, aparecerá na janela logo abaixo do botão{" "}
                <b>Avaliar</b>.
              </li>
              <li>
                Clique em <b>Baixar HTML</b> para salvar o relatório de correção
                na pasta <b>Downloads</b>.
              </li>
              <li>
                Se quiser, abra o relatório no navegador, clique com o botão
                direito e use a opção <code>Imprimir...</code> para
                transformá-lo em PDF.
              </li>
            </ul>
          </li>
        </ol>
      </details>

      {/* FORMULÁRIO PRINCIPAL --------------------------------------------- */}
      <form
        onSubmit={avaliar}
        style={{ display: "grid", gap: 12, marginTop: 4 }}
      >
        {/* Passo 1: Rubrica ---------------------------------------------- */}
        <label style={{ fontSize: 14 }}>
          <b>1) Escolha a grade de correção:</b>
          <select
          value={rubric}
          onChange={(e) => setRubric(e.target.value)}
          style={{
          display: "block",
          marginTop: 4,
          padding: "4px 6px",
          boxSizing: "border-box",
          border: "1px solid #ccc",
          width: "100%",   // <<< aqui está a mudança principal
          }}
          >
            {rubrics.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        {/* Passo 2: Nome ------------------------------------------------------- */}
        <label
          style={{
          fontSize: 14,
          display: "block",
          width: "100%",
          }}
          >
          <b>2) Digite seu nome ou identificação.</b>
          <input
          value={student}
          onChange={(e) => setStudent(e.target.value)}
          placeholder="Ex.: Maria Souza"
          style={{
          display: "block",
          marginTop: 4,
          width: "100%",
          padding: "4px 6px",
          boxSizing: "border-box",
          border: "1px solid #ccc",
        }}
        />
        </label>

        {/* Passo 3: Proposta (texto + upload) ---------------------------- */}
        <div style={{ fontSize: 14 }}>
          <b>3) Proposta (digitada ou imagem):</b>

          <textarea
            value={proposalText}
            onChange={(e) => setProposalText(e.target.value)}
            rows={4}
            style={{
              display: "block",
              marginTop: 4,
              width: "100%",
              padding: "4px 6px",
              boxSizing: "border-box",
              border: "1px solid #ccc",
              minHeight: 80,   // pode aumentar/diminuir depois se quiser
            }}
            placeholder="Cole aqui a proposta da redação (se preferir, faça o upload no botão abaixo)."
          />

          <div style={{ marginTop: 8 }}>
            <span style={{ fontWeight: 600 }}>Upload proposta:</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) =>
                setProposalFile(e.target.files?.[0] || null)
              }
              style={{ display: "block", marginTop: 4 }}
            />
          </div>
        </div>

{/* Passo 4: Redação + botão de transcrição ----------------------- */}
<div
  style={
    isNarrow
      ? {
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "stretch",
        }
      : {
          display: "grid",
          gridTemplateColumns: "minmax(0,3fr) minmax(0,2fr)",
          gap: 16,
          alignItems: "flex-start",
        }
  }
>
  <label style={{ fontSize: 14 }}>
    <b>4) Redação:</b>
    <textarea
      value={essay}
      onChange={(e) => setEssay(e.target.value)}
      rows={12}
      style={{
        display: "block",
        marginTop: 4,
        width: "100%",
        padding: "4px 6px",
        boxSizing: "border-box",
        border: "1px solid #ccc",
        height: "315px",
        resize: "vertical",
      }}
      placeholder="Espaço para digitar ou colar a sua redação."
    />
  </label>

  <div
    style={{
      borderRadius: 16,
      border: "2px dashed #1b3333ff",
      padding: 10,
      background: "rgba(47,79,79,0.05)",
      fontSize: 12,

      // desktop: fica do lado direito, alinhado no topo
      ...(isNarrow ? {} : { alignSelf: "flex-start" }),

      // mobile: fica embaixo e centralizado
      ...(isNarrow
        ? { width: "100%", maxWidth: 720, margin: "0 auto" }
        : {}),
    }}
  >
   <N8nTranscriber
  disabled={meLoading || !hasCreditsTranscricao}
  setRedacaoText={setEssay}
  onTranscribed={() => {
    // baixa 1 só na tela (UI-only)
    setCreditsTranscricao((prev) =>
      typeof prev === "number" ? Math.max(prev - 1, 0) : 0
    );
  }}
/>

  </div>
</div>

{/* Passo 5: Botão avaliar --------------------------------------- */}
<div style={{ marginTop: 8 }}>
        {/* Autorização para visualização/divulgação */}
      <fieldset
        style={{
          marginTop: "1rem",
          padding: "0.75rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        <legend style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
          Autorização para visualização e divulgação
        </legend>

        <p style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          Selecione uma das opções abaixo. Você só poderá enviar a redação após
          escolher se autoriza ou não a divulgação.
        </p>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            fontSize: "0.85rem",
            marginBottom: "0.25rem",
          }}
        >
          <input
            type="radio"
            name="sharePermission"
            value="yes"
            onChange={() => {
              setAllowedToShare(true);
              setConsentError(null);
            }}
          />
          <span>
            Autorizo a visualização pela equipe DCZ Pensando Educação e a
            eventual divulgação da minha redação e do relatório em materiais de
            demonstração e nas redes sociais, caso a nota final seja igual ou
            superior a 7,0 (ou 700, no caso do ENEM).
          </span>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            fontSize: "0.85rem",
          }}
        >
          <input
            type="radio"
            name="sharePermission"
            value="no"
            onChange={() => {
              setAllowedToShare(false);
              setConsentError(null);
            }}
          />
          <span>
            Não autorizo a divulgação da minha redação nem do relatório em
            materiais de demonstração ou nas redes sociais. Os dados serão
            usados apenas para a correção automática e para fins internos de
            suporte técnico, se necessário.
          </span>
        </label>

        {consentError && (
          <p
            style={{
              color: "red",
              fontSize: "0.8rem",
              marginTop: "0.5rem",
            }}
          >
            {consentError}
          </p>
        )}
      </fieldset>
  <button
    type="submit"
disabled={loading || meLoading || !canSubmitFinal}
    style={{
      width: "100%",
      padding: "12px 16px",
      borderRadius: 6,
      border: "none",
      background: "#9b9543ce",
      color: "#fff",
      fontWeight: 700,
      fontSize: 16, // texto um pouco maior
      cursor: loading || meLoading || !canSubmitFinal ? "not-allowed" : "pointer",
    }}
  >
 {
  loading
    ? "Gerando avaliação..."
    : meLoading
      ? "Carregando..."
      : (typeof creditsRedacao === "number" && creditsRedacao <= 0)
        ? "Sem cotas de correção — compre para avaliar"
        : "5) AVALIAR SUA REDAÇÃO"
}
          </button>
        </div>
      </form>

      {/* RELATÓRIO -------------------------------------------------------- */}
      {report && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              marginBottom: 8,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {(() => {
  const isEnem = rubric.toUpperCase().includes("ENEM");
  const label = isEnem ? "0–1000" : "0–100";

  if (score == null) {
    return (
      <>
        <b>Nota ({label}):</b> — 
      </>
    );
  }

  const displayScore = isEnem ? Math.round(score * 10) : Math.round(score);

  return (
    <>
      <b>Nota ({label}):</b> {displayScore}
    </>
  );
})()}

            <button onClick={baixarHTML}>Baixar HTML</button>
          </div>

          <iframe
            title="Relatório"
            style={{
              width: "100%",
              height: 560,
              border: "1px solid #ddd",
              background: "#fff",
            }}
            srcDoc={report}
          />
        </div>
      )}
      </div>

      {/* LATERAL DIREITA (faixa marrom) */}
      <div style={{ width: isMobile ? 0 : 24 }} />
    </div>
);
}