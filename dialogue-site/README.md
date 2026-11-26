# Dialogue — study site

A website for the dialogue group. The site holds several **series** (for example "Moses in the Bible and the Qur’an"). Each series has **sessions**, and each session has its videos and its PDF.

## What is in this folder

| File / folder | What it is |
|---|---|
| `content.js` | **Everything you edit:** the site name, the series, and the sessions. |
| `index.html`, `styles.css`, `app.js` | The website itself. No need to change these. |
| `pdfs/<series>/` | The PDFs of each series (for example `pdfs/moses/`). |
| `videos/<series>/` | Video files (optional — YouTube can be used instead). |
| `assets/<series>/` | Pictures: one for the series, one per session (1280×720). |

Web addresses look like this: home page `/#/`, a series `/#/moses`, a session `/#/moses/4`.

## Put the site online with GitHub Pages (free)

1. Sign in to GitHub and create a new repository, for example `dialogue`. On the free plan it must be **Public**.
2. On the new repository page, click **uploading an existing file** and drag in everything inside this folder (not the folder itself). Every file here is under 25 MB, the limit for uploads through the GitHub website.
3. In the repository go to **Settings → Pages**. Under **Build and deployment** choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and click **Save**.
4. After a minute or two the site is live at `https://YOUR-USERNAME.github.io/dialogue/`.

Later videos may be larger than 25 MB. Upload those with GitHub Desktop or `git push` (up to 100 MB per file), or put them on YouTube.

## Videos on YouTube (recommended as the site grows)

A GitHub Pages site can be at most 1 GB, so YouTube is the better home for many videos.

1. Upload the video to YouTube. Choose **Unlisted** if only people with the link should see it.
2. Copy the ID from the link: in `https://youtu.be/AbC123xyz` the ID is `AbC123xyz`.
3. In `content.js`, write it in that video's line: `youtube: "AbC123xyz"`. The site then plays the YouTube version, and you can delete the file from `videos/`.

## Add a new session

1. Put the PDF in `pdfs/<series>/` and its picture in `assets/<series>/`.
2. In `content.js`, inside the series, copy the "Next session" example and fill it in.
3. Upload the changed and new files. The newest session also appears at the top of the home page.

## Add a new series

1. Make folders `pdfs/<name>/`, `assets/<name>/` (and `videos/<name>/` if needed).
2. In `content.js`, copy the "new series" example at the bottom and fill it in. The `id` is the short name used in the web address.

To preview on your computer: open a terminal in this folder, run `python3 -m http.server`, and visit `http://localhost:8000`.

---

## Türkçe kısa özet

Sitede birden fazla **seri** olabilir (örneğin Musa serisi). Her serinin **oturumları** vardır ve her oturumun kendi videoları ve PDF'i bulunur. Değiştireceğiniz tek dosya `content.js`.

**Yayına almak (GitHub Pages, ücretsiz):**
1. GitHub'da yeni bir **Public** depo açın (örneğin `dialogue`).
2. "uploading an existing file" bağlantısına tıklayın ve bu klasörün içindekileri sürükleyip bırakın. Buradaki her dosya 25 MB'tan küçük.
3. **Settings → Pages** bölümünde `main` dalını ve `/ (root)` klasörünü seçip kaydedin.
4. Site `https://KULLANICI-ADINIZ.github.io/dialogue/` adresinde açılır.

**Yeni oturum:** PDF'i `pdfs/<seri>/`, resmi `assets/<seri>/` klasörüne koyun. `content.js` içindeki "Next session" örneğini kopyalayıp doldurun.

**Yeni seri:** `content.js` dosyasının altındaki "new series" örneğini kopyalayıp doldurun.

**YouTube:** Videoyu "Liste dışı" yükleyin. Linkteki ID'yi `youtube: ""` alanına yazın.
