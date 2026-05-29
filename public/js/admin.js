let adminUsername = null;
let adminPassword = null;
let adminRole = null;
let adminCollege = null; // { _id, name, domain }
let selectedGlobalCollegeId = null;

let allLeaderboard = [];
let allAnalytics = [];
let allAdminQuestions = [];
let analyticsChart = null;
let activeAnalyticsSection = null;
let activeQSection = 'All';
let editingQuestionId = null;
let deletingQuestionId = null;
let selectedCorrectAnswer = null;
let totalQuestionsGlobal = 0;
let selectedExamId = null;   // currently selected exam
let allExams = [];            // cached exam list
let allColleges = [];
let allAdminAccounts = [];

// ----------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------
const adminFetch = (url, options = {}) => {
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-admin-username': adminUsername,
            'x-admin-password': adminPassword,
            ...(options.headers || {}),
        },
    });
};

// ----------------------------------------------------------------
// AUTH
// ----------------------------------------------------------------
async function adminLogin() {
    const username = document.getElementById('adminUsernameInput').value;
    const pwd = document.getElementById('adminPasswordInput').value;
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    if (!username || !pwd) { showLoginError('Please enter username and password.'); return; }

    btn.textContent = 'Checking...'; btn.disabled = true;

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: pwd })
        });

        if (!res.ok) {
            showLoginError('Invalid credentials. Please try again.');
            btn.textContent = 'Login'; btn.disabled = false;
            return;
        }

        const data = await res.json();
        adminUsername = username;
        adminPassword = pwd;
        adminRole = data.role;
        adminCollege = data.college;

        sessionStorage.setItem('adminUsername', adminUsername);
        sessionStorage.setItem('adminPassword', adminPassword);
        sessionStorage.setItem('adminRole', adminRole);
        sessionStorage.setItem('adminCollege', JSON.stringify(adminCollege));

        initDashboard();
    } catch (err) {
        showLoginError('Server error. Please try again.');
        btn.textContent = 'Login'; btn.disabled = false;
    }
}

async function initDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    const dash = document.getElementById('dashboard');
    dash.classList.remove('hidden');
    dash.classList.add('flex');

    const roleBadge = document.getElementById('adminRoleBadge');
    roleBadge.textContent = adminRole === 'main' ? 'Main Admin' : `Admin: ${adminCollege?.name}`;

    if (adminRole === 'main') {
        document.getElementById('tabBtnColleges').classList.remove('hidden');
        document.getElementById('tabBtnAdmins').classList.remove('hidden');
        document.getElementById('collegeSelectorContainer').classList.remove('hidden');
        await loadColleges();
        if (allColleges.length > 0) {
            selectedGlobalCollegeId = allColleges[0]._id;
            document.getElementById('globalCollegeSelector').value = selectedGlobalCollegeId;
        }
    } else {
        selectedGlobalCollegeId = adminCollege?._id;
        document.getElementById('collegeSelectorContainer').classList.add('hidden');
    }

    await loadExamSelector();
}

window.addEventListener('DOMContentLoaded', () => {
    const savedU = sessionStorage.getItem('adminUsername');
    const savedP = sessionStorage.getItem('adminPassword');
    const savedR = sessionStorage.getItem('adminRole');
    const savedC = sessionStorage.getItem('adminCollege');

    if (savedU && savedP) {
        adminUsername = savedU;
        adminPassword = savedP;
        adminRole = savedR;
        adminCollege = savedC ? JSON.parse(savedC) : null;
        initDashboard();
    }

    document.getElementById('adminPasswordInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') adminLogin();
    });

    renderOptionInputs();
});

function showLoginError(msg) {
    const el = document.getElementById('loginError');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function adminLogout() {
    sessionStorage.clear();
    window.location.reload();
}

// ----------------------------------------------------------------
// TAB NAVIGATION
// ----------------------------------------------------------------
let analyticsLoaded = false;
let questionsLoaded = false;
let studentsLoaded = false;
let collegesLoaded = false;
let adminsLoaded = false;

function switchTab(tab) {
    ['leaderboard', 'analytics', 'questions', 'students', 'settings', 'colleges', 'admins'].forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if (el) el.classList.add('hidden');
    });
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active-tab');
    const tabEl = document.getElementById(`tab-${tab}`);
    if (tabEl) tabEl.classList.remove('hidden');

    if (tab === 'analytics' && !analyticsLoaded) { loadAnalytics(); analyticsLoaded = true; }
    if (tab === 'questions' && !questionsLoaded)  { loadAdminQuestions(); questionsLoaded = true; }
    if (tab === 'students' && !studentsLoaded)   { loadStudents(); studentsLoaded = true; }
    if (tab === 'colleges' && !collegesLoaded)   { loadColleges(); collegesLoaded = true; }
    if (tab === 'admins' && !adminsLoaded)      { loadAdminAccounts(); adminsLoaded = true; }
    if (tab === 'settings') { renderExamSettingsTab(); }
}

