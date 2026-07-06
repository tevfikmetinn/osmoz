// Osmoz background service worker
// - Content script'ten seçim gelir
// - Gemini 2.5 Flash'a JSON schema ile analiz için gönderilir
// - Cevap parse edilip content script'e döndürülür
// - Kaydet komutunda IndexedDB'ye yazılır (offscreen üzerinden değil, direkt worker'da işleyeceğiz — IDB service worker'da çalışır)

import { analyzeSelection } from "../lib/gemini.js";
import { saveCard, seedDailyReviews } from "../lib/db.js";

chrome.runtime.onInstalled.addListener(async () => {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) {
    // İlk kurulumda ayarlar sayfasını aç
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "ANALYZE_SELECTION") {
        const data = await analyzeSelection(message.payload);
        sendResponse({ ok: true, data });
      } else if (message?.type === "SAVE_CARD") {
        const savedIds = await saveCard(message.payload);
        sendResponse({ ok: true, savedIds });
      } else if (message?.type === "SEED_REVIEWS") {
        const list = await seedDailyReviews();
        sendResponse({ ok: true, list });
      } else {
        sendResponse({ ok: false, error: "Bilinmeyen mesaj tipi" });
      }
    } catch (err) {
      console.error("[Osmoz bg] error:", err);
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  })();
  return true; // async response
});
