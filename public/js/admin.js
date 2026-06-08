// Admin Panel Logic - Professional Edition
let currentAdmin = JSON.parse(localStorage.getItem('admin')) || null;
let currentTab = 'exams';
let selectedExamId = null;
let colleges = [];
let selectedCollegeId = ''; 
let leaderboardData = [];
let examQuestions = [];
let analyticsData = [];

// Charts
let sectionDonutChart = null;
let questionHistChart = null;

// DOM Elements
const loginPanel = document.getElementById('loginPanel');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (currentAdmin) {
        showDashboard();
    } else {
        loginPanel.classList.remove('hidden');
    }
});

function refreshIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

// ── Notifications & Confirmations ──────────────────────────────────

function notify(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const toast = document.createElement('div');
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

    toast.className = `glass flex items-center gap-3 px-6 py-4 rounded-2xl border ${colors[type]} animate-slide-up pointer-events-auto shadow-2xl`;
    toast.innerHTML = `<i data-lucide="${icons[type]}" class="w-5 h-5"></i><span class="text-sm font-bold uppercase">${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();

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
        const t = document.getElementById('confirmTitle');
        const m = document.getElementById('confirmMessage');
        const icon = document.getElementById('confirmIcon');
        const iconBox = document.getElementById('confirmIconContainer');
        const proceedBtn = document.getElementById('confirmProceedBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        t.textContent = title.toUpperCase();
        m.textContent = message;

        if (type === 'danger') {
            iconBox.className = 'w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg bg-red-500/10 text-red-500 shadow-red-500/10';
            proceedBtn.className = 'flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 transition-all hover:bg-red-600';
            icon.setAttribute('data-lucide', 'alert-triangle');
        } else {
            iconBox.className = 'w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg bg-primary-500/10 text-primary-500 shadow-primary-500/10';
            proceedBtn.className = 'flex-1 py-4 bg-primary-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-600';
            icon.setAttribute('data-lucide', 'help-circle');
        }

        overlay.classList.remove('hidden');
        lucide.createIcons();

        const cleanup = (val) => {
            overlay.classList.add('hidden');
            proceedBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(val);
        };

        proceedBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
    });
}

// ── Auth ─────────────────────────────────────────────────────────────

loginForm.onsubmit = async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    try {
        const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Access Denied');
        currentAdmin = { ...data, password };
        localStorage.setItem('admin', JSON.stringify(currentAdmin));
        showDashboard();
        notify('Authentication successful', 'success');
    } catch (err) {
        loginError.textContent = err.message;
        loginError.classList.remove('hidden');
    }
};

function logout() { localStorage.removeItem('admin'); window.location.reload(); }
function getAuthHeaders() { return { 'x-admin-username': currentAdmin.username, 'x-admin-password': currentAdmin.password, 'Content-Type': 'application/json' }; }

// ── Navigation ───────────────────────────────────────────────────────

function showDashboard() {
    loginPanel.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    document.getElementById('adminUsername').textContent = currentAdmin.username;
    document.getElementById('adminRoleLabel').textContent = currentAdmin.role + ' administrator';
    const affLabel = document.getElementById('affiliatedCollegeLabel');
    if (currentAdmin.role === 'mini') { affLabel.textContent = currentAdmin.college?.name.toUpperCase() || 'ASSIGNED COLLEGE'; affLabel.classList.remove('hidden'); }
    else { affLabel.textContent = 'UNIVERSAL SCOPE'; affLabel.classList.remove('hidden'); }
    if (currentAdmin.role === 'main') {
        document.getElementById('mainAdminLinks').classList.remove('hidden');
        document.getElementById('collegeFilterContainer').classList.remove('hidden');
        loadColleges().then(() => { showTab('exams'); });
    } else { selectedCollegeId = currentAdmin.college?._id; showTab('exams'); }
}

async function loadColleges() {
    try {
        const res = await fetch('/api/admin/colleges', { headers: getAuthHeaders() });
        colleges = await res.json();
        const filter = document.getElementById('collegeFilter');
        filter.innerHTML = colleges.map(c => `<option value="${c._id}">${c.name.toUpperCase()}</option>`).join('');
        if (colleges.length > 0) { selectedCollegeId = colleges[0]._id; filter.value = selectedCollegeId; }
    } catch (err) { console.error('Failed to load colleges', err); }
}

function showTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-${tabId}`);
    if (activeBtn) activeBtn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`content-${tabId}`).classList.add('active');
    const titles = { colleges: ['Institutions', 'Global management of registered colleges'], accounts: ['Administrators', 'Assign and manage college-level access'], exams: ['Assessments', 'Control and monitor exam sessions'], students: ['Students', 'Manage student eligibility and profiles'], 'exam-details': ['Analysis', 'Real-time performance and management'] };
    document.getElementById('tabTitle').textContent = titles[tabId][0].toUpperCase();
    document.getElementById('tabDescription').textContent = titles[tabId][1];
    loadCurrentTab();
    refreshIcons();
}

function loadCurrentTab() {
    if (currentAdmin.role === 'main') { const filter = document.getElementById('collegeFilter'); if (filter) selectedCollegeId = filter.value; }
    switch (currentTab) {
        case 'colleges': loadCollegesGrid(); break;
        case 'accounts': loadAccountsList(); break;
        case 'exams': loadExamsGrid(); break;
        case 'students': loadStudentsList(); break;
    }
}

function updateStatsBar(label1, value1, label2 = null, value2 = null) {
    const container = document.getElementById('collegeStatsContainer');
    const l1 = document.getElementById('statLabel1'); const v1 = document.getElementById('statValue1');
    const l2 = document.getElementById('statLabel2'); const v2 = document.getElementById('statValue2');
    const div = document.getElementById('statDivider'); const g2 = document.getElementById('statGroup2');
    l1.textContent = label1.toUpperCase(); v1.textContent = value1;
    if (label2 !== null) { l2.textContent = label2.toUpperCase(); v2.textContent = value2; div.classList.remove('hidden'); g2.classList.remove('hidden'); }
    else { div.classList.add('hidden'); g2.classList.add('hidden'); }
    container.classList.remove('hidden');
}

