const input = document.getElementById("apiKey");
const status = document.getElementById("status");

(async function init() {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (apiKey) input.value = apiKey;
})();

document.getElementById("save").addEventListener("click", async () => {
  const key = input.value.trim();
  if (!key) {
    setStatus("Boş bırakma bre.", "err");
    return;
  }
  await chrome.storage.local.set({ apiKey: key });
  setStatus("Kaydedildi ✓", "ok");
});

document.getElementById("test").addEventListener("click", async () => {
  const key = input.value.trim();
  if (!key) {
    setStatus("Önce anahtarı gir.", "err");
    return;
  }
  setStatus("Test ediliyor…", "");
  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      encodeURIComponent(key);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Say OK." }] }],
        generationConfig: { maxOutputTokens: 8 },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`${res.status} ${t.slice(0, 120)}`);
    }
    await chrome.storage.local.set({ apiKey: key });
    setStatus("Bağlantı başarılı ✓ Anahtar kaydedildi.", "ok");
  } catch (err) {
    setStatus("Hata: " + (err.message || err), "err");
  }
});

function setStatus(msg, kind) {
  status.textContent = msg;
  status.className = "status " + (kind || "");
}
