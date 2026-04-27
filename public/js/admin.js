// ================================================================
// Admin Dashboard JavaScript
// ================================================================

let adminPassword = null;
let allLeaderboard = [];
let allAnalytics = [];
let allAdminQuestions = [];
let analyticsChart = null;
let activeAnalyticsSection = null;
let activeQSection = 'All';
let editingQuestionId = null;
let deletingQuestionId = null;
let selectedCorrectAnswer = null;

// ----------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------
const adminFetch = (url, options = {}) => {
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
            ...(options.headers || {}),
        },
    });
};

// ----------------------------------------------------------------
// AUTH
// ----------------------------------------------------------------
async function adminLogin() {
    const pwd = document.getElementById('adminPasswordInput').value;
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    if (!pwd) { showLoginError('Please enter a password.'); return; }

    btn.textContent = 'Checking...'; btn.disabled = true;

    // Must set adminPassword BEFORE calling adminFetch,
    // because adminFetch reads adminPassword to set the header.
    adminPassword = pwd;

    const res = await adminFetch('/api/admin/leaderboard', { method: 'GET' });

    if (res.status === 401) {
        adminPassword = null; // reset on failure
        showLoginError('Incorrect password. Please try again.');
        btn.textContent = 'Login'; btn.disabled = false;
        return;
    }

    // Password is correct — save and show dashboard
    sessionStorage.setItem('adminPassword', pwd);
    document.getElementById('loginScreen').classList.add('hidden');
    const dash = document.getElementById('dashboard');
    dash.classList.remove('hidden');
    dash.classList.add('flex');

    await loadLeaderboard();
}

// Try to restore session on load
window.addEventListener('DOMContentLoaded', () => {
    const saved = sessionStorage.getItem('adminPassword');
    if (saved) {
        adminPassword = saved;
        document.getElementById('loginScreen').classList.add('hidden');
        const dash = document.getElementById('dashboard');
        dash.classList.remove('hidden');
        dash.classList.add('flex');
        loadLeaderboard();
    }

    document.getElementById('adminPasswordInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') adminLogin();
    });

    // Init option inputs for modal
    renderOptionInputs();
});

function showLoginError(msg) {
    const el = document.getElementById('loginError');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function adminLogout() {
    sessionStorage.removeItem('adminPassword');
    adminPassword = null;
    window.location.reload();
}

// ----------------------------------------------------------------
// TAB NAVIGATION
// ----------------------------------------------------------------
let analyticsLoaded = false;
let questionsLoaded = false;

function switchTab(tab) {
    ['leaderboard', 'analytics', 'questions', 'settings'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.add('hidden');
    });
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active-tab');
    document.getElementById(`tab-${tab}`).classList.remove('hidden');

    if (tab === 'analytics' && !analyticsLoaded) { loadAnalytics(); analyticsLoaded = true; }
    if (tab === 'questions' && !questionsLoaded) { loadAdminQuestions(); questionsLoaded = true; }
    if (tab === 'settings') { loadSettings(); }
}

// ----------------------------------------------------------------
// LEADERBOARD
// ----------------------------------------------------------------
async function loadLeaderboard() {
    const res = await adminFetch('/api/admin/leaderboard');
    if (res.status === 401) { adminLogout(); return; }
    allLeaderboard = await res.json();
    renderLeaderboard(allLeaderboard);
}

