/**
 * register.js — Exam dashboard logic
 *
 * Flow:
 *  1. Student fills details form → clicks "View Available Exams"
 *  2. Validate fields client-side
 *  3. Fetch /api/exams → filter by email domain → fetch /api/users/my-exams
 *  4. Render exam cards: Active / Upcoming / Completed / Not Available
 *  5. "Take Exam" → open confirm modal → POST /api/users/register → redirect to test.html
 *  6. "View Result" → redirect to result.html?examId=xxx
 */

// ── State ────────────────────────────────────────────────────────────
let studentInfo    = null;  // { name, rollNumber, email }
let pendingExamId  = null;  // examId waiting for confirm-start
let timers         = {};    // examId -> intervalId (for countdown cleanup)

// ── Elements ─────────────────────────────────────────────────────────
const detailsPanel = document.getElementById('detailsPanel');
const examPanel    = document.getElementById('examPanel');
const detailsForm  = document.getElementById('detailsForm');
const detailsError = document.getElementById('detailsError');
const continueBtn  = document.getElementById('continueBtn');

// ── On load: restore session if present ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const saved = sessionStorage.getItem('studentInfo');
    if (saved) {
        studentInfo = JSON.parse(saved);
        // Pre-fill form
        document.getElementById('name').value       = studentInfo.name;
        document.getElementById('rollNumber').value = studentInfo.rollNumber;
        document.getElementById('email').value      = studentInfo.email;
        showExamDashboard();
    }
});

// ── Details form submit ───────────────────────────────────────────────
let nameFetchTimeout = null;
async function fetchNameByRoll(rollNumber) {
    const email = document.getElementById('email').value.trim();
    if (!rollNumber || !email || !email.includes('@')) {
        document.getElementById('name').value = '';
        return;
    }

    clearTimeout(nameFetchTimeout);
    nameFetchTimeout = setTimeout(async () => {
        const nameInput = document.getElementById('name');
        const loading = document.getElementById('nameLoading');
        const errEl = document.getElementById('detailsError');

        loading.classList.remove('hidden');
        hideError(errEl);

        try {
            // First, get all colleges to find the one matching this domain
            const collegesRes = await fetch('/api/admin/colleges'); // Note: This might need a public endpoint or we just try lookup
            // Actually, let's just let the backend handle the college lookup by domain in a single call if possible
            // But since I already changed getStudentByRoll to take collegeId, I need to find the college first.
            // Let's assume there's a public /api/colleges/lookup?domain=...
            
            const domain = '@' + email.split('@')[1];
            const student = await api.getStudentName(rollNumber, domain); // Update api helper to take domain
            nameInput.value = student.name;
            studentInfo = { ...studentInfo, collegeId: student.collegeId };
        } catch (err) {
            nameInput.value = '';
            showError(errEl, err.message);
        } finally {
            loading.classList.add('hidden');
        }
    }, 500);
}

// Also trigger name fetch when email changes
document.getElementById('email')?.addEventListener('input', () => {
    const roll = document.getElementById('rollNumber').value;
    if (roll) fetchNameByRoll(roll);
});

detailsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(detailsError);

    const name       = document.getElementById('name').value.trim();
    const rollNumber = document.getElementById('rollNumber').value.trim();
    const email      = document.getElementById('email').value.trim();

    if (!name || !email || !email.includes('@')) {
        return showError(detailsError, 'Please enter roll number and valid college email.');
    }

    const emailLower = email.toLowerCase();

    // Loading state
    continueBtn.disabled = true;
    continueBtn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Loading...`;

    // studentInfo already has collegeId from fetchNameByRoll
    studentInfo = { ...studentInfo, name, rollNumber, email: emailLower };
    sessionStorage.setItem('studentInfo', JSON.stringify(studentInfo));

    continueBtn.disabled = false;
    continueBtn.innerHTML = `<span>View Exams</span><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;

    showExamDashboard();
});

// ── Show exam dashboard ───────────────────────────────────────────────
async function showExamDashboard() {
    // ... (rest of skeleton rendering)

    try {
        const [allExams, myExams] = await Promise.all([
            fetch(`/api/users/exams?collegeId=${studentInfo.collegeId}`).then(r => r.json()),
            api.getMyExams({ rollNumber: studentInfo.rollNumber, email: studentInfo.email }),
        ]);
        
        // ... (rest of rendering logic)
    } catch (err) {
        // ...
    }
}

        const renderItems = (items, containerId, sectionId) => {
            const container = document.getElementById(containerId);
            const section = document.getElementById(sectionId);
            if (!items.length) {
                section.classList.add('hidden');
                container.innerHTML = '';
                return;
            }
            section.classList.remove('hidden');
            container.innerHTML = '';
            items.forEach(item => container.appendChild(buildExamCard(item)));
        };

        renderItems(active,   'listCurrent',  'sectionCurrent');
        renderItems(upcoming, 'listUpcoming', 'sectionUpcoming');
        renderItems(past,     'listPast',     'sectionPast');

        if (!active.length && !upcoming.length && !past.length) {
            document.getElementById('examEmpty').classList.remove('hidden');
        }

    } catch (err) {
        document.getElementById('examEmpty').innerHTML = `<p class="text-red-400">Failed to load exams: ${err.message}</p>`;
        document.getElementById('examEmpty').classList.remove('hidden');
    }
}

