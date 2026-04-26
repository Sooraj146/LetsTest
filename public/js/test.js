// ================================================================
// Mobile Sidebar Toggle
// ================================================================
function openSidebar() {
    document.getElementById('sidebar').classList.remove('-translate-x-full');
    document.getElementById('sidebarOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // prevent background scroll
}
function closeSidebar() {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('sidebarOverlay').classList.add('hidden');
    document.body.style.overflow = '';
}
// Auto-close sidebar on mobile when a question number is tapped
function closeSidebarOnMobile() {
    if (window.innerWidth < 768) closeSidebar();
}

document.addEventListener('DOMContentLoaded', async () => {
    // --- Auth Check ---
    const sessionUserStr = sessionStorage.getItem('user');
    if (!sessionUserStr) { window.location.href = '/'; return; }
    const user = JSON.parse(sessionUserStr);
    if (user.isSubmitted) { window.location.href = '/result.html'; return; }

    document.getElementById('studentName').textContent = user.name;

    // --- State ---
    let questions = [];
    let sections = [];
    let currentSectionIndex = 0;
    let currentQuestionIndex = 0;
    let expandedSections = new Set([0]); // track which section dropdowns are open

    const savedAnswersKey = `answers_${user.rollNumber}`;
    let answers = JSON.parse(localStorage.getItem(savedAnswersKey)) || {};

    // --- DOM ---
    const sectionNav         = document.getElementById('sectionNav');
    const currentSectionTitle = document.getElementById('currentSectionTitle');
    const currentQuestionNum  = document.getElementById('currentQuestionNum');
    const questionText        = document.getElementById('questionText');
    const optionsContainer    = document.getElementById('optionsContainer');
    const prevBtn             = document.getElementById('prevBtn');
    const nextBtn             = document.getElementById('nextBtn');
    const loader              = document.getElementById('loader');
    const questionContainer   = document.getElementById('questionContainer');
    const progressText        = document.getElementById('progressText');
    const progressBar         = document.getElementById('progressBar');

    // --- Fetch Questions ---
    try {
        loader.classList.remove('hidden');
        const raw = await api.getQuestions();

        // Group by section preserving insertion order
        const grouped = {};
        raw.forEach(q => {
            if (!grouped[q.section]) grouped[q.section] = [];
            grouped[q.section].push(q);
        });
        sections = Object.keys(grouped);
        sections.forEach(s => { questions = questions.concat(grouped[s]); });

        initButtons();
        renderSidebar();
        renderQuestion();
        updateProgress();

        loader.classList.add('hidden');
        questionContainer.classList.remove('opacity-0');
    } catch (err) {
        alert('Failed to load questions. Please refresh.');
        console.error(err);
    }

    // --- Timer Logic ---
    try {
        const settings = await api.getSettings();
        if (settings.endTime) {
            const endD = new Date(settings.endTime);
            const timerContainer = document.getElementById('testTimerContainer');
            const timerDisplay = document.getElementById('testTimerDisplay');
            timerContainer.style.display = 'block';

            const updateTimer = () => {
                const diff = endD - new Date();
                if (diff <= 0) {
                    clearInterval(window.testTimerInterval);
                    timerDisplay.textContent = '00:00';
                    timerDisplay.classList.remove('text-primary-400');
                    timerDisplay.classList.add('text-red-400');
                    // Auto submit
                    submitTest();
                    return;
                }

                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / 1000 / 60) % 60);
                const s = Math.floor((diff / 1000) % 60);

                let timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                if (h > 0) timeStr = `${h.toString().padStart(2, '0')}:` + timeStr;
                
                timerDisplay.textContent = timeStr;
                
                // Turn red when less than 5 minutes left
                if (diff < 5 * 60 * 1000) {
                    timerDisplay.classList.remove('text-primary-400');
                    timerDisplay.classList.add('text-red-400', 'animate-pulse');
                    timerContainer.classList.remove('border-primary-500/30');
                    timerContainer.classList.add('border-red-500/50');
                }
            };
            
            updateTimer();
            window.testTimerInterval = setInterval(updateTimer, 1000);
        }
    } catch (err) {
        console.error('Failed to load timer settings', err);
    }

    // --- Init nav buttons ---
    function initButtons() {
        prevBtn.addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                updateSectionIndex();
                renderSidebar();
                renderQuestion();
            }
        });
        nextBtn.addEventListener('click', () => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                updateSectionIndex();
                renderSidebar();
                renderQuestion();
            }
        });

        document.getElementById('finalSubmitBtn').addEventListener('click', openModal);
        document.getElementById('cancelSubmitBtn').addEventListener('click', closeModal);
        document.getElementById('confirmSubmitBtn').addEventListener('click', submitTest);
    }

    function updateSectionIndex() {
        const q = questions[currentQuestionIndex];
        currentSectionIndex = sections.indexOf(q.section);
        expandedSections.add(currentSectionIndex); // auto-expand active section
    }

    // ================================================================
    // SIDEBAR — section headers + question-number grid with tick marks
    // ================================================================
    function renderSidebar() {
        sectionNav.innerHTML = '';

        sections.forEach((sec, secIdx) => {
            const secQuestions  = questions.filter(q => q.section === sec);
            const answeredInSec = secQuestions.filter(q => answers[q._id]).length;
            const isCompleted   = answeredInSec === secQuestions.length;
            const isActive      = secIdx === currentSectionIndex;
            const isExpanded    = expandedSections.has(secIdx);

            // Wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'mb-1';

            // ---- Section Header ----
            const header = document.createElement('button');
            header.className = `w-full flex justify-between items-center px-3 py-2.5 rounded-lg transition-all text-left ${
                isActive
                    ? 'bg-primary-600/20 border border-primary-500/40 text-white'
                    : 'border border-transparent hover:bg-dark-800 text-slate-400 hover:text-white'
            }`;
            header.innerHTML = `
                <div class="flex items-center gap-2 min-w-0">
                    ${isCompleted
                        ? `<svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                               <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                           </svg>`
                        : `<span class="w-4 h-4 flex-shrink-0 inline-block"></span>`}
                    <span class="font-medium text-sm truncate">${sec}</span>
                </div>
                <div class="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span class="text-xs ${isActive ? 'text-primary-400' : 'text-slate-600'}">${answeredInSec}/6</span>
                    <svg class="w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isActive ? 'text-primary-400' : 'text-slate-600'}"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>`;

            header.addEventListener('click', () => {
                // Toggle expand/collapse for this section
                if (expandedSections.has(secIdx)) {
                    if (secIdx !== currentSectionIndex) expandedSections.delete(secIdx);
                } else {
                    expandedSections.add(secIdx);
                }
                // Navigate to first question in this section
                closeSidebarOnMobile();
                const firstIdx = questions.findIndex(q => q.section === sec);
                currentQuestionIndex = firstIdx;
                currentSectionIndex = secIdx;
                expandedSections.add(secIdx);
                renderSidebar();
                renderQuestion();
            });

            // ---- Question Number Grid (dropdown) ----
            const dropdown = document.createElement('div');
            dropdown.className = `overflow-hidden transition-all duration-200 ${isExpanded ? '' : 'hidden'}`;

            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-6 gap-1.5 px-2 py-2 mt-0.5';

            secQuestions.forEach((q, qIdxInSec) => {
                const isAnswered = !!answers[q._id];
                const globalIdx  = questions.indexOf(q);
                const isCurrent  = globalIdx === currentQuestionIndex;

                const btn = document.createElement('button');
                btn.title = `Question ${qIdxInSec + 1}`;
                btn.className = `relative flex items-center justify-center h-8 rounded-md text-xs font-bold transition-all duration-150 ${
                    isCurrent
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50 ring-2 ring-primary-400 ring-offset-1 ring-offset-dark-900'
                        : isAnswered
                            ? 'bg-green-500/15 text-green-400 border border-green-500/40 hover:bg-green-500/30'
                            : 'bg-dark-800 text-slate-500 border border-dark-700 hover:border-slate-500 hover:text-slate-300'
                }`;

                btn.innerHTML = `${qIdxInSec + 1}
                    ${isAnswered && !isCurrent
                        ? `<span class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-dark-900"></span>`
                        : ''}`;

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentQuestionIndex = globalIdx;
                    currentSectionIndex  = secIdx;
                    expandedSections.add(secIdx);
                    closeSidebarOnMobile();
                    renderSidebar();
                    renderQuestion();
                });

                grid.appendChild(btn);
            });

            dropdown.appendChild(grid);
            wrapper.appendChild(header);
            wrapper.appendChild(dropdown);
            sectionNav.appendChild(wrapper);
        });
    }

    // ================================================================
    // QUESTION RENDERER
    // ================================================================
    function renderQuestion() {
        questionContainer.classList.add('opacity-0');
        setTimeout(() => {
            const q = questions[currentQuestionIndex];
            const sectionStart = questions.findIndex(qst => qst.section === q.section);

            currentSectionTitle.textContent = q.section;
            currentQuestionNum.textContent  = currentQuestionIndex - sectionStart + 1;
            questionText.textContent        = q.questionText;
            optionsContainer.innerHTML      = '';

            q.options.forEach((opt) => {
                const isSelected = answers[q._id] === opt;

                const label = document.createElement('label');
                label.className = `option-wrapper flex items-center p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected ? 'selected' : 'border-dark-700 bg-dark-800 hover:bg-dark-700'
                }`;
                label.innerHTML = `
                    <input type="radio" name="q_${q._id}" value="${opt}" class="radio-custom" ${isSelected ? 'checked' : ''}>
                    <span class="ml-4 option-label text-slate-300 font-medium">${opt}</span>`;

                label.querySelector('input').addEventListener('change', (e) => {
                    answers[q._id] = e.target.value;
                    localStorage.setItem(savedAnswersKey, JSON.stringify(answers));

                    // Update option styles without full re-render
                    Array.from(optionsContainer.children).forEach(c => {
                        c.classList.remove('selected');
                        c.classList.add('border-dark-700', 'bg-dark-800');
                    });
                    label.classList.add('selected');
                    label.classList.remove('border-dark-700', 'bg-dark-800');

                    updateProgress();
                    renderSidebar();
                });

                optionsContainer.appendChild(label);
            });

            prevBtn.disabled = currentQuestionIndex === 0;
            nextBtn.disabled = currentQuestionIndex === questions.length - 1;
            questionContainer.classList.remove('opacity-0');
        }, 150);
    }

    function updateProgress() {
        const answered = Object.keys(answers).length;
        const total    = questions.length;
        progressText.textContent = `${answered}/${total}`;
        progressBar.style.width  = `${(answered / total) * 100}%`;
    }

    // ================================================================
    // MODAL
    // ================================================================
    function openModal() {
        const modal = document.getElementById('submitModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }
    function closeModal() {
        const modal = document.getElementById('submitModal');
        modal.classList.add('opacity-0');
        setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
    }

    // ================================================================
    // SUBMIT
    // ================================================================
    async function submitTest() {
        const btn = document.getElementById('confirmSubmitBtn');
        btn.disabled = true;
        btn.textContent = 'Submitting...';
        try {
            await api.submitTest({ rollNumber: user.rollNumber, answers });
            user.isSubmitted = true;
            sessionStorage.setItem('user', JSON.stringify(user));
            localStorage.removeItem(savedAnswersKey);
            window.location.href = '/result.html';
        } catch (err) {
            alert(err.message || 'Submission failed');
            btn.disabled = false;
            btn.textContent = 'Yes, Submit';
            closeModal();
        }
    }
});
