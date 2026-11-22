
(function () {
  var STORAGE_KEY = "alg_prog_5grade_v3";
  var PAGES = ["start", "theory", "sim1", "sim2", "prac1", "prac2", "test", "report"];

  var DEFAULT_ORDER = [
    { id: "step_shoes", text: "Взути кросівки та зав'язати шнурівки" },
    { id: "step_wake", text: "Прокинутися вранці та застелити ліжко" },
    { id: "step_bag", text: "Взяти зібраний портфель і вийти з дому" },
    { id: "step_wash", text: "Вмитися та почистити зуби" }
  ];
  var CORRECT_ORDER_IDS = ["step_wake", "step_wash", "step_shoes", "step_bag"];

  var state = loadState();

  function getDefaultState() {
    return {
      student: { lastName: "", firstName: "", className: "" },
      currentPage: "start",
      completedPages: {},
      sim1: { x: 0, y: 0, commands: [], lastSuccessSteps: 0, reachedBattery: false, bonusAwarded: false },
      sim2: { order: DEFAULT_ORDER.slice(), bonusAwarded: false },
      prac1: { solved: {} },
      prac2: { solved: {} },
      test: { solved: {} }
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultState();
      var parsed = JSON.parse(raw);
      var def = getDefaultState();
      return {
        student: parsed.student || def.student,
        currentPage: parsed.currentPage || "start",
        completedPages: parsed.completedPages || {},
        sim1: parsed.sim1 || def.sim1,
        sim2: (parsed.sim2 && Array.isArray(parsed.sim2.order)) ? parsed.sim2 : def.sim2,
        prac1: parsed.prac1 || def.prac1,
        prac2: parsed.prac2 || def.prac2,
        test: parsed.test || def.test
      };
    } catch (e) {
      return getDefaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
    updateUIProgress();
  }

  function getScores() {
    var p1 = Object.keys(state.prac1.solved).filter(function (k) { return state.prac1.solved[k]; }).length * 2;
    var p2 = Object.keys(state.prac2.solved).filter(function (k) { return state.prac2.solved[k]; }).length * 2;
    var ts = Object.keys(state.test.solved).filter(function (k) { return state.test.solved[k]; }).length * 2;
    var b1 = state.sim1.bonusAwarded ? 2 : 0;
    var b2 = state.sim2.bonusAwarded ? 2 : 0;
    var bonus = b1 + b2;
    var total = Math.min(36, p1 + p2 + ts + bonus);
    var percent = Math.round((total / 36) * 100);
    var grade12 = Math.round((total / 36) * 12);
    return { p1: p1, p2: p2, ts: ts, b1: b1, b2: b2, bonus: bonus, total: total, percent: percent, grade12: grade12 };
  }

  function updateUIProgress() {
    var s = getScores();
    var fullName = ((state.student.lastName || "") + " " + (state.student.firstName || "")).trim();
    var hdrName = document.getElementById("hdr-student-name");
    var hdrClass = document.getElementById("hdr-student-class");
    if (hdrName) hdrName.textContent = fullName || "Учень 5 класу";
    if (hdrClass && document.activeElement !== hdrClass) hdrClass.value = state.student.className || "5";

    var liveScore = document.getElementById("live-score");
    if (liveScore) liveScore.textContent = String(s.total);

    if (s.p1 === 8) state.completedPages.prac1 = true;
    if (s.p2 === 8) state.completedPages.prac2 = true;
    if (s.ts === 16) state.completedPages.test = true;

    var doneCount = PAGES.filter(function (p) { return Boolean(state.completedPages[p]); }).length;
    var pct = Math.round((doneCount / PAGES.length) * 100);
    var pEl = document.getElementById("progress-percent");
    var cEl = document.getElementById("completed-count");
    var fEl = document.getElementById("progress-fill");
    if (pEl) pEl.textContent = pct + "%";
    if (cEl) cEl.textContent = String(doneCount);
    if (fEl) fEl.style.width = pct + "%";

    var navBtns = document.querySelectorAll("#top-nav .nav-btn");
    for (var i = 0; i < navBtns.length; i++) {
      var btn = navBtns[i];
      var p = btn.getAttribute("data-page");
      btn.classList.toggle("active", p === state.currentPage);
      btn.classList.toggle("completed", Boolean(state.completedPages[p]));
    }
  }

  function showPage(pageId) {
    if (PAGES.indexOf(pageId) === -1) pageId = "start";
    state.currentPage = pageId;
    if (pageId === "theory") state.completedPages.theory = true;
    if (pageId === "report") state.completedPages.report = true;

    var sections = document.querySelectorAll(".page-section");
    for (var i = 0; i < sections.length; i++) {
      sections[i].classList.toggle("active", sections[i].id === "page-" + pageId);
    }

    if (pageId === "sim1") renderSim1();
    if (pageId === "sim2") renderSim2();
    if (pageId === "report") renderReport();

    saveState();
    window.scrollTo(0, 0);
  }

  function renderSim1() {
    var arena = document.getElementById("sim1-grid");
    var seqBox = document.getElementById("sim1-seq");
    var codeBox = document.getElementById("sim1-code");
    var statusEl = document.getElementById("sim1-bonus-status");
    if (!arena) return;

    var labels = {
      up: "⬆️ Вгору",
      down: "⬇️ Вниз",
      left: "⬅️ Ліворуч",
      right: "➡️ Праворуч"
    };
    var codes = {
      up: "krok_vgoru()",
      down: "krok_vniz()",
      left: "krok_livoruch()",
      right: "krok_pravoruch()"
    };

    var html = "";
    for (var row = 0; row < 4; row++) {
      var y = 3 - row;
      for (var x = 0; x < 4; x++) {
        var isRobot = state.sim1.x === x && state.sim1.y === y;
        var isBattery = x === 3 && y === 2;
        var isWall = (x === 1 && y === 0) || (x === 1 && y === 1);
        var cls = "grid-cell";
        var icon = "";
        if (isWall) {
          cls += " wall";
          icon = "🧱";
        } else if (isRobot && isBattery) {
          cls += " reached";
          icon = "🤖🔋";
        } else if (isRobot) {
          cls += " robot";
          icon = "🤖";
        } else if (isBattery) {
          cls += " target";
          icon = "🔋";
        }
        html += '<div class="' + cls + '">' + icon + "<small>(" + x + "," + y + ")</small></div>";
      }
    }
    arena.innerHTML = html;

    if (state.sim1.commands.length === 0) {
      seqBox.innerHTML = '<span style="color:#64748b;font-size:0.9rem;">Додайте команди кнопками вище, щоб оминути стіну 🧱 та дістатися батарейки 🔋.</span>';
      codeBox.textContent = "# Програма для Робота поки порожня";
    } else {
      seqBox.innerHTML = state.sim1.commands.map(function (c, idx) {
        return '<span class="cmd-chip">' + (idx + 1) + ". " + labels[c] + "</span>";
      }).join("");
      codeBox.textContent = state.sim1.commands.map(function (c) { return codes[c]; }).join(String.fromCharCode(10));
    }

    statusEl.textContent = state.sim1.bonusAwarded
      ? "✅ Контрольну умову Симулятора №1 виконано! Нараховано +2 бали."
      : "ℹ️ Проведіть Робота 🤖 зі старту (0, 0) до батарейки 🔋 у клітинці (3, 2) в обхід стіни 🧱 та натисніть «Запустити програму» (+2 бали).";
  }

  function runSim1() {
    var cx = 0;
    var cy = 0;
    var hitWall = false;
    for (var i = 0; i < state.sim1.commands.length; i++) {
      var cmd = state.sim1.commands[i];
      var nx = cx;
      var ny = cy;
      if (cmd === "up") ny = Math.min(3, cy + 1);
      if (cmd === "down") ny = Math.max(0, cy - 1);
      if (cmd === "left") nx = Math.max(0, cx - 1);
      if (cmd === "right") nx = Math.min(3, cx + 1);
      if ((nx === 1 && ny === 0) || (nx === 1 && ny === 1)) {
        hitWall = true;
        break;
      }
      cx = nx;
      cy = ny;
    }
    state.sim1.x = cx;
    state.sim1.y = cy;
    state.completedPages.sim1 = true;
    var out = document.getElementById("sim1-output");

    if (hitWall) {
      out.className = "feedback err";
      out.innerHTML = "Робот натрапив на стіну 🧱! Натисніть «Очистити та на старт» і спочатку підніміть Робота вгору на (0, 2).";
    } else if (cx === 3 && cy === 2 && state.sim1.commands.length > 0) {
      state.sim1.reachedBattery = true;
      state.sim1.lastSuccessSteps = state.sim1.commands.length;
      state.sim1.bonusAwarded = true;
      out.className = "feedback ok";
      out.innerHTML = "Чудово! Робот дістався батарейки 🔋 за <strong>" + state.sim1.commands.length + "</strong> команд! Запам'ятайте це число для Завдання 4 Практичної №1.";
    } else {
      out.className = "feedback info";
      out.innerHTML = "Робот зупинився у клітинці <strong>(" + cx + ", " + cy + ")</strong>. Ціль батарейки 🔋: <strong>(3, 2)</strong>.";
    }
    saveState();
    renderSim1();
  }

  function renderSim2() {
    var host = document.getElementById("sim2-list");
    var statusEl = document.getElementById("sim2-bonus-status");
    if (!host) return;

    host.innerHTML = state.sim2.order.map(function (item, idx) {
      return '<div class="order-row">' +
        '<div><strong>Крок ' + (idx + 1) + ':</strong> ' + item.text + '</div>' +
        '<div style="display:flex;gap:6px;">' +
        '<button type="button" class="btn btn-outline" style="padding:5px 10px;" data-move="up" data-idx="' + idx + '"' + (idx === 0 ? " disabled" : "") + '>⬆️</button>' +
        '<button type="button" class="btn btn-outline" style="padding:5px 10px;" data-move="down" data-idx="' + idx + '"' + (idx === state.sim2.order.length - 1 ? " disabled" : "") + '>⬇️</button>' +
        '</div></div>';
    }).join("");

    var moveBtns = host.querySelectorAll("[data-move]");
    for (var i = 0; i < moveBtns.length; i++) {
      moveBtns[i].onclick = function () {
        var idx = Number(this.getAttribute("data-idx"));
        var dir = this.getAttribute("data-move");
        var swapIdx = dir === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= state.sim2.order.length) return;
        var tmp = state.sim2.order[idx];
        state.sim2.order[idx] = state.sim2.order[swapIdx];
        state.sim2.order[swapIdx] = tmp;
        saveState();
        renderSim2();
      };
    }

    statusEl.textContent = state.sim2.bonusAwarded
      ? "✅ Контрольну умову Симулятора №2 виконано! Нараховано +2 бали."
      : "ℹ️ Розташуйте 4 кроки алгоритму «Ранкові збори до школи» у правильному порядку та натисніть «Перевірити порядок» (+2 бали).";
  }

  function checkSim2() {
    state.completedPages.sim2 = true;
    var isRight = true;
    for (var i = 0; i < CORRECT_ORDER_IDS.length; i++) {
      if (state.sim2.order[i].id !== CORRECT_ORDER_IDS[i]) isRight = false;
    }
    var out = document.getElementById("sim2-output");
    if (isRight) {
      state.sim2.bonusAwarded = true;
      out.className = "feedback ok";
      out.innerHTML = "Правильно! Алгоритм «Ранкові збори до школи» складено у вірній послідовності. Нараховано +2 бали!";
    } else {
      out.className = "feedback err";
      out.innerHTML = "Послідовність ще не точна. Подумайте, що учень робить найпершим після сну і що останнім перед виходом.";
    }
    saveState();
    renderSim2();
  }

  function markSolved(group, taskId, cardId, fbId, btnEl) {
    state[group].solved[taskId] = true;
    var fb = document.getElementById(fbId);
    if (fb) {
      fb.className = "feedback ok";
      fb.textContent = "✅ Правильно! Зараховано 2 бали.";
      fb.style.display = "block";
    }
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = "Виконано ✓";
    }
    var badge = document.getElementById("badge_" + taskId);
    if (badge) {
      badge.textContent = "✅ +2 / 2 бали";
      badge.style.color = "#166534";
    }
    saveState();
  }

  function showErr(fbId, msg) {
    var fb = document.getElementById(fbId);
    if (!fb) return;
    fb.className = "feedback err";
    fb.textContent = msg;
    fb.style.display = "block";
  }

  function renderReport() {
    var s = getScores();
    var fullName = ((state.student.lastName || "") + " " + (state.student.firstName || "")).trim() || "Не вказано";
    var classStr = state.student.className || "5";
    var today = new Date().toLocaleDateString("uk-UA");

    document.getElementById("rep-class-top").textContent = classStr;
    document.getElementById("rep-student-fullname").textContent = fullName;
    document.getElementById("rep-student-class").textContent = classStr;
    document.getElementById("rep-date").textContent = today;
    document.getElementById("rep-sig-student").textContent = fullName;

    var status = "Роботу розпочато";
    if (s.total >= 30) status = "Відмінно виконано";
    else if (s.total >= 20) status = "Виконано успішно";
    else if (s.total > 0) status = "Виконано частково";
    document.getElementById("rep-status").textContent = status;

    document.getElementById("rep-prac1").textContent = String(s.p1);
    document.getElementById("rep-prac2").textContent = String(s.p2);
    document.getElementById("rep-test").textContent = String(s.ts);
    document.getElementById("rep-s1").textContent = String(s.b1);
    document.getElementById("rep-s2").textContent = String(s.b2);
    document.getElementById("rep-bonus").textContent = String(s.bonus);
    document.getElementById("rep-total").textContent = String(s.total);
    document.getElementById("rep-total-box").textContent = String(s.total);
    document.getElementById("rep-percent").textContent = s.percent + "%";
    document.getElementById("rep-grade12").textContent = String(s.grade12);
  }

  function restoreSolvedVisuals() {
    ["prac1", "prac2", "test"].forEach(function (grp) {
      Object.keys(state[grp].solved).forEach(function (tid) {
        if (state[grp].solved[tid]) {
          var btn = document.querySelector('[data-task="' + tid + '"]');
          markSolved(grp, tid, null, "fb_" + tid, btn);
        }
      });
    });
  }

  function bindAllEvents() {
    var ln = document.getElementById("start-lastname");
    var fn = document.getElementById("start-firstname");
    var cl = document.getElementById("start-class");
    var hdrCl = document.getElementById("hdr-student-class");

    if (ln) {
      ln.value = state.student.lastName || "";
      ln.oninput = function () { state.student.lastName = ln.value.trim(); saveState(); };
    }
    if (fn) {
      fn.value = state.student.firstName || "";
      fn.oninput = function () { state.student.firstName = fn.value.trim(); saveState(); };
    }
    if (cl) {
      cl.value = state.student.className || "";
      cl.oninput = function () { state.student.className = cl.value.trim(); saveState(); };
    }
    if (hdrCl) {
      hdrCl.oninput = function () {
        state.student.className = hdrCl.value.trim();
        if (cl) cl.value = state.student.className;
        saveState();
        if (state.currentPage === "report") renderReport();
      };
    }

    var startBtn = document.getElementById("btn-start-work");
    if (startBtn) {
      startBtn.onclick = function () {
        var lVal = ln.value.trim();
        var fVal = fn.value.trim();
        var cVal = cl.value.trim();
        if (!lVal || !fVal || !cVal) {
          showErr("start-error", "Введіть Прізвище, Ім'я та Клас або оберіть потрібну вкладку вгорі.");
          return;
        }
        document.getElementById("start-error").style.display = "none";
        state.student = { lastName: lVal, firstName: fVal, className: cVal };
        state.completedPages.start = true;
        saveState();
        showPage("theory");
      };
    }

    var navBtns = document.querySelectorAll("#top-nav .nav-btn");
    for (var i = 0; i < navBtns.length; i++) {
      navBtns[i].onclick = function () {
        showPage(this.getAttribute("data-page"));
      };
    }

    var footBtns = document.querySelectorAll("[data-nav]");
    for (var j = 0; j < footBtns.length; j++) {
      footBtns[j].onclick = function () {
        showPage(this.getAttribute("data-nav"));
      };
    }

    var addCmdBtns = document.querySelectorAll("[data-add-cmd]");
    for (var k = 0; k < addCmdBtns.length; k++) {
      addCmdBtns[k].onclick = function () {
        if (state.sim1.commands.length >= 12) return;
        state.sim1.commands.push(this.getAttribute("data-add-cmd"));
        saveState();
        renderSim1();
      };
    }

    var run1Btn = document.getElementById("sim1-run-btn");
    if (run1Btn) run1Btn.onclick = runSim1;

    var clr1Btn = document.getElementById("sim1-clear-cmds");
    if (clr1Btn) {
      clr1Btn.onclick = function () {
        state.sim1.x = 0;
        state.sim1.y = 0;
        state.sim1.commands = [];
        saveState();
        renderSim1();
      };
    }

    var check2Btn = document.getElementById("sim2-check-btn");
    if (check2Btn) check2Btn.onclick = checkSim2;

    var checkBtns = document.querySelectorAll("[data-task]");
    for (var m = 0; m < checkBtns.length; m++) {
      checkBtns[m].onclick = function () {
        var tid = this.getAttribute("data-task");
        var grp = this.getAttribute("data-group");
        var kind = this.getAttribute("data-kind");
        var ans = this.getAttribute("data-ans");
        if (state[grp].solved[tid]) return;

        if (kind === "radio") {
          var sel = document.querySelector('input[name="' + tid + '"]:checked');
          if (!sel) { showErr("fb_" + tid, "Оберіть варіант відповіді."); return; }
          if (sel.value === ans) markSolved(grp, tid, null, "fb_" + tid, this);
          else showErr("fb_" + tid, "Спробуй ще раз.");
        } else if (kind === "select") {
          var val = document.getElementById("inp_" + tid).value;
          if (!val) { showErr("fb_" + tid, "Оберіть значення зі списку."); return; }
          if (val === ans) markSolved(grp, tid, null, "fb_" + tid, this);
          else showErr("fb_" + tid, "Спробуй ще раз.");
        } else if (kind === "text") {
          var txt = document.getElementById("inp_" + tid).value.trim().toLowerCase();
          if (!txt) { showErr("fb_" + tid, "Введіть відповідь у поле."); return; }
          if (txt === ans) markSolved(grp, tid, null, "fb_" + tid, this);
          else showErr("fb_" + tid, "Спробуй ще раз.");
        } else if (kind === "match") {
          var m1 = document.getElementById("m_" + tid + "_1").value;
          var m2 = document.getElementById("m_" + tid + "_2").value;
          var m3 = document.getElementById("m_" + tid + "_3").value;
          if (!m1 || !m2 || !m3) { showErr("fb_" + tid, "Оберіть відповідність для всіх 3 рядків."); return; }
          if (m1 === "a" && m2 === "b" && m3 === "c") markSolved(grp, tid, null, "fb_" + tid, this);
          else showErr("fb_" + tid, "Є неточність у відповідностях. Спробуй ще раз.");
        } else if (kind === "sim1check") {
          var raw1 = document.getElementById("inp_" + tid).value.trim();
          if (!raw1) { showErr("fb_" + tid, "Введіть кількість кроків."); return; }
          if (!state.sim1.reachedBattery) {
            showErr("fb_" + tid, "Спочатку у Симуляторі №1 приведіть Робота 🤖 до батарейки 🔋 (3, 2) і натисніть «Запустити програму».");
            return;
          }
          if (Number(raw1) === state.sim1.lastSuccessSteps) markSolved(grp, tid, null, "fb_" + tid, this);
          else showErr("fb_" + tid, "Число не збігається з довжиною вашого успішного маршруту (" + state.sim1.lastSuccessSteps + "). Спробуй ще раз.");
        } else if (kind === "sim2check") {
          var sel2 = document.querySelector('input[name="' + tid + '"]:checked');
          if (!sel2) { showErr("fb_" + tid, "Оберіть варіант відповіді."); return; }
          if (!state.sim2.bonusAwarded) {
            showErr("fb_" + tid, "Спочатку складіть правильний порядок кроків у Симуляторі №2 та натисніть «Перевірити порядок».");
            return;
          }
          if (sel2.value === ans) markSolved(grp, tid, null, "fb_" + tid, this);
          else showErr("fb_" + tid, "Спробуй ще раз.");
        }
      };
    }

    var printBtn = document.getElementById("btn-print-report");
    if (printBtn) printBtn.onclick = function () { window.print(); };

    var resetBtn = document.getElementById("btn-reset-all");
    if (resetBtn) {
      resetBtn.onclick = function () {
        if (window.confirm("Скинути всі результати та розпочати заново?")) {
          localStorage.removeItem(STORAGE_KEY);
          window.location.reload();
        }
      };
    }
  }

  function init() {
    bindAllEvents();
    restoreSolvedVisuals();
    renderSim1();
    renderSim2();
    showPage(state.currentPage || "start");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