// ----------------------------------------------------------------
// COLLEGE & ADMIN MANAGEMENT (Main Admin only)
// ----------------------------------------------------------------
async function loadColleges() {
    const res = await adminFetch('/api/admin/colleges');
    if (res.ok) {
        allColleges = await res.json();
        const selector = document.getElementById('globalCollegeSelector');
        selector.innerHTML = allColleges.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
        if (selectedGlobalCollegeId) selector.value = selectedGlobalCollegeId;
        renderCollegesTable();
    }
}

function renderCollegesTable() {
    const tbody = document.getElementById('collegesTableBody');
    tbody.innerHTML = allColleges.map(c => `
        <tr class="hover:bg-dark-800/50 transition-colors">
            <td class="px-4 py-3 font-medium text-white">${c.name}</td>
            <td class="px-4 py-3 text-slate-400 font-mono text-xs">${c.domain}</td>
        </tr>
    `).join('');
}

function onGlobalCollegeChange(select) {
    selectedGlobalCollegeId = select.value;
    selectedExamId = null;
    loadExamSelector();
}

function openAddCollegeModal() {
    document.getElementById('newCollegeName').value = '';
    document.getElementById('newCollegeDomain').value = '';
    document.getElementById('addCollegeError').classList.add('hidden');
    document.getElementById('addCollegeModal').classList.remove('hidden');
    document.getElementById('addCollegeModal').classList.add('flex');
}

function closeAddCollegeModal() {
    document.getElementById('addCollegeModal').classList.add('hidden');
}

async function confirmAddCollege() {
    const name = document.getElementById('newCollegeName').value.trim();
    const domain = document.getElementById('newCollegeDomain').value.trim();
    const errEl = document.getElementById('addCollegeError');

    if (!name || !domain) { showError(errEl, 'All fields required.'); return; }

    const res = await adminFetch('/api/admin/colleges', {
        method: 'POST',
        body: JSON.stringify({ name, domain })
    });

    if (res.ok) {
        closeAddCollegeModal();
        await loadColleges();
    } else {
        const data = await res.json();
        showError(errEl, data.message);
    }
}

async function loadAdminAccounts() {
    // Note: We need an endpoint to list accounts, but for now we'll skip or assume create only
}

function openAddAdminModal() {
    const select = document.getElementById('newAdminCollege');
    select.innerHTML = allColleges.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
    document.getElementById('newAdminUsername').value = '';
    document.getElementById('newAdminPassword').value = '';
    document.getElementById('addAdminError').classList.add('hidden');
    document.getElementById('addAdminModal').classList.remove('hidden');
    document.getElementById('addAdminModal').classList.add('flex');
}

function closeAddAdminModal() {
    document.getElementById('addAdminModal').classList.add('hidden');
}

async function confirmAddAdmin() {
    const username = document.getElementById('newAdminUsername').value.trim();
    const password = document.getElementById('newAdminPassword').value.trim();
    const collegeId = document.getElementById('newAdminCollege').value;
    const errEl = document.getElementById('addAdminError');

    if (!username || !password || !collegeId) { showError(errEl, 'All fields required.'); return; }

    const res = await adminFetch('/api/admin/accounts', {
        method: 'POST',
        body: JSON.stringify({ username, password, collegeId })
    });

    if (res.ok) {
        closeAddAdminModal();
    } else {
        const data = await res.json();
        showError(errEl, data.message);
    }
}

// ----------------------------------------------------------------
// STUDENT MANAGEMENT
// ----------------------------------------------------------------
let allStudents = [];

async function loadStudents() {
    if (!selectedGlobalCollegeId) return;
    const res = await adminFetch(`/api/admin/students?collegeId=${selectedGlobalCollegeId}`);
    if (res.ok) {
        allStudents = await res.json();
        renderStudents();
    }
}

function renderStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!allStudents.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-10 text-slate-500">No students added yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = allStudents.map(s => `
        <tr class="hover:bg-dark-800/50 transition-colors">
            <td class="px-4 py-3 text-slate-400 font-mono text-xs">${s.rollNumber}</td>
            <td class="px-4 py-3 font-medium text-white">${s.name}</td>
            <td class="px-4 py-3 text-right">
                <button onclick="deleteStudent('${s._id}')" class="p-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/20 text-red-400 transition-colors" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function openAddStudentModal() {
    document.getElementById('newStudentRoll').value = '';
    document.getElementById('newStudentName').value = '';
    document.getElementById('addStudentError').classList.add('hidden');
    const modal = document.getElementById('addStudentModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeAddStudentModal() {
    document.getElementById('addStudentModal').classList.add('hidden');
}

async function confirmAddStudent() {
    const roll = document.getElementById('newStudentRoll').value;
    const name = document.getElementById('newStudentName').value.trim();
    const errEl = document.getElementById('addStudentError');

    if (!roll || !name) { showError(errEl, 'Roll number and name are required.'); return; }

    const res = await adminFetch('/api/admin/students', {
        method: 'POST',
        body: JSON.stringify({ rollNumber: Number(roll), name, collegeId: selectedGlobalCollegeId })
    });

    if (res.ok) {
        closeAddStudentModal();
        await loadStudents();
    } else {
        const data = await res.json();
        showError(errEl, data.message);
    }
}

async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    const res = await adminFetch(`/api/admin/students/${id}`, { method: 'DELETE' });
    if (res.ok) {
        await loadStudents();
    } else {
        alert('Failed to delete student.');
    }
}

