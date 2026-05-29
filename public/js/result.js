document.addEventListener('DOMContentLoaded', async () => {
    const sessionUserStr = sessionStorage.getItem('user');
    if (!sessionUserStr) { window.location.href = '/'; return; }

    const user    = JSON.parse(sessionUserStr);
    // examId comes from URL (?examId=xxx) — allows direct linking from exam dashboard
    const examId  = new URLSearchParams(window.location.search).get('examId') || user.examId;
    if (!examId) { window.location.href = '/'; return; }

    document.getElementById('studentGreeting').textContent = `Great job, ${user.name}! Here are your results.`;

    try {
        const result = await api.getResult(examId, user.rollNumber);

        // --- Populate counts ---
        document.getElementById('centerScore').textContent = result.totalScore;
        document.getElementById('totalQuestionsLabel').textContent = result.totalQuestions ?? '?';
        document.getElementById('correctCount').textContent = result.correctCount;
        document.getElementById('wrongCount').textContent = result.wrongCount;
        document.getElementById('skippedCount').textContent = result.unattemptedCount;

        const accuracy = result.answeredCount > 0
            ? Math.round((result.correctCount / result.answeredCount) * 100)
            : 0;
        document.getElementById('accuracyBadge').textContent = `${accuracy}% Accuracy`;

        // --- Donut Chart ---
        const ctx = document.getElementById('donutChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Correct', 'Wrong', 'Skipped'],
                datasets: [{
                    data: [result.correctCount, result.wrongCount, result.unattemptedCount],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.85)',  // emerald
                        'rgba(239, 68, 68, 0.85)',    // red
                        'rgba(71, 85, 105, 0.6)',     // slate
                    ],
                    borderColor: [
                        'rgba(16, 185, 129, 1)',
                        'rgba(239, 68, 68, 1)',
                        'rgba(71, 85, 105, 1)',
                    ],
                    borderWidth: 2,
                    hoverOffset: 8,
                }]
            },
            options: {
                cutout: '70%',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.raw} questions`
                        }
                    }
                },
                animation: { animateRotate: true, duration: 1200, easing: 'easeInOutQuart' }
            }
        });

        // --- Section Breakdown bars ---
        const container = document.getElementById('sectionScoresContainer');
        container.innerHTML = '';
        const sections = Object.keys(result.sectionScores);

        sections.forEach((sec) => {
            const score = result.sectionScores[sec];
            const sectionTotal = (result.sectionTotals && result.sectionTotals[sec]) || 6;
            const pct = (score / sectionTotal) * 100;
            let barColor = 'bg-primary-500';
            if (pct === 100) barColor = 'bg-emerald-500';
            else if (pct < 50)  barColor = 'bg-red-500';
            else if (pct < 80)  barColor = 'bg-yellow-500';

            const div = document.createElement('div');
            div.className = 'bg-dark-900/50 p-4 rounded-xl border border-dark-700';
            div.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium text-slate-200 text-sm">${sec}</span>
                    <span class="text-sm font-bold text-white">${score}<span class="text-slate-500 font-normal">/${sectionTotal}</span></span>
                </div>
                <div class="w-full bg-dark-800 rounded-full h-2.5 overflow-hidden">
                    <div class="progress-bar ${barColor} h-2.5 rounded-full transition-all duration-1000 ease-out" style="width:0%"></div>
                </div>`;
            container.appendChild(div);
            // Brief timeout so browser renders 0% first, then animates
            setTimeout(() => { div.querySelector('.progress-bar').style.width = `${pct}%`; }, 120);
        });

    } catch (error) {
        console.error(error);
        alert('Failed to load results: ' + error.message);
    }
});

// ================================================================
// ANSWER KEY PDF (generated dynamically from live DB questions)
// ================================================================
async function downloadAnswerKey() {
    const btn = document.getElementById('answerKeyBtn');
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin w-5 h-5 text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Generating...`;

    try {
        const resp = await fetch(`/api/questions/answer-key?examId=${examId}`);
        if (!resp.ok) throw new Error('Failed to fetch answer key');
        const data = await resp.json();   // { sections: [...], questions: { section: [...] } }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('portrait', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        const margin = 14;
        const colW = pageWidth - margin * 2;

        // ── Title ──
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59);
        doc.text('MCA Test — Answer Key', margin, 18);

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 25);

        let y = 32;
        let qNum = 0;

        data.sections.forEach(section => {
            const qs = data.questions[section];

            // ── Section header ──
            if (y > 265) { doc.addPage(); y = 16; }
            doc.setFontSize(11);
            doc.setTextColor(37, 99, 235);
            doc.setFont(undefined, 'bold');
            doc.text(section, margin, y);
            doc.setFont(undefined, 'normal');
            y += 6;

            qs.forEach(q => {
                qNum++;
                const optionLabels = ['A', 'B', 'C', 'D'];

                // Question text (wrapped)
                doc.setFontSize(9.5);
                doc.setTextColor(30, 41, 59);
                const qLines = doc.splitTextToSize(`Q${qNum}. ${q.questionText}`, colW);
                const qBlockH = qLines.length * 5 + 2;

                if (y + qBlockH + 28 > 282) { doc.addPage(); y = 16; }

                doc.text(qLines, margin, y);
                y += qBlockH;

                // Options
                q.options.forEach((opt, idx) => {
                    const isCorrect = opt === q.correctAnswer;
                    const label = `   ${optionLabels[idx]}. `;

                    const optLines = doc.splitTextToSize(label + opt, colW - 6);
                    const optH = optLines.length * 4.5 + 1;

                    if (y + optH > 282) { doc.addPage(); y = 16; }

                    if (isCorrect) {
                        // Highlight correct answer row
                        doc.setFillColor(220, 252, 231); // light green
                        doc.roundedRect(margin - 1, y - 3.5, colW + 2, optH + 1, 1.5, 1.5, 'F');
                        doc.setTextColor(22, 101, 52);   // dark green text
                        doc.setFont(undefined, 'bold');
                    } else {
                        doc.setTextColor(71, 85, 105);
                        doc.setFont(undefined, 'normal');
                    }

                    doc.setFontSize(9);
                    doc.text(optLines, margin + 1, y);
                    y += optH;
                });

                // Correct answer label — use plain ASCII, jsPDF standard font
                // doesn't support Unicode symbols (★ renders as spaced garbage)
                doc.setFont(undefined, 'bold');
                doc.setTextColor(22, 101, 52);
                const ansLabel = `[ANS] ${q.correctAnswer}`;
                const ansLines = doc.splitTextToSize(ansLabel, colW - 10);
                doc.text(ansLines, margin + 4, y);
                doc.setFont(undefined, 'normal');
                y += ansLines.length * 4.5 + 5; // gap between questions
            });

            y += 4; // extra gap between sections
        });

        // ── Page numbers ──
        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`MCA Test — Answer Key | Page ${i} of ${pages}`, margin, doc.internal.pageSize.height - 8);
        }

        doc.save(`MCA_Test_Answer_Key_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
        alert('Could not generate answer key: ' + err.message);
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> Download Answer Key`;
    }
}
