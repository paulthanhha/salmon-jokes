(function () {
  var CFG = window.CONFIG || {};
  var NEW_DAYS = CFG.NEW_DAYS || 7;

  var SAMPLE = [
    { id: "1", joke: "Tại sao cà chua đỏ mặt?", hint: "Nghĩ đến món salad", answer: "Vì nó thấy salad đang thay đồ.", date: daysAgo(2) },
    { id: "2", joke: "Tại sao bút chì buồn?", hint: "Nghĩ đến việc chuốt bút", answer: "Vì nó luôn bị gọt giũa.", date: daysAgo(30) },
    { id: "3", joke: "Tại sao máy tính không bao giờ đói?", hint: "", answer: "Vì nó có rất nhiều byte.", date: daysAgo(60) },
    { id: "4", joke: "Con gì đập thì sống, không đập thì chết?", hint: "Nằm trong lồng ngực", answer: "Con tim.", date: daysAgo(90) }
  ];

  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var jokes = [], counts = {}, cur = null;
  var view = "joke", tab = "haha", hintOn = false, ansOn = false, justRevealed = false;
  var reacted = load("dj_reacted", {});

  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d; }
  function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function parseCSV(t) {
    var rows = [], row = [], f = "", q = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (q) {
        if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && t[i + 1] === "\n") i++;
        row.push(f); rows.push(row); row = []; f = "";
      } else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  function parseDate(s) {
    s = (s || "").trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    return null;
  }

  function isNew(j) {
    if (!j.date) return false;
    var d = (Date.now() - j.date.getTime()) / 86400000;
    return d >= -1 && d <= NEW_DAYS;
  }

  function loadJokes() {
    if (!CFG.SHEET_CSV_URL) return Promise.resolve(SAMPLE);
    var u = CFG.SHEET_CSV_URL + (CFG.SHEET_CSV_URL.indexOf("?") > -1 ? "&" : "?") + "t=" + Date.now();
    return fetch(u).then(function (r) {
      if (!r.ok) throw new Error("csv");
      return r.text();
    }).then(function (t) {
      return parseCSV(t).slice(1).map(function (r, i) {
        return {
          id: (r[0] || "").trim() || String(i + 1),
          joke: (r[1] || "").trim(),
          hint: (r[2] || "").trim(),
          answer: (r[3] || "").trim(),
          date: parseDate(r[4])
        };
      }).filter(function (j) { return j.joke && j.answer; });
    });
  }

  function fetchCounts() {
    if (!CFG.API_URL) return;
    fetch(CFG.API_URL + "?action=counts").then(function (r) { return r.json(); }).then(function (d) {
      counts = d || {};
      if (view === "top") renderTop();
      else if (ansOn) renderJoke();
    }).catch(function () {});
  }

  function pick(exclude) {
    var pool = jokes.length > 1 ? jokes.filter(function (j) { return !exclude || j.id !== exclude.id; }) : jokes;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function route() {
    var h = location.hash.slice(1);
    if (h === "top") {
      view = "top";
      renderTop();
    } else {
      view = "joke";
      var m = h.match(/^joke=(.+)$/);
      var id = m ? decodeURIComponent(m[1]) : null;
      var j = jokes.find(function (x) { return x.id === id; });
      if (!j && jokes.length) {
        j = pick(cur);
        history.replaceState(null, "", "#joke=" + encodeURIComponent(j.id));
      }
      cur = j; hintOn = false; ansOn = false; justRevealed = false;
      renderJoke();
    }
    document.getElementById("nav-joke").setAttribute("aria-current", view === "joke" ? "page" : "false");
    document.getElementById("nav-top").setAttribute("aria-current", view === "top" ? "page" : "false");
  }

  function renderJoke() {
    var j = cur;
    if (!j) {
      app.innerHTML = '<p class="empty">Chưa có joke nào. Thêm joke vào Google Sheet nhé.</p>';
      return;
    }
    var c = counts[j.id] || { haha: 0, lay: 0 }, mine = reacted[j.id];
    var showN = !!CFG.API_URL;
    var rx = ansOn
      ? '<p class="ask">Bạn thấy joke này thế nào?</p><div class="rx">' +
        '<button class="react r-haha" data-act="react" data-type="haha" aria-pressed="' + (mine === "haha") + '"><span class="e">😂</span>Haha' + (showN ? " " + c.haha : "") + "</button>" +
        '<button class="react r-lay" data-act="react" data-type="lay" aria-pressed="' + (mine === "lay") + '"><span class="e">🙏</span>Lạy luôn' + (showN ? " " + c.lay : "") + "</button></div>"
      : "";
    app.innerHTML =
      '<article class="card">' +
      (isNew(j) ? '<span class="new">Mới</span>' : "") +
      '<h1 class="joke">' + esc(j.joke) + "</h1>" +
      (j.hint ? '<div class="hint" ' + (hintOn ? "" : "hidden") + ">" + esc(j.hint) + "</div>" : "") +
      '<div class="answer' + (justRevealed ? " pop" : "") + '" ' + (ansOn ? "" : "hidden") + ">" + esc(j.answer) + "</div>" +
      '<div class="actions">' +
      (j.hint && !hintOn && !ansOn ? '<button class="btn b-hint" data-act="hint">Gợi ý</button>' : "") +
      (!ansOn ? '<button class="btn b-ans" data-act="ans">Xem đáp án</button>' : "") +
      "</div>" + rx +
      '<div class="foot"><button class="link" data-act="share">Sao chép link</button>' +
      '<button class="btn b-next" data-act="next">Joke khác</button></div></article>';
    justRevealed = false;
  }

  function renderTop() {
    if (!CFG.API_URL) {
      app.innerHTML = '<article class="card"><p class="empty">Bảng xếp hạng sẽ hiện khi kết nối Google Apps Script. Xem API_URL trong config.js.</p></article>';
      return;
    }
    var list = jokes.map(function (j) { return { j: j, n: (counts[j.id] || {})[tab] || 0 }; })
      .filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return b.n - a.n; })
      .slice(0, 10);
    app.innerHTML =
      '<div class="seg" role="tablist">' +
      '<button class="tab" role="tab" data-act="tab" data-tab="haha" aria-selected="' + (tab === "haha") + '">😂 Haha nhất</button>' +
      '<button class="tab" role="tab" data-act="tab" data-tab="lay" aria-selected="' + (tab === "lay") + '">🙏 Lạy luôn nhất</button></div>' +
      (list.length
        ? '<ol class="rank">' + list.map(function (x, i) {
            return '<li><button data-act="open" data-id="' + esc(encodeURIComponent(x.j.id)) + '"><span class="rk">' + (i + 1) + '</span><span>' + esc(x.j.joke) + '</span><span class="rn">' + x.n + "</span></button></li>";
          }).join("") + "</ol>"
        : '<article class="card"><p class="empty">Chưa có ai bình chọn. Xem vài joke rồi quay lại nhé.</p></article>');
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toastEl.classList.remove("on"); }, 1800);
  }

  function react(type) {
    if (!cur) return;
    if (reacted[cur.id]) { toast("Bạn đã chọn cho joke này rồi"); return; }
    reacted[cur.id] = type;
    save("dj_reacted", reacted);
    counts[cur.id] = counts[cur.id] || { haha: 0, lay: 0 };
    counts[cur.id][type]++;
    renderJoke();
    if (CFG.API_URL) {
      fetch(CFG.API_URL + "?action=react&id=" + encodeURIComponent(cur.id) + "&type=" + type, { mode: "no-cors" }).catch(function () {});
    }
  }

  function share() {
    var url = location.origin + location.pathname + "#joke=" + encodeURIComponent(cur.id);
    var done = function () { toast("Đã sao chép link"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { toast(url); });
    else toast(url);
  }

  app.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var a = b.getAttribute("data-act");
    if (a === "hint") { hintOn = true; renderJoke(); }
    else if (a === "ans") { ansOn = true; justRevealed = true; renderJoke(); }
    else if (a === "react") react(b.getAttribute("data-type"));
    else if (a === "share") share();
    else if (a === "next") { var j = pick(cur); location.hash = "joke=" + encodeURIComponent(j.id); }
    else if (a === "tab") { tab = b.getAttribute("data-tab"); renderTop(); }
    else if (a === "open") location.hash = "joke=" + b.getAttribute("data-id");
  });

  document.getElementById("nav-joke").onclick = function () {
    if (view === "top") { var j = cur || pick(); location.hash = "joke=" + encodeURIComponent(j.id); }
    else { var n = pick(cur); location.hash = "joke=" + encodeURIComponent(n.id); }
  };
  document.getElementById("nav-top").onclick = function () { location.hash = "top"; };
  document.getElementById("home").onclick = function (e) { e.preventDefault(); document.getElementById("nav-joke").click(); };
  window.addEventListener("hashchange", route);

  loadJokes().then(function (list) {
    jokes = list;
    route();
    fetchCounts();
  }).catch(function () {
    app.innerHTML = '<p class="empty">Không tải được joke. Kiểm tra lại SHEET_CSV_URL trong config.js.</p>';
  });
})();