// ----------------------------------------------------------------
// LEADERBOARD
// ----------------------------------------------------------------
async function loadLeaderboard() {
    if (!selectedExamId) return;
    const res = await adminFetch(`/api/admin/leaderboard?examId=${selectedExamId}`);
    if (res.status === 401) { adminLogout(); return; }
    const payload = await res.json();
    allLeaderboard = payload.leaderboard ?? payload;
    totalQuestionsGlobal = payload.totalQuestions ?? 0;
    renderLeaderboard(allLeaderboard);
}

function renderLeaderboard(data) {
    const sectionSet = new Set();
    data.forEach(u => Object.keys(u.sectionScores || {}).forEach(s => sectionSet.add(s)));
    const sections = [...sectionSet];
    const colCount = 3 + sections.length + 1;

    const thL = 'px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider';
    const thC = 'px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider';
    document.getElementById('leaderboardHead').innerHTML = `<tr>
        <th class="${thL}">Rank</th>
        <th class="${thL}">Student</th>
        <th class="${thL}">Roll No</th>
        ${sections.map(s => `<th class="${thC}">${s}</th>`).join('')}
        <th class="${thC}">Total</th>
    </tr>`;

    document.getElementById('statTotal').textContent = data.length;
    const passThreshold = totalQuestionsGlobal > 0 ? Math.ceil(totalQuestionsGlobal / 2) : null;
    if (passThreshold !== null) {
        document.getElementById('statPassLabel').textContent = `Pass ≥${passThreshold}`;
    }

    const tbody = document.getElementById('leaderboardBody');
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center py-10 text-slate-500">No submissions yet.</td></tr>`;
        return;
    }

    const avg = (data.reduce((s, u) => s + u.totalScore, 0) / data.length).toFixed(1);
    const high = data[0].totalScore;
    const passed = passThreshold !== null ? data.filter(u => u.totalScore >= passThreshold).length : 0;
    document.getElementById('statAvg').textContent = avg;
    document.getElementById('statHigh').textContent = high;
    document.getElementById('statPass').textContent =
        data.length > 0 ? Math.round((passed / data.length) * 100) + '%' : '--';

    const medals = ['🥇', '🥈', '🥉'];
    const passGreen  = totalQuestionsGlobal > 0 ? Math.ceil(totalQuestionsGlobal * 0.8) : Infinity;
    const passYellow = totalQuestionsGlobal > 0 ? Math.ceil(totalQuestionsGlobal * 0.5) : Infinity;

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
                    u.totalScore >= passGreen  ? 'bg-emerald-500/20 text-emerald-400' :
                    u.totalScore >= passYellow ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                }">${u.totalScore}${totalQuestionsGlobal > 0 ? '/' + totalQuestionsGlobal : ''}</span>
            </td>
        </tr>`).join('');
}

function filterTable(query) {
    const q = query.toLowerCase();
    const filtered = allLeaderboard.filter(u =>
        u.name.toLowerCase().includes(q) || String(u.rollNumber).toLowerCase().includes(q)
    );
    renderLeaderboard(filtered);
}

// ----------------------------------------------------------------
// ANALYTICS
// ----------------------------------------------------------------
async function loadAnalytics() {
    if (!selectedExamId) return;
    const res = await adminFetch(`/api/admin/analytics?examId=${selectedExamId}`);
    allAnalytics = await res.json();

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
    if (!selectedExamId) return;
    const res = await adminFetch(`/api/admin/questions?examId=${selectedExamId}`);
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

    const grouped = {};
    filtered.forEach(q => {
        if (!grouped[q.section]) grouped[q.section] = [];
        grouped[q.section].push(q);
    });

    const badgeColors = [
        'bg-primary-600/20 text-primary-400 border-primary-500/30',
        'bg-violet-600/20 text-violet-400 border-violet-500/30',
        'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
        'bg-amber-600/20 text-amber-400 border-amber-500/30',
        'bg-rose-600/20 text-rose-400 border-rose-500/30',
        'bg-cyan-600/20 text-cyan-400 border-cyan-500/30',
    ];
    const headerColors = [
        'text-primary-400', 'text-violet-400', 'text-emerald-400', 'text-amber-400', 'text-rose-400', 'text-cyan-400',
    ];

    container.innerHTML = Object.keys(grouped).map((sec, secIdx) => {
        const colorIdx = secIdx % badgeColors.length;
        const qs = grouped[sec];

        const questionCards = qs.map((q, qIdx) => `
            <div class="glass-panel border border-dark-700 rounded-xl p-5 hover:border-dark-600 transition-colors">
                <div class="flex justify-between items-start gap-4">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs font-mono text-slate-500">Q${qIdx + 1}</span>
                            <span class="inline-block px-2 py-0.5 text-xs font-semibold ${badgeColors[colorIdx]} border rounded-full">${q.section}</span>
                        </div>
                        <p class="text-white font-medium text-sm leading-relaxed">${q.questionText}</p>
                        <div class="mt-3 grid grid-cols-2 gap-2">
                            ${q.options.map(opt => `
                                <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg ${opt === q.correctAnswer ? 'bg-emerald-500/15 border border-emerald-500/40' : 'bg-dark-800/60 border border-dark-700'}">
                                    ${opt === q.correctAnswer
                                        ? `<svg class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
                                        : `<span class="w-3.5 h-3.5 flex-shrink-0"></span>`}
                                    <span class="text-xs ${opt === q.correctAnswer ? 'text-emerald-300 font-semibold' : 'text-slate-400'} truncate">${opt}</span>
                                </div>`).join('')}
                        </div>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                        <button onclick="openQuestionModal('${q._id}')" class="p-2 rounded-lg border border-dark-600 hover:bg-dark-700 text-slate-400 hover:text-white transition-colors" title="Edit">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onclick="openDeleteModal('${q._id}')" class="p-2 rounded-lg border border-red-500/30 hover:bg-red-500/20 text-red-400 transition-colors" title="Delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            </div>`).join('');

        return `
            <div class="mb-8">
                <div class="flex items-center gap-3 mb-3 pb-2 border-b border-dark-700">
                    <h3 class="font-semibold text-base ${headerColors[colorIdx]}">${sec}</h3>
                    <span class="ml-auto text-xs text-slate-500 font-mono">${qs.length} question${qs.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="space-y-3 pl-1">${questionCards}</div>
            </div>`;
    }).join('');
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
    document.getElementById('questionModal').classList.add('hidden');
    editingQuestionId = null;
    selectedCorrectAnswer = null;
}

