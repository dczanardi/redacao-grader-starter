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

const BUY_REDACAO_URL =
  process.env.NEXT_PUBLIC_BUY_REDACAO_URL || "https://mpago.la/19QsBE1";

export default function Redacao() {
  const [rubrics, setRubrics] = useState<string[]>([]);
  const [rubric, setRubric] = useState("");
  const [student, setStudent] = useState("");
  const [proposalText, setProposalText] = useState("");
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [score, setScore] = useState<number | undefined>(undefined);
  const [allowedToShare, setAllowedToShare] = useState<boolean | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [creditsRedacao, setCreditsRedacao] = useState<number | null>(null);
const [meLoading, setMeLoading] = useState(true);
// --- créditos ---
const creditsValue = typeof creditsRedacao === "number" ? creditsRedacao : 0;
const hasCredits = creditsValue > 0;

async function reloadCredits() {
  setMeLoading(true);
  try {
    const me = await fetchMe();
    const c = me?.credits?.redacao;
    setCreditsRedacao(typeof c === "number" ? c : 0);
  } finally {
    setMeLoading(false);
  }
}

useEffect(() => {
  reloadCredits();
}, []);


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
  const canSubmitFinal = canSubmit && hasCredits && !meLoading;


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
  alert("Sem créditos disponíveis. Compre créditos para avaliar.");
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
     
return (
  <>
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 0,
        background: "#b5ad74", // cor das faixas laterais
      }}
    >
     {/* LATERAL ESQUERDA (faixa marrom) */}
<div
  style={{
    width: 260,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,

    // ✅ fica no topo (não desce pro meio)
    justifyContent: "flex-start",
    alignItems: "stretch",

    // ✅ “gruda” no topo quando rolar a página
    position: "sticky",
    top: 16,
    height: "fit-content",
  }}
>
  <button
    type="button"
    onClick={() => window.open("/reports", "_blank")}
    style={{
      width: "100%",
      padding: "14px 12px",
      borderRadius: 12,
      border: "2px solid rgba(255,255,255,0.55)",
      background: "rgba(255,255,255,0.25)",
      fontWeight: 800,
      cursor: "pointer",
    }}
  >
    Meus relatórios
  </button>
  <N8nHelpWidget />
</div>

      {/* CARTÃO CENTRAL (o conteúdo que já existe hoje) */}
      <div
        style={{
          maxWidth: 980,
          width: "100%",
          margin: "0 auto",
          padding: 16,
          backgroundColor: "#eef4f7ff",
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
    width: "120%",
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
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,3fr) minmax(0,2fr)",
            gap: 16,
            alignItems: "flex-start",
          }}
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
                width: "102%",
                padding: "4px 6px",
                boxSizing: "border-box",
                border: "1px solid #ccc",
                height: "315px",   // altura aproximada da caixa de transcrição
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
              alignSelf: "center",   // <<< esta linha faz a caixa descer/centrar
            }}
          >
           <N8nTranscriber setRedacaoText={setEssay} />
          </div>
        </div>

        
<div style={{ margin: "10px 0", opacity: meLoading ? 0.7 : 1 }}>
  <b>Créditos disponíveis:</b>{" "}
  {meLoading ? "carregando..." : (creditsRedacao ?? 0)}
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
      Você está sem créditos para avaliar redações.
    </div>

<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
  <button
    type="button"
    onClick={() => window.open(BUY_REDACAO_URL, "_blank", "noopener,noreferrer")}
    style={{
      padding: "10px 14px",
      borderRadius: 8,
      border: "none",
      background: "#0f766e",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    Comprar créditos
  </button>

  <button
    type="button"
    onClick={reloadCredits}
    style={{
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid #bbb",
      background: "#fff",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    Já comprei — atualizar
  </button>
</div>

  </div>
)}

{/* E-mail do usuário (obrigatório) */}
<div style={{ marginTop: 12, marginBottom: 12 }}>
  <label style={{ display: "block", fontWeight: 600 }}>
    Seu e-mail
  </label>
  <input
    type="email"
    value={student}
    onChange={(e) => setStudent(e.target.value)}
    placeholder="seuemail@email.com"
    style={{
      width: "100%",
      padding: "8px",
      borderRadius: 6,
      border: "1px solid #ccc",
    }}
  />
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
        ? "Sem créditos — compre para avaliar"
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
      <div style={{ width: 260 }} />
    </div>
  </>
);
}