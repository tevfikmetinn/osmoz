// Osmoz content script — sayfada metin seçildiğinde 🌱 buton gösterir
// ve seçim yapıldığında popup açar (in-page overlay)

const OSMOZ_BUTTON_ID = "osmoz-select-button";
const OSMOZ_CARD_ID = "osmoz-analysis-card";
const MIN_SELECTION_LENGTH = 2;
const MAX_SELECTION_LENGTH = 500;

let currentSelection = null;
let cardOpenedAt = 0;
const CARD_GRACE_MS = 400; // dış tıklama ile kapanmadan önceki koruma süresi

function removeButton() {
  document.getElementById(OSMOZ_BUTTON_ID)?.remove();
}
function removeCard() {
  document.getElementById(OSMOZ_CARD_ID)?.remove();
}
function removeOsmozUI() {
  removeButton();
  removeCard();
}
function isCardOpen() {
  return !!document.getElementById(OSMOZ_CARD_ID);
}

function getSelectionInfo() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const text = selection.toString().trim();
  if (text.length < MIN_SELECTION_LENGTH || text.length > MAX_SELECTION_LENGTH) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  const containerNode = range.commonAncestorContainer;
  const containerEl =
    containerNode.nodeType === Node.ELEMENT_NODE
      ? containerNode
      : containerNode.parentElement;
  const sentenceContext = containerEl
    ? containerEl.innerText.slice(0, 800).replace(/\s+/g, " ").trim()
    : text;

  return {
    text,
    rect,
    sentenceContext,
    pageTitle: document.title.slice(0, 120),
    pageUrl: location.href,
  };
}

function showSelectButton(info) {
  // Kart açıksa yeni buton üretme — kart yaşasın
  if (isCardOpen()) return;
  removeButton();

  const btn = document.createElement("button");
  btn.id = OSMOZ_BUTTON_ID;
  btn.className = "osmoz-select-btn";
  btn.textContent = "🌱 Analiz et";
  btn.title = "Osmoz ile analiz et";

  const top = window.scrollY + info.rect.bottom + 6;
  const left = window.scrollX + info.rect.left;
  btn.style.top = `${top}px`;
  btn.style.left = `${left}px`;

  btn.addEventListener("mousedown", (e) => e.preventDefault(), true);
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openAnalysisCard(info);
  });

  document.body.appendChild(btn);
}

async function openAnalysisCard(info) {
  removeOsmozUI();
  cardOpenedAt = Date.now();

  const card = document.createElement("div");
  card.id = OSMOZ_CARD_ID;
  card.className = "osmoz-card";
  card.innerHTML = `
    <div class="osmoz-card-header">
      <span class="osmoz-logo">🌱 Osmoz</span>
      <button class="osmoz-close" aria-label="Kapat">×</button>
    </div>
    <div class="osmoz-original">${escapeHtml(info.text)}</div>
    <div class="osmoz-loading">Analiz ediliyor…</div>
    <div class="osmoz-body" hidden></div>
    <div class="osmoz-actions" hidden>
      <button class="osmoz-save">💾 Kaydet ve öğren</button>
      <button class="osmoz-skip">Vazgeç</button>
    </div>
  `;

  positionCard(card, info.rect);
  document.body.appendChild(card);

  card.querySelector(".osmoz-close").addEventListener("click", removeOsmozUI);
  card.querySelector(".osmoz-skip").addEventListener("click", removeOsmozUI);

  try {
    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_SELECTION",
      payload: {
        text: info.text,
        sentenceContext: info.sentenceContext,
        pageTitle: info.pageTitle,
        pageUrl: info.pageUrl,
      },
    });

    if (!response || !response.ok) {
      throw new Error(response?.error || "Bilinmeyen hata");
    }

    renderAnalysis(card, response.data, info);
  } catch (err) {
    card.querySelector(".osmoz-loading").textContent =
      "Hata: " + (err.message || err);
  }
}

function positionCard(card, rect) {
  const cardWidth = 380;
  const margin = 12;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const viewportW = window.innerWidth;

  let left = scrollX + rect.left;
  if (left + cardWidth + margin > scrollX + viewportW) {
    left = scrollX + viewportW - cardWidth - margin;
  }
  if (left < scrollX + margin) left = scrollX + margin;

  const top = scrollY + rect.bottom + 8;
  card.style.top = `${top}px`;
  card.style.left = `${left}px`;
  card.style.width = `${cardWidth}px`;
}