async function saveQuestion() {
    const section       = document.getElementById('mSection').value.trim();
    const questionText  = document.getElementById('mQuestion').value.trim();
    const options       = [0,1,2,3].map(i => document.getElementById(`optInput_${i}`).value.trim());
    const correctAnswer = selectedCorrectAnswer?.trim() || options.find((_, i) => document.getElementById(`radio_${i}`).checked);

    const errEl = document.getElementById('modalError');
    if (!section || !questionText || options.some(o => !o) || !correctAnswer) {
        showError(errEl, 'All fields required and a correct answer must be selected.'); return;
    }

    const btn = document.getElementById('modalSaveBtn');
    btn.disabled = true; btn.textContent = 'Saving...';

    const body = JSON.stringify({ examId: selectedExamId, section, questionText, options, correctAnswer });
    const url  = editingQuestionId ? `/api/admin/questions/${editingQuestionId}` : '/api/admin/questions';
    const method = editingQuestionId ? 'PUT' : 'POST';

    const res = await adminFetch(url, { method, body });
    btn.disabled = false; btn.textContent = 'Save';

    if (!res.ok) { showError(errEl, (await res.json()).message); return; }

    closeQuestionModal();
    questionsLoaded = false;
    await loadAdminQuestions();
}

// ----------------------------------------------------------------
// EXAM SELECTOR
// ----------------------------------------------------------------
async function loadExamSelector() {
    if (!selectedGlobalCollegeId) return;
    const res = await fetch(`/api/exams?collegeId=${selectedGlobalCollegeId}`);
    allExams = res.ok ? await res.json() : [];

    renderExamSelectorBar();

    const initial = allExams[0]?._id;
    if (initial) {
        selectExam(initial);
    } else {
        selectedExamId = null;
        document.getElementById('activeExamLabel').textContent = 'No exams';
        renderLeaderboard([]);
    }
}

function renderExamSelectorBar() {
    const select = document.getElementById('examSelectorDropdown');
    if (!select) return;
    select.innerHTML = allExams.length
        ? allExams.map(e => `<option value="${e._id}" ${e._id === selectedExamId ? 'selected' : ''}>${e.title}</option>`).join('')
        : '<option value="">No exams yet</option>';
}

function selectExam(examId) {
    selectedExamId = examId;
    analyticsLoaded = false;
    questionsLoaded = false;
    allLeaderboard  = [];
    allAnalytics    = [];
    allAdminQuestions = [];

    const exam = allExams.find(e => e._id === examId);
    if (exam) document.getElementById('activeExamLabel').textContent = exam.title;
    loadLeaderboard();
}

function onExamSelectorChange(select) { if (select.value) selectExam(select.value); }

function openCreateExamModal() {
    document.getElementById('newExamTitle').value = '';
    document.getElementById('newExamStart').value = '';
    document.getElementById('newExamEnd').value   = '';
    document.getElementById('createExamError').classList.add('hidden');
    document.getElementById('createExamModal').classList.remove('hidden');
    document.getElementById('createExamModal').classList.add('flex');
}

function closeCreateExamModal() { document.getElementById('createExamModal').classList.add('hidden'); }

async function confirmCreateExam() {
    const title = document.getElementById('newExamTitle').value.trim();
    const startVal = document.getElementById('newExamStart').value;
    const endVal = document.getElementById('newExamEnd').value;
    const errEl = document.getElementById('createExamError');

    if (!title || !selectedGlobalCollegeId) { showError(errEl, 'Title required.'); return; }

    const res = await adminFetch('/api/admin/exams', {
        method: 'POST',
        body: JSON.stringify({ title, collegeId: selectedGlobalCollegeId, startTime: startVal ? new Date(startVal).toISOString() : null, endTime: endVal ? new Date(endVal).toISOString() : null })
    });

    if (res.ok) {
        const exam = await res.json();
        allExams.unshift(exam);
        renderExamSelectorBar();
        closeCreateExamModal();
        selectExam(exam._id);
        switchTab('settings');
    } else {
        showError(errEl, (await res.json()).message);
    }
}

