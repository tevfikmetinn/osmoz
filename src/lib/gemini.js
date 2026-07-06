// Osmoz Gemini 2.5 Flash entegrasyonu
// - Structured output (JSON schema) ile deterministic cevap
// - Tek çağrıda: çeviri + kelime analizi + grammar + öbek/deyim + 3 örnek + cloze kartı

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Gemini structured output için JSON schema
// Not: Gemini'nin şema desteği tam JSON Schema değil (subset). Sadece OBJECT/ARRAY/STRING/NUMBER/BOOLEAN.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    translation_tr: {
      type: "string",
      description: "Seçilen metnin bağlama uygun Türkçe çevirisi.",
    },
    level: {
      type: "string",
      description: "Zorluk seviyesi: A2, B1, B2, C1, C2.",
    },
    grammar: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Cümlenin ana grammar yapısının adı (örn: Past Perfect Continuous, Passive Voice).",
        },
        note: {
          type: "string",
          description: "Türkçe kısa açıklama, 1-2 cümle.",
        },
        structure: {
          type: "string",
          description: "'düz' veya 'devrik'.",
        },
      },
    },
    phrasal_or_idiom: {
      type: "object",
      description:
        "Eğer metin bir phrasal verb veya deyim içeriyorsa. Yoksa boş obje ({}) dön.",
      properties: {
        name: { type: "string" },
        explanation_tr: { type: "string" },
        is_idiom: { type: "boolean" },
      },
    },
    words: {
      type: "array",
      description:
        "Anahtar kelime/öbekler. Metindeki tüm dolgu kelimeleri değil; öğrenilmeye değer olanlar.",
      items: {
        type: "object",
        properties: {
          word: { type: "string", description: "İngilizce kelime veya öbek." },
          translation_tr: { type: "string" },
          role: {
            type: "string",
            description:
              "Türkçe gramer rolü, örn: 'past participle', 'phrasal verb', 'noun (uncountable)'.",
          },
        },
      },
    },
    cloze: {
      type: "object",
      description:
        "Boşluk doldurma test kartı. Anahtar kalıbı çıkarılmış cümle.",
      properties: {
        sentence_with_blank: {
          type: "string",
          description: "Anahtar öbek yerine '_____' konmuş cümle.",
        },
        answer: {
          type: "string",
          description: "Boşluğa gelecek doğru cevap.",
        },
        hint_tr: {
          type: "string",
          description: "Türkçe küçük ipucu.",
        },
      },
    },
    examples: {
      type: "array",
      description:
        "Aynı grammar kalıbını / kelimeyi FARKLI bağlamlarda kullanan 3 örnek cümle. Türkçe çevirileri ile.",
      items: {
        type: "object",
        properties: {
          en: { type: "string" },
          tr: { type: "string" },
        },
      },
    },
  },
  required: ["translation_tr", "grammar", "words", "cloze", "examples"],
};

function buildPrompt({ text, sentenceContext, pageTitle, pageUrl }) {
  return `Sen Türk bir öğrencinin İngilizce öğrenmesine yardım eden bir dil analistisin.
Öğrenci internette geziyor ve bir cümleyi işaretledi. Analizini SESSİZ ve YAPILANDIRILMIŞ bir JSON olarak döndür — sohbet etme, açıklama yapma, sadece JSON.

Bağlam:
- Sayfa başlığı: ${pageTitle || "-"}
- Sayfa URL: ${pageUrl || "-"}
- Cümlenin geçtiği paragraf (referans için): """
${sentenceContext || text}
"""

Seçilen metin (asıl analiz edilecek olan): """
${text}
"""

Kurallar:
1. translation_tr: bağlam ile uyumlu, doğal Türkçe. Sözlük çevirisi değil.
2. level: A2/B1/B2/C1/C2 arasında seçilen metnin zorluğu.
3. grammar.name: net İngilizce grammar terimi (Past Perfect Continuous, Passive Voice, Inversion vs.).
   grammar.note: 1-2 cümlelik Türkçe açıklama — neden bu yapı, ne anlatıyor.
   grammar.structure: 'düz' ya da 'devrik'.
4. phrasal_or_idiom: metin bir phrasal verb, deyim veya kalıp içeriyorsa doldur. Yoksa boş obje ({}).
5. words: metindeki 2-5 anahtar kelime/öbek. Article, be, do gibi dolgu kelimeleri koyma. Her biri için Türkçe anlamı ve grameri.
6. cloze: seçilen metnin anahtar öbeğini '_____' ile değiştirilmiş versiyonu. answer alanında tam metin.
7. examples: SEÇİLEN kalıbın (grammar veya kelime) FARKLI bağlamlarda 3 kullanımı. Öğrenci pasif olarak aynı yapıyı 3 farklı yerde görecek. Her biri en ve tr.

SADECE JSON döndür.`;
}

export async function analyzeSelection(payload) {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) {
    throw new Error(
      "API key ayarlanmamış. Uzantı simgesine sağ tık > Seçenekler ile ekle.",
    );
  }

  const prompt = buildPrompt(payload);

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 400 && /API key/i.test(errText)) {
      throw new Error("API key geçersiz. Seçenekler sayfasından güncelle.");
    }
    if (res.status === 429) {
      throw new Error("Kota doldu (dakikada 15 istek limiti). Biraz bekle.");
    }
    throw new Error(`Gemini API hatası: ${res.status} ${errText.slice(0, 200)}`);
  }

  const json = await res.json();

  const raw =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ||
    json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!raw) {
    throw new Error("Gemini boş cevap döndürdü.");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // Bazen model JSON'u markdown ```json bloğuna sarabilir — bunu temizle
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();
    parsed = JSON.parse(cleaned);
  }

  return normalizeAnalysis(parsed);
}

function normalizeAnalysis(a) {
  return {
    translation_tr: a.translation_tr || "",
    level: a.level || "B1",
    grammar: {
      name: a.grammar?.name || "",
      note: a.grammar?.note || "",
      structure: a.grammar?.structure || "",
    },
    phrasal_or_idiom:
      a.phrasal_or_idiom && a.phrasal_or_idiom.name
        ? {
            name: a.phrasal_or_idiom.name,
            explanation_tr: a.phrasal_or_idiom.explanation_tr || "",
            is_idiom: !!a.phrasal_or_idiom.is_idiom,
          }
        : null,
    words: Array.isArray(a.words)
      ? a.words.map((w) => ({
          word: w.word || "",
          translation_tr: w.translation_tr || "",
          role: w.role || "",
        }))
      : [],
    cloze: {
      sentence_with_blank: a.cloze?.sentence_with_blank || "",
      answer: a.cloze?.answer || "",
      hint_tr: a.cloze?.hint_tr || "",
    },
    examples: Array.isArray(a.examples)
      ? a.examples.slice(0, 5).map((e) => ({
          en: e.en || "",
          tr: e.tr || "",
        }))
      : [],
  };
}
