/**
 * test.js — Professional Examination Engine
 */

// ── State ────────────────────────────────────────────────────────────
let questions    = [];
let currentIdx   = 0;
let answers      = {}; // questionId -> optionIndex (0-3)
let reviewState  = new Set(); // questionIds marked for review
let student      = null;
let examId       = null;

// ── Elements ─────────────────────────────────────────────────────────
const questionContainer = document.getElementById('questionContainer');
const optionsContainer  = document.getElementById('optionsContainer');
const questionText      = document.getElementById('questionText');
const prevBtn           = document.getElementById('prevBtn');
const nextBtn           = document.getElementById('nextBtn');
const sectionNav        = document.getElementById('sectionNav');
const loader            = document.getElementById('loader');

// ── Initialization ───────────────────────────────────────────────────

function notify(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
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

function confirmAction(title, message, type = 'danger') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirmOverlay');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        const proceedBtn = document.getElementById('confirmProceedBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        overlay.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
        const cleanup = (val) => { overlay.classList.add('hidden'); proceedBtn.onclick = null; cancelBtn.onclick = null; resolve(val); };
        proceedBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
    });
}

function refreshIcons() {
    if (window.lucide) lucide.createIcons();
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

document.addEventListener('DOMContentLoaded', async () => {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) { window.location.href = '/'; return; }

    student = JSON.parse(userStr);
    examId  = student.examId;
    
    document.getElementById('studentName').textContent = student.name.toUpperCase();
    refreshIcons();

    try {
        loader.classList.remove('hidden');
        let rawQuestions = await api.getQuestions(examId);
        loader.classList.add('hidden');

        if (!rawQuestions || !rawQuestions.length) {
            notify('No questions detected for this assessment.', 'error');
            return;
        }

        // Group by section, shuffle options, and shuffle questions within section
        const sectionMap = {};
        rawQuestions.forEach(q => {
            const sec = q.section || 'General Section';
            if (!sectionMap[sec]) sectionMap[sec] = [];
            // Map original options to keep track of true indices
            q.shuffledOptions = shuffleArray(q.options.map((text, idx) => ({ text, originalIndex: idx })));
            sectionMap[sec].push(q);
        });

        questions = [];
        Object.keys(sectionMap).forEach(sec => {
            const shuffledQs = shuffleArray(sectionMap[sec]);
            questions.push(...shuffledQs);
        });

        renderSidebar();
        showQuestion(0);
        updateProgress();

    } catch (err) {
        loader.classList.add('hidden');
        notify('Connection failure. Please try again.', 'error');
    }
});