// ----------------------------------------------------------------
// UTILS
// ----------------------------------------------------------------
function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

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
    if (!selectedExamId) return;
    const res = await adminFetch(`/api/admin/analytics?examId=${selectedExamId}`);
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
    if (!selectedExamId) return;
    const res = await adminFetch(`/api/admin/questions?examId=${selectedExamId}`);
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

    // Group questions by section, preserving insertion order
    const grouped = {};
    filtered.forEach(q => {
        if (!grouped[q.section]) grouped[q.section] = [];
        grouped[q.section].push(q);
    });

    const sectionColors = [
        'border-primary-500/40 bg-primary-500/5',
        'border-violet-500/40 bg-violet-500/5',
        'border-emerald-500/40 bg-emerald-500/5',
        'border-amber-500/40 bg-amber-500/5',
        'border-rose-500/40 bg-rose-500/5',
        'border-cyan-500/40 bg-cyan-500/5',
    ];
    const badgeColors = [
        'bg-primary-600/20 text-primary-400 border-primary-500/30',
        'bg-violet-600/20 text-violet-400 border-violet-500/30',
        'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
        'bg-amber-600/20 text-amber-400 border-amber-500/30',
        'bg-rose-600/20 text-rose-400 border-rose-500/30',
        'bg-cyan-600/20 text-cyan-400 border-cyan-500/30',
    ];
    const headerColors = [
        'text-primary-400',
        'text-violet-400',
        'text-emerald-400',
        'text-amber-400',
        'text-rose-400',
        'text-cyan-400',
    ];

    const sectionNames = Object.keys(grouped);

    container.innerHTML = sectionNames.map((sec, secIdx) => {
        const colorIdx = secIdx % sectionColors.length;
        const qs = grouped[sec];

        const questionCards = qs.map((q, qIdx) => `
            <div class="glass-panel border border-dark-700 rounded-xl p-5 hover:border-dark-600 transition-colors">
                <div class="flex justify-between items-start gap-4">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs font-mono text-slate-500">Q${qIdx + 1}</span>
                            <span class="inline-block px-2 py-0.5 text-xs font-semibold ${badgeColors[colorIdx]} border rounded-full">${q.section}</span>
                        </div>
                        <p class="text-white font-medium text-sm leading-relaxed">${q.questionText}</p>
                        <div class="mt-3 grid grid-cols-2 gap-2">
                            ${q.options.map(opt => `
                                <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg ${opt === q.correctAnswer ? 'bg-emerald-500/15 border border-emerald-500/40' : 'bg-dark-800/60 border border-dark-700'}">
                                    ${opt === q.correctAnswer
                                        ? `<svg class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
                                        : `<span class="w-3.5 h-3.5 flex-shrink-0"></span>`}
                                    <span class="text-xs ${opt === q.correctAnswer ? 'text-emerald-300 font-semibold' : 'text-slate-400'} truncate">${opt}</span>
                                </div>`).join('')}
                        </div>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                        <button onclick="openQuestionModal('${q._id}')" class="p-2 rounded-lg border border-dark-600 hover:bg-dark-700 text-slate-400 hover:text-white transition-colors" title="Edit">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onclick="openDeleteModal('${q._id}')" class="p-2 rounded-lg border border-red-500/30 hover:bg-red-500/20 text-red-400 transition-colors" title="Delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            </div>`).join('');

        return `
            <div class="mb-8">
                <!-- Section header -->
                <div class="flex items-center gap-3 mb-3 pb-2 border-b ${sectionColors[colorIdx].split(' ')[0]}">
                    <div class="w-2 h-6 rounded-full ${badgeColors[colorIdx].split(' ')[0].replace('bg-', 'bg-').replace('/20', '')}"></div>
                    <h3 class="font-semibold text-base ${headerColors[colorIdx]}">${sec}</h3>
                    <span class="ml-auto text-xs text-slate-500 font-mono">${qs.length} question${qs.length !== 1 ? 's' : ''}</span>
                </div>
                <!-- Question cards for this section -->
                <div class="space-y-3 pl-1">
                    ${questionCards}
                </div>
            </div>`;
    }).join('');
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

    const body = JSON.stringify({ examId: selectedExamId, section, questionText, options, correctAnswer });
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
    // Note: we avoid any 'X/Y' pattern in CSV values because Excel auto-converts them to dates.
    const totalQ = totalQuestionsGlobal > 0 ? totalQuestionsGlobal : (sections.length * 6 || 30);
    const headers = ['Rank', 'Name', 'Roll No', ...sections, 'Total Score', `Score out of ${totalQ}`];
    const rows = [headers.map(escapeCSV).join(',')];

    // Build data rows
    allLeaderboard.forEach(u => {
        const row = [
            u.rank,
            u.name,
            u.rollNumber,
            ...sections.map(s => u.sectionScores?.[s] ?? 0),
            u.totalScore,
            `${u.totalScore} of ${totalQ}`,  // 'X of Y' avoids Excel date parsing
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
    const pageW = doc.internal.pageSize.width;   // 297 mm
    const pageH = doc.internal.pageSize.height;  // 210 mm
    const margin = 14;

    // ── Dynamically extract section names ────────────────────────────
    const sectionSet = new Set();
    allLeaderboard.forEach(u => Object.keys(u.sectionScores || {}).forEach(s => sectionSet.add(s)));
    const sections = [...sectionSet];
    const totalQ = totalQuestionsGlobal > 0 ? totalQuestionsGlobal : 30;

    // Truncate long section names for compact headers
    const shortLabel = s => s.length > 12 ? s.substring(0, 11) + '.' : s;

    // ── Header block ───────────────────────────────────────
    // Blue accent bar at top
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 10, 'F');

    // Title
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('MCA Test  |  Student Results Report', margin, 7);
    doc.setFont(undefined, 'normal');

    // Metadata line
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    doc.text(`Generated: ${dateStr}     |     Total Students: ${allLeaderboard.length}     |     Total Questions: ${totalQ}`, margin, 17);

    // Thin separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, 19, pageW - margin, 19);

    // ── Summary stat boxes ──────────────────────────────────
    const scores = allLeaderboard.map(u => u.totalScore);
    const avg    = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const high   = Math.max(...scores);
    const low    = Math.min(...scores);
    const pass   = scores.filter(s => s >= Math.ceil(totalQ / 2)).length;

    const stats = [
        { label: 'Highest',  value: high },
        { label: 'Lowest',   value: low  },
        { label: 'Average',  value: avg  },
        { label: 'Passed (>=50%)', value: `${pass} / ${allLeaderboard.length}` },
    ];
    const boxW = 50; const boxH = 11; const boxY = 22;
    stats.forEach((s, i) => {
        const bx = margin + i * (boxW + 4);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.roundedRect(bx, boxY, boxW, boxH, 2, 2, 'FD');
        doc.setFontSize(7); doc.setTextColor(100, 116, 139);
        doc.text(s.label, bx + 3, boxY + 4);
        doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.setFont(undefined, 'bold');
        doc.text(String(s.value), bx + 3, boxY + 9.5);
        doc.setFont(undefined, 'normal');
    });

    // ── Column widths ──────────────────────────────────────────
    const usableW    = pageW - margin * 2;   // 269 mm
    const rankW      = 12;
    const rollW      = 24;
    const totalColW  = 20;
    const nameW      = 44;
    const secW       = sections.length > 0
        ? Math.floor((usableW - rankW - nameW - rollW - totalColW) / sections.length)
        : 30;

    const columnStyles = {
        0: { cellWidth: rankW,     halign: 'center' },
        1: { cellWidth: nameW,     halign: 'left'   },
        2: { cellWidth: rollW,     halign: 'center' },
    };
    sections.forEach((_, i) => {
        columnStyles[3 + i] = { cellWidth: secW, halign: 'center' };
    });
    columnStyles[3 + sections.length] = { cellWidth: totalColW, halign: 'center' };

    // ── Table data ───────────────────────────────────────────
    const medals = ['1st', '2nd', '3rd'];
    const rows = allLeaderboard.map((u, i) => [
        i < 3 ? medals[i] : `#${u.rank}`,
        u.name,
        String(u.rollNumber),
        ...sections.map(s => String(u.sectionScores?.[s] ?? '-')),
        `${u.totalScore}/${totalQ}`,
    ]);

    // ── autoTable ───────────────────────────────────────────
    doc.autoTable({
        head: [['Rank', 'Name', 'Roll No', ...sections.map(shortLabel), 'Total']],
        body: rows,
        startY: 36,
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        styles: {
            fontSize:    8.5,
            cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
            textColor:   [30, 41, 59],
            lineColor:   [203, 213, 225],   // light grey cell borders
            lineWidth:   0.25,              // draw ALL cell borders
            valign:      'middle',
            overflow:    'ellipsize',
        },
        headStyles: {
            fillColor:   [37, 99, 235],     // blue
            textColor:   [255, 255, 255],
            fontStyle:   'bold',
            fontSize:    8.5,
            lineColor:   [29, 78, 216],
            lineWidth:   0.3,
            halign:      'center',
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],     // very light blue-grey
        },
        // Highlight top 3
        didParseCell: (data) => {
            if (data.section === 'body' && data.row.index < 3) {
                data.cell.styles.fontStyle  = 'bold';
                data.cell.styles.textColor  = [30, 64, 175];  // blue text for top 3
            }
            // Bold + green for the Total column
            if (data.section === 'body' && data.column.index === 3 + sections.length) {
                data.cell.styles.fontStyle  = 'bold';
                data.cell.styles.textColor  = [21, 128, 61];
            }
        },
        columnStyles,
    });

    // ── Footer on every page ───────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(37, 99, 235);
        doc.rect(0, pageH - 8, pageW, 8, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(`MCA Test  |  Confidential`, margin, pageH - 3);
        doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 3, { align: 'right' });
    }

    doc.save(`MCA_Test_Results_${new Date().toISOString().split('T')[0]}.pdf`);
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

    const res = await adminFetch(`/api/admin/users?examId=${selectedExamId}`, { method: 'DELETE' });

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
// EXAM SELECTOR  (replaces the old Settings/Timer panel)
// ----------------------------------------------------------------
async function loadExamSelector() {
    const res = await adminFetch('/api/exams');
    allExams = res.ok ? await res.json() : [];

    renderExamSelectorBar();

    // Select the first exam by default (or last-used from sessionStorage)
    const saved = sessionStorage.getItem('selectedExamId');
    const initial = saved && allExams.find(e => e._id === saved)
        ? saved
        : allExams[0]?._id;

    if (initial) {
        selectExam(initial);
    } else {
        // No exams yet — prompt admin to create one
        document.getElementById('noExamBanner').classList.remove('hidden');
    }
}