function renderAnalysis(card, data, info) {
  const loading = card.querySelector(".osmoz-loading");
  const body = card.querySelector(".osmoz-body");
  const actions = card.querySelector(".osmoz-actions");

  loading.hidden = true;
  body.hidden = false;
  actions.hidden = false;

  const grammarBadge = data.grammar?.name
    ? `<span class="osmoz-badge">${escapeHtml(data.grammar.name)}</span>`
    : "";

  const grammarNote = data.grammar?.note
    ? `<div class="osmoz-note">${escapeHtml(data.grammar.note)}</div>`
    : "";

  const wordsHtml = (data.words || [])
    .map(
      (w) => `
      <div class="osmoz-word">
        <span class="osmoz-word-en">${escapeHtml(w.word || "")}</span>
        <span class="osmoz-word-tr">${escapeHtml(w.translation_tr || "")}</span>
        ${w.role ? `<span class="osmoz-word-role">${escapeHtml(w.role)}</span>` : ""}
      </div>`,
    )
    .join("");

  const idiomHtml = data.phrasal_or_idiom
    ? `<div class="osmoz-idiom">
         <strong>Öbek/Deyim:</strong> ${escapeHtml(data.phrasal_or_idiom.name || "")}
         <div class="osmoz-note">${escapeHtml(data.phrasal_or_idiom.explanation_tr || "")}</div>
       </div>`
    : "";

  body.innerHTML = `
    <div class="osmoz-translation">🇹🇷 ${escapeHtml(data.translation_tr || "")}</div>
    <div class="osmoz-grammar">${grammarBadge}${grammarNote}</div>
    ${idiomHtml}
    <div class="osmoz-words-title">Kelimeler</div>
    <div class="osmoz-words">${wordsHtml}</div>
  `;

  const saveBtn = card.querySelector(".osmoz-save");
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Kaydediliyor…";
    try {
      const res = await chrome.runtime.sendMessage({
        type: "SAVE_CARD",
        payload: {
          selection: info.text,
          sentenceContext: info.sentenceContext,
          pageUrl: info.pageUrl,
          pageTitle: info.pageTitle,
          analysis: data,
        },
      });
      if (!res?.ok) throw new Error(res?.error || "Kaydedilemedi");
      saveBtn.textContent = "✓ Kaydedildi";
      setTimeout(removeOsmozUI, 900);
    } catch (err) {
      saveBtn.textContent = "Hata";
      saveBtn.disabled = false;
      console.error("[Osmoz] save error:", err);
    }
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let selectionDebounce;
document.addEventListener("mouseup", (e) => {
  // Kart açıkken hiçbir şey yapma — kart yaşasın
  if (isCardOpen()) return;

  // Buton üstüne mouseup ise, buton kendi click handler'ını halleder — dokunma
  const btn = document.getElementById(OSMOZ_BUTTON_ID);
  if (btn && btn.contains(e.target)) return;

  clearTimeout(selectionDebounce);
  selectionDebounce = setTimeout(() => {
    if (isCardOpen()) return;
    const info = getSelectionInfo();
    if (info) {
      currentSelection = info;
      showSelectButton(info);
    } else {
      removeButton();
    }
  }, 60);
});

document.addEventListener("mousedown", (e) => {
  const btn = document.getElementById(OSMOZ_BUTTON_ID);
  const card = document.getElementById(OSMOZ_CARD_ID);
  // Buton veya kart üzerinde tıklama — kartı kapatma
  if (btn && btn.contains(e.target)) return;
  if (card && card.contains(e.target)) return;
  // Kart açılalı çok az olduysa dış tıklamayı yut (accidental kapanmayı önle)
  if (card && Date.now() - cardOpenedAt < CARD_GRACE_MS) return;
  removeOsmozUI();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") removeOsmozUI();
});

// Extension güncellendiğinde eski script hala DOM'da kalabiliyor;
// mesaj gelmesini engelleyen bir port kopukluğuna karşı sessiz yakala
window.addEventListener("error", (e) => {
  if (String(e.message).includes("Extension context invalidated")) {
    removeOsmozUI();
  }
});
