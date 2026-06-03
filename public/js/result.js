let currentExamId = null;
let studentRoll = null;

function notify(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const toast = document.createElement('div');
    const colors = { success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', error: 'bg-red-500/10 border-red-500/20 text-red-400', info: 'bg-primary-500/10 border-primary-500/20 text-primary-400' };
    const icons = { success: 'check-circle', error: 'alert-circle', info: 'info' };
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

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    currentExamId = params.get('examId');
    studentRoll   = params.get('rollNumber');

    if (!currentExamId || !studentRoll) {
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (!user) { window.location.href = '/'; return; }
        currentExamId = user.examId;
        studentRoll   = user.rollNumber;
    }

    try {
        const result = await api.getResult(currentExamId, studentRoll);

        // Professional ID display
        document.getElementById('studentGreeting').textContent = `${result.name.toUpperCase()} / ROLL NUMBER ${result.rollNumber}`;

        document.getElementById('centerScore').textContent = result.totalScore;
        document.getElementById('totalQuestionsLabel').textContent = result.totalQuestions ?? '?';

        document.getElementById('correctCount').textContent = result.correctCount;
        document.getElementById('wrongCount').textContent = result.wrongCount;
        document.getElementById('skippedCount').textContent = result.unattemptedCount;
        const accuracy = result.answeredCount > 0 ? Math.round((result.correctCount / result.answeredCount) * 100) : 0;
        document.getElementById('accuracyBadge').textContent = `${accuracy}% Precision`;

        const ctx = document.getElementById('donutChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Correct', 'Wrong', 'Skipped'],
                datasets: [{
                    data: [result.correctCount, result.wrongCount, result.unattemptedCount],
                    backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(71, 85, 105, 0.4)'],
                    borderColor: '#020617', borderWidth: 4, hoverOffset: 15,
                }]
            },
            options: {
                cutout: '80%', responsive: true, maintainAspectRatio: true,
                layout: { padding: 20 },
                plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 12, weight: 'bold' }, padding: 12, cornerRadius: 12 } },
                animation: { animateRotate: true, duration: 1500, easing: 'easeOutQuart' }
            }
        });

        const container = document.getElementById('sectionScoresContainer');
        container.innerHTML = '';
        const sections = Object.keys(result.sectionScores);
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

            const div = document.createElement('div');
            div.className = 'space-y-2 p-4 bg-dark-900/40 rounded-2xl border border-white/5 hover:border-white/10 transition-colors';
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="text-xs font-black uppercase tracking-widest text-slate-300 truncate pr-2">${sec}</span>
                    <span class="text-sm font-black text-white whitespace-nowrap flex items-center gap-1 bg-dark-950 px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner">${score} <span class="text-slate-600">/ ${sectionTotal}</span></span>
                </div>
                <div class="h-2 w-full bg-dark-950 rounded-full overflow-hidden border border-slate-800 flex">
                    <div class="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1000 ease-out relative overflow-hidden" style="width: 0%" id="bar-correct-${idx}">
                        <div class="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                    </div>
                    <div class="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-1000 ease-out" style="width: 0%" id="bar-wrong-${idx}"></div>
                </div>
            `;
            container.appendChild(div);
            setTimeout(() => { 
                const cBar = document.getElementById(`bar-correct-${idx}`);
                const wBar = document.getElementById(`bar-wrong-${idx}`);
                if (cBar) cBar.style.width = `${correctPct}%`;
                if (wBar) wBar.style.width = `${wrongPct}%`;
            }, 200);
        });
    } catch (err) { console.error(err); notify('Analysis retrieval failed.', 'error'); }
});

async function downloadAnswerKey() {
    const btn = document.getElementById('answerKeyBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Generating PDF...</span>';
    if (window.lucide) lucide.createIcons();

    try {
        const resp = await fetch(`/api/questions/answer-key?examId=${currentExamId}`);
        if (!resp.ok) throw new Error('Answer key not available.');
        const data = await resp.json();
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Professional Corporate Header
        doc.setFillColor(15, 23, 42); // slate-950
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22); 
        doc.setFont('helvetica', 'bold');
        doc.text('OFFICIAL ANSWER KEY', 14, 22);
        
        doc.setFontSize(10); 
        doc.setFont('helvetica', 'normal');
        doc.text(`Assessment ID: ${currentExamId}`, 14, 30); 
        doc.text(`Candidate Roll: ${studentRoll}`, 14, 35);
        
        let y = 45;
        
        data.sections.forEach(section => {
            const questions = data.questions[section];
            
            if (y > 260) { doc.addPage(); y = 20; }
            
            // Section Header (Pill-like shape)
            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(203, 213, 225);
            doc.rect(14, y, 182, 10, 'FD');
            doc.setFontSize(11); 
            doc.setTextColor(30, 41, 59); 
            doc.setFont('helvetica', 'bold'); 
            doc.text(section.toUpperCase(), 18, y + 6.5);
            y += 16;
            
            questions.forEach((q, i) => {
                if (y > 270) { doc.addPage(); y = 20; }
                
                // Question Text
                doc.setFontSize(10); 
                doc.setTextColor(30, 41, 59); 
                doc.setFont('helvetica', 'bold');
                const qText = doc.splitTextToSize(`Q${i + 1}. ${q.questionText}`, 170); 
                doc.text(qText, 14, y); 
                y += (qText.length * 5) + 3;
                
                // Options List
                doc.setFont('helvetica', 'normal');
                q.options.forEach((opt, idx) => {
                    const isCorrect = String(idx) === String(q.correctAnswer);
                    
                    if (isCorrect) { 
                        doc.setFillColor(220, 252, 231); // emerald-100
                        doc.setDrawColor(16, 185, 129);  // emerald-500
                    } else { 
                        doc.setFillColor(255, 255, 255);
                        doc.setDrawColor(226, 232, 240); // slate-200
                    }
                    
                    const optText = doc.splitTextToSize(`${String.fromCharCode(65 + idx)}. ${opt}`, 160);
                    const boxHeight = (optText.length * 5) + 4;
                    
                    if (y + boxHeight > 285) { doc.addPage(); y = 20; }
                    
                    doc.rect(20, y, 170, boxHeight, 'FD');
                    
                    if (isCorrect) {
                        doc.setTextColor(6, 95, 70); // emerald-800
                        doc.setFont('helvetica', 'bold');
                    } else {
                        doc.setTextColor(100, 116, 139); // slate-500
                        doc.setFont('helvetica', 'normal');
                    }
                    
                    doc.text(optText, 24, y + 5); 
                    y += boxHeight + 2;
                });
                y += 6;
            });
        });
        
        doc.save(`AnswerKey_Roll_${studentRoll}.pdf`);
        notify('Answer key downloaded', 'success');
    } catch (err) { notify(err.message, 'error'); } finally { btn.disabled = false; btn.innerHTML = originalText; if (window.lucide) lucide.createIcons(); }
}