function renderExamSelectorBar() {
    const select = document.getElementById('examSelectorDropdown');
    if (!select) return;
    select.innerHTML = allExams.length
        ? allExams.map(e =>
            `<option value="${e._id}" ${e._id === selectedExamId ? 'selected' : ''}>${e.title}</option>`
          ).join('')
        : '<option value="">No exams yet — create one</option>';
}

function selectExam(examId) {
    selectedExamId = examId;
    sessionStorage.setItem('selectedExamId', examId);

    // Reset loaded flags so tabs re-fetch for the new exam
    analyticsLoaded = false;
    questionsLoaded = false;
    allLeaderboard  = [];
    allAnalytics    = [];
    allAdminQuestions = [];

    document.getElementById('noExamBanner').classList.add('hidden');

    // Show exam name in header bar
    const exam = allExams.find(e => e._id === examId);
    if (exam) {
        document.getElementById('activeExamLabel').textContent = exam.title;
    }

    // Update dropdown selection
    const select = document.getElementById('examSelectorDropdown');
    if (select) select.value = examId;

    // Reload current active tab data
    loadLeaderboard();
    analyticsLoaded = false;
    questionsLoaded = false;
}

// Called when the dropdown changes
function onExamSelectorChange(select) {
    if (select.value) selectExam(select.value);
}

