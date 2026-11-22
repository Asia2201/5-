(function () {
  const STORAGE_KEY = "algorithms_programs_5grade_v1_state";
  const PAGES = ["start", "theory", "sim1", "sim2", "prac1", "prac2", "test", "report"];

  let state = loadState();

  function getDefaultState() {
    return {
      student: { lastName: "", firstName: "", className: "" },
      started: false,
      currentPage: "start",
      completedPages: {},
      sim1: { x: 0, y: 0, commands: [], lastSuccessSteps: 0, reachedStar: false, bonusAwarded: false },
      sim2: { selected: { s1: true, s2: true, s3: false, s4: false, s5: false }, generatedOnce: false, bonusAwarded: false },
      prac1: { solved: {}, userAnswers: {} },
      prac2: { solved: {}, userAnswers: {} },
      test: { solved: {}, userAnswers: {}, attempts: {} }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultState();
      return Object.assign(getDefaultState(), JSON.parse(raw));
    } catch (_) {
      return getDefaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
    updateHeaderAndProgress();
  }

  function isStudentRegistered() {
    return Boolean(
      state.started &&
      state.student.lastName && state.student.lastName.trim().length > 0 &&
      state.student.firstName && state.student.firstName.trim().length > 0 &&
      state.student.className && state.student.className.trim().length > 0
    );
  }

  function calculateTotalBreakdown() {
    const p1Score = Object.values(state.prac1.solved).filter(Boolean).length * 2;
    const p2Score = Object.values(state.prac2.solved).filter(Boolean).length * 2;
    const testScore = Object.values(state.test.solved).filter(Boolean).length * 2;
    const s1Bonus = state.sim1.bonusAwarded ? 2 : 0;
    const s2Bonus = state.sim2.bonusAwarded ? 2 : 0;
    const bonusTotal = s1Bonus + s2Bonus;
    const total = Math.min(36, p1Score + p2Score + testScore + bonusTotal);
    const percent = Math.round((total / 36) * 100);
    const grade12 = Math.round((total / 36) * 12);
    return { p1Score, p2Score, testScore, s1Bonus, s2Bonus, bonusTotal, total, percent, grade12 };
  }

  function updateHeaderAndProgress() {
    const nameEl = document.getElementById("hdr-student-name");
    const classInput = document.getElementById("hdr-student-class");
    const fullName = `${state.student.lastName || ""} ${state.student.firstName || ""}`.trim();
    if (nameEl) nameEl.textContent = fullName || "Не вказано";
    if (classInput && document.activeElement !== classInput) {
      classInput.value = state.student.className || "";
    }

    const breakdown = calculateTotalBreakdown();
    const liveScoreEl = document.getElementById("live-score");
    if (liveScoreEl) liveScoreEl.textContent = String(breakdown.total);

    if (Object.values(state.prac1.solved).filter(Boolean).length === 4) state.completedPages.prac1 = true;
    if (Object.values(state.prac2.solved).filter(Boolean).length === 4) state.completedPages.prac2 = true;
    if (Object.values(state.test.solved).filter(Boolean).length === 8) state.completedPages.test = true;

    const doneCount = PAGES.filter((p) => Boolean(state.completedPages[p])).length;
    const pct = Math.round((doneCount / PAGES.length) * 100);
    const pctEl = document.getElementById("progress-percent");
    const cntEl = document.getElementById("completed-count");
    const fillEl = document.getElementById("progress-fill");
    if (pctEl) pctEl.textContent = pct + "%";
    if (cntEl) cntEl.textContent = String(doneCount);
    if (fillEl) fillEl.style.width = pct + "%";

    document.querySelectorAll("#top-nav .nav-btn").forEach((btn) => {
      const p = btn.getAttribute("data-page");
      btn.classList.toggle("active", p === state.currentPage);
      btn.classList.toggle("completed", Boolean(state.completedPages[p]));
    });
  }

  function navigateTo(pageId) {
    if (pageId !== "start" && !isStudentRegistered()) {
      const err = document.getElementById("start-error");
      if (err) {
        err.textContent = "Спочатку введіть Прізвище, Ім'я та Клас і натисніть «Розпочати роботу».";
        err.style.display = "block";
      }
      pageId = "start";
    }

    if (pageId === "theory") state.completedPages.theory = true;
    if (pageId === "report") state.completedPages.report = true;

    state.currentPage = pageId;
    document.querySelectorAll(".page-section").forEach((sec) => {
      sec.classList.toggle("active", sec.id === "page-" + pageId);
    });

    if (pageId === "sim1") renderSim1();
    if (pageId === "sim2") renderSim2();
    if (pageId === "prac1") renderPractice1();
    if (pageId === "prac2") renderPractice2();
    if (pageId === "test") renderTest();
    if (pageId === "report") renderReport();

    saveState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initStartAndHeader() {
    const ln = document.getElementById("start-lastname");
    const fn = document.getElementById("start-firstname");
    const cl = document.getElementById("start-class");
    const hdrCl = document.getElementById("hdr-student-class");
    const err = document.getElementById("start-error");
    const startBtn = document.getElementById("btn-start-work");

    ln.value = state.student.lastName || "";
    fn.value = state.student.firstName || "";
    cl.value = state.student.className || "";

    hdrCl.oninput = () => {
      state.student.className = hdrCl.value.trim();
      cl.value = state.student.className;
      saveState();
      if (state.currentPage === "report") renderReport();
    };

    function handleStart() {
      const lastVal = ln.value.trim();
      const firstVal = fn.value.trim();
      const classVal = cl.value.trim();
      if (!lastVal || !firstVal || !classVal) {
        err.textContent = "Будь ласка, заповніть усі обов'язкові поля: Прізвище, Ім'я та Клас.";
        err.style.display = "block";
        return;
      }
      err.style.display = "none";
      state.student = { lastName: lastVal, firstName: firstVal, className: classVal };
      state.started = true;
      state.completedPages.start = true;
      saveState();
      navigateTo("theory");
    }

    startBtn.onclick = handleStart;
    document.querySelectorAll("#top-nav .nav-btn").forEach((btn) => {
      btn.onclick = () => navigateTo(btn.getAttribute("data-page"));
    });
    document.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.onclick = () => navigateTo(btn.getAttribute("data-nav"));
    });
  }

  function renderSim1() {
    const arena = document.getElementById("sim1-grid");
    const seqBox = document.getElementById("sim1-seq");
    const codeBox = document.getElementById("sim1-code");
    const cmds = window.COURSE_DATA.robotCommands;

    // 5x5 grid where y=0 is bottom row (row index 4 in visual grid) and y=4 is top row (row index 0)
    let cellsHtml = "";
    for (let visualRow = 0; visualRow < 5; visualRow++) {
      const y = 4 - visualRow;
      for (let x = 0; x < 5; x++) {
        const isRobot = state.sim1.x === x && state.sim1.y === y;
        const isStar = x === 2 && y === 2;
        let cls = "grid-cell";
        let icon = "";
        if (isRobot && isStar) {
          cls += " reached";
          icon = "🤖⭐";
        } else if (isRobot) {
          cls += " robot";
          icon = "🤖";
        } else if (isStar) {
          cls += " target";
          icon = "⭐";
        }
        cellsHtml += `<div class="${cls}" title="(${x}, ${y})">${icon}</div>`;
      }
    }
    arena.innerHTML = cellsHtml;

    if (state.sim1.commands.length === 0) {
      seqBox.innerHTML = '<span style="color:#64748b; font-size:0.9rem;">Список команд порожній. Натисніть кнопки команд нижче.</span>';
    } else {
      seqBox.innerHTML = state.sim1.commands
        .map((cId, i) => {
          const item = cmds.find((c) => c.id === cId);
          return `<span class="cmd-chip">${i + 1}. ${item.label}</span>`;
        })
        .join("");
    }

    const lines = state.sim1.commands.map((cId) => cmds.find((c) => c.id === cId).code);
    codeBox.textContent = lines.length ? lines.join("\n") : "# Додайте команди, щоб побачити програму";

    document.getElementById("sim1-bonus-status").textContent = state.sim1.bonusAwarded
      ? "✅ Контрольну умову Симулятора №1 виконано! Нараховано +2 бали."
      : "ℹ️ Доведіть Робота до зірки ⭐ у позиції (2, 2) та натисніть «Запустити програму», щоб отримати +2 бали.";

    document.querySelectorAll("[data-add-cmd]").forEach((btn) => {
      btn.onclick = () => {
        if (state.sim1.commands.length >= 12) return;
        state.sim1.commands.push(btn.getAttribute("data-add-cmd"));
        saveState();
        renderSim1();
      };
    });

    document.getElementById("sim1-clear-cmds").onclick = () => {
      state.sim1.x = 0;
      state.sim1.y = 0;
      state.sim1.commands = [];
      saveState();
      renderSim1();
    };

    document.getElementById("sim1-run-btn").onclick = () => {
      let cx = 0;
      let cy = 0;
      for (const cId of state.sim1.commands) {
        if (cId === "up") cy = Math.min(4, cy + 1);
        if (cId === "down") cy = Math.max(0, cy - 1);
        if (cId === "left") cx = Math.max(0, cx - 1);
        if (cId === "right") cx = Math.min(4, cx + 1);
      }
      state.sim1.x = cx;
      state.sim1.y = cy;
      state.completedPages.sim1 = true;
      const out = document.getElementById("sim1-output");
      if (cx === 2 && cy === 2 && state.sim1.commands.length > 0) {
        state.sim1.reachedStar = true;
        state.sim1.lastSuccessSteps = state.sim1.commands.length;
        state.sim1.bonusAwarded = true;
        out.className = "feedback ok";
        out.innerHTML = `Успіх! Робот досяг зірки ⭐ за <strong>${state.sim1.commands.length}</strong> кроків! Запам'ятайте це число для Завдання 4 Практичної №1.`;
      } else {
        out.className = "feedback info";
        out.innerHTML = `Програма виконала <strong>${state.sim1.commands.length}</strong> команд. Поточні координати Робота: <strong>(${cx}, ${cy})</strong>. Ціль зірки ⭐: <strong>(2, 2)</strong>.`;
      }
      saveState();
      renderSim1();
    };
  }

  function renderSim2() {
    const host = document.getElementById("sim2-steps");
    const steps = window.COURSE_DATA.recipeSteps;

    host.innerHTML = steps
      .map((st) => {
        const checked = Boolean(state.sim2.selected[st.id]);
        return `
          <label class="option-label">
            <input type="checkbox" data-step="${st.id}" ${checked ? "checked" : ""} />
            <span style="font-weight:600;">${st.text}</span>
          </label>`;
      })
      .join("");

    host.querySelectorAll("input[type='checkbox']").forEach((chk) => {
      chk.onchange = () => {
        state.sim2.selected[chk.getAttribute("data-step")] = chk.checked;
        saveState();
      };
    });

    document.getElementById("sim2-bonus-status").textContent = state.sim2.bonusAwarded
      ? "✅ Контрольну умову Симулятора №2 виконано! Нараховано +2 бали."
      : "ℹ️ Оберіть щонайменше 3 кроки алгоритму та натисніть «Сформувати алгоритм», щоб отримати +2 бали.";

    document.getElementById("sim2-build-btn").onclick = () => {
      const chosen = steps.filter((s) => state.sim2.selected[s.id]);
      state.sim2.generatedOnce = true;
      state.completedPages.sim2 = true;
      const out = document.getElementById("sim2-output");
      if (chosen.length >= 3) {
        state.sim2.bonusAwarded = true;
        out.className = "feedback ok";
        out.innerHTML = `Сформовано алгоритм із <strong>${chosen.length}</strong> кроків:<br/>${chosen.map((c) => c.text).join("<br/>")}`;
      } else {
        out.className = "feedback info";
        out.innerHTML = `Обрано кроків: <strong>${chosen.length}</strong>. Оберіть щонайменше 3 кроки, щоб отримати +2 бали.`;
      }
      saveState();
      renderSim2();
    };
  }

  function renderPractice1() {
    const host = document.getElementById("prac1-container");
    const tasks = window.COURSE_DATA.practice1;

    host.innerHTML = tasks
      .map((t) => {
        const isSolved = Boolean(state.prac1.solved[t.id]);
        const saved = state.prac1.userAnswers[t.id];
        let body = "";

        if (t.type === "single") {
          body = t.options
            .map((opt, idx) => `<label class="option-label"><input type="radio" name="${t.id}" value="${idx}" ${Number(saved) === idx ? "checked" : ""} ${isSolved ? "disabled" : ""} /><span>${opt}</span></label>`)
            .join("");
        } else if (t.type === "select_code") {
          body = `<div class="code-block">${t.codeBefore}<select id="inp_${t.id}" class="select-input" style="width:auto; display:inline-block;" ${isSolved ? "disabled" : ""}><option value="">-- обери --</option>${t.options.map((o) => `<option value="${o}" ${saved === o ? "selected" : ""}>${o}</option>`).join("")}</select>${escapeHtml(t.codeAfter)}</div>`;
        } else if (t.type === "matching") {
          const mapSaved = typeof saved === "object" && saved !== null ? saved : {};
          body = t.pairs
            .map((pair, idx) => `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; align-items:center; margin-bottom:8px;"><div style="background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-weight:700;">${pair.left}</div><select class="select-input" data-match="${t.id}" data-idx="${idx}" ${isSolved ? "disabled" : ""}><option value="">-- оберіть пояснення --</option>${t.rightOptions.map((ro) => `<option value="${ro}" ${mapSaved[idx] === ro ? "selected" : ""}>${ro}</option>`).join("")}</select></div>`)
            .join("");
        } else if (t.type === "sim1_steps") {
          body = `<div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;"><input id="inp_${t.id}" class="text-input" style="max-width:180px;" type="number" min="1" max="12" placeholder="Кількість кроків" value="${saved !== undefined ? saved : ""}" ${isSolved ? "disabled" : ""} /><button type="button" class="btn btn-outline" data-nav="sim1">Перейти до Симулятора №1</button></div>`;
        }

        return `<div class="card"><div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:10px;"><strong>${t.question}</strong><span style="white-space:nowrap; font-weight:700; color:${isSolved ? "#166534" : "#6d28d9"};">${isSolved ? "✅ +2 / 2 бали" : "2 бали"}</span></div>${body}<div style="margin-top:10px;"><button type="button" class="btn btn-primary" data-check-p1="${t.id}" ${isSolved ? "disabled" : ""}>Перевірити завдання</button></div><div id="fb_${t.id}" class="feedback ${isSolved ? "ok" : ""}" style="${isSolved ? "" : "display:none;"}">${isSolved ? "Правильно! Зараховано 2 бали." : ""}</div></div>`;
      })
      .join("");

    host.querySelectorAll("[data-nav]").forEach((b) => { b.onclick = () => navigateTo(b.getAttribute("data-nav")); });
    host.querySelectorAll("[data-check-p1]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-check-p1");
        if (state.prac1.solved[id]) return;
        const task = tasks.find((x) => x.id === id);
        const fb = document.getElementById("fb_" + id);
        let ok = false;
        if (task.type === "single") {
          const sel = host.querySelector(`input[name="${id}"]:checked`);
          if (!sel) { showFb(fb, "err", "Оберіть варіант відповіді."); return; }
          state.prac1.userAnswers[id] = Number(sel.value);
          ok = Number(sel.value) === task.correct;
        } else if (task.type === "select_code") {
          const val = document.getElementById("inp_" + id).value;
          if (!val) { showFb(fb, "err", "Оберіть слово зі списку."); return; }
          state.prac1.userAnswers[id] = val;
          ok = val === task.correct;
        } else if (task.type === "matching") {
          const map = {};
          let allChosen = true;
          host.querySelectorAll(`select[data-match="${id}"]`).forEach((s) => {
            const idx = s.getAttribute("data-idx");
            if (!s.value) allChosen = false;
            map[idx] = s.value;
          });
          if (!allChosen) { showFb(fb, "err", "Встановіть відповідність для всіх пунктів."); return; }
          state.prac1.userAnswers[id] = map;
          ok = task.pairs.every((p, idx) => map[idx] === p.right);
        } else if (task.type === "sim1_steps") {
          const raw = document.getElementById("inp_" + id).value.trim();
          if (raw === "") { showFb(fb, "err", "Введіть кількість кроків."); return; }
          const num = Number(raw);
          state.prac1.userAnswers[id] = num;
          if (!state.sim1.reachedStar || state.sim1.lastSuccessSteps <= 0) {
            showFb(fb, "err", "Спочатку у Симуляторі №1 доведіть Робота до зірки ⭐ (2, 2) і натисніть «Запустити програму».");
            return;
          }
          ok = num === state.sim1.lastSuccessSteps;
        }
        if (ok) { state.prac1.solved[id] = true; saveState(); renderPractice1(); }
        else { saveState(); showFb(fb, "err", "Спробуй ще раз."); }
      };
    });
  }

  function renderPractice2() {
    const host = document.getElementById("prac2-container");
    const tasks = window.COURSE_DATA.practice2;

    host.innerHTML = tasks
      .map((t) => {
        const isSolved = Boolean(state.prac2.solved[t.id]);
        const saved = state.prac2.userAnswers[t.id];
        let body = "";
        if (t.type === "single") {
          body = t.options.map((opt, idx) => `<label class="option-label"><input type="radio" name="${t.id}" value="${idx}" ${Number(saved) === idx ? "checked" : ""} ${isSolved ? "disabled" : ""} /><span>${opt}</span></label>`).join("");
        } else if (t.type === "input_word") {
          body = `<pre class="code-block">${escapeHtml(t.codeSnippet)}</pre><input id="inp_${t.id}" class="text-input" style="max-width:260px;" type="text" placeholder="Впишіть слово" value="${saved || ""}" ${isSolved ? "disabled" : ""} />`;
        } else if (t.type === "input_number") {
          body = `<pre class="code-block">${escapeHtml(t.codeSnippet)}</pre><input id="inp_${t.id}" class="text-input" style="max-width:220px;" type="number" placeholder="Введіть число" value="${saved !== undefined ? saved : ""}" ${isSolved ? "disabled" : ""} />`;
        } else if (t.type === "sim2_selected") {
          body = `<div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;"><input id="inp_${t.id}" class="text-input" style="max-width:200px;" type="number" placeholder="Кількість кроків" value="${saved !== undefined ? saved : ""}" ${isSolved ? "disabled" : ""} /><button type="button" class="btn btn-outline" data-nav="sim2">Перейти до Симулятора №2</button></div>`;
        }
        return `<div class="card"><div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:10px;"><strong>${t.question}</strong><span style="white-space:nowrap; font-weight:700; color:${isSolved ? "#166534" : "#0d9488"};">${isSolved ? "✅ +2 / 2 бали" : "2 бали"}</span></div>${body}<div style="margin-top:10px;"><button type="button" class="btn btn-teal" data-check-p2="${t.id}" ${isSolved ? "disabled" : ""}>Перевірити завдання</button></div><div id="fb_${t.id}" class="feedback ${isSolved ? "ok" : ""}" style="${isSolved ? "" : "display:none;"}">${isSolved ? "Правильно! Зараховано 2 бали." : ""}</div></div>`;
      })
      .join("");

    host.querySelectorAll("[data-nav]").forEach((b) => { b.onclick = () => navigateTo(b.getAttribute("data-nav")); });
    host.querySelectorAll("[data-check-p2]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-check-p2");
        if (state.prac2.solved[id]) return;
        const task = tasks.find((x) => x.id === id);
        const fb = document.getElementById("fb_" + id);
        let ok = false;
        if (task.type === "single") {
          const sel = host.querySelector(`input[name="${id}"]:checked`);
          if (!sel) { showFb(fb, "err", "Оберіть варіант відповіді."); return; }
          state.prac2.userAnswers[id] = Number(sel.value);
          ok = Number(sel.value) === task.correct;
        } else if (task.type === "input_word") {
          const val = document.getElementById("inp_" + id).value.trim().toLowerCase();
          if (!val) { showFb(fb, "err", "Введіть пропущене слово."); return; }
          state.prac2.userAnswers[id] = val;
          ok = val === task.correct;
        } else if (task.type === "input_number") {
          const raw = document.getElementById("inp_" + id).value.trim();
          if (raw === "") { showFb(fb, "err", "Введіть число."); return; }
          state.prac2.userAnswers[id] = Number(raw);
          ok = Number(raw) === task.correct;
        } else if (task.type === "sim2_selected") {
          const raw = document.getElementById("inp_" + id).value.trim();
          if (raw === "") { showFb(fb, "err", "Введіть число."); return; }
          const num = Number(raw);
          state.prac2.userAnswers[id] = num;
          const activeSteps = Object.values(state.sim2.selected).filter(Boolean).length;
          ok = num === 3 && activeSteps === 3;
        }
        if (ok) { state.prac2.solved[id] = true; saveState(); renderPractice2(); }
        else { saveState(); showFb(fb, "err", "Спробуй ще раз."); }
      };
    });
  }

  function renderTest() {
    const host = document.getElementById("test-container");
    const questions = window.COURSE_DATA.finalTest;
    const allCompleted = questions.every((q) => Boolean(state.test.solved[q.id]));

    host.innerHTML = questions
      .map((q) => {
        const isSolved = Boolean(state.test.solved[q.id]);
        const saved = state.test.userAnswers[q.id];
        return `<div class="card"><div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:10px;"><div style="white-space:pre-line; font-weight:700;">${escapeHtml(q.question)}</div><span style="white-space:nowrap; font-weight:700; color:${isSolved ? "#166534" : "#1d4ed8"};">${isSolved ? "✅ +2 / 2 бали" : "2 бали"}</span></div><div>${q.options.map((opt, idx) => `<label class="option-label"><input type="radio" name="${q.id}" value="${idx}" ${Number(saved) === idx ? "checked" : ""} ${isSolved ? "disabled" : ""} /><span>${escapeHtml(opt)}</span></label>`).join("")}</div><div style="margin-top:10px;"><button type="button" class="btn btn-primary" data-check-test="${q.id}" ${isSolved ? "disabled" : ""}>Відповісти</button></div><div id="fb_${q.id}" class="feedback ${isSolved ? "ok" : ""}" style="${isSolved ? "" : "display:none;"}">${isSolved ? "Правильно!" + (allCompleted ? " " + escapeHtml(q.explanation) : "") : ""}</div></div>`;
      })
      .join("");

    host.querySelectorAll("[data-check-test]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-check-test");
        if (state.test.solved[id]) return;
        const q = questions.find((x) => x.id === id);
        const fb = document.getElementById("fb_" + id);
        const sel = host.querySelector(`input[name="${id}"]:checked`);
        if (!sel) { showFb(fb, "err", "Оберіть один із варіантів відповіді."); return; }
        const chosen = Number(sel.value);
        state.test.userAnswers[id] = chosen;
        if (chosen === q.correct) { state.test.solved[id] = true; saveState(); renderTest(); }
        else { saveState(); showFb(fb, "err", "Спробуй ще раз"); }
      };
    });
  }

  function renderReport() {
    const b = calculateTotalBreakdown();
    const fullName = `${state.student.lastName || ""} ${state.student.firstName || ""}`.trim() || "Не вказано";
    const classStr = state.student.className || "5";
    const today = new Date().toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });

    document.getElementById("rep-class-top").textContent = classStr;
    document.getElementById("rep-student-fullname").textContent = fullName;
    document.getElementById("rep-student-class").textContent = classStr;
    document.getElementById("rep-date").textContent = today;
    document.getElementById("rep-sig-student").textContent = fullName;

    let statusText = "Роботу розпочато";
    if (b.total >= 30) statusText = "Відмінно виконано";
    else if (b.total >= 20) statusText = "Виконано успішно";
    else if (b.total > 0) statusText = "Виконано частково";
    document.getElementById("rep-status").textContent = statusText;

    document.getElementById("rep-prac1").textContent = String(b.p1Score);
    document.getElementById("rep-prac2").textContent = String(b.p2Score);
    document.getElementById("rep-test").textContent = String(b.testScore);
    document.getElementById("rep-s1").textContent = String(b.s1Bonus);
    document.getElementById("rep-s2").textContent = String(b.s2Bonus);
    document.getElementById("rep-bonus").textContent = String(b.bonusTotal);
    document.getElementById("rep-total").textContent = String(b.total);
    document.getElementById("rep-total-box").textContent = String(b.total);
    document.getElementById("rep-percent").textContent = b.percent + "%";
    document.getElementById("rep-grade12").textContent = String(b.grade12);

    document.getElementById("btn-print-report").onclick = () => window.print();
    document.getElementById("btn-reset-all").onclick = () => {
      if (window.confirm("Очистити всі збережені відповіді та розпочати практикум заново?")) {
        localStorage.removeItem(STORAGE_KEY);
        state = getDefaultState();
        saveState();
        initStartAndHeader();
        navigateTo("start");
      }
    };
  }

  function showFb(el, cls, msg) {
    if (!el) return;
    el.className = "feedback " + cls;
    el.textContent = msg;
    el.style.display = "block";
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function bootstrap() {
    initStartAndHeader();
    updateHeaderAndProgress();
    if (isStudentRegistered() && state.currentPage && state.currentPage !== "start") {
      navigateTo(state.currentPage);
    } else {
      navigateTo("start");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap);
  else bootstrap();
})();
