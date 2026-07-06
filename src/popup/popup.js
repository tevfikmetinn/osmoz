import {
  seedDailyReviews,
  updateCard,
  getAllNotes,
  deleteNote,
  getCard,
} from "../lib/db.js";
import { review, RATING } from "../lib/fsrs.js";

const views = {
  home: document.getElementById("home"),
  review: document.getElementById("review"),
  library: document.getElementById("library"),
  done: document.getElementById("done"),
};

let session = { queue: [], index: 0, current: null };

function show(name) {
  for (const key in views) views[key].hidden = key !== name;
}

async function renderHome() {
  const cards = await seedDailyReviews(8);
  const notes = await getAllNotes();
  const stats = document.getElementById("stats");
  const startBtn = document.getElementById("startReview");
  const emptyMsg = document.getElementById("emptyMsg");

  if (notes.length === 0) {
    stats.innerHTML = "";
    startBtn.hidden = true;
    emptyMsg.hidden = false;
    return;
  }

  emptyMsg.hidden = true;
  stats.innerHTML = `
    <div><strong>${cards.length}</strong> kart bugün seni bekliyor</div>
    <div>Toplam kalıp: ${notes.length}</div>
  `;
  startBtn.hidden = cards.length === 0;
  startBtn.onclick = () => startReview(cards);
  show("home");
}

function startReview(queue) {
  if (queue.length === 0) return;
  session = { queue, index: 0, current: null };
  show("review");
  showNextCard();
}

async function showNextCard() {
  if (session.index >= session.queue.length) {
    show("done");
    return;
  }

  // Kartın en güncel halini DB'den çek (aynı seans içi rating sonrası taze veri)
  const stub = session.queue[session.index];
  const card = (await getCard(stub.id)) || stub;
  session.current = card;

  document.getElementById("progress").textContent =
    `${session.index + 1} / ${session.queue.length}`;
  document.getElementById("grammarTag").textContent = card.grammar || "";
  document.getElementById("clozeFront").textContent = card.front || "";
  document.getElementById("clozeTranslation").textContent =
    card.translation_tr || "";
  document.getElementById("clozeAnswer").textContent = card.back || "";
  document.getElementById("clozeHint").textContent = card.hint || "";
  document.getElementById("cardSource").textContent = card.contextSource
    ? `bağlam: ${card.contextSource}`
    : "";

  document.getElementById("answerBlock").hidden = true;
  document.getElementById("rating").hidden = true;
  document.getElementById("showAnswer").hidden = false;
}

document.getElementById("showAnswer").addEventListener("click", () => {
  document.getElementById("answerBlock").hidden = false;
  document.getElementById("rating").hidden = false;
  document.getElementById("showAnswer").hidden = true;
});

document.getElementById("rating").addEventListener("click", async (e) => {
  const btn = e.target.closest("button.rate");
  if (!btn) return;
  const rating = parseInt(btn.dataset.rating, 10);
  const updated = review(session.current.fsrs, rating);
  const newCard = { ...session.current, fsrs: updated };
  await updateCard(newCard);

  // "Yeniden" seçildiyse kartı seansın sonuna at
  if (rating === RATING.AGAIN) {
    session.queue.push(newCard);
  }
  session.index++;
  showNextCard();
});

document.getElementById("backFromReview").addEventListener("click", () => {
  renderHome();
});

document.getElementById("doneBack").addEventListener("click", () => {
  window.close();
});

document.getElementById("openLibrary").addEventListener("click", renderLibrary);
document.getElementById("backFromLibrary").addEventListener("click", renderHome);

document.getElementById("openSettings").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

async function renderLibrary() {
  const notes = await getAllNotes();
  notes.sort((a, b) => b.createdAt - a.createdAt);
  const list = document.getElementById("libraryList");
  const empty = document.getElementById("libEmpty");

  if (notes.length === 0) {
    list.innerHTML = "";
    empty.hidden = false;
  } else {
    empty.hidden = true;
    list.innerHTML = notes
      .map(
        (n) => `
          <div class="lib-item" data-id="${n.id}">
            <div class="en">${escapeHtml(n.sourceText)}</div>
            <div class="tr">${escapeHtml(n.analysis?.translation_tr || "")}</div>
            <div class="meta">
              <span>${escapeHtml(n.analysis?.grammar?.name || "")} · ${formatDate(n.createdAt)}</span>
              <button class="del" data-id="${n.id}">sil</button>
            </div>
          </div>`,
      )
      .join("");
    list.querySelectorAll(".del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Bu kalıbı ve kartlarını sileyim mi?")) return;
        await deleteNote(btn.dataset.id);
        renderLibrary();
      });
    });
  }
  show("library");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}

renderHome().catch((e) => {
  document.body.innerHTML =
    '<div style="padding:16px;color:#b91c1c">Hata: ' + escapeHtml(e.message) + "</div>";
});