// ── Build exam card ───────────────────────────────────────────────────
function buildExamCard({ exam, done, submission }) {
    const now   = new Date();
    const start = exam.startTime ? new Date(exam.startTime) : null;
    const end   = exam.endTime   ? new Date(exam.endTime)   : null;

    const isPast     = end && end < now;
    const isUpcoming = start && start > now && !isPast;
    const isActive   = !isPast && !isUpcoming;

    const card = document.createElement('div');
    card.className = 'exam-card glass-panel rounded-2xl p-5';

    // Status badge
    let badgeHTML = '';
    if (done) {
        badgeHTML = `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full"><span class="status-dot bg-emerald-400"></span>Completed</span>`;
    } else if (isActive) {
        badgeHTML = `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full"><span class="status-dot bg-emerald-400 animate-pulse2"></span>Live Now</span>`;
    } else if (isUpcoming) {
        badgeHTML = `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full"><span class="status-dot bg-yellow-400"></span>Upcoming</span>`;
    } else {
        badgeHTML = `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-500/10 border border-slate-500/20 px-2.5 py-1 rounded-full"><span class="status-dot bg-slate-400"></span>Ended</span>`;
    }

    // Score if done
    const scoreHTML = done && submission
        ? `<span class="text-sm text-slate-400">Your score: <span class="text-white font-semibold">${submission.totalScore}</span></span>`
        : '';

    // Action button
    let actionBtn = '';
    if (done) {
        actionBtn = `<a href="result.html?examId=${exam._id}" class="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            View Result
        </a>`;
    } else if (isActive) {
        actionBtn = `<button onclick="openStartModal('${exam._id}', '${escHtml(exam.title)}')"
            class="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-600 to-accent hover:from-primary-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl transition-all hover:-translate-y-0.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            Take Exam
        </button>`;
    } else if (isUpcoming) {
        actionBtn = `<div class="text-sm text-yellow-400 font-mono font-semibold" id="timer-${exam._id}">--:--:--</div>`;
    }

    // Timer caption
    let timerCaption = '';
    if (start && !isPast) {
        const label = isActive ? 'Ends' : 'Starts';
        const dt    = isActive ? end : start;
        timerCaption = dt ? `<p class="text-xs text-slate-500 mt-1">${label}: ${dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>` : '';
    }

    card.innerHTML = `
        <div class="flex items-start justify-between gap-3 mb-1">
            <div class="flex-1 min-w-0">
                ${badgeHTML}
                <h2 class="text-base font-semibold text-white mt-2 leading-snug">${escHtml(exam.title)}</h2>
                ${timerCaption}
            </div>
            <div class="flex flex-col items-end gap-2 flex-shrink-0">
                ${actionBtn}
                ${scoreHTML}
            </div>
        </div>`;

    // Start countdown for upcoming exams
    if (isUpcoming && start) {
        const el = card.querySelector(`#timer-${exam._id}`);
        if (el) {
            const tick = () => {
                const diff = start - new Date();
                if (diff <= 0) { clearInterval(timers[exam._id]); showExamDashboard(); return; }
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
            };
            tick();
            timers[exam._id] = setInterval(tick, 1000);
        }
    }

    return card;
}

// ── Start exam modal ──────────────────────────────────────────────────
function openStartModal(examId, examTitle) {
    pendingExamId = examId;
    document.getElementById('modalExamTitle').textContent  = examTitle;
    document.getElementById('confirmName').textContent     = studentInfo.name;
    document.getElementById('confirmRoll').textContent     = studentInfo.rollNumber;
    document.getElementById('confirmEmail').textContent    = studentInfo.email;
    hideError(document.getElementById('modalError'));
    document.getElementById('startModal').classList.remove('hidden');
}

function closeStartModal() {
    document.getElementById('startModal').classList.add('hidden');
    pendingExamId = null;
}

async function confirmStart() {
    if (!pendingExamId) return;

    const btn       = document.getElementById('confirmStartBtn');
    const modalErr  = document.getElementById('modalError');
    hideError(modalErr);

    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Starting...`;

    try {
        const user = await api.register({
            name:       studentInfo.name,
            rollNumber: studentInfo.rollNumber,
            email:      studentInfo.email,
            examId:     pendingExamId,
        });

        // Save session with examId
        sessionStorage.setItem('user', JSON.stringify({ ...user, examId: pendingExamId }));
        window.location.href = '/test.html';

    } catch (err) {
        showError(modalErr, err.message);
        btn.disabled = false;
        btn.innerHTML = `<span>Start Exam</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
    }
}

// ── Switch user ───────────────────────────────────────────────────────
function switchUser() {
    sessionStorage.removeItem('studentInfo');
    sessionStorage.removeItem('user');
    studentInfo = null;
    examPanel.classList.add('hidden');
    detailsPanel.classList.remove('hidden');
    Object.values(timers).forEach(clearInterval);
    timers = {};
}

// ── Helpers ───────────────────────────────────────────────────────────
function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function hideError(el)      { el.classList.add('hidden'); }
function pad(n)             { return String(n).padStart(2, '0'); }
function escHtml(str)       { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
