/**
 * result.js — Performance Analysis with dual Desktop (Tailwind/Chart.js) and Mobile views.
 */

let currentExamId = null;
let studentRoll   = null;

// ── Toast Notification ────────────────────────────────────────────────
function notify(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const colors = { 
        success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', 
        error: 'bg-red-500/10 border-red-500/20 text-red-400', 
        info: 'bg-primary-500/10 border-primary-500/20 text-primary-400' 
    };
    const icons = { 
        success: 'check-circle', 
        error: 'alert-circle', 
        info: 'info' 
    };

    const toast = document.createElement('div');
    toast.className = `glass flex items-center gap-3 px-6 py-4 rounded-2xl border ${colors[type]} animate-slide-up pointer-events-auto shadow-2xl`;
    toast.innerHTML = `<i data-lucide="${icons[type]}" class="w-5 h-5"></i><span class="text-sm font-bold">${message}</span>`;
    container.appendChild(toast);
    
    if (window.lucide) lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.5s ease-out';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// ── DOM DomReady ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const params    = new URLSearchParams(window.location.search);
    currentExamId   = params.get('examId');
    studentRoll     = params.get('rollNumber');

    if (!currentExamId || !studentRoll) {
        const user = JSON.parse(sessionStorage.getItem('user') || 'null');
        const studentInfo = JSON.parse(sessionStorage.getItem('studentInfo') || 'null');

        if (!user && !studentInfo) { window.location.href = '/'; return; }

        currentExamId = user ? user.examId : null;
        studentRoll   = (user ? user.rollNumber : null) || (studentInfo ? studentInfo.rollNumber : null);
    }

    try {
        if (currentExamId) {
            const result = await api.getResult(currentExamId, studentRoll);

            // 1. Name & Roll number population
            const desktopGreeting = document.getElementById('studentGreeting');
            if (desktopGreeting) {
                desktopGreeting.textContent = `${result.name.toUpperCase()} / ROLL NUMBER ${result.rollNumber}`;
            }

            const mobileName = document.getElementById('mobileStudentName');
            const mobileRoll = document.getElementById('mobileStudentRoll');
            if (mobileName) mobileName.textContent = result.name.toUpperCase();
            if (mobileRoll) mobileRoll.textContent = `ROLL NO: ${result.rollNumber}`;

            // 2. Metrics population
            // Desktop counters
            const centerScore = document.getElementById('centerScore');
            const totalQuestionsLabel = document.getElementById('totalQuestionsLabel');
            if (centerScore) centerScore.textContent = result.totalScore;
            if (totalQuestionsLabel) totalQuestionsLabel.textContent = result.totalQuestions ?? '100';

            const correctCount = document.getElementById('correctCount');
            const wrongCount = document.getElementById('wrongCount');
            const skippedCount = document.getElementById('skippedCount');
            if (correctCount) correctCount.textContent = result.correctCount;
            if (wrongCount) wrongCount.textContent = result.wrongCount;
            if (skippedCount) skippedCount.textContent = result.unattemptedCount;

            const accuracy = result.answeredCount > 0 ? Math.round((result.correctCount / result.answeredCount) * 100) : 0;
            const accuracyBadge = document.getElementById('accuracyBadge');
            if (accuracyBadge) accuracyBadge.textContent = `${accuracy}% Precision`;

            // Mobile counters
            const mobileCenterScore = document.getElementById('mobileCenterScore');
            const mobileTotalQuestionsLabel = document.getElementById('mobileTotalQuestionsLabel');
            if (mobileCenterScore) mobileCenterScore.textContent = result.totalScore;
            if (mobileTotalQuestionsLabel) mobileTotalQuestionsLabel.textContent = result.totalQuestions ?? '100';

            const mobileAccuracyValue = document.getElementById('mobileAccuracyValue');
            const mobileCorrectCount = document.getElementById('mobileCorrectCount');
            const mobileIncorrectCount = document.getElementById('mobileIncorrectCount');
            if (mobileAccuracyValue) mobileAccuracyValue.textContent = `${accuracy}%`;
            if (mobileCorrectCount) mobileCorrectCount.textContent = result.correctCount;
            if (mobileIncorrectCount) mobileIncorrectCount.textContent = result.wrongCount + result.unattemptedCount;

            // 3. Chart.js Initialization
            // Desktop Donut Chart
            const desktopCtx = document.getElementById('donutChart');
            if (desktopCtx) {
                new Chart(desktopCtx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Correct', 'Wrong', 'Skipped'],
                        datasets: [{
                            data: [result.correctCount, result.wrongCount, result.unattemptedCount],
                            backgroundColor: ['#00ff88', '#ff3d71', 'rgba(92, 107, 132, 0.4)'],
                            borderColor: '#05070a', borderWidth: 4, hoverOffset: 15,
                        }]
                    },
                    options: {
                        cutout: '80%', responsive: true, maintainAspectRatio: true,
                        layout: { padding: 20 },
                        plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 12, weight: 'bold' }, padding: 12, cornerRadius: 12 } },
                        animation: { animateRotate: true, duration: 1500, easing: 'easeOutQuart' }
                    }
                });
            }

            // Mobile Donut Chart
            const mobileCtx = document.getElementById('mobileDonutChart');
            if (mobileCtx) {
                new Chart(mobileCtx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Correct', 'Wrong', 'Skipped'],
                        datasets: [{
                            data: [result.correctCount, result.wrongCount, result.unattemptedCount],
                            backgroundColor: ['#00ff88', '#ff3d71', 'rgba(92, 107, 132, 0.4)'],
                            borderColor: '#05070a', borderWidth: 2, hoverOffset: 10,
                        }]
                    },
                    options: {
                        cutout: '80%', responsive: true, maintainAspectRatio: true,
                        layout: { padding: 5 },
                        plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 10 }, padding: 8, cornerRadius: 8 } },
                        animation: { animateRotate: true, duration: 1500, easing: 'easeOutQuart' }
                    }
                });
            }

            // 4. Section-wise Performance Bars
            const container = document.getElementById('sectionScoresContainer');
            const mobileContainer = document.getElementById('mobileSectionScoresContainer');
            
            if (container) container.innerHTML = '';
            if (mobileContainer) mobileContainer.innerHTML = '';

            const sections = Object.keys(result.sectionScores || {});
            sections.forEach((sec, idx) => {
                let score = result.sectionScores[sec];
                let sectionTotal = (result.sectionTotals && result.sectionTotals[sec]) || 1;
                let correctPct = (score / sectionTotal) * 100;
                let wrongPct = 0;
                
                if (result.sectionDetails && result.sectionDetails[sec]) {
                    const detail = result.sectionDetails[sec];
                    score = detail.correct;
                    sectionTotal = detail.total || 1;
                    correctPct = (detail.correct / sectionTotal) * 100;
                    wrongPct = (detail.wrong / sectionTotal) * 100;
                }

                // Desktop progress bar card
                if (container) {
                    const div = document.createElement('div');
                    div.className = 'space-y-2 p-4 bg-dark-900/40 rounded-2xl border border-white/5 hover:border-white/10 transition-colors';
                    div.innerHTML = `
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-black uppercase tracking-widest text-slate-300 truncate pr-2">${sec}</span>
                            <span class="text-base font-black text-white whitespace-nowrap flex items-center gap-1 bg-dark-950 px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner">${score} <span class="text-slate-600">/ ${sectionTotal}</span></span>
                        </div>
                        <div class="h-2 w-full bg-dark-950 rounded-full overflow-hidden border border-slate-800 flex">
                            <div class="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1000 ease-out relative overflow-hidden" style="width: 0%" id="bar-correct-${idx}">
                                <div class="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                            </div>
                            <div class="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-1000 ease-out" style="width: 0%" id="bar-wrong-${idx}"></div>
                        </div>
                    `;
                    container.appendChild(div);
                }

                // Mobile progress bar card
                if (mobileContainer) {
                    const mDiv = document.createElement('div');
                    mDiv.className = 'space-y-1.5';
                    mDiv.innerHTML = `
                        <div class="flex justify-between items-center text-sm">
                            <span class="font-bold text-slate-300 truncate pr-2 max-w-[180px]">${sec}</span>
                            <span class="font-black text-white whitespace-nowrap bg-dark-900 px-2 py-1 rounded border border-slate-800">${score} <span class="text-slate-600">/ ${sectionTotal}</span></span>
                        </div>
                        <div class="h-1.5 w-full bg-dark-950 rounded-full overflow-hidden border border-slate-800 flex">
                            <div class="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1000 ease-out" style="width: 0%" id="mobile-bar-correct-${idx}"></div>
                            <div class="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-1000 ease-out" style="width: 0%" id="mobile-bar-wrong-${idx}"></div>
                        </div>
                    `;
                    mobileContainer.appendChild(mDiv);
                }

                setTimeout(() => { 
                    const cBar = document.getElementById(`bar-correct-${idx}`);
                    const wBar = document.getElementById(`bar-wrong-${idx}`);
                    if (cBar) cBar.style.width = `${correctPct}%`;
                    if (wBar) wBar.style.width = `${wrongPct}%`;

                    const mcBar = document.getElementById(`mobile-bar-correct-${idx}`);
                    const mwBar = document.getElementById(`mobile-bar-wrong-${idx}`);
                    if (mcBar) mcBar.style.width = `${correctPct}%`;
                    if (mwBar) mwBar.style.width = `${wrongPct}%`;
                }, 200);
            });

            if (sections.length === 0) {
                const noSecText = '<p class="text-slate-500 text-xs py-2">No sectional breakdown available.</p>';
                if (container) container.innerHTML = noSecText;
                if (mobileContainer) mobileContainer.innerHTML = noSecText;
            }

        } // end if (currentExamId)

    } catch (err) {
        console.error(err);
        notify('Failed to load analysis.', 'error');
    }
});

