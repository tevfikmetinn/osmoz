// Osmoz — IndexedDB kartları deposu
// Bir "note" = kullanıcının kaydettiği bir kalıp/kelime (analiz sonucu)
// Her note'tan 1..4 "card" üretilir (aynı kalıbın farklı bağlamlardaki cloze'ları).
// Cardlar tek başlarına FSRS ile ilerler → aynı kalıp 4 farklı yerde çıkarak "maruz kalma" hissi verir.

import { initCard } from "./fsrs.js";

const DB_NAME = "osmoz";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("notes")) {
        const notes = db.createObjectStore("notes", { keyPath: "id" });
        notes.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains("cards")) {
        const cards = db.createObjectStore("cards", { keyPath: "id" });
        cards.createIndex("noteId", "noteId");
        cards.createIndex("dueAt", "fsrs.dueAt");
        cards.createIndex("state", "fsrs.state");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, stores, mode = "readonly") {
  return db.transaction(stores, mode);
}

function req2promise(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function uid() {
  return (
    Math.random().toString(36).slice(2, 10) +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

/**
 * Cümlenin içinden `answer`'ı bul ve `_____` ile değiştir.
 * Kelime sınırlarını kaba biçimde kontrol eder (case-insensitive).
 * Bulamazsa null döner.
 */
function makeClozeFromExample(sentence, answer) {
  if (!sentence || !answer) return null;
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b(${escaped})\\b`, "i");
  if (!regex.test(sentence)) return null;
  return sentence.replace(regex, "_____");
}

/**
 * Analizden note + card'ları üret ve DB'ye kaydet.
 * payload: { selection, sentenceContext, pageUrl, pageTitle, analysis }
 * Dönen: { noteId, cardIds }
 */
export async function saveCard(payload) {
  const db = await openDb();
  const now = Date.now();
  const noteId = uid();

  const note = {
    id: noteId,
    createdAt: now,
    sourceText: payload.selection,
    sentenceContext: payload.sentenceContext || "",
    pageUrl: payload.pageUrl || "",
    pageTitle: payload.pageTitle || "",
    analysis: payload.analysis,
  };

  const cards = [];
  const answer = payload.analysis?.cloze?.answer || "";
  const mainSentence =
    payload.analysis?.cloze?.sentence_with_blank || payload.selection;

  // 1) Ana kart: AI'ın verdiği cloze (kullanıcının seçtiği bağlam)
  cards.push({
    id: uid(),
    noteId,
    type: "cloze",
    front: mainSentence,
    back: answer,
    hint: payload.analysis?.cloze?.hint_tr || "",
    translation_tr: payload.analysis?.translation_tr || "",
    grammar: payload.analysis?.grammar?.name || "",
    contextSource: payload.pageTitle || "seçim",
    fsrs: initCard(now),
  });

  // 2) 3 gizli örnek cümlenin her biri için ek cloze kartı üret
  // (aynı `answer`'ı bul, `_____` ile değiştir — bulamazsan atla)
  const examples = payload.analysis?.examples || [];
  for (const ex of examples) {
    const clozeSentence = makeClozeFromExample(ex.en, answer);
    if (!clozeSentence) continue;
    cards.push({
      id: uid(),
      noteId,
      type: "cloze",
      front: clozeSentence,
      back: answer,
      hint: payload.analysis?.cloze?.hint_tr || "",
      translation_tr: ex.tr || "",
      grammar: payload.analysis?.grammar?.name || "",
      contextSource: "örnek bağlam",
      fsrs: initCard(now),
    });
  }

  const t = tx(db, ["notes", "cards"], "readwrite");
  await req2promise(t.objectStore("notes").put(note));
  for (const c of cards) {
    await req2promise(t.objectStore("cards").put(c));
  }
  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });

  return { noteId, cardIds: cards.map((c) => c.id) };
}

export async function getAllCards() {
  const db = await openDb();
  const t = tx(db, ["cards"], "readonly");
  return req2promise(t.objectStore("cards").getAll());
}

export async function getAllNotes() {
  const db = await openDb();
  const t = tx(db, ["notes"], "readonly");
  return req2promise(t.objectStore("notes").getAll());
}

export async function getCard(id) {
  const db = await openDb();
  const t = tx(db, ["cards"], "readonly");
  return req2promise(t.objectStore("cards").get(id));
}

export async function getNote(id) {
  const db = await openDb();
  const t = tx(db, ["notes"], "readonly");
  return req2promise(t.objectStore("notes").get(id));
}

export async function updateCard(card) {
  const db = await openDb();
  const t = tx(db, ["cards"], "readwrite");
  await req2promise(t.objectStore("cards").put(card));
  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

export async function deleteNote(noteId) {
  const db = await openDb();
  const t = tx(db, ["notes", "cards"], "readwrite");
  await req2promise(t.objectStore("notes").delete(noteId));

  const cardStore = t.objectStore("cards");
  const index = cardStore.index("noteId");
  const cursorReq = index.openCursor(IDBKeyRange.only(noteId));
  await new Promise((res, rej) => {
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        res();
      }
    };
    cursorReq.onerror = () => rej(cursorReq.error);
  });

  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

/**
 * Popup'un günlük seans için ihtiyaç duyduğu kart havuzunu döndürür.
 * Vadesi gelmiş kartlar + günlük limit kadar "yeni" kart.
 */
export async function seedDailyReviews(maxNew = 8) {
  const all = await getAllCards();
  const now = Date.now();
  const due = all
    .filter((c) => c.fsrs && c.fsrs.state !== "new" && c.fsrs.dueAt <= now)
    .sort((a, b) => a.fsrs.dueAt - b.fsrs.dueAt);
  const news = all
    .filter((c) => !c.fsrs || c.fsrs.state === "new")
    .sort((a, b) => (a.fsrs?.dueAt || 0) - (b.fsrs?.dueAt || 0))
    .slice(0, maxNew);
  // Aynı note'tan üst üste iki kart karşımıza gelmesin diye karıştır
  const combined = [...due, ...news];
  return shuffle(combined);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
