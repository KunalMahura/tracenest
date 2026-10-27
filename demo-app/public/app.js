// Apex Institute of Technology — College Results Demo Application

document.addEventListener('DOMContentLoaded', () => {
  // ── Tab Switching ──
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
        if (targetId === 'rankingsTab' && !rankingsLoaded) loadRankings();
        if (targetId === 'subjectsTab' && !subjectsLoaded) loadSubjects();
      }
    });
  });

  // ── Search & Student Result ──
  const searchForm = document.getElementById('searchForm');
  const studentIdInput = document.getElementById('studentIdInput');
  const resultContainer = document.getElementById('resultContainer');
  const btnRandom = document.getElementById('btnRandom');
  const searchSpinner = document.getElementById('searchSpinner');
  const btnText = document.querySelector('#btnSearch .btn-text');

  let rankingsLoaded = false;
  let subjectsLoaded = false;

  async function fetchStudentResult(studentId) {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(`/results/${studentId}`);
      const duration = Math.round(performance.now() - start);
      const data = await res.json();

      if (!res.ok) {
        renderError(res.status, data.error || 'Failed to retrieve records', duration);
        logConsole(`GET /results/${studentId} [HTTP ${res.status}] (${duration}ms)\n${JSON.stringify(data, null, 2)}`);
        return;
      }

      renderScorecard(data, duration);
      logConsole(`GET /results/${studentId} [HTTP ${res.status} OK] (${duration}ms)\nStudent: ${data.student.name} | CGPA: ${data.student.cgpa}`);
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      renderError(500, err.message, duration);
      logConsole(`GET /results/${studentId} [Network Error] (${duration}ms): ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    if (isLoading) {
      searchSpinner.style.display = 'inline-block';
      btnText.textContent = 'Searching...';
    } else {
      searchSpinner.style.display = 'none';
      btnText.textContent = 'View Result';
    }
  }

  function getGradeClass(grade) {
    if (!grade) return '';
    const clean = grade.replace('+', 'plus');
    return `stat-grade-${clean}`;
  }

  function renderScorecard(data, latency) {
    const { student, results } = data;
    const gradeClass = getGradeClass(student.grade);

    const totalMarks = results.reduce((acc, curr) => acc + curr.marks, 0);
    const avgMarks = Math.round(totalMarks / results.length);

    const rowsHtml = results.map((sub) => `
      <tr>
        <td class="subject-code">${sub.code}</td>
        <td class="subject-title">${sub.name}</td>
        <td>${sub.credits} Credits</td>
        <td>
          <div class="marks-bar-wrapper">
            <span style="min-width: 30px; font-weight: 600;">${sub.marks}</span>
            <div class="marks-bar">
              <div class="marks-fill" style="width: ${sub.marks}%"></div>
            </div>
          </div>
        </td>
        <td>
          <span class="grade-badge ${sub.marks >= 50 ? 'stat-grade-Aplus' : 'stat-grade-F'}">
            ${sub.grade || student.grade}
          </span>
        </td>
      </tr>
    `).join('');

    resultContainer.innerHTML = `
      <div class="scorecard-card">
        <div class="scorecard-header">
          <div class="student-meta">
            <div class="student-avatar">${student.name.charAt(0)}${student.id.toString().slice(-1)}</div>
            <div>
              <div class="student-name">${student.name}</div>
              <div class="student-roll">Roll No: <strong>${student.roll}</strong> • Student ID: <strong>#${student.id}</strong></div>
            </div>
          </div>

          <div class="scorecard-stats">
            <div class="stat-pill">
              <div class="stat-pill-label">Cumulative GPA</div>
              <div class="stat-pill-val stat-cgpa">${student.cgpa.toFixed(2)}</div>
            </div>
            <div class="stat-pill">
              <div class="stat-pill-label">Grade Category</div>
              <div class="stat-pill-val ${gradeClass}">${student.grade}</div>
            </div>
            <div class="stat-pill">
              <div class="stat-pill-label">Trace Duration</div>
              <div class="latency-indicator">⏱️ ${latency}ms</div>
            </div>
          </div>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Course Name</th>
                <th>Credits</th>
                <th>Score (out of 100)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderError(statusCode, message, latency) {
    resultContainer.innerHTML = `
      <div class="error-banner">
        <h3>HTTP ${statusCode} ${statusCode === 404 ? 'Record Not Found' : 'Server Execution Error'}</h3>
        <p>${message}</p>
        <div style="margin-top: 10px;">
          <span class="latency-indicator">Response Time: ${latency}ms • Logged to TraceNest</span>
        </div>
      </div>
    `;
  }

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseInt(studentIdInput.value.trim(), 10);
    if (id) fetchStudentResult(id);
  });

  btnRandom.addEventListener('click', () => {
    const randomId = Math.floor(Math.random() * (1200 - 1001 + 1)) + 1001;
    studentIdInput.value = randomId;
    fetchStudentResult(randomId);
  });

  // Chip clicks
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const id = chip.getAttribute('data-id');
      studentIdInput.value = id;
      fetchStudentResult(id);
    });
  });

  // ── Rankings Tab ──
  const rankingsContainer = document.getElementById('rankingsTableContainer');
  const rankingsLoading = document.getElementById('rankingsLoading');
  const btnRefreshRankings = document.getElementById('btnRefreshRankings');

  async function loadRankings() {
    rankingsLoading.style.display = 'block';
    rankingsContainer.innerHTML = '';
    const start = performance.now();
    try {
      const res = await fetch('/rankings');
      const duration = Math.round(performance.now() - start);
      const data = await res.json();
      rankingsLoaded = true;

      if (!res.ok) {
        rankingsContainer.innerHTML = `<div class="error-banner"><h3>Error ${res.status}</h3><p>${data.error}</p></div>`;
        return;
      }

      const rows = data.rankings.map((st, idx) => {
        let rankBadge = `#${idx + 1}`;
        if (idx === 0) rankBadge = '🥇 Gold (1st)';
        else if (idx === 1) rankBadge = '🥈 Silver (2nd)';
        else if (idx === 2) rankBadge = '🥉 Bronze (3rd)';

        return `
          <tr style="cursor: pointer;" title="Click to view scorecard" onclick="selectStudent(${st.id})">
            <td style="font-weight: 700;">${rankBadge}</td>
            <td style="font-weight: 600; color: #fff;">${st.name}</td>
            <td style="font-family: 'JetBrains Mono', monospace;">${st.roll}</td>
            <td style="font-weight: 700; color: #38bdf8;">${st.cgpa.toFixed(2)}</td>
            <td><span class="grade-badge ${getGradeClass(st.grade)}">${st.grade}</span></td>
            <td><button class="chip">Inspect &rarr;</button></td>
          </tr>
        `;
      }).join('');

      rankingsContainer.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student Name</th>
              <th>Roll Number</th>
              <th>CGPA</th>
              <th>Grade</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
      logConsole(`GET /rankings [HTTP 200 OK] (${duration}ms) — Loaded Top ${data.rankings.length} students`);
    } catch (err) {
      rankingsContainer.innerHTML = `<div class="error-banner"><p>Failed to load rankings: ${err.message}</p></div>`;
    } finally {
      rankingsLoading.style.display = 'none';
    }
  }

  btnRefreshRankings.addEventListener('click', loadRankings);

  window.selectStudent = (id) => {
    studentIdInput.value = id;
    document.querySelector('[data-tab="searchTab"]').click();
    fetchStudentResult(id);
  };

  // ── Subjects Tab ──
  const subjectsGrid = document.getElementById('subjectsGrid');
  const subjectsLoading = document.getElementById('subjectsLoading');
  const btnRefreshSubjects = document.getElementById('btnRefreshSubjects');

  async function loadSubjects() {
    subjectsLoading.style.display = 'block';
    subjectsGrid.innerHTML = '';
    const start = performance.now();
    try {
      const res = await fetch('/subjects');
      const duration = Math.round(performance.now() - start);
      const data = await res.json();
      subjectsLoaded = true;

      subjectsGrid.innerHTML = data.subjects.map((sub) => `
        <div class="subject-item">
          <div class="sub-code">${sub.code}</div>
          <div class="sub-name">${sub.name}</div>
          <div class="sub-credits">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 14 14"></polyline>
            </svg>
            ${sub.credits} Academic Credits
          </div>
        </div>
      `).join('');

      logConsole(`GET /subjects [HTTP 200 OK] (${duration}ms) — ${data.subjects.length} courses loaded`);
    } catch (err) {
      subjectsGrid.innerHTML = `<div class="error-banner"><p>${err.message}</p></div>`;
    } finally {
      subjectsLoading.style.display = 'none';
    }
  }

  btnRefreshSubjects.addEventListener('click', loadSubjects);

  // ── Telemetry Simulator Lab ──
  const consoleOutput = document.getElementById('consoleOutput');
  const btnClearConsole = document.getElementById('btnClearConsole');

  function logConsole(msg) {
    const timestamp = new Date().toLocaleTimeString();
    consoleOutput.textContent = `[${timestamp}] ${msg}\n\n` + consoleOutput.textContent;
  }

  btnClearConsole.addEventListener('click', () => {
    consoleOutput.textContent = '// Console cleared.';
  });

  document.getElementById('btnTriggerFast').addEventListener('click', async () => {
    const start = performance.now();
    const res = await fetch('/subjects');
    const ms = Math.round(performance.now() - start);
    const json = await res.json();
    logConsole(`⚡ FAST REQUEST: GET /subjects -> HTTP ${res.status} (${ms}ms)\n${JSON.stringify(json, null, 2)}`);
  });

  document.getElementById('btnTriggerSlow').addEventListener('click', async () => {
    logConsole('🐢 Executing heavy query against /rankings (please wait)...');
    const start = performance.now();
    const res = await fetch('/rankings');
    const ms = Math.round(performance.now() - start);
    const json = await res.json();
    logConsole(`🐢 SLOW QUERY COMPLETED: GET /rankings -> HTTP ${res.status} (${ms}ms) (Trace recorded in TraceNest)`);
  });

  document.getElementById('btnTriggerError').addEventListener('click', async () => {
    const start = performance.now();
    const res = await fetch('/results/9009');
    const ms = Math.round(performance.now() - start);
    const json = await res.json();
    logConsole(`💥 ERROR SCENARIO: GET /results/9009 -> HTTP ${res.status} (${ms}ms)\n${JSON.stringify(json, null, 2)}`);
  });

  document.getElementById('btnTriggerAdmin').addEventListener('click', async () => {
    const start = performance.now();
    const res = await fetch('/admin/report');
    const ms = Math.round(performance.now() - start);
    const json = await res.json();
    logConsole(`🔒 ACCESS CONTROL PROBE: GET /admin/report -> HTTP ${res.status} Forbidden (${ms}ms)\n${JSON.stringify(json, null, 2)}`);
  });

  document.getElementById('btnTriggerBurst').addEventListener('click', async () => {
    logConsole('🚀 Firing concurrent 10-request burst to TraceNest ingestion...');
    const endpoints = ['/subjects', '/results/1010', '/results/1025', '/results/1040', '/rankings', '/results/9001', '/results/1080', '/subjects', '/results/1002', '/admin/report'];
    
    const promises = endpoints.map(async (ep, i) => {
      const s = performance.now();
      try {
        const r = await fetch(ep);
        const ms = Math.round(performance.now() - s);
        return `#${i + 1} ${ep} -> HTTP ${r.status} (${ms}ms)`;
      } catch (e) {
        return `#${i + 1} ${ep} -> Failed: ${e.message}`;
      }
    });

    const results = await Promise.all(promises);
    logConsole(`🚀 BURST RESULTS (10 concurrent requests):\n` + results.join('\n'));
  });

  // ── Initial load: fetch default student 1042 ──
  fetchStudentResult(1042);
});
