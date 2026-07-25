/* ============================================================
   DASHBOARD PAGE LOGIC
   ============================================================ */

(function () {
  const studentInfo = JSON.parse(sessionStorage.getItem('studentInfo'));

  if (!studentInfo) {
    LetsTest.navigate('index.html');
    return;
  }

  let tests = [];

  // ── Populate Student Info ──────────────────────────────
  function populateStudentInfo() {
    document.getElementById('studentName').textContent = studentInfo.name || 'Student';
    document.getElementById('studentRoll').textContent = studentInfo.rollNumber || '—';
    document.getElementById('studentBranch').textContent = studentInfo.collegeName || 'Let\'s Test Candidate';
  }

  // ── Load and Categorize Exams ───────────────────────────
  async function loadDashboardData() {
    try {
      let examsData = null;
      const cached = sessionStorage.getItem('preloadedExams');
      const needsRefresh = sessionStorage.getItem('needsRefresh') === 'true';

      if (cached && !needsRefresh) {
        examsData = JSON.parse(cached);
      } else {
        // Fetch fresh exam list via merged login endpoint
        const loginData = await api.login({
          rollNumber: studentInfo.rollNumber,
          email: studentInfo.email
        });
        examsData = loginData.exams;
        sessionStorage.setItem('preloadedExams', JSON.stringify(examsData));
        sessionStorage.removeItem('needsRefresh');
      }

      // Map exam status
      const activeExams = [];
      const upcomingExams = [];
      const completedExams = [];
      const missedExams = [];

      (examsData.current || []).forEach(exam => {
        const item = { ...exam, status: exam.isCompleted ? 'completed' : 'live' };
        if (exam.isCompleted) completedExams.push(item);
        else activeExams.push(item);
      });

      (examsData.upcoming || []).forEach(exam => {
        const item = { ...exam, status: exam.isCompleted ? 'completed' : 'upcoming' };
        if (exam.isCompleted) completedExams.push(item);
        else upcomingExams.push(item);
      });

      (examsData.past || []).forEach(exam => {
        const item = { ...exam, status: exam.isCompleted ? 'completed' : 'missed' };
        if (exam.isCompleted) completedExams.push(item);
        else missedExams.push(item);
      });

      // Combine all exams
      tests = [...activeExams, ...upcomingExams, ...completedExams, ...missedExams];

      populateStats(activeExams, upcomingExams, completedExams, missedExams);
      renderTests('all');
      initCountdowns();

    } catch (err) {
      LetsTest.toast('Sync failed: ' + err.message, 'error');
      console.error(err);
    }
  }

  // ── Populate Stats ─────────────────────────────────────
  function populateStats(live, upcoming, completed, missed) {
    animateCount('liveCount', live.length);
    animateCount('upcomingCount', upcoming.length);
    animateCount('completedCount', completed.length);
    animateCount('missedCount', missed.length);

    // Tab counts
    document.getElementById('allTabCount').textContent = tests.length;
    document.getElementById('liveTabCount').textContent = live.length;
    document.getElementById('upcomingTabCount').textContent = upcoming.length;
    document.getElementById('completedTabCount').textContent = completed.length;
    document.getElementById('missedTabCount').textContent = missed.length;
  }

  // ── Animate counter ────────────────────────────────────
  function animateCount(id, target) {
    const el = document.getElementById(id);
    let current = 0;
    if (target === 0) {
      el.textContent = 0;
      return;
    }
    const increment = Math.ceil(target / 20);
    const interval = setInterval(() => {
      current = Math.min(current + increment, target);
      el.textContent = current;
      if (current >= target) clearInterval(interval);
    }, 50);
  }

  // ── Render Test Cards ──────────────────────────────────
  function renderTests(filter = 'all') {
    const grid = document.getElementById('testsGrid');
    const emptyState = document.getElementById('emptyState');
    const filtered = filter === 'all' ? tests : tests.filter(t => t.status === filter);

    grid.innerHTML = '';

    if (filtered.length === 0) {
      grid.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');

    filtered.forEach((test, index) => {
      const card = createTestCard(test, index);
      grid.appendChild(card);
    });
  }

  function getDuration(exam) {
    return exam.duration ? `${exam.duration} min` : '60 min';
  }

  function createTestCard(test, index) {
    const card = document.createElement('div');
    card.className = `test-card glass-card fade-in-up status-${test.status}`;
    card.style.animationDelay = `${index * 0.05}s`;

    const statusLabels = {
      live: { action: 'Start Now →', class: 'live' },
      upcoming: { action: 'Scheduled', class: 'upcoming' },
      completed: { action: 'View Result', class: 'completed' },
      missed: { action: 'Missed', class: 'missed' }
    };

    const s = statusLabels[test.status] || { action: 'Locked', class: 'missed' };

    let scoreHTML = '';
    
    if (test.status === 'completed' && test.result && test.result.totalQuestions !== undefined) {
      const colorClass = 'pass';
      scoreHTML = `
        <div class="test-card__score test-card__score--${colorClass}">
          ${test.result.totalScore} / ${test.result.totalQuestions}
        </div>
      `;
    }

    const testDate = new Date(test.startTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const durationStr = getDuration(test);
    const questionsCount = test.totalQuestions || 0;
    const totalMarks = test.totalQuestions || 0; // standard 1 mark per question

    let actionButtonHTML = `<span class="test-card__action test-card__action--${test.status}">${s.action}</span>`;
    
    // Countdown timer placeholders
    let countdownHTML = '';
    let liveCountdownHTML = '';
    if (test.status === 'upcoming') {
      countdownHTML = `<div class="upcoming-countdown-timer" data-start-time="${test.startTime}" style="font-size:0.75rem; color:var(--accent-purple); font-weight:700; margin-top:4px;">STARTS IN: --:--:--</div>`;
    } else if (test.status === 'live' && test.endTime) {
      liveCountdownHTML = `<span class="live-ends-countdown" data-end-time="${test.endTime}" style="font-size:0.78rem; font-family:var(--font-body); color:var(--accent-red); font-weight:700; text-shadow:0 0 8px rgba(255, 23, 68, 0.25);">LOGIN CLOSES IN: --:--:--</span>`;
    }

    const sectionsList = test.sections || [];
    const sectionsHTML = sectionsList.length > 0
      ? `<div class="test-card__sections-row">${sectionsList.map(sec => `<span class="test-card__section-tag">${sec}</span>`).join('')}</div>`
      : '';

    card.innerHTML = `
      <div class="test-card__accent test-card__accent--${test.status}"></div>
      <div class="test-card__body">
        <div class="test-card__header">
          <div>
            <div class="test-card__title">${test.title}</div>
            ${sectionsHTML}
            ${countdownHTML}
          </div>
          <span class="badge badge--${test.status}">
            ${test.status === 'live' ? '<span class="live-dot"></span>' : ''}
            ${test.status}
          </span>
        </div>
        <div class="test-card__details">
          <div class="test-card__detail">
            <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
            ${testDate}
          </div>
          <div class="test-card__detail">
            <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            ${durationStr}
          </div>
          <div class="test-card__detail">
            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            ${questionsCount} Questions
          </div>
          <div class="test-card__detail">
            <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            ${totalMarks} Marks
          </div>
        </div>
        ${test.status === 'live' ? `
        <div class="test-card__footer">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            ${liveCountdownHTML}
          </div>
          <span class="test-card__action test-card__action--live" style="font-weight: 800; font-size: 0.92rem; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
            START NOW
            <span style="font-family: 'Outfit', sans-serif; font-weight: 900; margin-left: 2px;">&gt;</span>
          </span>
        </div>
        ` : `
        <div class="test-card__footer">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            ${actionButtonHTML}
            ${scoreHTML}
          </div>
          <div class="test-card__arrow">
            <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
        </div>
        `}
      </div>
    `;

    // Click handler
    card.addEventListener('click', () => {
      if (test.status === 'live') {
        startExam(test._id, card);
      } else if (test.status === 'completed') {
        sessionStorage.setItem('needsRefresh', 'true');
        LetsTest.navigate(`result.html?examId=${test._id}&rollNumber=${studentInfo.rollNumber}`);
      } else if (test.status === 'upcoming') {
        const start = new Date(test.startTime);
        LetsTest.toast(`Test scheduled for ${start.toLocaleDateString()} at ${start.toLocaleTimeString()}`, 'info');
      } else {
        LetsTest.toast('This test was missed. Contact your coordinator.', 'warning');
      }
    });

    return card;
  }

  // ── Start Exam Integration ──────────────────────────────────────────
  async function startExam(examId, cardEl) {
    const actionEl = cardEl.querySelector('.test-card__action');
    if (actionEl.classList.contains('loading')) return;

    actionEl.classList.add('loading');
    actionEl.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="width:14px;height:14px;margin-right:6px;display:inline-block;vertical-align:middle;"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg> Preparing...`;

    try {
      const payload = await api.register({
        rollNumber: studentInfo.rollNumber,
        email: studentInfo.email,
        examId: examId
      });

      // Store user session (without the bulk data)
      sessionStorage.setItem('user', JSON.stringify({
        _id: payload._id,
        name: payload.name,
        rollNumber: payload.rollNumber,
        email: payload.email,
        examId: payload.examId,
        isSubmitted: payload.isSubmitted,
        startedAt: payload.startedAt,
      }));

      // Store exam details and questions separately for test.html
      sessionStorage.setItem('examDetails', JSON.stringify(payload.examDetails));
      sessionStorage.setItem('examQuestions', JSON.stringify(payload.questions));
      sessionStorage.removeItem('examQuestions_shuffled');
      sessionStorage.removeItem('examQuestions_shuffled_options');
      sessionStorage.setItem('needsRefresh', 'true');

      LetsTest.toast('Assessment loaded! Starting...', 'success');
      setTimeout(() => {
        LetsTest.navigate('test.html');
      }, 800);
    } catch (err) {
      LetsTest.toast(err.message || 'Failed to start exam', 'error');
      actionEl.classList.remove('loading');
      if (actionEl.classList.contains('test-card__action--live')) {
        actionEl.innerHTML = 'START NOW <span style="font-family: \'Outfit\', sans-serif; font-weight: 900; margin-left: 2px;">&gt;</span>';
      } else {
        actionEl.textContent = s.action;
      }
    }
  }

  // ── Tab Switching ──────────────────────────────────────
  document.getElementById('testTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.tab;
    renderTests(filter);
  });

  // ── Logout ─────────────────────────────────────────────
  document.getElementById('logoutBtn').addEventListener('click', () => {
    LetsTest.openModal('logoutModal');
  });

  document.getElementById('cancelLogout').addEventListener('click', () => {
    LetsTest.closeModal('logoutModal');
  });

  document.getElementById('confirmLogout').addEventListener('click', () => {
    sessionStorage.clear();
    LetsTest.toast('Logged out successfully', 'success');
    setTimeout(() => LetsTest.navigate('index.html'), 500);
  });



  // ── Student Analysis Modal & Charts ───────────────────────────────────
  let saRadarChartInst = null;
  let saTrendChartInst = null;

  async function openStudentAnalysis() {
    LetsTest.openModal('studentAnalysisModal');
    
    // Reset state
    const content = document.getElementById('saContent');
    content.classList.add('hidden');
    content.classList.remove('active');
    document.getElementById('saLoader').classList.remove('hidden');
    document.getElementById('saNoRadarData').classList.add('hidden');
    document.getElementById('saNoTrendData').classList.add('hidden');

    try {
      const data = await api.getAggregatedAnalysis(studentInfo.rollNumber, studentInfo.collegeId);
      
      // Populate Header
      document.getElementById('saName').textContent = studentInfo.name;
      document.getElementById('saRoll').textContent = studentInfo.rollNumber;
      const saCollegeEl = document.getElementById('saCollege');
      if (saCollegeEl) saCollegeEl.textContent = studentInfo.collegeName || 'COLLEGE';

      // Populate Top Metrics
      document.getElementById('saGPA').textContent = `${data.metrics.gpa}%`;
      document.getElementById('saPrecision').textContent = `${data.metrics.precision}%`;
      document.getElementById('saParticipation').textContent = `${data.metrics.participation}%`;
      document.getElementById('saTestsTaken').textContent = `${data.metrics.testsTaken}/${data.metrics.testsAssigned}`;
      
      // Find Mastery
      let bestSec = 'N/A';
      let bestScore = -1;
      Object.entries(data.radarData).forEach(([sec, score]) => {
        if (score > bestScore) { bestScore = score; bestSec = sec; }
      });
      document.getElementById('saMastery').textContent = bestScore > 0 ? bestSec : 'N/A';

      // Render Charts
      renderSARadarChart(data.radarData);
      renderSATrendChart(data.trendData);

      // Show Content
      setTimeout(() => {
        document.getElementById('saLoader').classList.add('hidden');
        content.classList.remove('hidden');
        setTimeout(() => content.classList.add('active'), 50);
        if (window.lucide) lucide.createIcons();
      }, 500);

    } catch (err) {
      LetsTest.toast(err.message || 'Failed to fetch analysis', 'error');
      closeStudentAnalysis();
    }
  }

  function closeStudentAnalysis() {
    LetsTest.closeModal('studentAnalysisModal');
  }

  // Bind modal buttons
  document.getElementById('analysisBtn').addEventListener('click', openStudentAnalysis);
  document.getElementById('closeAnalysisBtn').addEventListener('click', closeStudentAnalysis);

  function renderSARadarChart(radarData) {
    const ctx = document.getElementById('saRadarChart').getContext('2d');
    if (saRadarChartInst) saRadarChartInst.destroy();

    const labels = Object.keys(radarData);
    const data = Object.values(radarData);

    if (labels.length === 0) {
      document.getElementById('saNoRadarData').classList.remove('hidden');
      return;
    }

    saRadarChartInst = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels.map(l => l.length > 15 ? l.substring(0, 15) + '...' : l),
        datasets: [{
          label: 'Mastery Level (%)',
          data: data,
          backgroundColor: 'rgba(0, 229, 255, 0.15)',
          borderColor: 'rgba(0, 229, 255, 1)',
          pointBackgroundColor: 'rgba(0, 229, 255, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(0, 229, 255, 1)',
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            pointLabels: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10, family: 'Orbitron', weight: 'bold' } },
            ticks: { display: false },
            min: 0,
            max: 100
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderSATrendChart(trendData) {
    const ctx = document.getElementById('saTrendChart').getContext('2d');
    if (saTrendChartInst) saTrendChartInst.destroy();

    if (trendData.length === 0) {
      document.getElementById('saNoTrendData').classList.remove('hidden');
      return;
    }

    const labels = trendData.map(t => new Date(t.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}));
    const data = trendData.map(t => t.scorePct);

    saTrendChartInst = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Exam Score (%)',
          data: data,
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00ff88',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10, family: 'Orbitron', weight: 'bold' } } },
          y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10, family: 'Orbitron', weight: 'bold' } } }
        },
        plugins: {
          legend: { display: false },
          tooltip: { 
            callbacks: { title: (context) => trendData[context[0].dataIndex].examName },
            backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 12, weight: 'bold' }, padding: 12, cornerRadius: 8 
          }
        }
      }
    });
  }

  // ── Countdowns ──────────────────────────────────
  let countdownTimerInterval = null;

  function initCountdowns() {
    if (countdownTimerInterval) clearInterval(countdownTimerInterval);

    function update() {
      const upcomingElements = document.querySelectorAll('.upcoming-countdown-timer');
      const liveElements = document.querySelectorAll('.live-ends-countdown');
      
      if (!upcomingElements.length && !liveElements.length) {
        clearInterval(countdownTimerInterval);
        countdownTimerInterval = null;
        return;
      }

      let refreshNeeded = false;
      const now = Date.now();

      // Update upcoming countdowns
      upcomingElements.forEach(el => {
        const startTime = new Date(el.getAttribute('data-start-time')).getTime();
        const diff = startTime - now;

        if (diff <= 0) {
          el.innerHTML = 'STARTS NOW';
          refreshNeeded = true;
        } else {
          const hrs = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          
          const pad = (n) => String(n).padStart(2, '0');
          el.innerHTML = `STARTS IN: ${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
        }
      });

      // Update live countdowns
      liveElements.forEach(el => {
        const endTimeStr = el.getAttribute('data-end-time');
        if (!endTimeStr || endTimeStr === 'null') {
          el.innerHTML = 'NO DEADLINE';
          return;
        }
        const endTime = new Date(endTimeStr).getTime();
        const diff = endTime - now;

        if (diff <= 0) {
          el.innerHTML = 'LOGIN CLOSED';
          refreshNeeded = true;
        } else {
          const hrs = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          
          const pad = (n) => String(n).padStart(2, '0');
          el.innerHTML = `LOGIN CLOSES IN: ${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
        }
      });

      if (refreshNeeded) {
        clearInterval(countdownTimerInterval);
        countdownTimerInterval = null;
        sessionStorage.setItem('needsRefresh', 'true');
        loadDashboardData();
      }
    }

    update();
    countdownTimerInterval = setInterval(update, 1000);
  }

  // ── Init ───────────────────────────────────────────────
  populateStudentInfo();
  loadDashboardData();
})();