async function loadCollegeStats() {
    try {
        const res = await fetch(`/api/admin/college-stats?collegeId=${selectedCollegeId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        updateStatsBar('Total Tests', data.testCount, 'Max Possible Mark', data.totalPossibleMarks);
    } catch (err) { console.error('Failed to load stats', err); }
}

// ── Colleges ─────────────────────────────────────────────────────────

async function loadCollegesGrid() {
    const grid = document.getElementById('collegeGrid');
    grid.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center gap-4 text-slate-500"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div><p class="uppercase font-black text-[10px] tracking-widest">Fetching Institutions...</p></div>';
    try {
        const res = await fetch('/api/admin/colleges', { headers: getAuthHeaders() });
        const data = await res.json();
        colleges = data;
        updateStatsBar('Total Colleges', data.length);
        if (data.length === 0) { grid.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500 uppercase font-black tracking-widest text-xs opacity-50">No colleges registered yet.</div>'; return; }
        grid.innerHTML = data.map(c => `
            <div class="glass-card p-6 rounded-3xl relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -mr-8 -mt-8 transition-all group-hover:scale-150"></div>
                <div class="flex justify-between items-start mb-4 relative">
                    <div class="w-12 h-12 bg-dark-800 rounded-2xl flex items-center justify-center text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-all"><i data-lucide="building" class="w-6 h-6"></i></div>
                    <div class="flex gap-1"><button onclick="deleteCollege('${c._id}')" class="p-2 text-slate-500 hover:text-red-400 transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>
                </div>
                <h4 class="text-xl font-bold text-white mb-1 uppercase tracking-tight">${c.name}</h4><p class="text-sm text-slate-500 font-mono">${c.domain}</p>
            </div>
        `).join('');
        refreshIcons();
    } catch (err) { grid.innerHTML = `<div class="col-span-full py-20 text-center text-red-400 font-bold uppercase">${err.message}</div>`; }
}

function openCollegeModal() {
    setModalTitle('New Institution');
    showModal(`<form onsubmit="saveCollege(event)" class="space-y-6"><div class="space-y-4"><div><label class="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-widest text-xs">College Name</label><input type="text" name="name" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-white transition-all uppercase font-black"></div><div><label class="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-widest text-xs">Restricted Email Domain</label><input type="text" name="domain" placeholder="@college.ac.in" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-white transition-all"></div></div><div class="flex gap-4 pt-6"><button type="button" onclick="closeModal()" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs">Discard</button><button type="submit" class="flex-1 py-4 btn-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg">Confirm</button></div></form>`);
}

async function saveCollege(e) {
    e.preventDefault();
    const body = { name: e.target.name.value.toUpperCase(), domain: e.target.domain.value };
    try {
        const res = await fetch('/api/admin/colleges', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Failed to synchronize college');
        closeModal(); loadCollegesGrid(); loadColleges(); notify('College registered successfully', 'success');
    } catch (err) { notify(err.message, 'error'); }
}

async function deleteCollege(id) {
    const ok = await confirmAction('Permanent Action', 'All linked accounts and data will be affected. Continue?');
    if (!ok) return;
    try {
        const res = await fetch(`/api/admin/colleges/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete');
        loadCollegesGrid(); loadColleges(); notify('College removed', 'success');
    } catch (err) { notify(err.message, 'error'); }
}

// ── Admins ───────────────────────────────────────────────────────────

async function loadAccountsList() {
    const list = document.getElementById('accountList');
    list.innerHTML = '<tr><td colspan="4" class="px-8 py-10 text-center text-slate-500 uppercase font-black tracking-widest text-xs">Syncing database...</td></tr>';
    try {
        const res = await fetch('/api/admin/accounts', { headers: getAuthHeaders() });
        const accounts = await res.json();
        window.allAccounts = accounts;
        updateStatsBar('Total Admins', accounts.length);
        if (accounts.length === 0) { list.innerHTML = '<tr><td colspan="4" class="px-8 py-10 text-center text-slate-500 uppercase font-black tracking-widest text-xs opacity-50">No mini admins created.</td></tr>'; return; }
        list.innerHTML = accounts.map(a => `
            <tr class="group hover:bg-white/[0.02] transition-all border-b border-white/[0.02]">
                <td class="px-8 py-6"><div class="flex items-center gap-3"><div class="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-all"><i data-lucide="user" class="w-5 h-5"></i></div><span class="font-bold text-white">${a.username}</span></div></td>
                <td class="px-8 py-6 text-slate-400 text-sm uppercase font-black tracking-widest opacity-70">${a.collegeId?.name || '---'}</td>

                <td class="px-8 py-6"><div class="flex items-center gap-2"><span class="text-xs font-mono bg-dark-800 px-2 py-1 rounded border border-white/5 text-slate-500">${a.password}</span></div></td>
                <td class="px-8 py-6 text-right"><div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onclick="openAccountModal('${a._id}')" class="p-2 glass rounded-lg text-slate-400 hover:text-white"><i data-lucide="edit-2" class="w-4 h-4"></i></button><button onclick="deleteAccount('${a._id}')" class="p-2 glass rounded-lg text-slate-400 hover:text-red-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></td>
            </tr>
        `).join('');
        refreshIcons();
    } catch (err) { list.innerHTML = `<tr><td colspan="4" class="px-8 py-10 text-center text-red-400 font-bold">${err.message}</td></tr>`; }
}

function openAccountModal(id = null) {
    const acc = id ? window.allAccounts.find(a => a._id === id) : { username: '', password: '', collegeId: { _id: '' } };
    setModalTitle(id ? 'Update Permissions' : 'Assign New Admin');
    showModal(`<form onsubmit="saveAccount(event, ${id ? `'${id}'` : 'null'})" class="space-y-6"><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label class="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-widest text-xs">Unique Username</label><input type="text" name="username" value="${acc.username}" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-white transition-all font-black"></div><div><label class="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-widest text-xs">Access Key (Password)</label><input type="text" name="password" value="${acc.password}" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-white transition-all font-bold"></div></div><div><label class="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-widest text-xs">Assigned College</label><select name="collegeId" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white appearance-none focus:ring-2 focus:ring-primary-500 transition-all uppercase font-bold"><option value="" disabled>Choose Institution...</option>${colleges.map(c => `<option value="${c._id}" ${c._id === (acc.collegeId?._id || acc.collegeId) ? 'selected' : ''}>${c.name.toUpperCase()}</option>`).join('')}</select></div><div class="flex gap-4 pt-6"><button type="button" onclick="closeModal()" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs">Cancel</button><button type="submit" class="flex-1 py-4 btn-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg">Save Profile</button></div></form>`);
}

async function saveAccount(e, id) {
    e.preventDefault();
    const body = { 
        username: e.target.username.value, 
        password: e.target.password.value, 
        collegeId: e.target.collegeId.value 
    };
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/accounts/${id}` : '/api/admin/accounts';
        const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Account update failed');
        closeModal(); loadAccountsList(); notify('Administrator permissions updated', 'success');
    } catch (err) { notify(err.message, 'error'); }
}

async function deleteAccount(id) {
    const ok = await confirmAction('Revoke Access', 'Are you sure you want to remove this admin?');
    if (!ok) return;
    try {
        const res = await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Action blocked by server');
        loadAccountsList(); notify('Admin access revoked', 'success');
    } catch (err) { notify(err.message, 'error'); }
}

// ── Exams ────────────────────────────────────────────────────────────

async function loadExamsGrid() {
    const grid = document.getElementById('examGrid');
    grid.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div><p class="uppercase font-black text-[10px] tracking-widest">Optimizing assessments...</p></div>';
    try {
        const res = await fetch(`/api/admin/exams?collegeId=${selectedCollegeId}`, { headers: getAuthHeaders() });
        const exams = await res.json();
        window.allExams = exams;
        updateStatsBar('Total Assessments', exams.length);
        if (exams.length === 0) { grid.innerHTML = '<div class="col-span-full py-20 text-center"><div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600"><i data-lucide="clipboard-x"></i></div><p class="text-slate-500 uppercase font-black tracking-widest text-xs opacity-50">No active exams found for this scope.</p></div>'; refreshIcons(); return; }
        grid.innerHTML = exams.map(exam => `
            <div class="glass-card p-8 rounded-[2rem] flex flex-col group">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex-1"><h3 class="text-2xl font-extrabold text-white mb-2 leading-tight group-hover:text-primary-400 transition-all uppercase tracking-tight">${exam.title}</h3><div class="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest"><span class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>Live Assessment</div></div>
                    <div class="flex gap-2"><button onclick="openExamModal('${exam._id}')" class="p-2.5 glass rounded-xl text-slate-500 hover:text-white transition-all"><i data-lucide="settings-2" class="w-5 h-5"></i></button><button onclick="deleteExam('${exam._id}')" class="p-2.5 glass rounded-xl text-slate-500 hover:text-red-400 transition-all"><i data-lucide="trash" class="w-5 h-5"></i></button></div>
                </div>
                <div class="grid grid-cols-1 gap-4 mb-8">
                    <div class="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5"><div class="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400"><i data-lucide="calendar-days" class="w-5 h-5"></i></div><div class="text-xs uppercase font-black tracking-tighter"><p class="text-slate-500 mb-0.5">Start Time</p><p class="text-white">${exam.startTime ? new Date(exam.startTime).toLocaleString().toUpperCase() : 'INSTANTLY OPEN'}</p></div></div>
                    <div class="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5"><div class="w-10 h-10 bg-accent-500/10 rounded-xl flex items-center justify-center text-accent-400"><i data-lucide="timer" class="w-5 h-5"></i></div><div class="text-xs uppercase font-black tracking-tighter"><p class="text-slate-500 mb-0.5">Deadline</p><p class="text-white">${exam.endTime ? new Date(exam.endTime).toLocaleString().toUpperCase() : 'INDEFINITE'}</p></div></div>
                </div>
                <button onclick="viewExamDetails('${exam._id}')" class="mt-auto w-full py-4 btn-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 group/btn">Open Control Center<i data-lucide="chevron-right" class="w-5 h-5 transition-transform group-hover/btn:translate-x-1"></i></button>
            </div>
        `).join('');
        refreshIcons();
    } catch (err) { grid.innerHTML = `<div class="col-span-full py-20 text-center text-red-400 font-bold uppercase">${err.message}</div>`; }
}

function openExamModal(id = null) {
    const exam = id ? window.allExams.find(e => e._id === id) : { title: '', startTime: '', endTime: '', collegeId: selectedCollegeId };
    const fmt = (d) => {
        if (!d) return '';
        const dateObj = new Date(d);
        const offset = dateObj.getTimezoneOffset() * 60000;
        return new Date(dateObj.getTime() - offset).toISOString().slice(0, 16);
    };
    setModalTitle(id ? 'Refine Assessment' : 'Launch New Assessment');
    let collegeSection = '';
    if (currentAdmin.role === 'main') {
        collegeSection = `<div><label class="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-widest text-xs">${id ? 'Relocate to Institution' : 'Target Institution'}</label><select name="collegeId" class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500 appearance-none uppercase font-black">${colleges.map(c => `<option value="${c._id}" ${c._id === (exam.collegeId?._id || exam.collegeId) ? 'selected' : ''}>${c.name.toUpperCase()}</option>`).join('')}</select></div>`;
    }
    showModal(`<form onsubmit="saveExam(event, ${id ? `'${id}'` : 'null'})" class="space-y-6"><div><label class="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-widest text-xs">Assessment Title</label><input type="text" name="title" value="${exam.title}" required placeholder="e.g. APTITUDE PROTOCOL" class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-white transition-all uppercase font-black tracking-tight"></div>${collegeSection}<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label class="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-widest text-xs">Activation Window</label><input type="datetime-local" name="startTime" value="${fmt(exam.startTime)}" class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500 uppercase"></div><div><label class="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-widest text-xs">Expiry Window</label><input type="datetime-local" name="endTime" value="${fmt(exam.endTime)}" class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500 uppercase"></div></div><div class="flex gap-4 pt-6"><button type="button" onclick="closeModal()" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs">Discard</button><button type="submit" class="flex-1 py-4 btn-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg">Save Assessment</button></div></form>`);
}

async function saveExam(e, id) {
    e.preventDefault();
    const startTimeLocal = e.target.startTime.value;
    const endTimeLocal = e.target.endTime.value;
    const startTimeUTC = startTimeLocal ? new Date(startTimeLocal).toISOString() : null;
    const endTimeUTC = endTimeLocal ? new Date(endTimeLocal).toISOString() : null;

    const body = { 
        title: e.target.title.value.toUpperCase(), 
        startTime: startTimeUTC, 
        endTime: endTimeUTC 
    };
    if (currentAdmin.role === 'main') { body.collegeId = e.target.collegeId.value; if (!body.collegeId) return notify('Target college is required', 'error'); }
    else { body.collegeId = currentAdmin.college?._id; }
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/exams/${id}` : '/api/admin/exams';
        const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Exam sync failed');
        closeModal(); loadExamsGrid(); notify('Exam profile synchronized', 'success');
    } catch (err) { notify(err.message, 'error'); }
}

async function deleteExam(id) {
    const ok = await confirmAction('Delete Exam', 'Critical Warning: This will erase all results and questions. Confirm?');
    if (!ok) return;
    try {
        const res = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Permission denied');
        loadExamsGrid(); notify('Exam deleted permanently', 'success');
    } catch (err) { notify(err.message, 'error'); }
}

// ── Students ─────────────────────────────────────────────────────────

async function loadStudentsList() {
    const list = document.getElementById('studentList');
    const tableHeader = document.querySelector('#content-students thead tr');
    tableHeader.innerHTML = `<th class="px-8 py-5">Profile</th><th class="px-8 py-5 text-center">Tests</th><th class="px-8 py-5 text-center">Total Marks</th><th class="px-8 py-5 text-center">Avg. Score</th><th class="px-8 py-5 text-center">College Rank</th><th class="px-8 py-5 text-right">Actions</th>`;
    list.innerHTML = '<tr><td colspan="6" class="px-8 py-10 text-center text-slate-500 uppercase font-black tracking-widest text-xs">Syncing student database...</td></tr>';
    try {
        const res = await fetch(`/api/admin/students?collegeId=${selectedCollegeId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        
        // Calculate Ranks within this college result set
        const sortedForRank = [...data].sort((a, b) => (b.totalMarks || 0) - (a.totalMarks || 0));
        const ranks = {};
        sortedForRank.forEach((s, idx) => {
            if (idx > 0 && s.totalMarks === sortedForRank[idx-1].totalMarks) {
                ranks[s._id] = ranks[sortedForRank[idx-1]._id];
            } else { ranks[s._id] = idx + 1; }
        });

        window.allStudents = data;
        document.getElementById('studentCountBadge').textContent = `${data.length} REGISTERED`;
        loadCollegeStats(); 
        if (data.length === 0) { list.innerHTML = '<tr><td colspan="6" class="px-8 py-20 text-center"><div class="text-slate-600 mb-2"><i data-lucide="user-x" class="w-10 h-10 mx-auto"></i></div><p class="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Empty Student Roster</p></td></tr>'; refreshIcons(); return; }
        list.innerHTML = data.map(s => {
            const avgScore = s.testCount > 0 ? (s.totalMarks / s.testCount).toFixed(1) : '0.0';
            const rank = ranks[s._id];
            let rankClass = 'text-slate-400 bg-white/5 border-white/5';
            if (rank === 1) rankClass = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]';
            else if (rank === 2) rankClass = 'text-slate-300 bg-white/10 border-white/20';
            else if (rank === 3) rankClass = 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            return `
                <tr class="group hover:bg-white/[0.01] transition-all border-b border-white/[0.02]">
                    <td class="px-8 py-6"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-dark-800 to-dark-700 flex items-center justify-center text-primary-400 border border-white/5 font-black text-xs shadow-inner uppercase">${s.name.charAt(0)}</div><div><p class="text-sm font-bold text-white leading-tight uppercase tracking-tight">${s.name.toUpperCase()}</p><div class="flex items-center gap-2 mt-1.5"><span class="px-2 py-0.5 bg-primary-500/10 text-primary-400 text-[9px] font-black uppercase tracking-[0.2em] rounded border border-primary-500/20 shadow-sm">ROLL NUMBER : <span class="text-xs font-black text-slate-300 tracking-[0.1em] ml-1">${s.rollNumber.toString()}</span></span></div></div></div></td>

                    <td class="px-8 py-6 text-center"><span class="px-3 py-1 bg-white/5 rounded-lg text-xs font-black text-slate-400 border border-white/5">${s.testCount || 0}</span></td>
                    <td class="px-8 py-6 text-center"><span class="text-sm font-black text-white">${s.totalMarks || 0}</span></td>
                    <td class="px-8 py-6 text-center"><span class="text-xs font-bold text-primary-400 bg-primary-500/5 px-2 py-1 rounded-md border border-primary-500/10">${avgScore}</span></td>
                    <td class="px-8 py-6 text-center"><div class="inline-flex items-center justify-center w-8 h-8 rounded-full border font-black text-xs ${rankClass}">${rank}</div></td>
                    <td class="px-8 py-6 text-right"><div class="flex justify-end gap-2"><button onclick="openStudentAnalysis('${s._id}')" class="p-2.5 glass rounded-xl text-primary-400 hover:text-white hover:bg-primary-500/20 hover:border-primary-500/40 transition-all" title="View Analysis"><i data-lucide="microscope" class="w-4 h-4"></i></button><button onclick="openStudentModal('${s._id}')" class="p-2.5 glass rounded-xl text-slate-400 hover:text-white hover:bg-primary-500/20 hover:border-primary-500/40 transition-all" title="Edit Profile"><i data-lucide="edit-3" class="w-4 h-4"></i></button><button onclick="deleteStudent('${s._id}')" class="p-2 glass rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all" title="Delete Student"><i data-lucide="user-minus" class="w-4 h-4"></i></button></div></td>
                </tr>
            `;
        }).join('');
        refreshIcons();
    } catch (err) { list.innerHTML = `<tr><td colspan="6" class="px-8 py-10 text-center text-red-400 font-bold uppercase tracking-widest text-xs">${err.message}</td></tr>`; }
}

function openStudentModal(id = null) {
    const student = id ? window.allStudents.find(s => s._id === id) : { name: '', rollNumber: '' };
    setModalTitle(id ? 'Refine Student Profile' : 'New Student Identity');
    showModal(`<form onsubmit="saveStudent(event, ${id ? `'${id}'` : 'null'})" class="space-y-6"><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label class="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-widest text-xs">Roll Identity</label><input type="number" name="rollNumber" value="${student.rollNumber}" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500 uppercase font-black tracking-widest"></div><div><label class="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-widest text-xs">Legal Name</label><input type="text" name="name" value="${student.name}" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500 uppercase font-bold tracking-tight"></div></div>${id ? '<p class="text-[10px] text-slate-500 uppercase tracking-[0.2em] bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/10 leading-relaxed font-bold">Protocol: History will be preserved and synchronized with the updated roll identity token.</p>' : ''}<div class="flex gap-4 pt-6"><button type="button" onclick="closeModal()" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs">Discard</button><button type="submit" class="flex-1 py-4 btn-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg">${id ? 'Sync Changes' : 'Create Student'}</button></div></form>`);
}

async function saveStudent(e, id) {
    e.preventDefault();
    const body = { name: e.target.name.value.toUpperCase(), rollNumber: e.target.rollNumber.value, collegeId: selectedCollegeId };
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/students/${id}` : '/api/admin/students';
        const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json()).message);
        closeModal(); loadStudentsList(); notify('Student record synchronized', 'success');
    } catch (err) { notify(err.message, 'error'); }
}

async function deleteStudent(id) {
    const ok = await confirmAction('Delete Profile', 'Are you sure you want to remove this student record?');
    if (!ok) return;
    try {
        const res = await fetch(`/api/admin/students/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Access denied');
        loadStudentsList(); notify('Student profile removed', 'success');
    } catch (err) { notify(err.message, 'error'); }
}

async function deleteAllStudents() {
    const ok = await confirmAction('Purge Roster', 'EXTREME DANGER: This will delete ALL students for this college. Continue?');
    if (!ok) return;
    try {
        const res = await fetch(`/api/admin/students?collegeId=${selectedCollegeId}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Action failed');
        const data = await res.json(); loadStudentsList(); notify(data.message, 'success');
    } catch (err) { notify(err.message, 'error'); }
}

// ── CSV Bulk Uploads ──────────────────────────────────────────────────

function openBulkStudentModal() {
    setModalTitle('Students Bulk Sync (CSV)');
    showModal(`<div class="space-y-6 text-center"><div class="p-8 border-2 border-dashed border-slate-800 rounded-[2rem] bg-white/5 group hover:border-primary-500/50 transition-all"><i data-lucide="upload-cloud" class="w-12 h-12 text-slate-600 mx-auto mb-4 group-hover:text-primary-400 transition-all"></i><h4 class="text-white font-bold mb-2 uppercase tracking-widest">Upload Student CSV</h4><p class="text-xs text-slate-500 mb-6 uppercase tracking-widest font-black opacity-50">Headers: rollNumber, name</p><input type="file" id="csvFile" accept=".csv" class="hidden" onchange="handleCSVUpload(this, 'students')"><button onclick="document.getElementById('csvFile').click()" class="px-8 py-3 bg-dark-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 hover:bg-dark-700 transition-all">Select System File</button></div><p class="text-[10px] text-slate-600 uppercase font-black tracking-widest">Duplicates will be bypassed</p></div>`);
    refreshIcons();
}

function openBulkModal() {
    setModalTitle('Questions Bulk Sync (CSV)');
    showModal(`<div class="space-y-6 text-center"><div class="p-8 border-2 border-dashed border-slate-800 rounded-[2rem] bg-white/5 group hover:border-primary-500/50 transition-all"><i data-lucide="file-up" class="w-12 h-12 text-slate-600 mx-auto mb-4 group-hover:text-primary-400 transition-all"></i><h4 class="text-white font-bold mb-2 uppercase tracking-widest">Upload Question CSV</h4><p class="text-xs text-slate-500 mb-6 uppercase tracking-widest font-black opacity-50">Standard Assessment Format</p><input type="file" id="csvFile" accept=".csv" class="hidden" onchange="handleCSVUpload(this, 'questions')"><button onclick="document.getElementById('csvFile').click()" class="px-8 py-3 bg-dark-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 hover:bg-dark-700 transition-all">Select System File</button></div></div>`);
    refreshIcons();
}

function handleCSVUpload(input, type) {
    const file = input.files[0]; if (!file) return;
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: async function(results) {
        let data = results.data;
        try {
            if (type === 'students') {
                data = data.map(s => ({ ...s, name: s.name.toUpperCase(), rollNumber: parseInt(s.rollNumber) }));
                const res = await fetch('/api/admin/students/bulk', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ collegeId: selectedCollegeId, students: data }) });
                const resData = await res.json(); notify(resData.message, 'success'); loadStudentsList();
            } else {
                const questions = data.map(q => {
                    const opts = [q.option1, q.option2, q.option3, q.option4].map(o => o?.trim().toUpperCase());
                    const correctText = q.correctAnswer?.trim().toUpperCase();
                    let correctIdx = opts.indexOf(correctText);
                    if (correctIdx === -1 && ['0','1','2','3'].includes(correctText)) correctIdx = parseInt(correctText);
                    return { section: q.section.toUpperCase(), questionText: q.questionText, options: opts, correctAnswer: correctIdx };
                }).filter(q => q.correctAnswer !== -1 && q.questionText);
                if (questions.length === 0) throw new Error('No valid questions found in CSV.');
                const res = await fetch('/api/admin/questions/bulk', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ examId: selectedExamId, questions }) });
                const resData = await res.json(); notify(resData.message, 'success'); loadQuestions();
            }
            closeModal();
        } catch (err) { notify('Upload Error: ' + err.message, 'error'); }
    }});
}

// ── Control Center (Exam Details) ────────────────────────────────────

function viewExamDetails(id) {
    selectedExamId = id; const exam = window.allExams.find(e => e._id === id);
    showTab('exam-details'); document.getElementById('detailExamTitle').textContent = exam.title.toUpperCase();
    showSubTab('leaderboard');
}

function showSubTab(subId) {
    document.querySelectorAll('.subtab-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`subtab-${subId}`).classList.add('active');
    document.querySelectorAll('.subtab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`subcontent-${subId}`).classList.remove('hidden');
    loadSubTabContent(subId); refreshIcons();
}

function loadSubTabContent(id) {
    switch (id) {
        case 'leaderboard': loadLeaderboard(); break;
        case 'questions': loadQuestions(); break;
        case 'analytics': loadAnalytics(); break;
    }
}

let leaderboardSections = []; // Store globally for exports

async function loadLeaderboard() {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '<tr><td colspan="4" class="px-8 py-10 text-center text-slate-500 uppercase font-black tracking-widest text-xs">Aggregating results...</td></tr>';
    try {
        const res = await fetch(`/api/admin/leaderboard?examId=${selectedExamId}`, { headers: getAuthHeaders() });
        const { leaderboard, totalQuestions } = await res.json();
        leaderboardData = leaderboard; window.totalQuestions = totalQuestions;
        updateStatsBar('Ranked Results', leaderboard.length);
        
        if (leaderboard.length === 0) { list.innerHTML = '<tr><td colspan="4" class="px-8 py-20 text-center text-slate-500 uppercase font-black tracking-widest text-xs opacity-50">No submissions recorded yet.</td></tr>'; return; }
        
        // Find all unique sections from submissions
        const uniqueSections = new Set();
        leaderboard.forEach(u => {
            if (u.sectionScores) Object.keys(u.sectionScores).forEach(sec => uniqueSections.add(sec));
        });
        leaderboardSections = Array.from(uniqueSections).sort();

        // Update Table Headers
        const thead = document.getElementById('leaderboardThead');
        let thHtml = `<tr>
            <th class="px-8 py-5">Rank</th>
            <th class="px-8 py-5">Student Identity</th>
            <th class="px-8 py-5 text-center">Total Mark</th>`;
        leaderboardSections.forEach(sec => {
            thHtml += `<th class="px-8 py-5 text-center truncate max-w-[100px]" title="${sec}">${sec}</th>`;
        });
        thHtml += `<th class="px-8 py-5 text-right">Submission Time</th></tr>`;
        thead.innerHTML = thHtml;

        list.innerHTML = leaderboard.map(u => `
            <tr class="group hover:bg-white/[0.02] transition-all border-b border-white/[0.02]">
                <td class="px-8 py-6"><div class="w-8 h-8 rounded-full flex items-center justify-center font-black ${u.rank === 1 ? 'bg-yellow-500/20 text-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.2)]' : 'bg-dark-800 text-slate-500'} border border-white/5 font-black text-xs">${u.rank}</div></td>
                <td class="px-8 py-6"><div class="text-white font-bold uppercase tracking-tight">${u.name}</div><div class="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mt-1 opacity-50">${u.rollNumber} • ${u.email}</div></td>
                <td class="px-8 py-6 text-center"><span class="text-lg font-black text-primary-400">${u.totalScore}</span><span class="text-slate-600 font-bold text-xs ml-1">/${totalQuestions}</span></td>
                ${leaderboardSections.map(sec => `<td class="px-8 py-6 text-center text-sm font-bold text-white">${u.sectionScores[sec] || 0}</td>`).join('')}
                <td class="px-8 py-6 text-right text-slate-400 font-mono text-xs">${new Date(u.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()}</td>
            </tr>
        `).join('');
    } catch (err) { list.innerHTML = `<tr><td colspan="4" class="px-8 py-10 text-center text-red-400 uppercase font-bold">${err.message}</td></tr>`; }
}

async function loadQuestions() {
    const list = document.getElementById('questionList');
    list.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500 uppercase font-black tracking-widest text-xs">Retrieving question bank...</div>';
    try {
        const res = await fetch(`/api/admin/questions?examId=${selectedExamId}`, { headers: getAuthHeaders() });
        examQuestions = await res.json();
        updateStatsBar('Bank Questions', examQuestions.length);
        if (examQuestions.length === 0) { list.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500 uppercase font-black tracking-widest text-xs opacity-50">The question bank is empty.</div>'; return; }
        const grouped = examQuestions.reduce((acc, q) => { const s = q.section || 'General'; if (!acc[s]) acc[s] = []; acc[s].push(q); return acc; }, {});
        list.innerHTML = Object.entries(grouped).map(([section, qs]) => `
            <div class="section-container space-y-8">
                <div class="flex items-center gap-6"><h5 class="text-xs font-black uppercase tracking-[0.3em] text-primary-400 bg-primary-500/10 px-6 py-2.5 rounded-full border border-primary-500/20 shadow-lg shadow-primary-500/5">${section.toUpperCase()}</h5><div class="h-px flex-1 bg-gradient-to-right from-primary-500/30 to-transparent"></div></div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    ${qs.map((q, i) => `
                        <div class="glass-card p-8 rounded-[2.5rem] relative group/q">
                            <div class="flex justify-between items-start mb-8"><h6 class="text-white font-bold leading-relaxed flex gap-4 text-lg"><span class="text-primary-500 font-black opacity-30 italic">#${i+1}</span>${q.questionText}</h6><div class="flex gap-2 ml-4"><button onclick="openQuestionModal('${q._id}')" class="p-2.5 glass rounded-xl text-slate-400 hover:text-white transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button><button onclick="deleteQuestion('${q._id}')" class="p-2.5 glass rounded-xl text-slate-400 hover:text-red-400 transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>
                            <div class="grid grid-cols-2 gap-4">${q.options.map((opt, idx) => `<div class="p-4 rounded-2xl text-xs font-bold border transition-all duration-300 ${idx == q.correctAnswer ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/5' : 'bg-dark-950/40 border-white/5 text-slate-500'}"><span class="text-[10px] uppercase opacity-40 mr-2 font-black text-[9px]">OPT ${String.fromCharCode(65 + idx)}</span>${opt.toUpperCase()}</div>`).join('')}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        refreshIcons();
    } catch (err) { list.innerHTML = `<div class="col-span-full py-20 text-center text-red-400 font-bold uppercase">${err.message}</div>`; }
}

async function deleteAllQuestions() {
    const ok = await confirmAction('Purge Bank', 'Are you sure you want to delete ALL questions from this exam? This cannot be undone.');
    if (!ok) return;
    try {
        const res = await fetch(`/api/admin/questions?examId=${selectedExamId}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to purge bank');
        loadQuestions(); notify('Question bank purged', 'success');
    } catch (err) { notify(err.message, 'error'); }
}

// ── Analytics (Advanced Charting) ────────────────────────────────────

async function loadAnalytics() {
    try {
        const res = await fetch(`/api/admin/analytics?examId=${selectedExamId}`, { headers: getAuthHeaders() });
        analyticsData = await res.json(); if (analyticsData.length === 0) return;
        const sectionMap = analyticsData.reduce((acc, q) => { const s = q.section || 'General'; if (!acc[s]) acc[s] = { correct: 0, total: 0 }; acc[s].correct += q.correctCount; acc[s].total += q.totalStudents; return acc; }, {});
        const sectionLabels = Object.keys(sectionMap);
        const sectionSuccessRates = sectionLabels.map(s => Math.round((sectionMap[s].correct / sectionMap[s].total) * 100) || 0);
        
        // Calculate global success rate across all questions
        let globalCorrect = 0; let globalTotal = 0;
        analyticsData.forEach(q => { globalCorrect += q.correctCount; globalTotal += q.totalStudents; });
        const overallSuccess = globalTotal > 0 ? Math.round((globalCorrect / globalTotal) * 100) : 0;

        renderDonut(sectionLabels, sectionSuccessRates, overallSuccess);
        if (sectionLabels.length > 0) renderHistogram(sectionLabels[0]);
        updateStatsBar('Data Sections', sectionLabels.length);
    } catch (err) { console.error('Analytics Error:', err); }
}

function renderDonut(labels, successRates, overallSuccess) {
    const ctx = document.getElementById('sectionDonutChart').getContext('2d'); if (sectionDonutChart) sectionDonutChart.destroy();
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    
    // Set default overall percentage
    const percentEl = document.getElementById('donutPercent');
    percentEl.textContent = overallSuccess + '%';

    sectionDonutChart = new Chart(ctx, {
        type: 'doughnut', data: { labels: labels, datasets: [{ data: labels.map(() => 1), backgroundColor: colors.slice(0, labels.length), borderWidth: 4, borderColor: '#0f172a', hoverOffset: 30, hoverBorderWidth: 0 }] },
        options: {
            cutout: '80%', layout: { padding: 30 }, plugins: { legend: { display: false } }, animation: { animateScale: true, animateRotate: true },
            onHover: (e, elements) => { if (elements.length > 0) { percentEl.textContent = successRates[elements[0].index] + '%'; } },
            onLeave: () => { percentEl.textContent = overallSuccess + '%'; },
            onClick: (e, elements) => { if (elements.length > 0) { renderHistogram(labels[elements[0].index]); } }
        }
    });
    // Add custom event listener for mouseleave to reset text when fully off the chart
    ctx.canvas.addEventListener('mouseleave', () => { percentEl.textContent = overallSuccess + '%'; });

    const legend = document.getElementById('sectionLegend');
    legend.innerHTML = labels.map((l, i) => `<button onclick="renderHistogram('${l}')" class="flex items-center gap-3 p-4 glass rounded-3xl hover:bg-white/5 transition-all text-left group"><div class="w-3 h-3 rounded-full group-hover:scale-150 transition-transform" style="background: ${colors[i % colors.length]}"></div><div class="overflow-hidden uppercase"><p class="text-[10px] font-black text-white truncate tracking-widest">${l}</p><p class="text-xs text-slate-500 font-bold">${successRates[i]}% Success</p></div></button>`).join('');
}

function renderHistogram(sectionName) {
    const questions = analyticsData.filter(q => (q.section || 'General') === sectionName);
    const ctx = document.getElementById('questionHistogram').getContext('2d'); if (questionHistChart) questionHistChart.destroy();
    document.getElementById('histTitle').textContent = `${sectionName.toUpperCase()} ANALYSIS`; document.getElementById('histSubtitle').textContent = `Individual item performance for ${questions.length} questions`;
    questionHistChart = new Chart(ctx, {
        type: 'bar', data: { labels: questions.map((_, i) => `Q${i + 1}`), datasets: [{ label: 'Correct', data: questions.map(q => q.correctCount), backgroundColor: '#10b981', borderRadius: 6 }, { label: 'Wrong', data: questions.map(q => q.wrongCount), backgroundColor: '#ef4444', borderRadius: 6 }, { label: 'Skipped', data: questions.map(q => q.unattemptedCount), backgroundColor: '#334155', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: 'rgba(255,255,255,0.03)' } } }, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { weight: 'bold', size: 10 }, padding: 20 } } } }
    });
}

// ── Question Management (Single) ─────────────────────────────────────

function openQuestionModal(id = null) {
    const q = id ? examQuestions.find(x => x._id === id) : { section: '', questionText: '', options: ['', '', '', ''], correctAnswer: 0 };
    setModalTitle(id ? 'Refine Question' : 'Draft New Question');
    showModal(`<form onsubmit="saveQuestion(event, ${id ? `'${id}'` : 'null'})" class="space-y-8"><div><label class="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Topic / Domain</label><input type="text" name="section" value="${q.section}" placeholder="e.g. QUANTITATIVE APTITUDE" required class="w-full px-6 py-4 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500 transition-all font-black uppercase tracking-widest"></div><div><label class="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Question Statement</label><textarea name="questionText" required rows="3" class="w-full px-6 py-4 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500 transition-all font-medium leading-relaxed">${q.questionText}</textarea></div><div class="space-y-4"><label class="block text-xs font-black uppercase tracking-[0.2em] text-slate-500">Options & Key</label><div class="grid grid-cols-1 md:grid-cols-2 gap-4">${q.options.map((opt, idx) => `<div class="flex items-center gap-4 p-4 bg-dark-900/50 border border-slate-800 rounded-[1.5rem] focus-within:border-primary-500/50 transition-all group"><label class="relative flex items-center cursor-pointer"><input type="radio" name="correctAnswer" value="${idx}" ${idx == q.correctAnswer ? 'checked' : ''} class="peer sr-only"><div class="w-6 h-6 border-2 border-slate-700 rounded-full peer-checked:border-emerald-500 peer-checked:bg-emerald-500/20 transition-all flex items-center justify-center"><div class="w-2 h-2 bg-emerald-500 rounded-full scale-0 peer-checked:scale-100 transition-transform"></div></div></label><input type="text" name="option${idx}" value="${opt}" placeholder="Option ${String.fromCharCode(65 + idx)}" required class="flex-1 bg-transparent outline-none text-white font-bold text-sm uppercase"></div>`).join('')}</div></div><div class="flex gap-4 pt-4"><button type="button" onclick="closeModal()" class="flex-1 py-5 bg-white/5 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">Cancel</button><button type="submit" class="flex-1 py-5 btn-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl">Sync to Bank</button></div></form>`);
}

async function saveQuestion(e, id) {
    e.preventDefault();
    const body = { examId: selectedExamId, section: e.target.section.value.toUpperCase(), questionText: e.target.questionText.value, options: [e.target.option0.value.toUpperCase(), e.target.option1.value.toUpperCase(), e.target.option2.value.toUpperCase(), e.target.option3.value.toUpperCase()], correctAnswer: e.target.correctAnswer.value };
    try {
        const res = await fetch(id ? `/api/admin/questions/${id}` : '/api/admin/questions', { method: id ? 'PUT' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Question sync failed');
        closeModal(); loadQuestions(); notify('Question bank updated', 'success');
    } catch (err) { notify(err.message, 'error'); }
}

async function deleteQuestion(id) {
    const ok = await confirmAction('Delete Question', 'Remove this question from the bank?');
    if (!ok) return;
    try {
        const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete');
        loadQuestions(); notify('Question removed from repository', 'success');
    } catch (err) { notify(err.message, 'error'); }
}

// ── Export Features ──────────────────────────────────────────────────

function getSortedResults() { return [...leaderboardData].sort((a, b) => a.rollNumber - b.rollNumber); }

function downloadCSV() {
    const data = getSortedResults();
    if (data.length === 0) return notify('No data to export', 'info');

    // Build dynamic headers
    const baseHeaders = ['Rank', 'Name', 'Roll Number', 'Email'];
    const sectionHeaders = leaderboardSections.map(sec => sec.toUpperCase());
    const endHeaders = ['Total Score', 'Total Questions', 'Submitted At'];
    const headers = [...baseHeaders, ...sectionHeaders, ...endHeaders];

    const rows = data.map(u => {
        const baseData = [u.rank, u.name, u.rollNumber, u.email];
        const sectionData = leaderboardSections.map(sec => u.sectionScores[sec] || 0);
        const endData = [u.totalScore, window.totalQuestions, new Date(u.submittedAt).toLocaleString().toUpperCase()];
        return [...baseData, ...sectionData, ...endData];
    });

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Results_${document.getElementById('detailExamTitle').textContent}_RollSorted.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); notify('CSV Export complete', 'success');
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const data = getSortedResults();
    if (data.length === 0) return notify('No data to export', 'info');

    const title = document.getElementById('detailExamTitle').textContent;

    // Header
    doc.setFillColor(15, 23, 42); // Dark blue header
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('EXAMINATION RESULTS', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);

    // Dynamic headers for PDF
    const baseHead = ['Roll No.', 'Candidate Name'];
    const sectionHead = leaderboardSections.map(sec => sec.substring(0, 8)); // truncate for PDF space
    const endHead = ['Total Score', 'Timestamp'];
    const headRow = [...baseHead, ...sectionHead, ...endHead];

    const rows = data.map(u => {
        const baseData = [u.rollNumber, u.name.toUpperCase()];
        const sectionData = leaderboardSections.map(sec => u.sectionScores[sec] || 0);
        const endData = [`${u.totalScore}/${window.totalQuestions}`, new Date(u.submittedAt).toLocaleTimeString().toUpperCase()];
        return [...baseData, ...sectionData, ...endData];
    });

    doc.autoTable({
        startY: 45,
        head: [headRow],
        body: rows,
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 45 }
    });

    doc.save(`Results_${title.replace(/\s+/g, '_')}.pdf`);
    notify('Official PDF Document generated', 'success');
}

function downloadQuestionsCSV() {
    if (examQuestions.length === 0) return notify('No questions to export', 'info');
    const headers = ['section', 'questionText', 'option1', 'option2', 'option3', 'option4', 'correctAnswer'];
    const rows = examQuestions.map(q => [q.section || 'General', q.questionText, q.options[0] || '', q.options[1] || '', q.options[2] || '', q.options[3] || '', q.options[q.correctAnswer] || '']);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Questions_${document.getElementById('detailExamTitle').textContent}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); notify('Question bank exported', 'success');
}

// ── Helpers ──────────────────────────────────────────────────────────

async function clearUsers() {
    const ok = await confirmAction('Purge Results', 'EXTREME DANGER: Erase all student results for this exam?');
    if (!ok) return;
    try {
        const res = await fetch(`/api/admin/users?examId=${selectedExamId}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await res.json(); notify(data.message, 'success'); loadLeaderboard();
    } catch (err) { notify(err.message, 'error'); }
}

function setModalTitle(text) { document.getElementById('modalTitle').textContent = text.toUpperCase(); }
function showModal(content) { document.getElementById('modalBody').innerHTML = content; document.getElementById('modalOverlay').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); document.body.style.overflow = ''; }

function openSidebar() { document.getElementById('sidebar').classList.remove('-translate-x-full'); document.getElementById('sidebarOverlay').classList.remove('hidden'); }
function closeSidebar() { document.getElementById('sidebar').classList.add('-translate-x-full'); document.getElementById('sidebarOverlay').classList.add('hidden'); }

// ── Student Analysis Modal ───────────────────────────────────────────
let saRadarChartInst = null;
let saTrendChartInst = null;

async function openStudentAnalysis(studentId) {
    document.getElementById('studentAnalysisModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Reset state
    document.getElementById('saContent').classList.add('opacity-0');
    document.getElementById('saContent').classList.add('hidden');
    document.getElementById('saLoader').classList.remove('hidden');
    document.getElementById('saNoRadarData').classList.add('hidden');
    document.getElementById('saNoTrendData').classList.add('hidden');

    try {
        const res = await fetch(`/api/admin/students/${studentId}/analysis`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to fetch analysis');
        const data = await res.json();
        
        // Populate Header
        document.getElementById('saName').textContent = data.student.name;
        document.getElementById('saRoll').textContent = data.student.rollNumber;
        document.getElementById('saCollege').textContent = data.student.college;

        // Populate Top Metrics
        document.getElementById('saGPA').textContent = `${data.metrics.gpa}%`;
        document.getElementById('saPrecision').textContent = `${data.metrics.precision}%`;
        document.getElementById('saParticipation').textContent = `${data.metrics.participation}%`;
        document.getElementById('saTestsTaken').textContent = `${data.metrics.testsTaken}/${data.metrics.testsAssigned}`;
        
        // Find Mastery
        let bestSec = 'N/A';
        let bestScore = -1;
        Object.entries(data.radarData).forEach(([sec, score]) => {
            if (score > bestScore) { bestScore = score; bestSec = sec; }
        });
        document.getElementById('saMastery').textContent = bestScore > 0 ? bestSec : 'N/A';

        // Render Charts
        renderSARadarChart(data.radarData);
        renderSATrendChart(data.trendData);

        // Show Content
        setTimeout(() => {
            document.getElementById('saLoader').classList.add('hidden');
            const content = document.getElementById('saContent');
            content.classList.remove('hidden');
            setTimeout(() => content.classList.remove('opacity-0'), 50);
        }, 500);

    } catch (err) {
        notify(err.message, 'error');
        closeStudentAnalysis();
    }
}

function closeStudentAnalysis() {
    document.getElementById('studentAnalysisModal').classList.add('hidden');
    document.body.style.overflow = '';
}

function renderSARadarChart(radarData) {
    const ctx = document.getElementById('saRadarChart').getContext('2d');
    if (saRadarChartInst) saRadarChartInst.destroy();

    const labels = Object.keys(radarData);
    const data = Object.values(radarData);

    if (labels.length === 0) {
        document.getElementById('saNoRadarData').classList.remove('hidden');
        return;
    }

    saRadarChartInst = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels.map(l => l.length > 15 ? l.substring(0, 15) + '...' : l),
            datasets: [{
                label: 'Mastery Level (%)',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 1)',
                pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 10, family: 'Inter', weight: 'bold' } },
                    ticks: { display: false, min: 0, max: 100 }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderSATrendChart(trendData) {
    const ctx = document.getElementById('saTrendChart').getContext('2d');
    if (saTrendChartInst) saTrendChartInst.destroy();

    if (trendData.length === 0) {
        document.getElementById('saNoTrendData').classList.remove('hidden');
        return;
    }

    const labels = trendData.map(t => new Date(t.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}));
    const data = trendData.map(t => t.scorePct);

    saTrendChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Exam Score (%)',
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#10b981',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10, family: 'Inter', weight: 'bold' } } },
                y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10, family: 'Inter', weight: 'bold' } } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { 
                    callbacks: { title: (context) => trendData[context[0].dataIndex].examName },
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 12, weight: 'bold' }, padding: 12, cornerRadius: 8 
                }
            }
        }
    });
}
