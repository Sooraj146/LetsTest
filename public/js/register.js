/**
 * register.js — Hardened Dashboard Logic
 */

// ── State ────────────────────────────────────────────────────────────
let studentInfo = JSON.parse(sessionStorage.getItem('studentInfo')) || null;

// ── Elements ─────────────────────────────────────────────────────────
const loginPanel = document.getElementById('loginPanel');
const dashboardPanel = document.getElementById('dashboardPanel');
const detailsForm = document.getElementById('detailsForm');
const loginError = document.getElementById('loginError');
const continueBtn = document.getElementById('continueBtn');

// ── Initialization ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (studentInfo) {
        showDashboard();
    } else {
        loginPanel.classList.remove('hidden');
    }
});

function refreshIcons() {
    if (window.lucide) lucide.createIcons();
}

// ── Auth ─────────────────────────────────────────────────────────────
detailsForm.onsubmit = async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    
    const rollNumber = e.target.rollNumber.value.trim();
    const email = e.target.email.value.trim();

    if (!email.includes('@')) {
        return showError(loginError, 'Institutional email required.');
    }

    continueBtn.disabled = true;
    const originalBtnText = continueBtn.innerHTML;
    continueBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>LOADING...</span>';
    refreshIcons();

    try {
        const domain = '@' + email.split('@')[1];
        const student = await api.getStudentName(rollNumber, domain);
        
        studentInfo = {
            name: student.name,
            rollNumber: rollNumber,
            email: email.toLowerCase(),
            collegeId: student.collegeId,
            collegeName: student.collegeName
        };

        sessionStorage.setItem('studentInfo', JSON.stringify(studentInfo));
        await showDashboard();
        notify(`Welcome back, ${studentInfo.name}`, 'success');
    } catch (err) {
        showError(loginError, err.message);
        continueBtn.disabled = false;
        continueBtn.innerHTML = originalBtnText;
        refreshIcons();
    }
};

function logout() {
    sessionStorage.clear();
    window.location.reload();
}

// ── Dashboard ────────────────────────────────────────────────────────
async function showDashboard() {
    loginPanel.classList.add('hidden');
    dashboardPanel.classList.remove('hidden');

    if (!studentInfo) return;

    // Direct DOM population
    const nameEl = document.getElementById('studentName');
    if (nameEl) nameEl.textContent = (studentInfo.name || 'STUDENT').toUpperCase();

    const affilEl = document.getElementById('studentAffiliation');
    if (affilEl) affilEl.textContent = (studentInfo.collegeName || 'INSTITUTION').toUpperCase();

    const rollEl = document.getElementById('displayRoll');
    if (rollEl) rollEl.textContent = studentInfo.rollNumber || '---';

    await loadExams();
}

async function loadExams() {
    const listCurrent = document.getElementById('listCurrent');
    const listUpcoming = document.getElementById('listUpcoming');
    const listPast = document.getElementById('listPast');
    const emptyState = document.getElementById('examEmpty');

    // Reset views
    listCurrent.innerHTML = '';
    listUpcoming.innerHTML = '';
    listPast.innerHTML = '';

    try {
        const [examsData, myResults] = await Promise.all([
            api.getExams(studentInfo.collegeId),
            api.getMyExams({ rollNumber: studentInfo.rollNumber, email: studentInfo.email })
        ]);

        const hasExams = (examsData.current?.length || 0) + (examsData.upcoming?.length || 0) + (examsData.past?.length || 0) > 0;
        
        if (!hasExams) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        const activeExams = [];
        const upcomingExams = [];
        const pastExams = [...(examsData.past || [])];

        // Logical sort: Submitted exams move to 'past'
        (examsData.current || []).forEach(exam => {
            if (myResults && myResults[exam._id]) {
                pastExams.push(exam);
            } else {
                activeExams.push(exam);
            }
        });

        (examsData.upcoming || []).forEach(exam => {
            if (myResults && myResults[exam._id]) {
                pastExams.push(exam);
            } else {
                upcomingExams.push(exam);
            }
        });

        renderExamList(activeExams, listCurrent, myResults, 'current');
        renderExamList(upcomingExams, listUpcoming, myResults, 'upcoming');
        renderExamList(pastExams, listPast, myResults, 'past');

        refreshIcons();
    } catch (err) {
        notify('Assessment sync failed. Please refresh.', 'error');
        console.error('Sync Error:', err);
    }
}

