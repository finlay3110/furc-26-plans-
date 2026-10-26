(function () {
  "use strict";

  var EVENTS = window.FURC_EVENTS || [];
  var STORAGE_KEY = "furcation-planner-2026";

  var DAYS = window.FURC_DAYS || [];

  // Logo-palette colours for the schedule's known tracks (matched by name). Order is legend order.
  var CATEGORIES = {
    Furcation: { label: "Furcation Events", color: "#d63864", match: /furcation/i },
    Charity: { label: "Charity Events", color: "#efcb52", match: /charity/i },
    Community: { label: "Community Events", color: "#5bc2a5", match: /community/i },
    DJ: { label: "DJ Session", color: "#6f8cd9", match: /\bdj\b/i },
    Registration: { label: "Registration", color: "#d4a574", match: /registration/i }
  };
  var TRACK_COLORS = window.FURC_TRACK_COLORS || {};

  // Any other pretalx track gets its own group, in the colour set in pretalx.
  function categoryOf(ev) {
    var key = Object.keys(CATEGORIES).filter(function (k) { return CATEGORIES[k].match && CATEGORIES[k].match.test(ev.type); })[0];
    if (key) return key;
    key = ev.type || "Other";
    if (!CATEGORIES[key]) CATEGORIES[key] = { label: key, color: TRACK_COLORS[key] || "#8e8e9e" };
    return key;
  }

  // Times are UK local; compare them as floating wall-clock values.
  function stamp(date, time) { return Date.parse(date + "T" + time + ":00Z"); }
  EVENTS.forEach(function (ev) {
    ev.start = stamp(ev.startDate, ev.startTime);
    ev.end = stamp(ev.endDate, ev.endTime);
    ev.cat = categoryOf(ev);
  });
  EVENTS.sort(function (a, b) { return a.start - b.start || a.end - b.end || a.name.localeCompare(b.name); });

  var byId = {};
  EVENTS.forEach(function (ev) { byId[ev.id] = ev; });

  // ---------- State ----------
  var state = { name: "", selected: [], day: DAYS[0].name };

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) {
        state.name = typeof saved.name === "string" ? saved.name : "";
        state.selected = (saved.selected || []).filter(function (id) { return byId[id]; });
        if (DAYS.some(function (d) { return d.name === saved.day; })) state.day = saved.day;
      }
    } catch (e) { /* storage unavailable: start fresh */ }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function selectedEvents() {
    return EVENTS.filter(function (ev) { return state.selected.indexOf(ev.id) !== -1; });
  }

  function clashesFor(ev, list) {
    return list.filter(function (o) { return o.id !== ev.id && o.start < ev.end && ev.start < o.end; });
  }

  // ---------- DOM helpers ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function possessive(name) {
    name = name.trim();
    return /s$/i.test(name) ? name + "'" : name + "'s";
  }
  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my";
  }
  function timeRange(ev) { return ev.startTime + " to " + ev.endTime; }

  // ---------- Steps ----------
  function showStep(id) {
    ["step-name", "step-pick", "step-export"].forEach(function (s) { $(s).hidden = s !== id; });
    $("page-title").textContent = state.name && id !== "step-name"
      ? possessive(state.name) + " Furcation Plans"
      : "Build your Furcation plan";
    window.scrollTo(0, 0);
    if (id === "step-name") $("name-input").focus();
  }

  // ---------- Step 2: picker ----------
  function renderTabs() {
    var tabs = $("day-tabs");
    tabs.innerHTML = "";
    tabs.style.setProperty("--days", DAYS.length);
    var chosen = selectedEvents();
    DAYS.forEach(function (d) {
      var count = chosen.filter(function (ev) { return ev.day === d.name; }).length;
      var btn = el("button", {
        type: "button", role: "tab", class: "tab", id: "tab-" + d.name,
        "aria-selected": String(state.day === d.name), "aria-controls": "day-panels"
      }, [
        el("span", { class: "tab-day", text: d.name }),
        el("span", { class: "tab-meta" }, [
          document.createTextNode(d.short.slice(0, -2) + d.short.slice(-2).toLowerCase()),
          el("span", { class: "tab-count", text: String(count), "aria-label": count + " selected" })
        ])
      ]);
      btn.addEventListener("click", function () {
        state.day = d.name; save(); renderTabs(); renderEvents();
      });
      tabs.appendChild(btn);
    });
  }

  function renderEvents() {
    var panel = $("day-panels");
    panel.innerHTML = "";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", "tab-" + state.day);
    var chosen = selectedEvents();
    var list = el("div", { class: "event-list" });
    var dayEvents = EVENTS.filter(function (ev) {
      return ev.day === state.day;
    });
    if (!dayEvents.length) list.appendChild(el("p", { class: "empty-day", text: "No events to show for this day." }));

    dayEvents.forEach(function (ev) {
      var isSel = state.selected.indexOf(ev.id) !== -1;
      var clashes = isSel ? clashesFor(ev, chosen) : [];
      var cb = el("input", { type: "checkbox", id: "cb-" + ev.id });
      cb.checked = isSel;
      cb.addEventListener("change", function () { toggle(ev.id, cb.checked); });

      var label = el("label", {
        class: "event" + (isSel ? " is-selected" : "") + (clashes.length ? " is-clash" : ""),
        for: "cb-" + ev.id, style: "--cat:" + CATEGORIES[ev.cat].color
      }, [
        cb,
        el("div", null, [
          el("div", { class: "event-time", text: timeRange(ev) }),
          el("div", { class: "event-name", text: ev.name }),
          el("div", { class: "event-meta" }, [
            el("span", { text: ev.venue }),
            el("span", { class: "type-chip", text: CATEGORIES[ev.cat].label })
          ]),
          ev.notes ? el("div", { class: "event-notes", text: ev.notes }) : null,
          clashes.length ? el("div", {
            class: "event-clash",
            text: "Clashes with " + clashes.map(function (c) { return c.name + " (" + c.day.slice(0, 3) + " " + c.startTime + ")"; }).join(", ")
          }) : null
        ])
      ]);
      list.appendChild(label);
    });
    panel.appendChild(list);
  }

  function renderSummary() {
    var chosen = selectedEvents();
    var n = chosen.length;
    $("selected-count").textContent = n;
    $("selected-label").textContent = n === 1 ? "event selected" : "events selected";
    $("to-export").disabled = n === 0;
    var clashing = chosen.filter(function (ev) { return clashesFor(ev, chosen).length; }).length;
    var note = $("clash-note");
    note.hidden = !clashing;
    note.textContent = clashing ? "· " + clashing + " clashing" : "";
  }

  function toggle(id, on) {
    var i = state.selected.indexOf(id);
    if (on && i === -1) state.selected.push(id);
    if (!on && i !== -1) state.selected.splice(i, 1);
    save();
    // Keep scroll position while re-rendering the list.
    var y = window.scrollY;
    renderTabs(); renderEvents(); renderSummary();
    window.scrollTo(0, y);
    var cb = $("cb-" + id);
    if (cb) cb.focus({ preventScroll: true });
  }

  // ---------- iCal ----------
  function icsEscape(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }
  // Fold lines at 75 octets without splitting multi-byte characters (RFC 5545 3.1).
  function icsFold(line) {
    var enc = new TextEncoder();
    var out = [], cur = "", bytes = 0, limit = 75;
    Array.from(line).forEach(function (ch) {
      var b = enc.encode(ch).length;
      if (bytes + b > limit) { out.push(cur); cur = " "; bytes = 1; limit = 75; }
      cur += ch; bytes += b;
    });
    out.push(cur);
    return out.join("\r\n");
  }
  function icsDate(date, time) { return date.replace(/-/g, "") + "T" + time.replace(":", "") + "00"; }

  function buildIcs() {
    var now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Furcation Planner//Furcation 2026//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:" + icsEscape(possessive(state.name) + " Furcation 2026"),
      "X-WR-TIMEZONE:Europe/London",
      "BEGIN:VTIMEZONE",
      "TZID:Europe/London",
      "BEGIN:DAYLIGHT",
      "TZOFFSETFROM:+0000",
      "TZOFFSETTO:+0100",
      "TZNAME:BST",
      "DTSTART:19700329T010000",
      "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
      "END:DAYLIGHT",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:+0100",
      "TZOFFSETTO:+0000",
      "TZNAME:GMT",
      "DTSTART:19701025T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
      "END:STANDARD",
      "END:VTIMEZONE"
    ];
    selectedEvents().forEach(function (ev) {
      var desc = [CATEGORIES[ev.cat].label];
      if (ev.notes) desc.push(ev.notes);
      desc.push("", "Furcation 2026 · John Fowler's, Sandy Glade Holiday Park", "https://furcation.org.uk");
      lines.push(
        "BEGIN:VEVENT",
        "UID:furc2026-" + icsDate(ev.startDate, ev.startTime) + "-" + slug(ev.name + " " + ev.venue) + "@furcation-planner",
        "DTSTAMP:" + now,
        "DTSTART;TZID=Europe/London:" + icsDate(ev.startDate, ev.startTime),
        "DTEND;TZID=Europe/London:" + icsDate(ev.endDate, ev.endTime),
        "SUMMARY:" + icsEscape(ev.name),
        "LOCATION:" + icsEscape(ev.venue),
        "DESCRIPTION:" + icsEscape(desc.join("\n")),
        "CATEGORIES:" + icsEscape(CATEGORIES[ev.cat].label),
        "TRANSP:OPAQUE",
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    return lines.map(icsFold).join("\r\n") + "\r\n";
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function fileBase() { return slug(state.name) + "-furcation-2026"; }

  // ---------- Poster (canvas) ----------
  var P = {
    W: 2400, minH: 1414, margin: 62, gutter: 24,
    bg: "#0a0a0c", column: "#17171c", accent: "#d63864",
    stripe: ["#d63864", "#4f6db8", "#5bc2a5", "#efcb52"],
    cardText: "#16161a", cardMuted: "#62626e", white: "#ffffff", muted: "#8e8e9e",
    font: '"Inter", "Helvetica Neue", Arial, sans-serif'
  };

  function font(weight, size) { return weight + " " + size + "px " + P.font; }

  function wrap(ctx, text, maxW) {
    var words = text.split(/\s+/), lines = [], line = "";
    words.forEach(function (w) {
      var test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    var tl = r.tl || 0, tr = r.tr || 0, br = r.br || 0, bl = r.bl || 0;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br); ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl); ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }
  function allR(r) { return { tl: r, tr: r, br: r, bl: r }; }

  var CARD = { padL: 31, padR: 16, padT: 26, gap: 14, timeH: 32, nameLH: 28, venueH: 30, notesLH: 22, padB: 16 };

  function layoutCard(ctx, ev, w) {
    ctx.font = font(700, 23);
    var nameLines = wrap(ctx, ev.name, w - CARD.padL - CARD.padR);
    ctx.font = font(500, 16);
    var noteLines = ev.notes ? wrap(ctx, ev.notes, w - CARD.padL - CARD.padR) : [];
    var h = CARD.padT + CARD.timeH + nameLines.length * CARD.nameLH + CARD.venueH + noteLines.length * CARD.notesLH + CARD.padB;
    return { ev: ev, nameLines: nameLines, noteLines: noteLines, h: h };
  }

  function drawCard(ctx, c, x, y, w) {
    var ev = c.ev, color = CATEGORIES[ev.cat].color;
    // card + colour bar
    ctx.fillStyle = P.white;
    roundRect(ctx, x, y, w, c.h, allR(10)); ctx.fill();
    ctx.save();
    roundRect(ctx, x, y, w, c.h, allR(10)); ctx.clip();
    ctx.fillStyle = color; ctx.fillRect(x, y, 16, c.h);
    ctx.fillStyle = P.white; ctx.fillRect(x + 16, y, w - 16, c.h);
    ctx.restore();

    var tx = x + CARD.padL, ty = y + CARD.padT;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    // time
    ctx.font = font(700, 20); ctx.fillStyle = P.cardText;
    ctx.fillText(timeRange(ev), tx, ty + 10);

    // name
    ty += CARD.timeH;
    ctx.font = font(700, 23); ctx.fillStyle = P.cardText;
    c.nameLines.forEach(function (line, i) { ctx.fillText(line, tx, ty + 12 + i * CARD.nameLH); });
    ty += c.nameLines.length * CARD.nameLH;

    // venue
    ctx.font = font(400, 18); ctx.fillStyle = P.cardMuted;
    ctx.fillText(ev.venue, tx, ty + 16);
    ty += CARD.venueH;

    if (c.noteLines.length) {
      ctx.font = font(500, 16); ctx.fillStyle = "#a36a00";
      c.noteLines.forEach(function (line, i) { ctx.fillText(line, tx, ty + 10 + i * CARD.notesLH); });
    }
  }

  function renderPoster(canvas) {
    var ctx = canvas.getContext("2d");
    var W = P.W, m = P.margin;
    var colW = (W - 2 * m - (DAYS.length - 1) * P.gutter) / DAYS.length;
    var cardW = colW - 38;
    var colTop = 218, headH = 80, bodyPad = 20;
    var chosen = selectedEvents();

    // Measure first so the canvas can grow for busy days.
    canvas.width = W; canvas.height = P.minH;
    var columns = DAYS.map(function (d) {
      var cards = chosen.filter(function (ev) { return ev.day === d.name; })
        .map(function (ev) { return layoutCard(ctx, ev, cardW); });
      var h = cards.reduce(function (s, c) { return s + c.h + CARD.gap; }, 0);
      return { day: d, cards: cards, h: h };
    });
    var tallest = Math.max.apply(null, columns.map(function (c) { return c.h; }));
    var footerH = 82;
    var H = Math.max(P.minH, Math.ceil(colTop + headH + bodyPad + tallest + bodyPad + footerH));
    canvas.height = H;

    // background
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);

    // title, shrunk to fit long names
    var title = (possessive(state.name) + " Furcation Plans").toUpperCase();
    var size = 80;
    ctx.font = font(900, size);
    while (ctx.measureText(title).width > W - 2 * m && size > 36) { size -= 2; ctx.font = font(900, size); }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = P.accent; ctx.fillText(title, m + 4, 122);
    ctx.fillStyle = P.white; ctx.fillText(title, m, 118);

    ctx.font = font(400, 26); ctx.fillStyle = P.white;
    ctx.fillText("Furcation 2026: Press Start!   |   John Fowler's, Sandy Glade Holiday Park   |   19 to 23 November", m, 162);
    ctx.font = font(400, 19); ctx.fillStyle = P.muted; ctx.textAlign = "right";
    ctx.fillText("All times UK local time", W - m, 162);
    ctx.textAlign = "left";

    var seg = (W - 2 * m) / P.stripe.length;
    P.stripe.forEach(function (c, i) { ctx.fillStyle = c; ctx.fillRect(m + i * seg, 182, seg, 5); });

    // columns
    var colBottom = H - footerH;
    columns.forEach(function (col, i) {
      var x = m + i * (colW + P.gutter);
      ctx.fillStyle = P.column;
      roundRect(ctx, x, colTop, colW, colBottom - colTop, allR(16)); ctx.fill();
      ctx.fillStyle = P.accent;
      roundRect(ctx, x, colTop, colW, headH, { tl: 16, tr: 16, br: 0, bl: 0 }); ctx.fill();

      ctx.fillStyle = P.white;
      ctx.font = font(800, 31); ctx.textAlign = "left";
      ctx.fillText(col.day.name.toUpperCase(), x + 24, colTop + 52);
      ctx.font = font(800, 23); ctx.textAlign = "right";
      ctx.fillText(col.day.short, x + colW - 24, colTop + 51);
      ctx.textAlign = "left";

      var y = colTop + headH + bodyPad;
      if (!col.cards.length) {
        ctx.font = font(500, 20); ctx.fillStyle = P.muted; ctx.textAlign = "center";
        ctx.fillText("Rest day – nothing planned", x + colW / 2, y + 40);
        ctx.textAlign = "left";
      }
      col.cards.forEach(function (c) {
        drawCard(ctx, c, x + 19, y, cardW);
        y += c.h + CARD.gap;
      });
    });

    // legend: only the colour groups that appear on the plan
    var used = {};
    chosen.forEach(function (ev) { used[ev.cat] = true; });
    var lx = m, ly = H - 46;
    ctx.font = font(400, 20); ctx.textBaseline = "middle";
    Object.keys(CATEGORIES).forEach(function (k) {
      if (!used[k]) return;
      ctx.fillStyle = CATEGORIES[k].color;
      roundRect(ctx, lx, ly - 11, 22, 22, allR(5)); ctx.fill();
      ctx.fillStyle = P.white;
      ctx.fillText(CATEGORIES[k].label, lx + 34, ly + 1);
      lx += 34 + ctx.measureText(CATEGORIES[k].label).width + 52;
    });
    ctx.textBaseline = "alphabetic";
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var loads = ["400", "500", "700", "800", "900"].map(function (w) { return document.fonts.load(w + " 20px Inter"); });
    // Don't hang the preview if the web font is blocked or offline.
    var timeout = new Promise(function (r) { setTimeout(r, 2500); });
    return Promise.race([Promise.all(loads), timeout]).catch(function () {});
  }

  function showExport() {
    showStep("step-export");
    fontsReady().then(function () { renderPoster($("plan-canvas")); });
  }

  function savePng() {
    var canvas = $("plan-canvas");
    canvas.toBlob(function (blob) { download(blob, fileBase() + ".png"); }, "image/png");
  }

  function savePdf() {
    var canvas = $("plan-canvas");
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) { alert("PDF library failed to load. Try Save as PNG instead."); return; }
    // A4 landscape width; height follows the poster so busy plans aren't squashed.
    var w = 841.89, h = w * canvas.height / canvas.width;
    var doc = new jsPDF({ orientation: h > w ? "portrait" : "landscape", unit: "pt", format: [w, h], compress: true });
    doc.setProperties({
      title: possessive(state.name) + " Furcation Plans",
      subject: "Furcation 2026",
      creator: "Furcation Planner"
    });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h, undefined, "FAST");
    doc.save(fileBase() + ".pdf");
  }

  // ---------- Wire up ----------
  function init() {
    load();

    $("name-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = $("name-input").value.trim();
      if (!v) return;
      state.name = v; save();
      renderTabs(); renderEvents(); renderSummary();
      showStep("step-pick");
    });
    $("change-name").addEventListener("click", function () {
      $("name-input").value = state.name;
      showStep("step-name");
    });
    $("clear-all").addEventListener("click", function () {
      if (!state.selected.length || confirm("Clear all selected events?")) {
        state.selected = []; save(); renderTabs(); renderEvents(); renderSummary();
      }
    });
    $("to-export").addEventListener("click", showExport);
    $("back-to-pick").addEventListener("click", function () {
      renderTabs(); renderEvents(); renderSummary(); showStep("step-pick");
    });
    $("dl-ics").addEventListener("click", function () {
      download(new Blob([buildIcs()], { type: "text/calendar;charset=utf-8" }), fileBase() + ".ics");
    });
    $("dl-png").addEventListener("click", savePng);
    $("dl-pdf").addEventListener("click", savePdf);

    if (state.name) {
      $("name-input").value = state.name;
      renderTabs(); renderEvents(); renderSummary();
      showStep("step-pick");
    } else {
      showStep("step-name");
    }
  }

  // Exposed for testing.
  window.FurcPlanner = { buildIcs: buildIcs, state: state };

  init();
})();
