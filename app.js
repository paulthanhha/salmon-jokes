(function () {
  var CFG = window.CONFIG || {};
  var NEW_DAYS = CFG.NEW_DAYS || 7;

  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d; }

  var SAMPLE = [
    { id: "1", joke: "Tại sao cà chua đỏ mặt?", hint: "Nghĩ đến món salad", answer: "Vì nó thấy salad đang thay đồ.", date: daysAgo(95), author: "" },
    { id: "2", joke: "Tại sao bút chì buồn?", hint: "Nghĩ đến việc chuốt bút", answer: "Vì nó luôn bị gọt giũa.", date: daysAgo(70), author: "" },
    { id: "3", joke: "Tại sao máy tính không bao giờ đói?", hint: "", answer: "Vì nó có rất nhiều byte.", date: daysAgo(62), author: "" },
    { id: "4", joke: "Tại sao sách toán luôn buồn?", hint: "Nghĩ đến nội dung trong sách", answer: "Vì nó có quá nhiều vấn đề.", date: daysAgo(40), author: "Tác giả B" },
    { id: "5", joke: "Tại sao điện thoại đi gặp bác sĩ?", hint: "Nghĩ đến vạch sóng", answer: "Vì nó bị mất sóng.", date: daysAgo(33), author: "" },
    { id: "6", joke: "Con gì đập thì sống, không đập thì chết?", hint: "Nằm trong lồng ngực", answer: "Con tim.", date: daysAgo(12), author: "Tác giả A" },
    { id: "7", joke: "Cái gì của bạn nhưng người khác dùng nhiều hơn bạn?", hint: "", answer: "Tên của bạn.", date: daysAgo(5), author: "Tác giả B" },
    { id: "8", joke: "Tại sao bộ xương không đi dự tiệc?", hint: "Nghĩ đến tiếng Anh: nobody", answer: "Vì nó chẳng có ai đi cùng.", date: daysAgo(2), author: "Tác giả A" }
  ];

  function $(id) { return document.getElementById(id); }
  var board = $("board"), rankEl = $("rank"), dlg = $("dlg"), mc = $("mc"), toastEl = $("toast");
  var dq = $("dq"), da = $("da"), dh = $("dh"), hbtn = $("hbtn"), tip = $("tip");

  var jokes = [], order = [], counts = {};
  var cur = null, hintOn = false, ansOn = false, tab = "haha";
  var reacted = load("dj_reacted", {});
  var RANK_N = CFG.RANK_SIZE || 10, SAVED_N = CFG.SAVED_SIZE || 10, savedPage = 1;
  var saved = load("dj_saved", []);
  if (!Array.isArray(saved)) saved = [];
  var PAGE = CFG.PAGE_SIZE || 18, sortMode = "new", page = 1;

  function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function tint(id) { var h = 0; id = String(id); for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h % 5; }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

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

  function isHidden(v) {
    v = (v || "").trim().toLowerCase();
    return v !== "" && ["false", "0", "no", "n", "không", "khong"].indexOf(v) < 0;
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
          date: parseDate(r[4]),
          author: (r[5] || "").trim(),
          hide: (r[6] || "").trim()
        };
      }).filter(function (j) { return j.joke && j.answer && !isHidden(j.hide); });
    });
  }

  function idNum(j) { return /^\s*-?\d+(\.\d+)?\s*$/.test(j.id) ? parseFloat(j.id) : NaN; }
  function idLabel(j) { return /^\d+$/.test(j.id) ? pad(+j.id) : j.id; }

  function applySort() {
    var dir = sortMode === "new" ? -1 : 1;
    order = jokes.slice().sort(function (a, b) {
      var x = idNum(a), y = idNum(b);
      if (!isNaN(x) && !isNaN(y) && x !== y) return (x - y) * dir;
      return (a.i - b.i) * dir;
    });
    page = 1;
  }

  function build() {
    jokes.forEach(function (j, i) { j.i = i; });
    applySort();
  }

  function fetchCounts() {
    if (!CFG.API_URL) return;
    fetch(CFG.API_URL + "?action=counts").then(function (r) { return r.json(); }).then(function (d) {
      counts = d || {};
      renderBoard(); renderRank();
      if (dlg.open) updateReact();
    }).catch(function () {});
  }

  function tileHTML(j) {
    var c = counts[j.id], mini = "";
    if (CFG.API_URL && c && (c.haha || c.lay)) mini = "<span>😂 " + c.haha + "</span><span>🙏 " + c.lay + "</span>";
    return '<button class="tile t' + tint(j.id) + '" type="button" data-id="' + esc(j.id) + '">' +
      '<span class="tab">Câu ' + esc(idLabel(j)) + "</span>" +
      '<span class="tq">' + esc(j.joke) + "</span>" +
      '<span class="tbm">' +
      '<span class="tf">' + (isNew(j) ? '<span class="new zz">Mới</span>' : "") + mini + "</span></span></button>";
  }

  function totalPages() { return Math.max(1, Math.ceil(order.length / PAGE)); }

  function renderBoard() {
    $("toolbar").hidden = !order.length;
    $("total").textContent = order.length + " câu";
    if (!order.length) {
      board.innerHTML = '<p class="empty">Chưa có joke nào. Thêm joke vào Google Sheet nhé.</p>';
      $("pager").innerHTML = "";
      return;
    }
    var from = (page - 1) * PAGE;
    board.innerHTML = '<div class="tiles">' + order.slice(from, from + PAGE).map(tileHTML).join("") + "</div>";
  }

  function pageList(cur, total, maxAll) {
    var set = {}, out = [], prev = 0;
    if (total <= (maxAll || 7)) { for (var i = 1; i <= total; i++) set[i] = 1; }
    else { set[1] = 1; set[total] = 1; for (var d = -1; d <= 1; d++) if (cur + d >= 1 && cur + d <= total) set[cur + d] = 1; }
    Object.keys(set).map(Number).sort(function (a, b) { return a - b; }).forEach(function (p) {
      if (p - prev > 1) out.push(0);
      out.push(p); prev = p;
    });
    return out;
  }

  function renderPager() {
    var total = totalPages(), el = $("pager");
    if (total <= 1) { el.innerHTML = ""; return; }
    el.innerHTML =
      '<button class="pg" type="button" data-page="' + (page - 1) + '" aria-label="Trang trước"' + (page === 1 ? " disabled" : "") + ">‹</button>" +
      pageList(page, total).map(function (p) {
        return p === 0 ? '<span class="pg-gap" aria-hidden="true">…</span>'
          : '<button class="pg" type="button" data-page="' + p + '" aria-label="Trang ' + p + '"' + (p === page ? ' aria-current="page"' : "") + ">" + p + "</button>";
      }).join("") +
      '<button class="pg" type="button" data-page="' + (page + 1) + '" aria-label="Trang sau"' + (page === total ? " disabled" : "") + ">›</button>" +
      '<span class="pg-info">Trang ' + page + " / " + total + "</span>";
  }

  function goPage(p) {
    p = Math.min(Math.max(1, p), totalPages());
    if (p === page) return;
    page = p;
    renderBoard(); renderPager();
    $("toolbar").scrollIntoView();
    var t = board.querySelector(".tile");
    if (t) t.focus({ preventScroll: true });
  }

  function isSaved(id) { return saved.indexOf(id) > -1; }

  function renderSaved() {
    var list = saved.map(byId).filter(Boolean), el = $("saved");
    if (!list.length) {
      el.innerHTML = '<p class="empty">Chưa lưu thẻ nào. Bấm biểu tượng dấu trang trong khung câu hỏi để lưu.</p>';
      return;
    }
    var pages = Math.max(1, Math.ceil(list.length / SAVED_N));
    savedPage = Math.min(Math.max(1, savedPage), pages);
    var from = (savedPage - 1) * SAVED_N;
    var pager = "";
    if (pages > 1) {
      pager = '<div class="spager" role="navigation" aria-label="Chuyển trang danh sách đã lưu">' +
        '<button class="pg" type="button" data-spage="' + (savedPage - 1) + '" aria-label="Danh sách đã lưu: trang trước"' + (savedPage === 1 ? " disabled" : "") + ">‹</button>" +
        pageList(savedPage, pages, 5).map(function (p) {
          return p === 0 ? '<span class="pg-gap" aria-hidden="true">…</span>'
            : '<button class="pg" type="button" data-spage="' + p + '" aria-label="Danh sách đã lưu: trang ' + p + '"' + (p === savedPage ? ' aria-current="page"' : "") + ">" + p + "</button>";
        }).join("") +
        '<button class="pg" type="button" data-spage="' + (savedPage + 1) + '" aria-label="Danh sách đã lưu: trang sau"' + (savedPage === pages ? " disabled" : "") + ">›</button></div>";
    }
    el.innerHTML = '<ul class="sv">' + list.slice(from, from + SAVED_N).map(function (j) {
      return '<li><button class="op" type="button" data-open="' + esc(j.id) + '"><span class="rq">' + esc(j.joke) + "</span></button>" +
        '<button class="rm" type="button" data-rm="' + esc(j.id) + '" aria-label="Bỏ lưu: ' + esc(j.joke) + '">✕</button></li>';
    }).join("") + "</ul>" + pager;
  }

  function updateSave() {
    var on = isSaved(cur.id), b = $("save"), label = on ? "Bỏ lưu thẻ này" : "Lưu thẻ này";
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", label);
    b.title = label;
  }

  function toggleSave() {
    var i = saved.indexOf(cur.id);
    if (i > -1) saved.splice(i, 1); else saved.unshift(cur.id);
    save("dj_saved", saved);
    updateSave(); renderSaved();
    toast(i > -1 ? "Đã bỏ lưu" : "Đã lưu thẻ");
  }

  function renderRank() {
    if (!CFG.API_URL) {
      rankEl.innerHTML = '<p class="empty">Xếp hạng sẽ hiện khi kết nối Google Apps Script. Xem API_URL trong config.js.</p>';
      return;
    }
    var list = jokes.map(function (j) { return { j: j, n: (counts[j.id] || {})[tab] || 0 }; })
      .filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return b.n - a.n; })
      .slice(0, RANK_N);
    rankEl.innerHTML = list.length
      ? '<ol class="rank">' + list.map(function (x, i) {
          return '<li><button type="button" data-id="' + esc(x.j.id) + '"><span class="rk">' + (i + 1) + '</span><span class="rq">' + esc(x.j.joke) + '</span><span class="rn">' + x.n + "</span></button></li>";
        }).join("") + "</ol>"
      : '<p class="empty">Chưa có ai bình chọn. Mở vài thẻ rồi quay lại nhé.</p>';
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toastEl.classList.remove("on"); }, 1800);
  }

  function updateReact() {
    var c = counts[cur.id] || { haha: 0, lay: 0 }, mine = reacted[cur.id], showN = !!CFG.API_URL;
    $("rh").setAttribute("aria-pressed", String(mine === "haha"));
    $("rl").setAttribute("aria-pressed", String(mine === "lay"));
    $("rhn").textContent = showN ? c.haha : "";
    $("rln").textContent = showN ? c.lay : "";
  }

  function update() {
    var j = cur;
    mc.className = "mc t" + tint(j.id);
    $("mnew").hidden = !isNew(j);
    dq.textContent = j.joke;
    dq.setAttribute("aria-expanded", String(ansOn));
    tip.textContent = ansOn ? "Bấm vào câu hỏi để ẩn đáp án" : "Bấm vào câu hỏi để xem đáp án";
    da.textContent = j.answer;
    da.hidden = !ansOn;
    dh.textContent = j.hint ? "Gợi ý: " + j.hint : "";
    dh.hidden = !(hintOn && j.hint);
    hbtn.hidden = !(j.hint && !hintOn && !ansOn);
    $("by").innerHTML = j.author ? "Tác giả: <b>" + esc(j.author) + "</b>" : "";
    $("by").hidden = !j.author;
    $("mt").textContent = "Câu " + idLabel(j);
    $("rxbox").hidden = !ansOn;
    updateReact();
    updateSave();
  }

  function setHash(j) { try { history.replaceState(null, "", "#joke=" + encodeURIComponent(j.id)); } catch (e) {} }

  function openJoke(j) {
    if (!j) return;
    cur = j; hintOn = false; ansOn = false;
    update();
    if (!dlg.open) dlg.showModal();
    setHash(j);
  }

  function go(delta) {
    var n = (order.indexOf(cur) + delta + order.length) % order.length;
    openJoke(order[n]);
  }

  function randomJoke() {
    if (!order.length) return;
    var pool = order.length > 1 ? order.filter(function (j) { return j !== cur; }) : order;
    openJoke(pool[Math.floor(Math.random() * pool.length)]);
  }

  function flip() {
    ansOn = !ansOn;
    update();
  }

  function react(type) {
    if (!ansOn) return;
    var id = cur.id, prev = reacted[id];
    if (prev === type) { toast("Bạn đã chọn rồi, bấm nút còn lại để đổi"); return; }
    reacted[id] = type;
    save("dj_reacted", reacted);
    counts[id] = counts[id] || { haha: 0, lay: 0 };
    if (prev) counts[id][prev] = Math.max(0, (counts[id][prev] || 0) - 1);
    counts[id][type] = (counts[id][type] || 0) + 1;
    updateReact(); renderBoard(); renderRank();
    if (prev) toast("Đã đổi lựa chọn");
    if (CFG.API_URL) {
      fetch(CFG.API_URL + "?action=react&id=" + encodeURIComponent(id) + "&type=" + type + (prev ? "&prev=" + prev : ""), { mode: "no-cors" }).catch(function () {});
    }
  }

  function share() {
    var url = location.origin + location.pathname + "#joke=" + encodeURIComponent(cur.id);
    var done = function () { toast("Đã sao chép link"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { toast(url); });
    else toast(url);
  }

  function byId(id) { return order.filter(function (j) { return j.id === id; })[0]; }

  function openFromHash() {
    var m = location.hash.match(/^#joke=(.+)$/);
    if (!m) return;
    var j = byId(decodeURIComponent(m[1]));
    if (j && (j !== cur || !dlg.open)) openJoke(j);
  }

  board.addEventListener("click", function (e) {
    var t = e.target.closest(".tile");
    if (t) openJoke(byId(t.getAttribute("data-id")));
  });
  $("pager").addEventListener("click", function (e) {
    var b = e.target.closest("[data-page]");
    if (b && !b.disabled) goPage(+b.getAttribute("data-page"));
  });
  document.querySelectorAll(".sbtn").forEach(function (b) {
    b.addEventListener("click", function () {
      sortMode = b.getAttribute("data-sort");
      document.querySelectorAll(".sbtn").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      applySort(); renderBoard(); renderPager();
    });
  });
  rankEl.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-id]");
    if (b) openJoke(byId(b.getAttribute("data-id")));
  });
  document.querySelectorAll(".seg .tab-b").forEach(function (b) {
    b.addEventListener("click", function () {
      tab = b.getAttribute("data-tab");
      document.querySelectorAll(".seg .tab-b").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      renderRank();
    });
  });

  var root = document.documentElement, themeBtn = $("theme");
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    var label = t === "dark" ? "Chuyển sang nền sáng" : "Chuyển sang nền tối";
    themeBtn.setAttribute("aria-pressed", String(t === "dark"));
    themeBtn.setAttribute("aria-label", label);
    themeBtn.title = label;
  }
  applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
  themeBtn.onclick = function () {
    var t = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(t);
    try { localStorage.setItem("dj_theme", t); } catch (e) {}
  };

  $("rand").onclick = randomJoke;
  $("rnd").onclick = randomJoke;
  $("prev").onclick = function () { go(-1); };
  $("next").onclick = function () { go(1); };
  $("mx").onclick = function () { dlg.close(); };
  dq.onclick = flip;
  hbtn.onclick = function () { hintOn = true; update(); };
  $("rh").onclick = function () { react("haha"); };
  $("rl").onclick = function () { react("lay"); };
  $("share").onclick = share;
  $("save").onclick = toggleSave;
  $("saved").addEventListener("click", function (e) {
    var o = e.target.closest("[data-open]"), r = e.target.closest("[data-rm]");
    var sp = e.target.closest("[data-spage]");
    if (sp) {
      if (!sp.disabled) {
        savedPage = +sp.getAttribute("data-spage");
        renderSaved();
        var cp = $("saved").querySelector('.spager [aria-current="page"]');
        if (cp) cp.focus();
      }
      return;
    }
    if (o) openJoke(byId(o.getAttribute("data-open")));
    else if (r) {
      var i = saved.indexOf(r.getAttribute("data-rm"));
      if (i > -1) { saved.splice(i, 1); save("dj_saved", saved); renderSaved(); }
    }
  });

  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", function () {
    if (location.hash) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });
  window.addEventListener("hashchange", function () {
    if (location.hash) openFromHash();
    else if (dlg.open) dlg.close();
  });

  loadJokes().then(function (list) {
    jokes = list;
    build();
    renderBoard();
    renderPager();
    renderRank();
    renderSaved();
    fetchCounts();
    openFromHash();
  }).catch(function () {
    board.innerHTML = '<p class="empty">Không tải được joke. Kiểm tra lại SHEET_CSV_URL trong config.js.</p>';
  });
})();
