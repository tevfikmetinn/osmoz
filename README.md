# Osmoz

A Chrome extension that turns your English web reading into passive language learning.

*İngilizce web okumanı pasif dil öğrenmeye çeviren bir Chrome uzantısı.*

Select a sentence anywhere, get a small analysis, save it, and let it come back to you as a flashcard some days later.

*Herhangi bir yerde bir cümle seç, küçük bir analiz al, kaydet, birkaç gün sonra kart olarak karşına gelsin.*

---

## Why this exists

The main thing about learning a language is exposure, not sitting down with a textbook.

*Dil öğrenmenin asıl olayı maruz kalmak..*

We already spend hours reading English tweets, articles, Reddit threads and video captions.

*Zaten saatlerce İngilizce tweet, makale, Reddit gönderisi ve video altyazısı okuyoruz.*

Most tools stop at translation. But translation alone does not tell you why a phrase is in that form, whether it is a phrasal verb, an inversion, or an idiom.

*Araçların çoğu çeviride kalıyor. Ama çeviri tek başına bir öbeğin neden o halde olduğunu, phrasal verb mü, devrik yapı mı, deyim mi olduğunu söylemiyor.*

Osmoz sits quietly in the background of your normal browsing and, when you want it, gives you a small structured explanation of a sentence — then remembers it for you.

*Osmoz normal gezintinin arka planında sessizce duruyor, istediğinde bir cümlenin küçük yapılandırılmış açıklamasını veriyor ve sonra senin adına hatırlıyor.*

---

## How it works

*Nasıl çalışıyor*

### 1. Select a sentence

*Cümleyi seç*

Highlight any English text on any website with your mouse. A small green button appears just below your selection.

*Fare ile herhangi bir sitedeki İngilizce metni seç. Seçimin hemen altında küçük yeşil bir buton çıkıyor.*

![Selection button](screenshots/01-select.png)

### 2. Read the analysis

Click the button. In one or two seconds a card opens with the Turkish translation, the grammar name, a short note about why the sentence is in that form, and the key words.

*Butona tıkla. Bir iki saniye içinde Türkçe çeviri, grammar adı, cümlenin neden o halde olduğuna dair kısa bir not ve anahtar kelimelerin bulunduğu bir kart açılıyor.*

There is no chat. You do not ask questions. The card is the whole interaction.

*Sohbet yok. Soru sormuyorsun. Kart tek etkileşim.*

![Analysis card](screenshots/02-analyze.png)

### 3. Save and let it come back


When you save a sentence, the extension does something quiet in the background: it also generates three more example sentences that use the same grammar pattern in different contexts.

*Bir cümleyi kaydettiğinde uzantı arka planda sessiz bir şey yapıyor: aynı grammar kalıbını farklı bağlamlarda kullanan üç örnek cümle daha üretiyor.*

You never see these three sentences directly. They enter your review queue and show up on different days, in different clothes.


The idea is Krashen's comprehensible input: see the same pattern in different real sentences until it becomes yours.



### 4. Daily review
*Günlük tekrar*

Click the extension icon in the top right of Chrome. The home screen tells you how many cards want your attention today.


![Review home](screenshots/03-home.png)

Each card is a fill-in-the-blank. You read the sentence, guess the missing part in your head, then reveal the answer.

*Her kart bir boşluk doldurma. Cümleyi okuyorsun, boşluğu içinden söylüyorsun, sonra cevabı açıyorsun.*

Four buttons decide when the card will return: Again, Hard, Good, Easy. Behind them is an FSRS-inspired spaced repetition scheduler.

*Dört buton kartın ne zaman geri döneceğini belirliyor: Yeniden, Zor, İyi, Kolay.*

![Review card](screenshots/04-review.png)

---



## What it does not do yet

These are the things I know are missing and want to add later. If you are looking at this and want to help, pick one.

*Eksik olduğunu bildiğim ve sonra eklemek istediğim şeyler. Bunu görüp yardım etmek istiyorsan birini seç.*

- Read text from inside images. Right now the extension only sees selectable web text, so tweet screenshots with captions on the image, Netflix subtitles, and video overlays are invisible to it.

  *Görsellerin içindeki yazıyı okuma. Şu an uzantı sadece seçilebilir web metnini görüyor; görsel üstüne yazılmış caption'lı tweet ekran görüntüleri, Netflix altyazıları ve video overlay'leri onun için görünmez.*
  
- A proper icon set. Chrome currently shows a default puzzle piece.

  *Düzgün bir icon seti. Chrome şu anda default puzzle parçasını gösteriyor.*
  
- YouTube subtitle integration so you can click a word in the caption without pausing.

  *YouTube altyazı entegrasyonu — videoyu durdurmadan bir kelimeye tıklayabilme.*
  
- Statistics: which grammar patterns you keep saving, which ones you keep failing.

  *İstatistik: hangi grammar kalıplarını sürekli kaydediyorsun, hangilerinde sürekli takılıyorsun.*
  
- Prompt personalisation so the analysis matches your level over time.

  *Prompt kişiselleştirme — analiz zamanla senin seviyene uysun.*
  
- Export and import of your saved patterns.

  *Kaydedilen kalıpları dışa aktarma ve içe aktarma.*

---

## Under the hood
This is version v0 published by Tevfik Metin.

---

## License

MIT. Do whatever you want with it.
*MIT. Ne istersen yap.*
