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
      (s.pdf ? '<a class="button" href="' + esc(s.pdf) + '" target="_blank" rel="noopener">' + ICON_PAGE + "Read the PDF</a>" : "") +
      "</div>";
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
      html += '<section class="pdf-panel" aria-label="PDF">' +
        '<div class="pdf-panel__head"><div><h2>Read the PDF</h2><p>' + esc(s.pdfNote || "") + "</p></div>" +
        '<div class="actions"><a class="button button--solid" href="' + esc(s.pdf) + '" target="_blank" rel="noopener">' + ICON_PAGE + "Open the PDF</a>" +
        '<a class="button" href="' + esc(s.pdf) + '" download>Download</a></div></div>' +
        '<iframe src="' + esc(s.pdf) + '#view=FitH" title="PDF for session ' + esc(s.number) + '" loading="lazy"></iframe></section>';
    }
    main.innerHTML = html + "</div>";

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
    if (!parts.length) renderHome();
    else {
      var sr = SERIES.filter(function (x) { return x.id === parts[0]; })[0];
      if (!sr) notFound();
      else if (parts.length === 1) renderSeries(sr);
      else {
        var s = sr.sessions.filter(function (x) { return String(x.number) === parts[1]; })[0];
        if (s) renderSession(sr, s); else notFound();
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
