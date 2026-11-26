(function () {
  "use strict";

  var SITE = window.SITE || { name: "Dialogue", tagline: "" };
  var SERIES = (window.SERIES || []).map(function (s) {
    var copy = Object.assign({}, s);
    copy.sessions = (s.sessions || []).slice().sort(function (a, b) { return a.number - b.number; });
    return copy;
  });
  var main = document.getElementById("main");

  var ICON_PLAY = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4.5v11l9-5.5z" fill="currentColor"/></svg>';
  var ICON_PAGE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h7l3 3v12H5z M12 2.5v3h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function link(series, session) {
    return "#/" + encodeURIComponent(series.id) + (session ? "/" + session.number : "");
  }
  function hasVideo(s) {
    return (s.videos || []).some(function (v) { return v.youtube || v.file; });
  }
  function count(n) { return n + (n === 1 ? " session" : " sessions"); }

  function readings(s) {
    var html = '<dl class="readings">';
    if (s.bible && s.bible.filter(Boolean).length) html += '<div class="bible"><dt>Bible</dt><dd>' + s.bible.map(esc).join("<br>") + "</dd></div>";
    if (s.quran && s.quran.filter(Boolean).length) html += '<div class="quran"><dt>Qur’an</dt><dd>' + s.quran.map(esc).join("<br>") + "</dd></div>";
    return html + "</dl>";
  }
  function actions(series, s) {
    return '<div class="actions">' +
      (hasVideo(s) ? '<a class="button button--solid" href="' + link(series, s) + '">' + ICON_PLAY + "Watch the video</a>" : "") +
      (s.pdf ? '<a class="button" href="' + link(series, s) + '/read">' + ICON_PAGE + "Read the PDF</a>" : "") +
      "</div>";
  }

  // ---------- PDF reading (PDF.js, kept in lib/pdfjs) ----------
  var pdfLib = null;
  var pdfDocs = {};

  function loadPdf(url) {
    if (!pdfLib) {
      pdfLib = import("./lib/pdfjs/pdf.min.js").then(function (lib) {
        lib.GlobalWorkerOptions.workerSrc = new URL("lib/pdfjs/pdf.worker.min.js", location.href).href;
        return lib;
      });
    }
    if (!pdfDocs[url]) {
      pdfDocs[url] = pdfLib.then(function (lib) {
        return lib.getDocument({ url: url, standardFontDataUrl: "lib/pdfjs/standard_fonts/" }).promise;
      });
      pdfDocs[url].catch(function () { delete pdfDocs[url]; });
    }
    return pdfDocs[url];
  }

  // draw one page into a canvas that fills its holder's width
  function drawPage(doc, number, holder, maxPixels) {
    return doc.getPage(number).then(function (page) {
      var base = page.getViewport({ scale: 1 });
      var cssWidth = holder.clientWidth || 800;
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var scale = Math.min(cssWidth * ratio, maxPixels || 1800) / base.width;
      var vp = page.getViewport({ scale: scale });
      var canvas = document.createElement("canvas");
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      canvas.setAttribute("aria-hidden", "true");
      return page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise.then(function () {
        holder.innerHTML = "";
        holder.appendChild(canvas);
        holder.classList.add("is-drawn");
      });
    });
  }

  function pdfFailed(target, s) {
    target.innerHTML = '<p class="notice">The PDF could not be shown here. <a href="' + esc(s.pdf) + '" target="_blank" rel="noopener">Open the PDF</a> in a new tab instead.</p>';
  }

  var readerMode = (function () { try { return localStorage.getItem("readerMode") || "book"; } catch (e) { return "book"; } })();
  var readerCleanup = null;

  function renderReader(sr, s, startPage) {
    document.title = "PDF — Session " + s.number + ": " + s.title + " — " + SITE.name;
    main.innerHTML = crumbs([{ text: SITE.name, href: "#/" }, { text: sr.title, href: link(sr) },
        { text: "Session " + s.number, href: link(sr, s) }, { text: "PDF" }]) +
      '<header class="reader-head">' +
        '<div><h1>' + esc(s.title) + "</h1>" +
        '<p class="reader-head__note" id="reader-note">' + esc(s.pdfNote || "") + "</p></div>" +
        '<div class="actions">' +
          '<div class="modes" role="group" aria-label="How to show the pages">' +
            '<button type="button" data-mode="book" aria-pressed="' + (readerMode === "book") + '">Book</button>' +
            '<button type="button" data-mode="scroll" aria-pressed="' + (readerMode === "scroll") + '">All pages</button>' +
          "</div>" +
          '<a class="button" href="' + esc(s.pdf) + '" download>Download</a>' +
        "</div>" +
      "</header>" +
      '<div id="reader"><p class="notice">Loading the PDF…</p></div>';

    var reader = document.getElementById("reader");
    var current = Math.max(1, parseInt(startPage, 10) || 1);

    function remember(page) {
      current = page;
      var h = link(sr, s) + "/read" + (page > 1 ? "/" + page : "");
      if (history.replaceState) history.replaceState(null, "", h);
    }

    function start(doc) {
      if (readerCleanup) { readerCleanup(); readerCleanup = null; }
      if (current > doc.numPages) current = doc.numPages;
      readerCleanup = readerMode === "book" ? bookView(doc, reader, current, remember) : scrollView(doc, reader, current, remember);
    }

    loadPdf(s.pdf).then(function (doc) {
      if (!document.body.contains(reader)) return;
      var note = document.getElementById("reader-note");
      if (note) note.textContent = (s.pdfNote ? s.pdfNote + ". " : "") + doc.numPages + " pages.";
      start(doc);
      Array.prototype.forEach.call(main.querySelectorAll(".modes button"), function (b) {
        b.addEventListener("click", function () {
          readerMode = b.getAttribute("data-mode");
          try { localStorage.setItem("readerMode", readerMode); } catch (e) {}
          Array.prototype.forEach.call(main.querySelectorAll(".modes button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
          start(doc);
        });
      });
    }).catch(function () { pdfFailed(reader, s); });
  }

  // ----- all pages, one under another -----
  function scrollView(doc, reader, startPage, remember) {
    var first = null;
    var html = '<div class="reader">';
    for (var n = 1; n <= doc.numPages; n++) {
      html += '<figure class="sheet" id="page-' + n + '">' +
        '<div class="sheet__paper" data-page="' + n + '"></div>' +
        "<figcaption>Page " + n + " of " + doc.numPages + "</figcaption></figure>";
    }
    reader.innerHTML = html + "</div>";
    var observer;
    doc.getPage(1).then(function (p) {
      var vp = p.getViewport({ scale: 1 });
      Array.prototype.forEach.call(reader.querySelectorAll(".sheet__paper"), function (h) { h.style.aspectRatio = vp.width + " / " + vp.height; });
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var holder = e.target;
          if (e.isIntersecting) {
            if (!holder.dataset.state) {
              holder.dataset.state = "drawing";
              drawPage(doc, +holder.dataset.page, holder).then(function () { holder.dataset.state = "drawn"; }, function () { holder.dataset.state = ""; });
            }
          } else if (holder.dataset.state === "drawn") {
            holder.innerHTML = ""; holder.classList.remove("is-drawn"); holder.dataset.state = "";
          }
        });
      }, { rootMargin: "1600px 0px" });
      Array.prototype.forEach.call(reader.querySelectorAll(".sheet__paper"), function (h) { observer.observe(h); });
      if (startPage > 1) {
        var target = document.getElementById("page-" + startPage);
        if (target) target.scrollIntoView();
      }
    });
    return function () { if (observer) observer.disconnect(); };
  }

  // ----- book: pages turn like a real book -----
  function bookView(doc, reader, startPage, remember) {
    var N = doc.numPages;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reader.innerHTML =
      '<div class="book-wrap" id="book-wrap">' +
        '<div class="book" id="book" tabindex="0" aria-label="PDF pages. Use the arrow keys to turn pages.">' +
          '<div class="book__stage" id="book-stage">' +
            '<div class="book__slot book__slot--left" id="slot-left"></div>' +
            '<div class="book__slot book__slot--right" id="slot-right"></div>' +
          "</div>" +
        "</div>" +
        '<div class="book-controls">' +
          '<button type="button" class="turn" id="turn-prev" aria-label="Previous page">' +
            '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          '<div class="book-controls__middle"><span id="book-status" aria-live="polite"></span>' +
            '<input type="range" id="book-range" min="1" max="' + N + '" value="1" aria-label="Go to page"></div>' +
          '<button type="button" class="turn" id="turn-next" aria-label="Next page">' +
            '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          (document.fullscreenEnabled ? '<button type="button" class="button button--small" id="book-full">Full screen</button>' : "") +
        "</div>" +
      "</div>";

    var wrap = document.getElementById("book-wrap");
    var book = document.getElementById("book");
    var stage = document.getElementById("book-stage");
    var left = document.getElementById("slot-left");
    var right = document.getElementById("slot-right");
    var status = document.getElementById("book-status");
    var range = document.getElementById("book-range");
    var ratio = 792 / 612;
    var spread = true;      // two pages side by side, or one page on small screens
    var pageW = 400, pageH = 520;
    var pos = startPage;    // the page shown (single) or the right-hand page of the spread
    var busy = false;
    var cache = {};         // page number -> promise of a drawn canvas
    var order = [];

    // which pages are visible for a given page number
    function view(p) {
      if (!spread) return { l: null, r: p, key: p };
      if (p === 1) return { l: null, r: 1, key: 1 };
      var l = p % 2 === 0 ? p : p - 1;
      return { l: l, r: l + 1 <= N ? l + 1 : null, key: l };
    }
    function nextOf(v) {
      if (!spread) return v.r < N ? view(v.r + 1) : null;
      var p = v.r ? v.r + 1 : (v.l ? v.l + 2 : 2);
      if (v.r === null) return null;
      return p <= N ? view(p) : null;
    }
    function prevOf(v) {
      if (!spread) return v.r > 1 ? view(v.r - 1) : null;
      if (v.l === null) return null;
      return v.l - 1 >= 1 ? view(v.l - 1) : null;
    }

    function size() {
      var w = wrap.clientWidth;
      var full = document.fullscreenElement === wrap;
      var room = window.innerHeight - (full ? 100 : 120);
      spread = w >= 860;
      if (spread) pageW = Math.min((w - 16) / 2, room / ratio);
      else pageW = w;   // phones: full width; turn the phone sideways for bigger text
      pageW = Math.floor(Math.max(200, pageW));
      pageH = Math.floor(pageW * ratio);
      stage.style.width = (spread ? pageW * 2 : pageW) + "px";
      stage.style.height = pageH + "px";
      book.classList.toggle("book--single", !spread);
    }

    function page(n) {
      if (!n) return Promise.resolve(null);
      if (!cache[n]) {
        cache[n] = doc.getPage(n).then(function (pg) {
          var base = pg.getViewport({ scale: 1 });
          ratio = base.height / base.width;
          var px = Math.min(Math.max(pageW, 500) * Math.min(window.devicePixelRatio || 1, 2) * 1.25, 2200);
          var vp = pg.getViewport({ scale: px / base.width });
          var c = document.createElement("canvas");
          c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
          return pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise.then(function () { return c; });
        });
        order.push(n);
        while (order.length > 10) {
          var old = order.shift();
          if (Math.abs(old - pos) > 3) delete cache[old]; else order.push(old);
          if (order.length > 14) break;
        }
      }
      return cache[n];
    }
    function copy(c) {
      var k = document.createElement("canvas");
      k.width = c.width; k.height = c.height;
      k.getContext("2d").drawImage(c, 0, 0);
      return k;
    }
    function fill(slot, canvas, blank) {
      slot.innerHTML = "";
      slot.classList.toggle("is-empty", !canvas && !blank);
      if (canvas) slot.appendChild(copy(canvas));
    }
    function label(v) {
      var a = v.l && v.r ? "Pages " + v.l + "–" + v.r : "Page " + (v.r || v.l);
      status.textContent = a + " of " + N;
      range.value = v.r || v.l;
      document.getElementById("turn-prev").disabled = !prevOf(v);
      document.getElementById("turn-next").disabled = !nextOf(v);
    }
    function preload(v) {
      var n = nextOf(v), p = prevOf(v);
      [n, p].forEach(function (x) { if (x) { page(x.l); page(x.r); } });
    }
    function show(v) {
      return Promise.all([page(v.l), page(v.r)]).then(function (c) {
        if (spread) fill(left, c[0]);
        fill(right, c[1]);
        pos = v.r || v.l;
        label(v);
        remember(pos);
        preload(v);
      });
    }

    function leaf(side, front, back) {
      var el = document.createElement("div");
      el.className = "leaf leaf--" + side;
      el.innerHTML = '<div class="leaf__face leaf__face--front"></div><div class="leaf__face leaf__face--back"></div>';
      if (front) el.firstChild.appendChild(copy(front));
      if (back) el.lastChild.appendChild(copy(back));
      stage.appendChild(el);
      return el;
    }
    function animate(el, from, to) {
      return new Promise(function (resolve) {
        el.style.transform = "rotateY(" + from + "deg)";
        el.getBoundingClientRect();
        el.classList.add("is-turning");
        el.style.transform = "rotateY(" + to + "deg)";
        var done = false;
        function end() { if (!done) { done = true; resolve(); } }
        el.addEventListener("transitionend", end);
        setTimeout(end, 1000);
      });
    }

    function go(dir) {
      if (busy) return;
      var v = view(pos);
      var t = dir > 0 ? nextOf(v) : prevOf(v);
      if (!t) return;
      busy = true;
      Promise.all([page(v.l), page(v.r), page(t.l), page(t.r)]).then(function (c) {
        var curL = c[0], curR = c[1], newL = c[2], newR = c[3];
        if (reduce) return show(t);
        var el;
        if (spread && dir > 0) {
          // the right page lifts and turns over to the left
          fill(right, newR, true);
          el = leaf("right", curR, newL);
          return animate(el, 0, -180).then(function () { fill(left, newL); el.remove(); return show(t); });
        }
        if (spread && dir < 0) {
          fill(left, newL, true);
          el = leaf("left", curL, newR);
          return animate(el, 0, 180).then(function () { fill(right, newR); el.remove(); return show(t); });
        }
        if (dir > 0) {
          fill(right, newR);
          el = leaf("single", curR, null);
          return animate(el, 0, -180).then(function () { el.remove(); return show(t); });
        }
        el = leaf("single", newR, null);
        return animate(el, -180, 0).then(function () { el.remove(); return show(t); });
      }).then(function () { busy = false; }, function () { busy = false; });
    }

    function jump(p) {
      if (busy) return;
      p = Math.max(1, Math.min(N, p));
      show(view(p));
    }

    // input: buttons, keys, clicks on the pages, swipes, the slider
    document.getElementById("turn-prev").addEventListener("click", function () { go(-1); });
    document.getElementById("turn-next").addEventListener("click", function () { go(1); });
    range.addEventListener("change", function () { jump(+range.value); });
    function onKey(e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { go(1); e.preventDefault(); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { go(-1); e.preventDefault(); }
    }
    document.addEventListener("keydown", onKey);
    var downX = null, downY = null;
    stage.addEventListener("pointerdown", function (e) { downX = e.clientX; downY = e.clientY; });
    stage.addEventListener("pointerup", function (e) {
      if (downX === null) return;
      var dx = e.clientX - downX, dy = e.clientY - downY;
      downX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? 1 : -1); return; }
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        var r = stage.getBoundingClientRect();
        go(e.clientX - r.left > r.width * (spread ? 0.5 : 0.35) ? 1 : -1);
      }
    });
    var full = document.getElementById("book-full");
    if (full) full.addEventListener("click", function () {
      if (document.fullscreenElement) document.exitFullscreen(); else wrap.requestFullscreen();
    });
    function relayout() {
      var was = spread, oldW = pageW;
      size();
      if (was !== spread || Math.abs(pageW - oldW) > 120) { cache = {}; order = []; }
      show(view(pos));
    }
    var t = null;
    function onResize() { clearTimeout(t); t = setTimeout(relayout, 200); }
    window.addEventListener("resize", onResize);
    function onFull() {
      if (full) full.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen";
      relayout();
    }
    document.addEventListener("fullscreenchange", onFull);

    doc.getPage(1).then(function (p) {
      var b = p.getViewport({ scale: 1 });
      ratio = b.height / b.width;
      size();
      return show(view(pos));
    }).then(function () {
      // on wide screens, bring the whole book into view
      if (spread) wrap.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    });

    return function () {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFull);
      window.removeEventListener("resize", onResize);
    };
  }

  function crumbs(parts) {
    return '<nav class="crumbs" aria-label="Breadcrumb">' + parts.map(function (p, i) {
      return (i ? '<span aria-hidden="true">/</span>' : "") + (p.href ? '<a href="' + p.href + '">' + esc(p.text) + "</a>" : "<span>" + esc(p.text) + "</span>");
    }).join("") + "</nav>";
  }

  // ---------- home ----------
  function renderHome() {
    document.title = SITE.name;
    if (!SERIES.length) {
      main.innerHTML = '<p class="notice">No series yet. Add the first one in content.js.</p>';
      return;
    }
    var html = "";
    // the newest session: the last session of the first series that has one
    var latest = null;
    SERIES.forEach(function (sr) {
      if (!latest && sr.sessions.length) latest = { series: sr, s: sr.sessions[sr.sessions.length - 1] };
    });
    if (latest) {
      var s = latest.s, sr = latest.series;
      html += '<section class="latest" aria-labelledby="latest-title">' +
        (s.image ? '<a class="latest__img" href="' + link(sr, s) + '" tabindex="-1" aria-hidden="true"><img src="' + esc(s.image) + '" alt=""></a>' : "<div></div>") +
        "<div>" +
          '<p class="latest__kicker">Newest session</p>' +
          '<h2 id="latest-title"><a href="' + link(sr, s) + '">' + esc(s.title) + "</a></h2>" +
          '<p class="latest__series">' + esc(sr.title) + ", session " + esc(s.number) + "</p>" +
          actions(sr, s) +
        "</div></section>";
    }
    html += '<h2 class="section-title">Series</h2><ul class="series-list">';
    SERIES.forEach(function (sr) {
      html += '<li class="series-item">' +
        (sr.image ? '<a class="series-item__img" href="' + link(sr) + '" tabindex="-1" aria-hidden="true"><img src="' + esc(sr.image) + '" alt="" loading="lazy"></a>' : "<div></div>") +
        '<div><h3><a href="' + link(sr) + '">' + esc(sr.title) + "</a></h3><p>" + esc(sr.summary) + "</p></div>" +
        '<span class="series-item__count">' + count(sr.sessions.length) + "</span>" +
        "</li>";
    });
    main.innerHTML = html + "</ul>";
  }

  // ---------- one series ----------
  function renderSeries(sr) {
    document.title = sr.title + " — " + SITE.name;
    var html = crumbs([{ text: SITE.name, href: "#/" }, { text: sr.title }]) +
      '<header class="series-head"><h1>' + esc(sr.title) + "</h1><p>" + esc(sr.summary) + "</p>" +
      (sr.sources ? '<p class="sources">' + esc(sr.sources) + "</p>" : "") + "</header>";
    if (!sr.sessions.length) {
      main.innerHTML = html + '<p class="notice">No sessions in this series yet.</p>';
      return;
    }
    html += '<ol class="sequence' + (sr.sessions.length > 1 ? " sequence--many" : "") + '">';
    sr.sessions.forEach(function (s) {
      html += '<li class="session">' +
        '<div class="session__num" aria-hidden="true">' + esc(s.number) + "<span>Session</span></div>" +
        '<div class="session__body">' +
          (s.image ? '<a class="session__image" href="' + link(sr, s) + '" tabindex="-1" aria-hidden="true"><img src="' + esc(s.image) + '" alt="" loading="lazy"></a>' : "<div></div>") +
          "<div>" +
            '<h2 class="session__title"><a href="' + link(sr, s) + '">Session ' + esc(s.number) + ": " + esc(s.title) + "</a></h2>" +
            '<p class="session__summary">' + esc(s.summary) + "</p>" +
            readings(s) + actions(sr, s) +
          "</div>" +
        "</div></li>";
    });
    main.innerHTML = html + "</ol>";
  }

  // ---------- one session ----------
  function playerHTML(s, v) {
    if (v && v.youtube) {
      return '<div class="player__frame"><iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.youtube) +
        '?rel=0" title="' + esc(v.label) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    }
    if (v && v.file) {
      return '<div class="player__frame"><video controls preload="metadata" playsinline' + (s.poster ? ' poster="' + esc(s.poster) + '"' : "") +
        '><source src="' + esc(v.file) + '" type="video/mp4">Your browser cannot play this video. <a href="' + esc(v.file) + '">Download it</a> instead.</video></div>';
    }
    return '<div class="player__empty"' + (s.poster ? ' style="background-image:linear-gradient(rgba(20,26,42,.75),rgba(20,26,42,.75)),url(\'' + esc(s.poster) + "')\"" : "") +
      "><p>The video for this session is not ready yet.</p></div>";
  }

  function renderSession(sr, s) {
    document.title = "Session " + s.number + ": " + s.title + " — " + SITE.name;
    var videos = (s.videos || []).filter(function (v) { return v.youtube || v.file; });
    var html = crumbs([{ text: SITE.name, href: "#/" }, { text: sr.title, href: link(sr) }, { text: "Session " + s.number }]) +
      '<div class="page-head"><p class="page-head__num">' + esc(sr.title) + ", session " + esc(s.number) + "</p><h1>" + esc(s.title) + "</h1></div>" +
      '<section class="player" aria-label="Video"><div id="player-slot">' + playerHTML(s, videos[0]) + "</div>";
    if (videos.length > 1) {
      html += '<div class="versions" role="group" aria-label="Choose a video">';
      videos.forEach(function (v, i) {
        html += '<button type="button" data-i="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(v.label) +
          (v.length ? '<span class="len">' + esc(v.length) + "</span>" : "") + "</button>";
      });
      html += "</div>";
    }
    html += "</section>" +
      '<div class="details"><section><h2>About this session</h2><p>' + esc(s.summary) + "</p>" + readings(s) +
      (sr.sources ? '<p class="sources">' + esc(sr.sources) + "</p>" : "") + "</section>";
    if (s.pdf) {
      html += '<section class="pdf-panel" aria-labelledby="pdf-title">' +
        '<a class="pdf-panel__cover" href="' + link(sr, s) + '/read" aria-hidden="true" tabindex="-1"><div class="pdf-panel__thumb" id="pdf-thumb"></div></a>' +
        '<div class="pdf-panel__text"><h2 id="pdf-title">Read the PDF</h2><p>' + esc(s.pdfNote || "") + "</p>" +
        '<div class="actions"><a class="button button--solid" href="' + link(sr, s) + '/read">' + ICON_PAGE + "Read the PDF</a>" +
        '<a class="button" href="' + esc(s.pdf) + '" download>Download</a></div></div></section>';
    }
    main.innerHTML = html + "</div>";

    var thumb = document.getElementById("pdf-thumb");
    if (thumb) {
      loadPdf(s.pdf).then(function (doc) {
        if (document.body.contains(thumb)) return drawPage(doc, 1, thumb, 700);
      }).catch(function () { /* the buttons still work without the preview */ });
    }

    var buttons = main.querySelectorAll(".versions button");
    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener("click", function () {
        document.getElementById("player-slot").innerHTML = playerHTML(s, videos[+b.getAttribute("data-i")]);
        Array.prototype.forEach.call(buttons, function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      });
    });
  }

  function notFound() {
    document.title = SITE.name;
    main.innerHTML = crumbs([{ text: SITE.name, href: "#/" }]) +
      '<p class="notice">This page does not exist. Choose a series from the home page.</p>';
  }

  function route() {
    var parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    document.body.classList.toggle("inner", parts.length > 0);
    if (readerCleanup) { readerCleanup(); readerCleanup = null; }
    if (!parts.length) renderHome();
    else {
      var sr = SERIES.filter(function (x) { return x.id === parts[0]; })[0];
      if (!sr) notFound();
      else if (parts.length === 1) renderSeries(sr);
      else {
        var s = sr.sessions.filter(function (x) { return String(x.number) === parts[1]; })[0];
        if (!s) notFound();
        else if (parts[2] === "read" && s.pdf) renderReader(sr, s, parts[3]);
        else renderSession(sr, s);
      }
    }
    if (location.hash) { main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }

  document.getElementById("site-name").textContent = SITE.name;
  document.getElementById("site-tagline").textContent = SITE.tagline || "";
  document.getElementById("footer-text").textContent = SITE.name + " — videos and readings from our study sessions.";

  window.addEventListener("hashchange", route);
  route();
})();
