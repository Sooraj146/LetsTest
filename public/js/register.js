/**
 * register.js — Dashboard & Login Logic (v2 — Cyan Theme)
 */

// ── State ─────────────────────────────────────────────────────────────
let studentInfo = JSON.parse(sessionStorage.getItem('studentInfo')) || null;

// ── Elements ──────────────────────────────────────────────────────────
const loginPanel     = document.getElementById('loginPanel');
const dashboardPanel = document.getElementById('dashboardPanel');
const detailsForm    = document.getElementById('detailsForm');
const loginError     = document.getElementById('loginError');
const continueBtn    = document.getElementById('continueBtn');

// ── Bootstrap ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (studentInfo) {
        showDashboard();
    } else {
        loginPanel.style.display = '';
    }
    if (window.lucide) lucide.createIcons();
});

// ── Toast ─────────────────────────────────────────────────────────────
function notify(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const icons = {
        success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;
    toast.innerHTML = `${icons[type]}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-14px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ── Auth ──────────────────────────────────────────────────────────────
detailsForm.onsubmit = async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';

    const rollNumber = e.target.rollNumber.value.trim();
    const email      = e.target.email.value.trim();

    if (!email.includes('@')) {
        showError('Institutional email required.');
        return;
    }

    continueBtn.disabled = true;
    const btnText = document.getElementById('continueBtnText');
    const btnIcon = document.getElementById('continueBtnIcon');
    btnText.textContent = 'Verifying...';
    btnIcon.outerHTML = `<svg id="continueBtnIcon" class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;

    try {
        // REQUEST 1: Single merged login call — returns student info + all exams
        const loginData = await api.login({ rollNumber, email });

        studentInfo = {
            name:        loginData.student.name,
            rollNumber:  loginData.student.rollNumber,
            email:       email.toLowerCase(),
            collegeId:   loginData.student.collegeId,
            collegeName: loginData.student.collegeName
        };

        sessionStorage.setItem('studentInfo', JSON.stringify(studentInfo));
        // Pass pre-fetched exam data directly — no more separate API calls
        await showDashboard(loginData.exams);
    } catch (err) {
        showError(err.message);
        continueBtn.disabled = false;
        document.getElementById('continueBtnText').textContent = 'Access Dashboard';
        const iconEl = document.getElementById('continueBtnIcon');
        if (iconEl) iconEl.outerHTML = `<svg id="continueBtnIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
    }
};

function showError(msg) {
    loginError.textContent = msg;
    loginError.style.display = '';
}

function logout() {
    sessionStorage.clear();
    window.location.reload();
}

// ── Dashboard ─────────────────────────────────────────────────────────
// preloadedExams: passed in after login to avoid re-fetching.
// When session-restoring (page refresh), we re-fetch via api.login().
async function showDashboard(preloadedExams = null) {
    loginPanel.style.display = 'none';
    dashboardPanel.style.display = '';

    if (!studentInfo) return;

    // Populate header
    const nameEl = document.getElementById('studentName');
    if (nameEl) nameEl.textContent = studentInfo.name || 'Student';

    const cidEl = document.getElementById('studentCandidateId');
    if (cidEl) {
        cidEl.textContent = `ROLL NO: ${(studentInfo.rollNumber || '—').toString().toUpperCase()}`;
    }

    // Avatar initials
    const avatarEl = document.getElementById('avatarEl');
    if (avatarEl) {
        const parts = (studentInfo.name || 'S').split(' ');
        avatarEl.textContent = parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
    }

    await loadExams(preloadedExams);
}

// preloadedExams: already-fetched data from login response (avoids extra API calls).
// If null (session restore / dashboard refresh), fetches via api.login() instead.
async function loadExams(preloadedExams = null) {
    const listCurrent  = document.getElementById('listCurrent');
    const listUpcoming = document.getElementById('listUpcoming');
    const listPast     = document.getElementById('listPast');
    const listExpired  = document.getElementById('listExpired');
    const emptyState   = document.getElementById('examEmpty');

    listCurrent.innerHTML = '';
    listUpcoming.innerHTML = '';
    listPast.innerHTML = '';
    if (listExpired) listExpired.innerHTML = '';

    try {
        let examsData;
        if (preloadedExams) {
            // Data already available from the login response — no extra request
            examsData = preloadedExams;
        } else {
            // Session restore (page refresh): re-run merged login to get fresh data
            const loginData = await api.login({
                rollNumber: studentInfo.rollNumber,
                email:      studentInfo.email
            });
            examsData = loginData.exams;
        }

        const hasExams = (examsData.current?.length || 0)
                       + (examsData.upcoming?.length || 0)
                       + (examsData.past?.length || 0) > 0;

        if (!hasExams) {
            emptyState.style.display = '';
            return;
        }
        emptyState.style.display = 'none';

        // Each exam now carries isCompleted + result from the server
        const activeExams   = [];
        const upcomingExams = [];
        const completedExams = [];
        const missedExams    = [];

        (examsData.current || []).forEach(exam => {
            if (exam.isCompleted) completedExams.push(exam);
            else activeExams.push(exam);
        });

        (examsData.upcoming || []).forEach(exam => {
            if (exam.isCompleted) completedExams.push(exam);
            else upcomingExams.push(exam);
        });

        (examsData.past || []).forEach(exam => {
            if (exam.isCompleted) completedExams.push(exam);
            else missedExams.push(exam);
        });

        // Build a results map compatible with existing render functions
        const myResults = {};
        [...completedExams].forEach(exam => {
            if (exam.result) myResults[exam._id] = exam.result;
        });

        renderActiveTests(activeExams, listCurrent, myResults);
        renderUpcomingTests(upcomingExams, listUpcoming);
        renderHistoryList(completedExams, listPast, myResults);
        if (listExpired) renderExpiredList(missedExams, listExpired);

        toggle('sectionCurrent',  activeExams.length > 0);
        toggle('sectionUpcoming', upcomingExams.length > 0);
        toggle('sectionPast',     completedExams.length > 0);
        toggle('sectionExpired',  missedExams.length > 0);

        initUpcomingCountdowns();
    } catch (err) {
        notify('Assessment sync failed. Please refresh.', 'error');
        console.error('Sync Error:', err);
    }
}

function toggle(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
}

// ── Render: Active Tests (Sea Blue) ───────────────────────────────────
function renderActiveTests(exams, container) {
    if (!exams.length) return;
    container.innerHTML = exams.map(exam => {
        const sections = exam.sections && exam.sections.length ? exam.sections : ['ASSESSMENT'];
        return `
        <div class="exam-card status-live">
            <div>
                <h4 class="exam-card-title">${esc(exam.title)}</h4>
                <div style="font-size:0.8rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.1em;">
                    LIVE ASSESSMENT · ${getDuration(exam)} MIN · ${exam.totalQuestions || 0} MARKS
                </div>
                <div class="card-sections-list">
                    ${sections.map(s => `<span class="section-pill">${esc(s)}</span>`).join('')}
                </div>
            </div>
            <div style="margin-top:24px;">
                <button onclick="startExam(event, '${exam._id}')" class="btn btn-cyan" style="width:100%; padding:14px; font-size:0.9rem; letter-spacing:0.1em;">
                    START ASSESSMENT
                </button>
            </div>
        </div>`;
    }).join('');
}

// ── Render: Upcoming Tests (Violet) ────────────────────────────────────
function renderUpcomingTests(exams, container) {
    if (!exams.length) return;
    container.innerHTML = exams.map(exam => {
        const start = new Date(exam.startTime);
        const now = new Date();
        const diffMs = start - now;
        const diffHrs = Math.max(0, Math.floor(diffMs / 3600000));
        const sections = exam.sections && exam.sections.length ? exam.sections : ['ASSESSMENT'];

        let timerHtml = '';
        if (diffMs <= 24 * 3600 * 1000) {
            timerHtml = `<div class="upcoming-countdown" data-start-time="${exam.startTime}" data-exam-id="${exam._id}" style="font-size:0.8rem; color:var(--purple); font-weight:800; text-transform:uppercase; letter-spacing:0.1em; display:flex; align-items:center; gap:6px;">STARTS IN: --:--:--</div>`;
        } else {
            timerHtml = `<div style="font-size:0.8rem; color:var(--purple); font-weight:800; text-transform:uppercase; letter-spacing:0.1em;">STARTS IN ${diffHrs} HOURS</div>`;
        }

        return `
        <div class="exam-card status-upcoming" style="min-height:220px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h4 class="exam-card-title">${esc(exam.title)}</h4>
                    ${timerHtml}
                </div>
                <div style="text-align:right;">
                    <div style="font-size:1.4rem; font-weight:900; color:#fff; line-height:1;">${start.getDate()}</div>
                    <div style="font-size:0.7rem; font-weight:800; color:var(--purple); text-transform:uppercase;">${start.toLocaleString('default',{month:'short'})}</div>
                </div>
            </div>

            <div class="card-sections-list">
                ${sections.map(s => `<span class="section-pill">${esc(s)}</span>`).join('')}
            </div>

            <div style="margin-top:24px;">
                <button disabled class="btn btn-ghost" style="width:100%; opacity:0.5; font-size:0.9rem; letter-spacing:0.05em;">LOCKED</button>
            </div>
        </div>`;
    }).join('');
}

// ── Render: History (Green) ────────────────────────────────────────────
function renderHistoryList(exams, container, myResults) {
    if (!exams.length) return;
    container.innerHTML = exams.map(exam => {
        const result = myResults && myResults[exam._id];
        const score = result && result.totalScore !== undefined ? result.totalScore : '—';
        const total = result && result.totalQuestions !== undefined ? result.totalQuestions : (exam.totalQuestions !== undefined ? exam.totalQuestions : '?');
        const sections = exam.sections && exam.sections.length ? exam.sections : extractTags(exam.title);

        return `
        <div class="exam-card status-attended" style="min-height:220px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h4 class="exam-card-title" style="color:var(--green);">${esc(exam.title)}</h4>
                    <div style="font-size:0.8rem; color:var(--green); font-weight:800; text-transform:uppercase; letter-spacing:0.15em;">
                        COMPLETED · SCORE: ${score}/${total}
                    </div>
                </div>
                <div style="background:var(--green-dim); padding:4px 10px; border-radius:6px; border:1px solid rgba(0,255,136,0.3);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
            </div>

            <div class="card-sections-list">
                ${sections.map(s => `<span class="section-pill">${esc(s)}</span>`).join('')}
            </div>

            <div style="margin-top:24px;">
                <a href="result.html?examId=${exam._id}&rollNumber=${studentInfo.rollNumber}" class="btn btn-transparent" style="width:100%; font-size:0.85rem; border-color:var(--green); color:var(--green); border-width:2px; text-decoration:none; display:inline-flex;">
                    VIEW DETAILED ANALYSIS
                </a>
            </div>
        </div>`;
    }).join('');
}

// ── Render: Expired (Red) ──────────────────────────────────────────────
function renderExpiredList(exams, container) {
    if (!exams.length) return;
    container.innerHTML = exams.map(exam => `
        <div class="expired-card status-unattended">
            <h4 style="font-size:1.1rem; font-weight:800; color:var(--red); margin-bottom:8px; text-transform:uppercase;">${esc(exam.title)}</h4>
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.1em;">
                MISSED · DEADLINE: ${new Date(exam.endTime).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}
            </div>
            <div style="margin-top:16px;">
                <span class="pill pill-red" style="font-size:0.6rem; padding:4px 12px; border-width:2px;">UNATTENDED</span>
            </div>
        </div>`).join('');
}

// ── Exam Start ─────────────────────────────────────────────────────────
// REQUEST 2: Single merged register call — returns user + examDetails + questions.
// Stores everything in sessionStorage so test.html needs 0 extra API calls.
async function startExam(e, examId) {
    const btn = e.currentTarget;
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> PREPARING...`;

    try {
        const payload = await api.register({
            rollNumber: studentInfo.rollNumber,
            email:      studentInfo.email,
            examId:     examId
        });

        // Store user session (without the bulk data)
        sessionStorage.setItem('user', JSON.stringify({
            _id:        payload._id,
            name:       payload.name,
            rollNumber: payload.rollNumber,
            email:      payload.email,
            examId:     payload.examId,
            isSubmitted: payload.isSubmitted,
        }));

        // Store exam details and questions separately for test.html
        sessionStorage.setItem('examDetails', JSON.stringify(payload.examDetails));
        sessionStorage.setItem('examQuestions', JSON.stringify(payload.questions));

        window.location.href = '/test.html';
    } catch (err) {
        notify(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

// ── Helpers ────────────────────────────────────────────────────────────
function extractTags(title) {
    const words = ['QUANTITATIVE', 'LOGICAL', 'VERBAL', 'ANALYTICAL', 'DSA', 'CODING', 'APTITUDE', 'REASONING', 'ENGLISH', 'MATH', 'GENERAL'];
    const found = words.filter(w => title.toUpperCase().includes(w));
    return found.length ? found.slice(0, 3) : ['ASSESSMENT'];
}

function getDuration(exam) {
    if (!exam.startTime || !exam.endTime) return '—';
    const diff = Math.round((new Date(exam.endTime) - new Date(exam.startTime)) / 60000);
    return diff > 0 ? diff : '—';
}

function esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Student Analysis Modal & Charts ───────────────────────────────────
let saRadarChartInst = null;
let saTrendChartInst = null;

async function openStudentAnalysis() {
    if (!studentInfo) return;
    
    document.getElementById('studentAnalysisModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
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
        document.getElementById('saCollege').textContent = studentInfo.collegeName || 'COLLEGE';

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
        notify(err.message, 'error');
        closeStudentAnalysis();
    }
}

function closeStudentAnalysis() {
    document.getElementById('studentAnalysisModal').classList.remove('active');
    document.body.style.overflow = '';
}

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
                backgroundColor: 'rgba(0, 242, 255, 0.15)',
                borderColor: 'rgba(0, 242, 255, 1)',
                pointBackgroundColor: 'rgba(0, 242, 255, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(0, 242, 255, 1)',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
                    grid: { color: 'rgba(255, 255, 255, 0.08)' },
                    pointLabels: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10, family: 'Outfit', weight: 'bold' } },
                    ticks: { display: false }
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
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10, family: 'Outfit', weight: 'bold' } } },
                y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10, family: 'Outfit', weight: 'bold' } } }
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

let upcomingTimerInterval = null;

function initUpcomingCountdowns() {
    if (upcomingTimerInterval) clearInterval(upcomingTimerInterval);

    function update() {
        const elements = document.querySelectorAll('.upcoming-countdown');
        if (!elements.length) {
            clearInterval(upcomingTimerInterval);
            upcomingTimerInterval = null;
            return;
        }

        let refreshNeeded = false;
        const now = Date.now();

        elements.forEach(el => {
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
                el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:2px;display:inline-block;vertical-align:middle;" class="blink"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> STARTS IN: ${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
            }
        });

        if (refreshNeeded) {
            clearInterval(upcomingTimerInterval);
            upcomingTimerInterval = null;
            loadExams();
        }
    }

    update();
    upcomingTimerInterval = setInterval(update, 1000);
}

