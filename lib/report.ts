export function renderReportHTML(data: any) {
  // Descobre se é ENEM ou outra banca
  const rubricLabel = (
    (data.rubric?.institution || data.rubric?.name || "") as string
  ).toUpperCase();

  const isEnemReport = rubricLabel.includes("ENEM");

  // nota interna continua 0–100
  const rawFinalScore = data.final_score_0_100 ?? 0;

  // para ENEM mostramos 0–1000; para as demais, 0–100
  const finalScoreDisplay = isEnemReport
    ? Math.round(rawFinalScore * 10)
    : Math.round(rawFinalScore);

  const scoreScaleLabel = isEnemReport ? "0–1000" : "0–100";

  // Monta a parte dos critérios
  const crit = (data.criteria || []).map((c: any) => {
    // nível normalizado (0–1,0). Se vier string, converte.
    const nivel01 =
      typeof c.level_chosen === "number"
        ? c.level_chosen
        : Number(c.level_chosen ?? 0);

    const nivelFormatado = nivel01.toFixed(1);

    const justificativaBase = escapeHTML(c.justification || "");

    // Acrescenta a informação de nível usando o MESMO número da tabela
    const justificativaComNivel =
      justificativaBase +
      ` (Neste critério, o nível considerado foi ${nivelFormatado} em uma escala de 0 a 1,0.)`;

    return `
    <section>
      <h3>${c.id} — ${c.name} (peso ${(c.weight * 100).toFixed(0)}%)</h3>
      <p><b>Nível (0–1,0):</b> ${nivelFormatado} (${c.level_score_native})</p>
      <p><b>Justificativa:</b> ${justificativaComNivel}</p>
      <p><b>Evidências:</b> ${(c.evidence || [])
        .map((e: string) => `“${escapeHTML(e)}”`)
        .join("; ")}</p>
    </section>
  `;
  }).join("\n");

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <title>${data.institution} — Avaliação de Redação</title>
  <style>
  body{font-family:Arial,Helvetica,sans-serif;margin:28px;color:#111;line-height:1.5}
  h1{font-size:22px;margin:0 0 6px}
  h2{font-size:18px;margin:16px 0 6px}
  h3{font-size:16px;margin:14px 0 6px}
  .badge{padding:4px 10px;border:1px solid #bbb;border-radius:999px;display:inline-block}
  ol{margin:0 0 0 20px}
  footer{margin-top:28px;color:#666;font-size:12px}
  </style></head><body>
  <h1>${data.institution} — Avaliação de Redação</h1>
  <div class="badge">Nota (${scoreScaleLabel}): <b>${finalScoreDisplay}</b></div>
  <h2>Proposta (resumo)</h2><p>${escapeHTML(data.proposta_summary || "")}</p>
  <h2>Endereçamento do tema</h2><p>${escapeHTML(data.addressing_of_theme || "")}</p>
  <h2>Critérios</h2>${crit}
  <h2>Feedback geral</h2><p>${escapeHTML(data.overall_feedback || "")}</p>
  <h2>Próximos passos</h2><ol>${(data.actionable_edits || [])
    .map((a: string) => `<li>${escapeHTML(a)}</li>`)
    .join("")}</ol>
  <footer>${escapeHTML(data.ethics_note || "")}</footer>
  </body></html>`;
}

function escapeHTML(s: string) {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[m]!
      )
  );
}