function renderExamList(exams, container, myExams, type) {
    if (!exams || !exams.length) {
        container.closest('section').classList.add('hidden');
        return;
    }
    
    container.closest('section').classList.remove('hidden');
    container.innerHTML = exams.map(exam => {
        const result = myExams ? myExams[exam._id] : null;
        const isDone = !!result;
        
        let actionBtn = '';
        let statusTag = '';

        if (isDone) {
            statusTag = '<span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/20">Completed</span>';
            actionBtn = `<a href="result.html?examId=${exam._id}&rollNumber=${studentInfo.rollNumber}" class="w-full py-3 bg-white/5 hover:bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/5">
                <i data-lucide="award" class="w-4 h-4"></i> Analysis (${result.totalScore} pts)
            </a>`;
        } else if (type === 'current') {
            statusTag = '<span class="px-2.5 py-1 bg-primary-500/10 text-primary-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-primary-500/20 animate-pulse">Active</span>';
            actionBtn = `<button onclick="startExam(event, '${exam._id}')" class="w-full py-3 btn-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/10">
                <i data-lucide="play" class="w-4 h-4"></i> Start Assessment
            </button>`;
        } else if (type === 'upcoming') {
            statusTag = '<span class="px-2.5 py-1 bg-slate-800 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/5">Locked</span>';
            const start = new Date(exam.startTime);
            actionBtn = `<div class="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center justify-center gap-2 py-3 bg-white/5 rounded-2xl border border-white/5">
                <i data-lucide="lock" class="w-3.5 h-3.5"></i> ${start.toLocaleDateString()}
            </div>`;
        } else {
            statusTag = '<span class="px-2.5 py-1 bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-red-500/20">Expired</span>';
            actionBtn = `<div class="text-[10px] text-slate-600 font-black uppercase tracking-widest text-center py-3">Access Closed</div>`;
        }

        return `
            <div class="glass-card group hover:border-primary-500/50 p-8 rounded-[2.5rem] flex flex-col justify-between border border-white/5 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div class="relative">
                    <div class="mb-6 flex justify-between items-center">${statusTag} <i data-lucide="component" class="w-4 h-4 text-slate-800"></i></div>
                    <h4 class="text-xl font-bold text-white mb-8 leading-tight tracking-tight group-hover:text-primary-400 transition-all uppercase">${esc(exam.title)}</h4>
                </div>
                <div class="relative z-10">${actionBtn}</div>
            </div>
        `;
    }).join('');
}

// ── Exam Execution ───────────────────────────────────────────────────

function notify(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return; // Fallback
    const toast = document.createElement('div');
    const colors = { success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', error: 'bg-red-500/10 border-red-500/20 text-red-400', info: 'bg-primary-500/10 border-primary-500/20 text-primary-400' };
    const icons = { success: 'check-circle', error: 'alert-circle', info: 'info' };
    toast.className = `glass flex items-center gap-3 px-6 py-4 rounded-2xl border ${colors[type]} animate-slide-up pointer-events-auto shadow-2xl`;
    toast.innerHTML = `<i data-lucide="${icons[type]}" class="w-5 h-5"></i><span class="text-sm font-bold uppercase tracking-tight">${message}</span>`;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.5s ease-out';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

async function startExam(e, examId) {
    const btn = e.currentTarget;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> PREPARING...';
    if (window.lucide) lucide.createIcons();

    try {
        const user = await api.register({
            name: studentInfo.name,
            rollNumber: studentInfo.rollNumber,
            email: studentInfo.email,
            examId: examId
        });

        sessionStorage.setItem('user', JSON.stringify({ ...user, examId: examId }));
        window.location.href = '/test.html';
    } catch (err) {
        notify(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (window.lucide) lucide.createIcons();
    }
}

// ── Helpers ──────────────────────────────────────────────────────────
function showError(el, msg) { el.textContent = msg.toUpperCase(); el.classList.remove('hidden'); }
function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