// ── Download Answer Key ───────────────────────────────────────────────
async function downloadAnswerKey() {
    const btn = document.getElementById('answerKeyBtn');
    const mobileBtn = document.getElementById('mobileAnswerKeyBtn');
    const orig = btn ? btn.innerHTML : '';
    const mobileOrig = mobileBtn ? mobileBtn.innerHTML : '';

    const loadingHtml = `<svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generating...`;

    if (btn) { btn.disabled = true; btn.innerHTML = loadingHtml; }
    if (mobileBtn) { mobileBtn.disabled = true; mobileBtn.innerHTML = loadingHtml; }

    try {
        const resp = await fetch(`/api/questions/answer-key?examId=${currentExamId}`);
        if (!resp.ok) throw new Error('Answer key not available.');
        const data = await resp.json();

        // Resolve exam title from sessionStorage (set when the exam was started)
        const examDetailsRaw = sessionStorage.getItem('examDetails');
        const examTitle = examDetailsRaw ? (JSON.parse(examDetailsRaw).title || 'Assessment') : 'Assessment';

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // ── Header Band ───────────────────────────────────────────────
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 210, 42, 'F');

        // Cyan accent rule
        doc.setFillColor(0, 242, 255);
        doc.rect(0, 40, 210, 2, 'F');

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('OFFICIAL ANSWER KEY', 14, 16);

        // Sections list in header
        const sectionLabel = data.sections.length > 0
            ? `SECTIONS: ${data.sections.join('  ·  ')}`
            : 'SECTIONS: —';
        doc.setFontSize(10);
        doc.setTextColor(0, 200, 210); // cyan-ish
        doc.text(sectionLabel, 14, 26);

        let y = 52;

        data.sections.forEach(section => {
            const questions = data.questions[section];
            if (y > 255) { doc.addPage(); y = 20; }

            // Section Header
            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(`SECTION: ${section.toUpperCase()}`, 14, y + 6);

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.5);
            doc.line(14, y + 8, 196, y + 8);
            y += 16;

            questions.forEach((q, i) => {
                if (y > 270) { doc.addPage(); y = 20; }

                // Question Text
                doc.setFontSize(10);
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'bold');
                const qText = doc.splitTextToSize(`Q${i + 1}. ${q.questionText}`, 174);
                doc.text(qText, 14, y);
                y += (qText.length * 5) + 3;

                // Options
                q.options.forEach((opt, idx) => {
                    const isCorrect = String(idx) === String(q.correctAnswer);
                    const optLabel  = String.fromCharCode(65 + idx);
                    const optText   = doc.splitTextToSize(`${optLabel}. ${opt}`, 166);
                    const boxHeight = (optText.length * 5) + 4;

                    if (y + boxHeight > 282) { doc.addPage(); y = 20; }

                    if (isCorrect) {
                        doc.setFillColor(240, 253, 244);
                        doc.rect(18, y, 174, boxHeight, 'F');
                        doc.setFillColor(34, 197, 94);
                        doc.rect(18, y, 2, boxHeight, 'F');
                        doc.setTextColor(21, 128, 61);
                        doc.setFont('helvetica', 'bold');
                    } else {
                        doc.setTextColor(71, 85, 105);
                        doc.setFont('helvetica', 'normal');
                    }

                    doc.text(optText, 24, y + 5);
                    y += boxHeight + 1.5;
                });
                y += 5;
            });
        });

        // Sanitise title for filename (remove special chars)
        const safeTitle = examTitle.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
        doc.save(`Answer Key - ${safeTitle}.pdf`);
        notify('Answer key downloaded successfully', 'success');
    } catch (err) {
        notify(err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
        if (mobileBtn) { mobileBtn.disabled = false; mobileBtn.innerHTML = mobileOrig; }
        if (window.lucide) lucide.createIcons();
    }
}