function renderLeaderboard(data) {
    // Stat cards
    document.getElementById('statTotal').textContent = data.length;
    if (data.length > 0) {
        const avg = (data.reduce((s, u) => s + u.totalScore, 0) / data.length).toFixed(1);
        const high = data[0].totalScore;
        const passed = data.filter(u => u.totalScore >= 15).length;
        document.getElementById('statAvg').textContent = avg;
        document.getElementById('statHigh').textContent = high;
        document.getElementById('statPass').textContent = Math.round((passed / data.length) * 100) + '%';
    }

    const medals = ['🥇', '🥈', '🥉'];
    const tbody = document.getElementById('leaderboardBody');
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-10 text-slate-500">No submissions yet.</td></tr>`;
        return;
    }

    const sections = ['Age Calculation', 'Profit & Loss', 'Analogy', 'Time & Work', 'Number Series'];
    tbody.innerHTML = data.map((u, i) => `
        <tr class="hover:bg-dark-800/50 transition-colors">
            <td class="px-4 py-3 font-semibold ${i < 3 ? 'text-yellow-400' : 'text-slate-400'}">
                ${i < 3 ? medals[i] : `#${u.rank}`}
            </td>
            <td class="px-4 py-3 font-medium text-white">${u.name}</td>
            <td class="px-4 py-3 text-slate-400 font-mono text-xs">${u.rollNumber}</td>
            ${sections.map(s => `<td class="px-4 py-3 text-center text-slate-300">${u.sectionScores?.[s] ?? '-'}</td>`).join('')}
            <td class="px-4 py-3 text-center">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                    u.totalScore >= 24 ? 'bg-emerald-500/20 text-emerald-400' :
                    u.totalScore >= 15 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                }">${u.totalScore}/30</span>
            </td>
        </tr>`).join('');
}

function filterTable(query) {
    const q = query.toLowerCase();
    const filtered = allLeaderboard.filter(u =>
        u.name.toLowerCase().includes(q) || u.rollNumber.toLowerCase().includes(q)
    );
    renderLeaderboard(filtered);
}

// ----------------------------------------------------------------
// ANALYTICS
// ----------------------------------------------------------------
async function loadAnalytics() {
    const res = await adminFetch('/api/admin/analytics');
    allAnalytics = await res.json();

    // Build section filter pills
    const sections = [...new Set(allAnalytics.map(a => a.section))];
    const filterContainer = document.getElementById('sectionFilterBtns');
    filterContainer.innerHTML = sections.map(s => `
        <button class="filter-pill ${s === sections[0] ? 'active-pill' : ''}"
                onclick="switchAnalyticsSection('${s}', this)">${s}</button>
    `).join('');

    if (sections.length) switchAnalyticsSection(sections[0], filterContainer.querySelector('.active-pill'));
}

function switchAnalyticsSection(section, btn) {
    activeAnalyticsSection = section;
    document.querySelectorAll('#sectionFilterBtns .filter-pill').forEach(b => b.classList.remove('active-pill'));
    btn.classList.add('active-pill');
    renderAnalyticsChart(section);
    renderAnalyticsTable(section);
}

function renderAnalyticsChart(section) {
    const data = allAnalytics.filter(a => a.section === section);
    const labels = data.map((_, i) => `Q${i + 1}`);
    const correct = data.map(d => d.correctCount);
    const wrong   = data.map(d => d.wrongCount);
    const skip    = data.map(d => d.unattemptedCount);

    document.getElementById('analyticsTitle').textContent = `${section} — Per-Question Performance`;

    if (analyticsChart) analyticsChart.destroy();

    const ctx = document.getElementById('analyticsChart').getContext('2d');
    analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Correct',  data: correct, backgroundColor: 'rgba(16,185,129,0.8)', borderRadius: 4, borderSkipped: false },
                { label: 'Wrong',    data: wrong,   backgroundColor: 'rgba(239,68,68,0.8)',   borderRadius: 4, borderSkipped: false },
                { label: 'Skipped',  data: skip,    backgroundColor: 'rgba(71,85,105,0.6)',   borderRadius: 4, borderSkipped: false },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
                tooltip: { callbacks: { title: (i) => {
                    const q = data[i[0].dataIndex];
                    return q ? q.questionText.substring(0, 60) + '...' : '';
                }}}
            },
            scales: {
                x: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51,65,85,0.5)' } },
                y: { stacked: true, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(51,65,85,0.5)' } }
            }
        }
    });
}

function renderAnalyticsTable(section) {
    const data = allAnalytics.filter(a => a.section === section);
    const tbody = document.getElementById('analyticsBody');
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500">No data yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map((d, i) => {
        const pct = d.totalStudents > 0 ? Math.round((d.correctCount / d.totalStudents) * 100) : 0;
        return `
        <tr class="hover:bg-dark-800/40 transition-colors">
            <td class="px-4 py-3 text-slate-300 max-w-xs">
                <span class="text-slate-500 mr-2 font-mono text-xs">Q${i + 1}</span>${d.questionText.substring(0, 80)}...
            </td>
            <td class="px-4 py-3 text-center text-emerald-400 font-semibold">${d.correctCount}</td>
            <td class="px-4 py-3 text-center text-red-400 font-semibold">${d.wrongCount}</td>
            <td class="px-4 py-3 text-center text-slate-500">${d.unattemptedCount}</td>
            <td class="px-4 py-3 text-center">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                    pct >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                    pct >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                }">${pct}%</span>
            </td>
        </tr>`;
    }).join('');
}

// ----------------------------------------------------------------
// QUESTION MANAGEMENT
// ----------------------------------------------------------------
async function loadAdminQuestions() {
    const res = await adminFetch('/api/admin/questions');
    allAdminQuestions = await res.json();
    renderSectionFilter();
    renderQuestions('All');
}

function renderSectionFilter() {
    const sections = ['All', ...new Set(allAdminQuestions.map(q => q.section))];
    const el = document.getElementById('qSectionFilter');
    el.innerHTML = sections.map(s => `
        <button class="filter-pill ${s === activeQSection ? 'active-pill' : ''}"
                onclick="filterQuestions('${s}', this)">${s}</button>
    `).join('');
    // Populate datalist for modal
    const dl = document.getElementById('sectionsList');
    dl.innerHTML = [...new Set(allAdminQuestions.map(q => q.section))]
        .map(s => `<option value="${s}">`).join('');
}

function filterQuestions(section, btn) {
    activeQSection = section;
    document.querySelectorAll('#qSectionFilter .filter-pill').forEach(b => b.classList.remove('active-pill'));
    btn.classList.add('active-pill');
    renderQuestions(section);
}

function renderQuestions(section) {
    const filtered = section === 'All' ? allAdminQuestions : allAdminQuestions.filter(q => q.section === section);
    const container = document.getElementById('questionsList');
    if (!filtered.length) {
        container.innerHTML = `<p class="text-slate-500 text-center py-10">No questions found.</p>`;
        return;
    }
    container.innerHTML = filtered.map((q) => `
        <div class="glass-panel border border-dark-700 rounded-xl p-5">
            <div class="flex justify-between items-start gap-4">
                <div class="flex-1 min-w-0">
                    <span class="inline-block px-2 py-0.5 text-xs font-semibold bg-primary-600/20 text-primary-400 border border-primary-500/30 rounded-full mb-2">${q.section}</span>
                    <p class="text-white font-medium text-sm leading-relaxed">${q.questionText}</p>
                    <div class="mt-3 grid grid-cols-2 gap-2">
                        ${q.options.map(opt => `
                            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg ${opt === q.correctAnswer ? 'bg-emerald-500/15 border border-emerald-500/40' : 'bg-dark-800/60 border border-dark-700'}">
                                ${opt === q.correctAnswer ? `<svg class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>` : `<span class="w-3.5 h-3.5 flex-shrink-0"></span>`}
                                <span class="text-xs ${opt === q.correctAnswer ? 'text-emerald-300 font-semibold' : 'text-slate-400'} truncate">${opt}</span>
                            </div>`).join('')}
                    </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    <button onclick="openQuestionModal('${q._id}')" class="p-2 rounded-lg border border-dark-600 hover:bg-dark-700 text-slate-400 hover:text-white transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button onclick="openDeleteModal('${q._id}')" class="p-2 rounded-lg border border-red-500/30 hover:bg-red-500/20 text-red-400 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        </div>`).join('');
}

// ----------------------------------------------------------------
// QUESTION MODAL
// ----------------------------------------------------------------
function renderOptionInputs(options = ['', '', '', ''], correctAnswer = null) {
    selectedCorrectAnswer = correctAnswer;
    const container = document.getElementById('optionsForm');
    container.innerHTML = options.map((opt, i) => `
        <div class="flex items-center gap-3">
            <input type="radio" name="correctOpt" id="radio_${i}" class="radio-custom"
                   ${selectedCorrectAnswer === opt && opt !== '' ? 'checked' : ''}
                   onchange="selectedCorrectAnswer = document.getElementById('optInput_${i}').value">
            <input type="text" id="optInput_${i}" value="${opt}" placeholder="Option ${i + 1}"
                   class="flex-1 px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none text-white placeholder-slate-500 text-sm"
                   oninput="if(document.getElementById('radio_${i}').checked) selectedCorrectAnswer = this.value">
        </div>`).join('');
}

function openQuestionModal(id) {
    editingQuestionId = id;
    document.getElementById('modalError').classList.add('hidden');

    if (!id) {
        document.getElementById('modalTitle').textContent = 'Add New Question';
        document.getElementById('mSection').value = '';
        document.getElementById('mQuestion').value = '';
        renderOptionInputs();
    } else {
        const q = allAdminQuestions.find(q => q._id === id);
        document.getElementById('modalTitle').textContent = 'Edit Question';
        document.getElementById('mSection').value = q.section;
        document.getElementById('mQuestion').value = q.questionText;
        renderOptionInputs(q.options, q.correctAnswer);
    }

    const modal = document.getElementById('questionModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeQuestionModal() {
    const modal = document.getElementById('questionModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    editingQuestionId = null;
    selectedCorrectAnswer = null;
}

async function saveQuestion() {
    const section       = document.getElementById('mSection').value.trim();
    const questionText  = document.getElementById('mQuestion').value.trim();
    const options       = [0,1,2,3].map(i => document.getElementById(`optInput_${i}`).value.trim());
    const correctAnswer = selectedCorrectAnswer?.trim() ||
        options.find((_, i) => document.getElementById(`radio_${i}`).checked);

    const errEl = document.getElementById('modalError');
    if (!section || !questionText || options.some(o => !o) || !correctAnswer) {
        errEl.textContent = 'All fields are required and a correct answer must be selected.';
        errEl.classList.remove('hidden'); return;
    }
    if (!options.includes(correctAnswer)) {
        errEl.textContent = 'Correct answer must match one of the options.';
        errEl.classList.remove('hidden'); return;
    }

    const btn = document.getElementById('modalSaveBtn');
    btn.disabled = true; btn.textContent = 'Saving...';

    const body = JSON.stringify({ section, questionText, options, correctAnswer });
    const url  = editingQuestionId ? `/api/admin/questions/${editingQuestionId}` : '/api/admin/questions';
    const method = editingQuestionId ? 'PUT' : 'POST';

    const res = await adminFetch(url, { method, body });
    const data = await res.json();

    btn.disabled = false; btn.textContent = 'Save';

    if (!res.ok) { errEl.textContent = data.message; errEl.classList.remove('hidden'); return; }

    closeQuestionModal();
    questionsLoaded = false;
    await loadAdminQuestions();
}

// ----------------------------------------------------------------
// DELETE MODAL
// ----------------------------------------------------------------
function openDeleteModal(id) {
    deletingQuestionId = id;
    const modal = document.getElementById('deleteModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('confirmDeleteBtn').onclick = async () => {
        const res = await adminFetch(`/api/admin/questions/${deletingQuestionId}`, { method: 'DELETE' });
        if (res.ok) {
            closeDeleteModal();
            questionsLoaded = false;
            await loadAdminQuestions();
        }
    };
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    deletingQuestionId = null;
}

// ----------------------------------------------------------------
// DOWNLOAD DROPDOWN
// ----------------------------------------------------------------
function toggleDownloadMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('downloadMenu');
    menu.classList.toggle('hidden');
}
function closeDownloadMenu() {
    document.getElementById('downloadMenu').classList.add('hidden');
}
// Close when clicking anywhere outside
document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('downloadDropdownWrapper');
    if (wrapper && !wrapper.contains(e.target)) closeDownloadMenu();
});

// ----------------------------------------------------------------
// CSV DOWNLOAD  (fully dynamic — no hardcoded section names)
// ----------------------------------------------------------------
function downloadCSV() {
    if (!allLeaderboard.length) {
        alert('No student data to export yet.');
        return;
    }

    // Dynamically extract all section names from the actual data
    const sectionSet = new Set();
    allLeaderboard.forEach(u => Object.keys(u.sectionScores || {}).forEach(s => sectionSet.add(s)));
    const sections = [...sectionSet];

    // Helper: escape a cell value for CSV (wrap in quotes if it contains comma/quote/newline)
    const escapeCSV = (val) => {
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"` 
            : str;
    };

    // Build header row — dynamic sections in the middle
    const headers = ['Rank', 'Name', 'Roll No', ...sections, 'Total Score', 'Total (fraction)'];
    const rows = [headers.map(escapeCSV).join(',')];

    // Build data rows
    allLeaderboard.forEach(u => {
        const row = [
            u.rank,
            u.name,
            u.rollNumber,
            ...sections.map(s => u.sectionScores?.[s] ?? 0),
            u.totalScore,
            `${u.totalScore}/${sections.reduce((acc, s) => acc + (u.sectionScores?.[s] !== undefined ? 6 : 0), 0) || 30}`,
        ];
        rows.push(row.map(escapeCSV).join(','));
    });

    // Trigger download
    const csvContent = '\uFEFF' + rows.join('\r\n'); // \uFEFF = BOM for Excel UTF-8 detection
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `MCA_Test_Results_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------
// PDF DOWNLOAD
// ----------------------------------------------------------------
function downloadPDF() {
    if (!allLeaderboard.length) {
        alert('No student data to export yet.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');

    // --- Dynamically extract all section names from actual data ---
    const sectionSet = new Set();
    allLeaderboard.forEach(u => Object.keys(u.sectionScores || {}).forEach(s => sectionSet.add(s)));
    const sections = [...sectionSet];

    // Short labels for headers (keeps the PDF compact)
    const shortLabel = s => s
        .replace('Age Calculation', 'Age Calc')
        .replace('Profit & Loss', 'P&L')
        .replace('Time & Work', 'T&W')
        .replace('Number Series', 'Num Series');

    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('MCA Test - Student Progress Report', 14, 18);

    // Subtitle
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    doc.text(`Total Students: ${allLeaderboard.length}`, 14, 32);

    // Build rows — section columns are fully dynamic
    const rows = allLeaderboard.map(u => [
        u.rank,
        u.name,
        u.rollNumber,
        ...sections.map(s => u.sectionScores?.[s] ?? '-'),
        `${u.totalScore}/30`,
    ]);

    // Dynamic column widths — fixed cols + equal-width section cols
    const fixedWidths = { 0: 12, 1: 42, 2: 26 };
    const lastColWidth = 22;
    const totalPageWidth = 267; // A4 landscape usable width
    const usedFixed = fixedWidths[0] + fixedWidths[1] + fixedWidths[2] + lastColWidth;
    const sectionColWidth = sections.length > 0
        ? Math.floor((totalPageWidth - usedFixed) / sections.length)
        : 20;

    const columnStyles = {
        0: { cellWidth: fixedWidths[0], halign: 'center' },
        1: { cellWidth: fixedWidths[1] },
        2: { cellWidth: fixedWidths[2] },
    };
    sections.forEach((_, i) => {
        columnStyles[3 + i] = { cellWidth: sectionColWidth, halign: 'center' };
    });
    columnStyles[3 + sections.length] = { cellWidth: lastColWidth, halign: 'center' };

    doc.autoTable({
        head: [['Rank', 'Name', 'Roll No', ...sections.map(shortLabel), 'Total']],
        body: rows,
        startY: 38,
        styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles,
    });

    // Footer on every page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`MCA Test — Confidential | Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 8);
    }

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`MCA_Test_Results_${dateStr}.pdf`);
}