// ── Exam Settings tab ────────────────────────────────────────────
function renderExamSettingsTab() {
    const exam = allExams.find(e => e._id === selectedExamId);
    if (!exam) return;

    const toLocal = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };

    document.getElementById('timerStart').value = toLocal(exam.startTime);
    document.getElementById('timerEnd').value   = toLocal(exam.endTime);
    document.getElementById('examTitleInput').value = exam.title;
}

async function saveExamSettings() {
    const title      = document.getElementById('examTitleInput').value.trim();
    const startVal   = document.getElementById('timerStart').value;
    const endVal     = document.getElementById('timerEnd').value;
    const errEl      = document.getElementById('timerError');
    const succEl     = document.getElementById('timerSuccess');

    errEl.classList.add('hidden');
    succEl.classList.add('hidden');

    if (!title) {
        errEl.textContent = 'Exam title is required.';
        errEl.classList.remove('hidden'); return;
    }

    let startTime = startVal ? new Date(startVal).toISOString() : null;
    let endTime   = endVal   ? new Date(endVal).toISOString()   : null;

    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
        errEl.textContent = 'End time must be after start time.';
        errEl.classList.remove('hidden'); return;
    }

    const btn = document.getElementById('saveTimerBtn');
    btn.disabled = true; btn.textContent = 'Saving...';

    const res = await adminFetch(`/api/admin/exams/${selectedExamId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, startTime, endTime }),
    });

    btn.disabled = false; btn.textContent = 'Save Exam Settings';

    if (res.ok) {
        const updated = await res.json();
        // Update local cache
        const idx = allExams.findIndex(e => e._id === selectedExamId);
        if (idx !== -1) allExams[idx] = updated;
        renderExamSelectorBar();
        document.getElementById('activeExamLabel').textContent = updated.title;
        succEl.classList.remove('hidden');
        setTimeout(() => succEl.classList.add('hidden'), 3000);
    } else {
        errEl.textContent = 'Failed to save exam settings.';
        errEl.classList.remove('hidden');
    }
}

// ── Create new exam modal ─────────────────────────────────────────
function openCreateExamModal() {
    document.getElementById('newExamTitle').value = '';
    document.getElementById('newExamStart').value = '';
    document.getElementById('newExamEnd').value   = '';
    document.getElementById('createExamError').classList.add('hidden');
    document.getElementById('createExamModal').classList.remove('hidden');
    document.getElementById('createExamModal').classList.add('flex');
}

function closeCreateExamModal() {
    document.getElementById('createExamModal').classList.add('hidden');
    document.getElementById('createExamModal').classList.remove('flex');
}

async function confirmCreateExam() {
    const title    = document.getElementById('newExamTitle').value.trim();
    const startVal = document.getElementById('newExamStart').value;
    const endVal   = document.getElementById('newExamEnd').value;
    const errEl    = document.getElementById('createExamError');
    errEl.classList.add('hidden');

    if (!title) { errEl.textContent = 'Title is required.'; errEl.classList.remove('hidden'); return; }

    const btn = document.getElementById('createExamBtn');
    btn.disabled = true; btn.textContent = 'Creating...';

    const res = await adminFetch('/api/admin/exams', {
        method: 'POST',
        body: JSON.stringify({
            title,
            startTime: startVal ? new Date(startVal).toISOString() : null,
            endTime:   endVal   ? new Date(endVal).toISOString()   : null,
        }),
    });

    btn.disabled = false; btn.textContent = 'Create';

    if (res.ok) {
        const exam = await res.json();
        allExams.unshift(exam);
        renderExamSelectorBar();
        closeCreateExamModal();
        selectExam(exam._id);
        // Switch to settings tab so admin can see the new exam
        switchTab('settings');
    } else {
        const data = await res.json();
        errEl.textContent = data.message || 'Failed to create exam.';
        errEl.classList.remove('hidden');
    }
}

// ── Delete exam ───────────────────────────────────────────────────
async function deleteCurrentExam() {
    if (!selectedExamId) return;
    const exam = allExams.find(e => e._id === selectedExamId);
    if (!confirm(`Delete exam "${exam?.title}"? This will NOT delete associated questions or student records.`)) return;

    const res = await adminFetch(`/api/admin/exams/${selectedExamId}`, { method: 'DELETE' });
    if (res.ok) {
        allExams = allExams.filter(e => e._id !== selectedExamId);
        selectedExamId = null;
        sessionStorage.removeItem('selectedExamId');
        renderExamSelectorBar();
        await loadExamSelector();
    } else {
        alert('Failed to delete exam.');
    }
}

// ----------------------------------------------------------------
// BULK ADD QUESTIONS
// ----------------------------------------------------------------
function triggerBulkUpload() {
    document.getElementById('bulkCsvInput').click();
}

function showBulkInfo() {
    const modal = document.getElementById('bulkInfoModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeBulkInfo() {
    const modal = document.getElementById('bulkInfoModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function handleBulkCsv(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const questions = parseCSV(text);
        if (questions.length === 0) {
            showResult('Error', 'No valid questions found in CSV.', 'error');
            return;
        }

        const res = await adminFetch('/api/admin/questions/bulk', {
            method: 'POST',
            body: JSON.stringify({ examId: selectedExamId, questions })
        });
        const data = await res.json();
        if (res.ok) {
            showResult('Upload Complete', data.message, 'success');
            questionsLoaded = false;
            await loadAdminQuestions();
        } else {
            showResult('Upload Failed', data.message, 'error');
        }
        input.value = '';
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    // Helper to split CSV line while respecting quotes
    function splitCSV(line) {
        const result = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuote && line[i+1] === '"') { // Handle escaped quotes ""
                    cur += '"'; i++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += char;
            }
        }
        result.push(cur.trim());
        return result.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
    }

    const headers = splitCSV(lines[0]).map(h => h.trim().toLowerCase());
    const required = ['section', 'questiontext', 'option1', 'option2', 'option3', 'option4', 'correctanswer'];
    
    const missing = required.filter(h => !headers.includes(h));
    if (missing.length > 0) {
        showResult('CSV Error', 'Missing headers in CSV: ' + missing.join(', '), 'error');
        return [];
    }

    const results = [];
    for (let i = 1; i < lines.length; i++) {
        const values = splitCSV(lines[i]);
        if (values.length < headers.length) continue;

        const row = {};
        headers.forEach((h, idx) => row[h] = values[idx]);

        results.push({
            section: row['section'],
            questionText: row['questiontext'],
            options: [row['option1'], row['option2'], row['option3'], row['option4']],
            correctAnswer: row['correctanswer']
        });
    }
    return results;
}

// ----------------------------------------------------------------
// CLEAR ALL QUESTIONS
// ----------------------------------------------------------------
function openClearQuestionsModal() {
    const modal = document.getElementById('clearQuestionsModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeClearQuestionsModal() {
    const modal = document.getElementById('clearQuestionsModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function confirmClearQuestions() {
    const btn = document.getElementById('confirmClearQuestionsBtn');
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    const res = await adminFetch(`/api/admin/questions?examId=${selectedExamId}`, { method: 'DELETE' });
    if (res.ok) {
        closeClearQuestionsModal();
        allAdminQuestions = [];
        renderQuestions('All');
        renderSectionFilter();
        showResult('Success', 'All questions cleared successfully.', 'success');
    } else {
        const data = await res.json();
        showResult('Error', data.message, 'error');
    }
    btn.disabled = false;
    btn.textContent = 'Yes, Delete All';
}

// ----------------------------------------------------------------
// RESULT MODAL HELPERS
// ----------------------------------------------------------------
function showResult(title, message, type = 'success') {
    const modal = document.getElementById('resultModal');
    const titleEl = document.getElementById('resultTitle');
    const msgEl = document.getElementById('resultMessage');
    const iconContainer = document.getElementById('resultIconContainer');

    titleEl.textContent = title;
    msgEl.textContent = message;

    if (type === 'success') {
        iconContainer.className = 'w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0';
        iconContainer.innerHTML = '<svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    } else {
        iconContainer.className = 'w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0';
        iconContainer.innerHTML = '<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeResultModal() {
    const modal = document.getElementById('resultModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}


