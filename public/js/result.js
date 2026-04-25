document.addEventListener('DOMContentLoaded', async () => {
    const sessionUserStr = sessionStorage.getItem('user');
    if (!sessionUserStr) { window.location.href = '/'; return; }

    const user = JSON.parse(sessionUserStr);
    document.getElementById('studentGreeting').textContent = `Great job, ${user.name}! Here are your results.`;

    try {
        const result = await api.getResult(user.rollNumber);

        // --- Populate counts ---
        document.getElementById('centerScore').textContent = result.totalScore;
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
            const pct = (score / 6) * 100;
            let barColor = 'bg-primary-500';
            if (pct === 100) barColor = 'bg-emerald-500';
            else if (pct < 50) barColor = 'bg-red-500';
            else if (pct < 80) barColor = 'bg-yellow-500';

            const div = document.createElement('div');
            div.className = 'bg-dark-900/50 p-4 rounded-xl border border-dark-700';
            div.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium text-slate-200 text-sm">${sec}</span>
                    <span class="text-sm font-bold text-white">${score}<span class="text-slate-500 font-normal">/6</span></span>
                </div>
                <div class="w-full bg-dark-800 rounded-full h-2.5 overflow-hidden">
                    <div class="${barColor} h-2.5 rounded-full transition-all duration-1000 ease-out" style="width:0%"></div>
                </div>`;
            container.appendChild(div);
            setTimeout(() => { div.querySelector('div > div').style.width = `${pct}%`; }, 100);
        });

    } catch (error) {
        console.error(error);
        alert('Failed to load results: ' + error.message);
    }
});