// ----------------------------------------------------------------
// CLEAR ALL USERS
// ----------------------------------------------------------------
function openClearUsersModal() {
    document.getElementById('clearUsersCount').textContent = allLeaderboard.length;
    const modal = document.getElementById('clearUsersModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeClearUsersModal() {
    const modal = document.getElementById('clearUsersModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function confirmClearUsers() {
    const btn = document.getElementById('confirmClearBtn');
    btn.disabled = true;
    btn.textContent = 'Clearing...';

    const res = await adminFetch('/api/admin/users', { method: 'DELETE' });

    if (res.ok) {
        closeClearUsersModal();
        allLeaderboard = [];
        renderLeaderboard([]);
        // Reset stat cards
        document.getElementById('statTotal').textContent = '0';
        document.getElementById('statAvg').textContent = '--';
        document.getElementById('statHigh').textContent = '--';
        document.getElementById('statPass').textContent = '--';
    } else {
        btn.textContent = 'Failed. Try again.';
    }

    btn.disabled = false;
    btn.textContent = 'Yes, Clear All';
}

// ----------------------------------------------------------------
// TIMER SETTINGS
// ----------------------------------------------------------------
async function loadSettings() {
    const res = await adminFetch('/api/admin/settings');
    if (!res.ok) return;
    const settings = await res.json();
    
    // Format dates for datetime-local input
    if (settings.startTime) {
        const d = new Date(settings.startTime);
        document.getElementById('timerStart').value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } else {
        document.getElementById('timerStart').value = '';
    }
    
    if (settings.endTime) {
        const d = new Date(settings.endTime);
        document.getElementById('timerEnd').value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } else {
        document.getElementById('timerEnd').value = '';
    }
}

async function saveTimerSettings() {
    const startVal = document.getElementById('timerStart').value;
    const endVal = document.getElementById('timerEnd').value;
    const errEl = document.getElementById('timerError');
    const succEl = document.getElementById('timerSuccess');
    
    errEl.classList.add('hidden');
    succEl.classList.add('hidden');
    
    let startTime = null;
    let endTime = null;
    
    if (startVal) startTime = new Date(startVal).toISOString();
    if (endVal) endTime = new Date(endVal).toISOString();
    
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
        errEl.textContent = 'End time must be after start time.';
        errEl.classList.remove('hidden');
        return;
    }
    
    const btn = document.getElementById('saveTimerBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    const res = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ startTime, endTime })
    });
    
    btn.disabled = false;
    btn.textContent = 'Save Timer Settings';
    
    if (res.ok) {
        succEl.classList.remove('hidden');
        setTimeout(() => succEl.classList.add('hidden'), 3000);
    } else {
        errEl.textContent = 'Failed to save settings.';
        errEl.classList.remove('hidden');
    }
}