function renderSidebar() {
    const grouped = questions.reduce((acc, q, idx) => {
        const s = q.section || 'General Section';
        if (!acc[s]) acc[s] = [];
        acc[s].push({ ...q, globalIdx: idx });
        return acc;
    }, {});


    sectionNav.innerHTML = Object.entries(grouped).map(([name, qs]) => `
        <div class="space-y-4">
            <div class="flex items-center gap-3 px-2">
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">${name}</span>
                <div class="h-px flex-1 bg-white/5"></div>
            </div>
            <div class="grid grid-cols-5 gap-2">
                ${qs.map(q => {
                    const isAnswered = answers[q._id] !== undefined;
                    const isReviewed = reviewState.has(q._id);
                    const isActive = currentIdx === q.globalIdx;
                    
                    let stateClass = 'bg-white/5 text-slate-600 border-white/5 hover:bg-white/10 hover:text-slate-400';
                    let iconHtml = qs.indexOf(q) + 1;

                    if (isActive) {
                        stateClass = 'bg-primary-600 text-white border-primary-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-110 z-10';
                    } else if (isReviewed) {
                        stateClass = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                        iconHtml = '<i data-lucide="bookmark" class="w-3.5 h-3.5"></i>';
                    } else if (isAnswered) {
                        stateClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                        iconHtml = '<i data-lucide="check" class="w-3.5 h-3.5"></i>';
                    }

                    return `
                        <button onclick="showQuestion(${q.globalIdx})" id="nav-q-${q.globalIdx}" 
                            class="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black transition-all duration-300 border ${stateClass}">
                            ${iconHtml}
                        </button>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');
    refreshIcons();
}

function showQuestion(idx) {
    currentIdx = idx;
    const q = questions[idx];

    // Tactical Header Sync
    document.getElementById('currentSectionTitle').textContent = (q.section || 'Assessment Section').toUpperCase();
    document.getElementById('currentQuestionNum').textContent = idx + 1;
    document.getElementById('sectionTotalNum').textContent = questions.length;
    
    // Direct question text update
    questionText.textContent = q.questionText;

    // Sync Review State
    const revBtn = document.getElementById('reviewBtn');
    if (reviewState.has(q._id)) {
        revBtn.innerHTML = '<i data-lucide="bookmark-check" class="w-5 h-5"></i> Marked';
        revBtn.classList.add('bg-purple-500/20', 'text-white', 'border-purple-500/40');
    } else {
        revBtn.innerHTML = '<i data-lucide="bookmark" class="w-5 h-5"></i> Mark for Review';
        revBtn.classList.remove('bg-purple-500/20', 'text-white', 'border-purple-500/40');
    }

    // Render Options Matrix
    const labels = ['A', 'B', 'C', 'D'];
    optionsContainer.innerHTML = q.shuffledOptions.map((optObj, i) => {
        const isSelected = answers[q._id] === optObj.originalIndex;
        return `
        <button onclick="saveAnswer('${q._id}', ${optObj.originalIndex})" 
            class="w-full text-left p-6 rounded-[2.5rem] border transition-all duration-300 group flex items-center gap-6 relative overflow-hidden
            ${isSelected 
                ? 'bg-primary-500/10 border-primary-500/50 text-white shadow-[0_0_30px_rgba(59,130,246,0.1)]' 
                : 'bg-dark-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/[0.03]'}">
            
            ${isSelected ? '<div class="absolute inset-0 bg-primary-500/5 animate-pulse"></div>' : ''}
            
            <div class="relative w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-500
                ${isSelected 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/40 rotate-[360deg]' 
                    : 'bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300'}">
                ${labels[i]}
            </div>
            
            <span class="relative flex-1 font-bold text-sm md:text-base leading-relaxed tracking-tight transition-colors
                ${isSelected ? 'text-white' : 'group-hover:text-slate-200'}">
                ${optObj.text}
            </span>
            
            <div class="relative w-6 h-6 rounded-full border-2 transition-all duration-500 flex items-center justify-center
                ${isSelected 
                    ? 'border-primary-400 bg-primary-400/20 scale-110' 
                    : 'border-slate-800 scale-90 opacity-0 group-hover:opacity-100'}">
                <i data-lucide="check" class="w-3.5 h-3.5 text-white ${isSelected ? 'opacity-100' : 'opacity-0'}"></i>
            </div>
        </button>
    `}).join('');

    questionContainer.classList.remove('opacity-0');
    questionContainer.style.opacity = '1';
    
    updateNavState();
    renderSidebar();
    refreshIcons();
}

function toggleReview() {
    const qId = questions[currentIdx]._id;
    if (reviewState.has(qId)) reviewState.delete(qId);
    else reviewState.add(qId);
    
    // Auto navigate to next
    if (currentIdx < questions.length - 1) {
        showQuestion(currentIdx + 1);
    } else {
        showQuestion(currentIdx);
    }
}

function saveAnswer(qId, optIdx) {
    answers[qId] = optIdx;
    showQuestion(currentIdx);
    updateProgress();
}

function updateProgress() {
    const total = questions.length;
    const answered = Object.keys(answers).length;
    const pct = (answered / total) * 100;
    
    document.getElementById('progressText').textContent = `${answered}/${total}`;
    document.getElementById('progressBar').style.width = `${pct}%`;
}

function updateNavState() {
    prevBtn.disabled = currentIdx === 0;
    
    const isLast = currentIdx === questions.length - 1;
    const allAnswered = Object.keys(answers).length === questions.length;

    if (isLast && allAnswered) {
        nextBtn.innerHTML = 'Submit Assessment <i data-lucide="shield-check" class="w-5 h-5 ml-1"></i>';
        nextBtn.classList.remove('btn-primary');
        nextBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
        nextBtn.onclick = () => submitTest();
    } else {
        nextBtn.innerHTML = 'Proceed <i data-lucide="chevron-right" class="w-5 h-5 transition-transform group-hover:translate-x-1"></i>';
        nextBtn.classList.add('btn-primary');
        nextBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
        nextBtn.onclick = () => currentIdx < questions.length - 1 && showQuestion(currentIdx + 1);
    }
    refreshIcons();
}

prevBtn.onclick = () => currentIdx > 0 && showQuestion(currentIdx - 1);

async function submitTest() {
    const count = Object.keys(answers).length;
    const ok = await confirmAction('SUBMIT ASSESSMENT', `You have answered ${count} of ${questions.length} questions. Are you sure you want to submit?`, 'info');
    if (!ok) return;

    try {
        await api.submitTest({
            rollNumber: student.rollNumber,
            examId: examId,
            answers: answers
        });
        window.location.href = `/result.html?examId=${examId}&rollNumber=${student.rollNumber}`;
    } catch (err) {
        notify('Error submitting assessment. Please try again.', 'error');
    }
}

document.getElementById('finalSubmitBtn').onclick = submitTest;

function openSidebar() { document.getElementById('sidebar').classList.remove('-translate-x-full'); document.getElementById('sidebarOverlay').classList.remove('hidden'); }
function closeSidebar() { document.getElementById('sidebar').classList.add('-translate-x-full'); document.getElementById('sidebarOverlay').classList.add('hidden'); }
