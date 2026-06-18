/**
 * test.js — Examination Engine v2 (Cyan Theme)
 */

// ── State ─────────────────────────────────────────────────────────────
let questions     = [];
let currentIdx    = 0;
let answers       = {};        // questionId → originalOptionIndex
let reviewState   = new Set(); // questionIds flagged for review
let student       = null;
let examId        = null;
let timerInterval = null;

// ── Elements ──────────────────────────────────────────────────────────
const questionContainer = document.getElementById('questionContainer');
const optionsContainer  = document.getElementById('optionsContainer');
const questionText      = document.getElementById('questionText');
const questionBadge     = document.getElementById('questionBadge');
const prevBtn           = document.getElementById('prevBtn');
const nextBtn           = document.getElementById('nextBtn');
const sectionNav        = document.getElementById('sectionNav');
const loader            = document.getElementById('loader');

// ── Notify ────────────────────────────────────────────────────────────
function notify(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const icons = {
        success: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        warning: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.innerHTML = `${icons[type]}<span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transition = 'all 0.3s ease';
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 350);
    }, 4000);
}

// ── Confirm Dialog ────────────────────────────────────────────────────
function confirmAction(title, message) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirmOverlay');
        document.getElementById('confirmTitle').textContent   = title;
        document.getElementById('confirmMessage').textContent = message;
        overlay.style.display = 'flex';

        const proceed = document.getElementById('confirmProceedBtn');
        const cancel  = document.getElementById('confirmCancelBtn');

        const cleanup = (val) => {
            overlay.style.display = 'none';
            proceed.onclick = null;
            cancel.onclick  = null;
            resolve(val);
        };

        proceed.onclick = () => cleanup(true);
        cancel.onclick  = () => cleanup(false);
    });
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── Init ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) { window.location.href = '/'; return; }

    student = JSON.parse(userStr);
    examId  = student.examId;

    try {
        loader.style.display = '';
        questionContainer.style.opacity = '0';

        // Data pre-loaded during register step — no extra API calls needed
        const examDetailsStr  = sessionStorage.getItem('examDetails');
        const examQuestionsStr = sessionStorage.getItem('examQuestions');

        const examDetails  = examDetailsStr  ? JSON.parse(examDetailsStr)  : null;
        const rawQuestions = examQuestionsStr ? JSON.parse(examQuestionsStr) : null;

        loader.style.display = 'none';

        // Populate Topbar and Sidebar details
        const topbarExamName    = document.getElementById('topbarExamName');
        const topbarStudentName = document.getElementById('topbarStudentName');
        const sidebarStudentName = document.getElementById('sidebarStudentName');
        if (topbarExamName) {
            topbarExamName.textContent = examDetails ? examDetails.title : 'Assessment Session';
        }
        if (topbarStudentName) {
            topbarStudentName.textContent = student.name || `Candidate (${student.rollNumber})`;
        }
        if (sidebarStudentName) {
            sidebarStudentName.textContent = student.name || `Candidate (${student.rollNumber})`;
        }

        if (!rawQuestions || !rawQuestions.length) {
            notify('No questions detected for this assessment.', 'error');
            return;
        }

        // Start timer
        if (examDetails && examDetails.endTime) {
            startTimer(examDetails.endTime);
        }

        // Group by section, shuffle within section
        const sectionMap = {};
        rawQuestions.forEach(q => {
            const sec = q.section || 'General';
            if (!sectionMap[sec]) sectionMap[sec] = [];
            q.shuffledOptions = shuffleArray(
                q.options.map((text, idx) => ({ text, originalIndex: idx }))
            );
            sectionMap[sec].push(q);
        });

        questions = [];
        Object.keys(sectionMap).forEach(sec => {
            questions.push(...shuffleArray(sectionMap[sec]));
        });

        // Update palette question count
        const countBadge = document.getElementById('qCountBadge');
        if (countBadge) countBadge.textContent = `${questions.length} QUESTIONS`;

        // Load saved progress from localStorage if available
        const savedAnswersStr = localStorage.getItem(`exam_${examId}_${student.rollNumber}_answers`);
        if (savedAnswersStr) {
            try {
                answers = JSON.parse(savedAnswersStr) || {};
            } catch (e) {
                console.error('Failed to parse saved answers:', e);
            }
        }

        const savedReviewStr = localStorage.getItem(`exam_${examId}_${student.rollNumber}_review`);
        if (savedReviewStr) {
            try {
                const arr = JSON.parse(savedReviewStr);
                if (Array.isArray(arr)) {
                    reviewState = new Set(arr);
                }
            } catch (e) {
                console.error('Failed to parse saved review state:', e);
            }
        }

        renderPalette();
        showQuestion(0);
        updateProgress();

    } catch (err) {
        loader.style.display = 'none';
        notify('Connection failure. Please try again.', 'error');
        console.error(err);
    }
});

// ── Timer ─────────────────────────────────────────────────────────────
function startTimer(endTimeStr) {
    const endTime  = new Date(endTimeStr).getTime();
    const container = document.getElementById('testTimerContainer');
    const display   = document.getElementById('testTimerDisplay');
    const badge     = document.getElementById('timerBadge');

    const sidebarContainer = document.getElementById('sidebarTimerContainer');
    const sidebarDisplay   = document.getElementById('sidebarTimerDisplay');

    if (container && display) container.style.display = '';
    if (sidebarContainer && sidebarDisplay) sidebarContainer.style.display = '';

    function update() {
        const now  = Date.now();
        const diff = endTime - now;

        if (diff <= 0) {
            clearInterval(timerInterval);
            if (display) display.textContent = '00:00';
            if (sidebarDisplay) sidebarDisplay.textContent = '00:00';
            notify('Time expired! Submitting automatically.', 'warning');
            submitTest(true);
            return;
        }

        const h  = Math.floor(diff / 3600000);
        const m  = Math.floor((diff % 3600000) / 60000);
        const s  = Math.floor((diff % 60000) / 1000);

        const timeText = h > 0
            ? `${pad(h)}:${pad(m)}:${pad(s)}`
            : `${pad(m)}:${pad(s)}`;

        if (display) display.textContent = timeText;
        if (sidebarDisplay) sidebarDisplay.textContent = timeText;

        if (badge) {
            badge.className = diff < 60000
                ? 'timer-display timer-critical'
                : diff < 300000
                    ? 'timer-display timer-warning'
                    : 'timer-display';
        }

        const sidebarBadge = sidebarContainer ? sidebarContainer.querySelector('.sidebar-timer-display') : null;
        if (sidebarBadge) {
            sidebarBadge.className = diff < 60000
                ? 'sidebar-timer-display timer-critical'
                : diff < 300000
                    ? 'sidebar-timer-display timer-warning'
                    : 'sidebar-timer-display';
        }
    }

    update();
    timerInterval = setInterval(update, 1000);
}

function pad(n) { return String(n).padStart(2, '0'); }

// ── Palette ───────────────────────────────────────────────────────────
function renderPalette() {
    // Group by section
    const grouped = {};
    questions.forEach((q, idx) => {
        const sec = q.section || 'General';
        if (!grouped[sec]) grouped[sec] = [];
        grouped[sec].push({ ...q, globalIdx: idx });
    });

    const sections = Object.keys(grouped);

    // Build palette for all sections with explicit headers
    sectionNav.innerHTML = sections.map(sec => {
        const qs = grouped[sec];
        return `
        <div class="sidebar-section-label" style="padding: 16px 20px 8px;"> ${sec}</div>
        <div class="palette-grid" style="padding: 0 20px 16px;">
            ${qs.map(q => {
                const isActive    = q.globalIdx === currentIdx;
                const isAnswered  = answers[q._id] !== undefined;
                const isReviewed  = reviewState.has(q._id);
                const localNum    = qs.indexOf(q) + 1;

                let cls = 'palette-btn';
                if (isActive)   cls += ' active';
                else if (isReviewed) cls += ' marked';
                else if (isAnswered) cls += ' answered';

                return `<button class="${cls}" onclick="showQuestion(${q.globalIdx})">${localNum}</button>`;
            }).join('')}
        </div>`;
    }).join('');
}

// ── Show Question ─────────────────────────────────────────────────────
function showQuestion(idx, skipAnimation = false) {
    const isNewQuestion = currentIdx !== idx || currentIdx === 0 && !skipAnimation;
    currentIdx = idx;
    const q = questions[idx];

    // Trigger animation only if actually changing questions
    if (isNewQuestion && !skipAnimation) {
        questionContainer.classList.remove('slide-in-right');
        void questionContainer.offsetWidth; // Force reflow
        questionContainer.classList.add('slide-in-right');
    }

    questionBadge.textContent = `Question ${idx + 1}`;
    questionText.textContent  = q.questionText;

    // Review button state
    const revBtn = document.getElementById('reviewBtn');
    if (reviewState.has(q._id)) {
        revBtn.style.background = 'rgba(255,215,64,0.15)';
        revBtn.style.borderColor = 'rgba(255,215,64,0.4)';
        revBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--yellow)" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Marked for Review`;
    } else {
        revBtn.style.background = 'rgba(255,215,64,0.07)';
        revBtn.style.borderColor = 'rgba(255,215,64,0.2)';
        revBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Mark for Review`;
    }


    // Options
    const labels = ['A', 'B', 'C', 'D'];
    optionsContainer.innerHTML = q.shuffledOptions.map((optObj, i) => {
        const isSelected = answers[q._id] === optObj.originalIndex;
        return `
        <button type="button" onclick="saveAnswer('${q._id}', ${optObj.originalIndex})"
            class="option-btn${isSelected ? ' selected' : ''}">
            <span class="option-label">${labels[i]}</span>
            <span style="flex:1;font-size:1.05rem;font-weight:600;text-align:left;">${esc(optObj.text)}</span>
            <span class="option-radio"></span>
        </button>`;
    }).join('');

    questionContainer.style.opacity = '1';
    updateNavState();
    renderPalette();

    // Scroll exam area back to top only when switching questions
    if (!skipAnimation) {
        const area = document.getElementById('examScrollArea');
        if (area) area.scrollTop = 0;
    }
}

function toggleReview() {
    const qId = questions[currentIdx]._id;
    if (reviewState.has(qId)) reviewState.delete(qId);
    else reviewState.add(qId);

    // Save progress to localStorage
    if (student && examId) {
        localStorage.setItem(`exam_${examId}_${student.rollNumber}_review`, JSON.stringify(Array.from(reviewState)));
    }

    showQuestion(currentIdx, true); // true = skip slide animation
}

function saveAnswer(qId, optIdx) {
    answers[qId] = optIdx;

    // Save progress to localStorage
    if (student && examId) {
        localStorage.setItem(`exam_${examId}_${student.rollNumber}_answers`, JSON.stringify(answers));
    }

    showQuestion(currentIdx, true); // true = skip animation
    updateProgress();
}

function updateProgress() {
    const total    = questions.length;
    const answered = Object.keys(answers).length;
    const pct      = total > 0 ? (answered / total) * 100 : 0;

    document.getElementById('progressText').textContent = `${answered}/${total}`;
    document.getElementById('progressBar').style.width  = `${pct}%`;
}

function updateNavState() {
    prevBtn.disabled = currentIdx === 0;
    prevBtn.style.opacity = currentIdx === 0 ? '0.35' : '1';

    const isLast       = currentIdx === questions.length - 1;
    const allAnswered  = Object.keys(answers).length === questions.length;

    if (isLast && allAnswered) {
        nextBtn.innerHTML = `Submit <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        nextBtn.className = 'btn exam-nav-btn';
        nextBtn.style.background = 'var(--green)';
        nextBtn.style.color = '#05070a';
        nextBtn.style.boxShadow = '0 4px 20px rgba(0,255,136,0.25)';
        nextBtn.onclick = () => submitTest();
    } else {
        nextBtn.innerHTML = `Next <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
        nextBtn.className = 'btn btn-cyan exam-nav-btn';
        nextBtn.style.background = '';
        nextBtn.style.color = '';
        nextBtn.style.boxShadow = '';
        nextBtn.onclick = () => currentIdx < questions.length - 1 && showQuestion(currentIdx + 1);
    }
}

prevBtn.onclick = () => currentIdx > 0 && showQuestion(currentIdx - 1);

// ── Submit ────────────────────────────────────────────────────────────
async function submitTest(force = false) {
    const count = Object.keys(answers).length;
    const flaggedCount = reviewState.size;
    if (!force) {
        const ok = await confirmAction(
            'Submit Assessment',
            `You have answered ${count} of ${questions.length} questions. There are ${flaggedCount} flagged questions. This action cannot be undone. Are you sure you want to continue?`
        );
        if (!ok) return;
    }

    clearInterval(timerInterval);

    const submitBtn = document.getElementById('finalSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Submitting...`;
    }

    try {
        await api.submitTest({ rollNumber: student.rollNumber, examId, answers });

        // Clear local storage progress on successful submission
        if (student && examId) {
            localStorage.removeItem(`exam_${examId}_${student.rollNumber}_answers`);
            localStorage.removeItem(`exam_${examId}_${student.rollNumber}_review`);
        }

        window.location.href = `/result.html?examId=${examId}&rollNumber=${student.rollNumber}`;
    } catch (err) {
        notify('Error submitting. Please try again.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Submit Assessment`;
        }
    }
}

document.getElementById('finalSubmitBtn').onclick = () => submitTest();

// ── Mobile sidebar ────────────────────────────────────────────────────
function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
}

// ── Helpers ───────────────────────────────────────────────────────────
function esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
