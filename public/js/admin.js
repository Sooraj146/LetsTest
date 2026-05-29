// Admin Panel Logic - Professional Edition
let currentAdmin = JSON.parse(localStorage.getItem('admin')) || null;
let currentTab = 'exams';
let selectedExamId = null;
let colleges = [];
let selectedCollegeId = ''; 
let leaderboardData = [];
let examQuestions = [];

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

// ── Auth ─────────────────────────────────────────────────────────────

loginForm.onsubmit = async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Access Denied');
        
        currentAdmin = { ...data, password };
        localStorage.setItem('admin', JSON.stringify(currentAdmin));
        showDashboard();
    } catch (err) {
        loginError.textContent = err.message;
        loginError.classList.remove('hidden');
    }
};

function logout() {
    localStorage.removeItem('admin');
    window.location.reload();
}

function getAuthHeaders() {
    return {
        'x-admin-username': currentAdmin.username,
        'x-admin-password': currentAdmin.password,
        'Content-Type': 'application/json'
    };
}

// ── Navigation ───────────────────────────────────────────────────────

function showDashboard() {
    loginPanel.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    
    document.getElementById('adminUsername').textContent = currentAdmin.username;
    document.getElementById('adminRoleLabel').textContent = currentAdmin.role + ' administrator';
    
    if (currentAdmin.role === 'main') {
        document.getElementById('mainAdminLinks').classList.remove('hidden');
        document.getElementById('collegeFilterContainer').classList.remove('hidden');
        loadColleges().then(() => {
            showTab('colleges');
        });
    } else {
        selectedCollegeId = currentAdmin.college?._id;
        showTab('exams');
    }
}

async function loadColleges() {
    try {
        const res = await fetch('/api/admin/colleges', { headers: getAuthHeaders() });
        colleges = await res.json();
        
        const filter = document.getElementById('collegeFilter');
        filter.innerHTML = colleges.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
        if (colleges.length > 0) {
            selectedCollegeId = colleges[0]._id;
            filter.value = selectedCollegeId;
        }
    } catch (err) {
        console.error('Failed to load colleges', err);
    }
}

function showTab(tabId) {
    currentTab = tabId;
    
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-${tabId}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`content-${tabId}`).classList.add('active');
    
    const titles = {
        colleges: ['Institutions', 'Global management of registered colleges'],
        accounts: ['Administrators', 'Assign and manage college-level access'],
        exams: ['Assessments', 'Control and monitor exam sessions'],
        students: ['Students', 'Manage student eligibility and profiles'],
        'exam-details': ['Analysis', 'Real-time performance and management']
    };
    
    document.getElementById('tabTitle').textContent = titles[tabId][0];
    document.getElementById('tabDescription').textContent = titles[tabId][1];
    
    loadCurrentTab();
    refreshIcons();
}

function loadCurrentTab() {
    if (currentAdmin.role === 'main') {
        const filter = document.getElementById('collegeFilter');
        if (filter) selectedCollegeId = filter.value;
    }

    switch (currentTab) {
        case 'colleges': loadCollegesGrid(); break;
        case 'accounts': loadAccountsList(); break;
        case 'exams': loadExamsGrid(); break;
        case 'students': loadStudentsList(); break;
    }
}

// ── Colleges ─────────────────────────────────────────────────────────

async function loadCollegesGrid() {
    const grid = document.getElementById('collegeGrid');
    grid.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center gap-4 text-slate-500"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div><p>Fetching Institutions...</p></div>';
    
    try {
        const res = await fetch('/api/admin/colleges', { headers: getAuthHeaders() });
        const data = await res.json();
        colleges = data;
        
        if (data.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500">No colleges registered yet.</div>';
            return;
        }

        grid.innerHTML = data.map(c => `
            <div class="glass-card p-6 rounded-3xl relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -mr-8 -mt-8 transition-all group-hover:scale-150"></div>
                <div class="flex justify-between items-start mb-4 relative">
                    <div class="w-12 h-12 bg-dark-800 rounded-2xl flex items-center justify-center text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-all">
                        <i data-lucide="building" class="w-6 h-6"></i>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="openCollegeModal('${c._id}')" class="p-2 text-slate-500 hover:text-white transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                        <button onclick="deleteCollege('${c._id}')" class="p-2 text-slate-500 hover:text-red-400 transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
                <h4 class="text-xl font-bold text-white mb-1">${c.name}</h4>
                <p class="text-sm text-slate-500 font-mono">${c.domain}</p>
            </div>
        `).join('');
        refreshIcons();
    } catch (err) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center text-red-400">${err.message}</div>`;
    }
}

function openCollegeModal(id = null) {
    const college = id ? colleges.find(c => c._id === id) : { name: '', domain: '' };
    setModalTitle(id ? 'Edit Institution' : 'New Institution');
    showModal(`
        <form onsubmit="saveCollege(event, ${id ? `'${id}'` : 'null'})" class="space-y-6">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-slate-400 mb-2">College Name</label>
                    <input type="text" name="name" value="${college.name}" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-white transition-all">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-400 mb-2">Restricted Email Domain</label>
                    <input type="text" name="domain" value="${college.domain}" placeholder="@college.ac.in" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-white transition-all">
                </div>
            </div>
            <div class="flex gap-4 pt-6">
                <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-bold">Discard</button>
                <button type="submit" class="flex-1 py-4 btn-primary text-white rounded-2xl font-bold shadow-lg">Confirm</button>
            </div>
        </form>
    `);
}

async function saveCollege(e, id) {
    e.preventDefault();
    const body = { name: e.target.name.value, domain: e.target.domain.value };
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/colleges/${id}` : '/api/admin/colleges';
        const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Failed to synchronize college');
        closeModal();
        loadCollegesGrid();
        loadColleges(); 
    } catch (err) {
        alert(err.message);
    }
}

async function deleteCollege(id) {
    if (!confirm('Permanent Action: All linked accounts and data will be affected. Continue?')) return;
    try {
        const res = await fetch(`/api/admin/colleges/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete');
        loadCollegesGrid();
        loadColleges();
    } catch (err) {
        alert(err.message);
    }
}

// ── Admins ───────────────────────────────────────────────────────────

async function loadAccountsList() {
    const list = document.getElementById('accountList');
    list.innerHTML = '<tr><td colspan="4" class="px-8 py-10 text-center text-slate-500">Syncing database...</td></tr>';
    
    try {
        const res = await fetch('/api/admin/accounts', { headers: getAuthHeaders() });
        const accounts = await res.json();
        window.allAccounts = accounts;
        
        if (accounts.length === 0) {
            list.innerHTML = '<tr><td colspan="4" class="px-8 py-10 text-center text-slate-500">No mini admins created.</td></tr>';
            return;
        }

        list.innerHTML = accounts.map(a => `
            <tr class="group hover:bg-white/[0.02] transition-all">
                <td class="px-8 py-5">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-all">
                            <i data-lucide="user" class="w-5 h-5"></i>
                        </div>
                        <span class="font-bold text-white">${a.username}</span>
                    </div>
                </td>
                <td class="px-8 py-5 text-slate-400 text-sm">${a.collegeId?.name || '---'}</td>
                <td class="px-8 py-5">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-mono bg-dark-800 px-2 py-1 rounded border border-white/5 text-slate-500">${a.password}</span>
                    </div>
                </td>
                <td class="px-8 py-5 text-right">
                    <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onclick="openAccountModal('${a._id}')" class="p-2 glass rounded-lg text-slate-400 hover:text-white"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                        <button onclick="deleteAccount('${a._id}')" class="p-2 glass rounded-lg text-slate-400 hover:text-red-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
        refreshIcons();
    } catch (err) {
        list.innerHTML = `<tr><td colspan="4" class="px-8 py-10 text-center text-red-400">${err.message}</td></tr>`;
    }
}

function openAccountModal(id = null) {
    const acc = id ? window.allAccounts.find(a => a._id === id) : { username: '', password: '', collegeId: { _id: '' } };
    setModalTitle(id ? 'Update Permissions' : 'Assign New Admin');
    showModal(`
        <form onsubmit="saveAccount(event, ${id ? `'${id}'` : 'null'})" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-semibold text-slate-400 mb-2">Unique Username</label>
                    <input type="text" name="username" value="${acc.username}" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-white transition-all">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-400 mb-2">Access Key (Password)</label>
                    <input type="text" name="password" value="${acc.password}" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-white transition-all">
                </div>
            </div>
            <div>
                <label class="block text-sm font-semibold text-slate-400 mb-2">Assigned College</label>
                <select name="collegeId" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white appearance-none focus:ring-2 focus:ring-primary-500 transition-all">
                    <option value="" disabled>Choose Institution...</option>
                    ${colleges.map(c => `<option value="${c._id}" ${c._id === acc.collegeId?._id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="flex gap-4 pt-6">
                <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-bold">Cancel</button>
                <button type="submit" class="flex-1 py-4 btn-primary text-white rounded-2xl font-bold shadow-lg">Save Profile</button>
            </div>
        </form>
    `);
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
        closeModal();
        loadAccountsList();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteAccount(id) {
    if (!confirm('Revoke access for this admin?')) return;
    try {
        const res = await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Action blocked by server');
        loadAccountsList();
    } catch (err) {
        alert(err.message);
    }
}

// ── Exams ────────────────────────────────────────────────────────────

async function loadExamsGrid() {
    const grid = document.getElementById('examGrid');
    grid.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>Optimizing assessments...</div>';
    
    try {
        const res = await fetch(`/api/exams?collegeId=${selectedCollegeId}`);
        const exams = await res.json();
        window.allExams = exams;

        if (exams.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-20 text-center"><div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600"><i data-lucide="clipboard-x"></i></div><p class="text-slate-500">No active exams found for this scope.</p></div>';
            refreshIcons();
            return;
        }

        grid.innerHTML = exams.map(exam => `
            <div class="glass-card p-8 rounded-[2rem] flex flex-col group">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex-1">
                        <h3 class="text-2xl font-extrabold text-white mb-2 leading-tight group-hover:text-primary-400 transition-all">${exam.title}</h3>
                        <div class="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            Live Assessment
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openExamModal('${exam._id}')" class="p-2.5 glass rounded-xl text-slate-500 hover:text-white transition-all"><i data-lucide="settings-2" class="w-5 h-5"></i></button>
                        <button onclick="deleteExam('${exam._id}')" class="p-2.5 glass rounded-xl text-slate-500 hover:text-red-400 transition-all"><i data-lucide="trash" class="w-5 h-5"></i></button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 gap-4 mb-8">
                    <div class="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                        <div class="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400">
                            <i data-lucide="calendar-days" class="w-5 h-5"></i>
                        </div>
                        <div class="text-xs">
                            <p class="text-slate-500 font-bold uppercase tracking-tighter">Start Time</p>
                            <p class="text-white font-medium">${exam.startTime ? new Date(exam.startTime).toLocaleString() : 'Instantly Open'}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                        <div class="w-10 h-10 bg-accent-500/10 rounded-xl flex items-center justify-center text-accent-400">
                            <i data-lucide="timer" class="w-5 h-5"></i>
                        </div>
                        <div class="text-xs">
                            <p class="text-slate-500 font-bold uppercase tracking-tighter">Deadline</p>
                            <p class="text-white font-medium">${exam.endTime ? new Date(exam.endTime).toLocaleString() : 'Indefinite'}</p>
                        </div>
                    </div>
                </div>

                <button onclick="viewExamDetails('${exam._id}')" class="mt-auto w-full py-4 btn-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 group/btn">
                    Open Control Center
                    <i data-lucide="chevron-right" class="w-5 h-5 transition-transform group-hover/btn:translate-x-1"></i>
                </button>
            </div>
        `).join('');
        refreshIcons();
    } catch (err) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center text-red-400">${err.message}</div>`;
    }
}

function openExamModal(id = null) {
    const exam = id ? window.allExams.find(e => e._id === id) : { title: '', startTime: '', endTime: '', collegeId: selectedCollegeId };
    const fmt = (d) => d ? new Date(d).toISOString().slice(0, 16) : '';
    setModalTitle(id ? 'Refine Assessment' : 'Launch New Assessment');
    
    let collegeSection = '';
    if (currentAdmin.role === 'main') {
        if (!id) {
            // Creation mode: Multi-select
            collegeSection = `
                <div>
                    <label class="block text-sm font-semibold text-slate-400 mb-3">Distribute to Institutions</label>
                    <div class="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto custom-scrollbar p-1">
                        ${colleges.map(c => `
                            <label class="flex items-center gap-3 p-3 glass rounded-xl cursor-pointer hover:border-primary-500/50 transition-all">
                                <input type="checkbox" name="collegeIds" value="${c._id}" checked class="w-5 h-5 rounded-lg accent-primary-500">
                                <span class="text-sm font-medium text-slate-300 truncate">${c.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            // Edit mode: Change single college for this specific exam instance
            collegeSection = `
                <div>
                    <label class="block text-sm font-semibold text-slate-400 mb-2">Relocate to Institution</label>
                    <select name="collegeId" class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500 appearance-none">
                        ${colleges.map(c => `<option value="${c._id}" ${c._id === exam.collegeId ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
            `;
        }
    }

    showModal(`
        <form onsubmit="saveExam(event, ${id ? `'${id}'` : 'null'})" class="space-y-6">
            <div>
                <label class="block text-sm font-semibold text-slate-400 mb-2">Assessment Title</label>
                <input type="text" name="title" value="${exam.title}" required placeholder="e.g. End Semester Aptitude 2026" class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-white transition-all">
            </div>
            ${collegeSection}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-semibold text-slate-400 mb-2">Activation Window</label>
                    <input type="datetime-local" name="startTime" value="${fmt(exam.startTime)}" class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-400 mb-2">Expiry Window</label>
                    <input type="datetime-local" name="endTime" value="${fmt(exam.endTime)}" class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500">
                </div>
            </div>
            <div class="flex gap-4 pt-6">
                <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-bold">Discard</button>
                <button type="submit" class="flex-1 py-4 btn-primary text-white rounded-2xl font-bold shadow-lg">Save Assessment</button>
            </div>
        </form>
    `);
}

async function saveExam(e, id) {
    e.preventDefault();
    const body = { 
        title: e.target.title.value, 
        startTime: e.target.startTime.value || null,
        endTime: e.target.endTime.value || null,
    };
    
    if (id) {
        if (currentAdmin.role === 'main') {
            body.collegeId = e.target.collegeId.value;
        } else {
            body.collegeId = selectedCollegeId;
        }
    } else {
        if (currentAdmin.role === 'main') {
            const collegeIds = Array.from(e.target.querySelectorAll('input[name="collegeIds"]:checked')).map(i => i.value);
            if (collegeIds.length === 0) return alert('Select at least one college');
            body.collegeIds = collegeIds;
        } else {
            body.collegeId = currentAdmin.college?._id;
        }
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/exams/${id}` : '/api/admin/exams';
        const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Exam sync failed');
        closeModal();
        loadExamsGrid();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteExam(id) {
    if (!confirm('Critical Warning: This will erase all results and questions. Confirm?')) return;
    try {
        const res = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Permission denied');
        loadExamsGrid();
    } catch (err) {
        alert(err.message);
    }
}

// ── Students ─────────────────────────────────────────────────────────

async function loadStudentsList() {
    const list = document.getElementById('studentList');
    list.innerHTML = '<tr><td colspan="3" class="px-8 py-10 text-center text-slate-500">Syncing profiles...</td></tr>';
    
    try {
        const res = await fetch(`/api/admin/students?collegeId=${selectedCollegeId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        window.allStudents = data;

        document.getElementById('studentCountBadge').textContent = `${data.length} Active`;
        
        if (data.length === 0) {
            list.innerHTML = '<tr><td colspan="3" class="px-8 py-20 text-center"><div class="text-slate-600 mb-2"><i data-lucide="user-x" class="w-10 h-10 mx-auto"></i></div><p class="text-slate-500">Empty Student Database.</p></td></tr>';
            refreshIcons();
            return;
        }

        list.innerHTML = data.map(s => `
            <tr class="group hover:bg-white/[0.02] transition-all">
                <td class="px-8 py-5">
                    <span class="font-mono text-primary-400 font-bold bg-primary-500/5 px-2 py-1 rounded-lg border border-primary-500/10">${s.rollNumber}</span>
                </td>
                <td class="px-8 py-5 font-bold text-white">${s.name}</td>
                <td class="px-8 py-5 text-right">
                    <button onclick="deleteStudent('${s._id}')" class="p-2 text-slate-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"><i data-lucide="user-minus" class="w-5 h-5"></i></button>
                </td>
            </tr>
        `).join('');
        refreshIcons();
    } catch (err) {
        list.innerHTML = `<tr><td colspan="3" class="px-8 py-10 text-center text-red-400">${err.message}</td></tr>`;
    }
}

function openStudentModal() {
    setModalTitle('New Student Identity');
    showModal(`
        <form onsubmit="saveStudent(event)" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-semibold text-slate-400 mb-2">Roll Identity</label>
                    <input type="number" name="rollNumber" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-400 mb-2">Legal Name</label>
                    <input type="text" name="name" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500">
                </div>
            </div>
            <div class="flex gap-4 pt-6">
                <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-bold">Discard</button>
                <button type="submit" class="flex-1 py-4 btn-primary text-white rounded-2xl font-bold shadow-lg">Create Student</button>
            </div>
        </form>
    `);
}

async function saveStudent(e) {
    e.preventDefault();
    const body = { name: e.target.name.value, rollNumber: e.target.rollNumber.value, collegeId: selectedCollegeId };
    try {
        const res = await fetch('/api/admin/students', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json()).message);
        closeModal();
        loadStudentsList();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteStudent(id) {
    if (!confirm('Remove student profile?')) return;
    try {
        const res = await fetch(`/api/admin/students/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Access denied');
        loadStudentsList();
    } catch (err) {
        alert(err.message);
    }
}

// ── CSV Bulk Uploads ──────────────────────────────────────────────────

function openBulkStudentModal() {
    setModalTitle('Students Bulk Sync (CSV)');
    showModal(`
        <div class="space-y-6 text-center">
            <div class="p-8 border-2 border-dashed border-slate-800 rounded-[2rem] bg-white/5 group hover:border-primary-500/50 transition-all">
                <i data-lucide="upload-cloud" class="w-12 h-12 text-slate-600 mx-auto mb-4 group-hover:text-primary-400 transition-all"></i>
                <h4 class="text-white font-bold mb-2">Upload Student CSV</h4>
                <p class="text-xs text-slate-500 mb-6">Headers required: <b>rollNumber, name</b></p>
                <input type="file" id="csvFile" accept=".csv" class="hidden" onchange="handleCSVUpload(this, 'students')">
                <button onclick="document.getElementById('csvFile').click()" class="px-6 py-2.5 bg-dark-800 text-white rounded-xl text-sm font-bold border border-white/5 hover:bg-dark-700 transition-all">Select File</button>
            </div>
            <p class="text-[10px] text-slate-600 uppercase font-black">Duplicates will be skipped automatically</p>
        </div>
    `);
    refreshIcons();
}

function openBulkModal() {
    setModalTitle('Questions Bulk Sync (CSV)');
    showModal(`
        <div class="space-y-6 text-center">
            <div class="p-8 border-2 border-dashed border-slate-800 rounded-[2rem] bg-white/5 group hover:border-primary-500/50 transition-all">
                <i data-lucide="file-up" class="w-12 h-12 text-slate-600 mx-auto mb-4 group-hover:text-primary-400 transition-all"></i>
                <h4 class="text-white font-bold mb-2">Upload Question CSV</h4>
                <p class="text-xs text-slate-500 mb-6">Headers: <b>section, questionText, option0, option1, option2, option3, correctAnswer</b></p>
                <input type="file" id="csvFile" accept=".csv" class="hidden" onchange="handleCSVUpload(this, 'questions')">
                <button onclick="document.getElementById('csvFile').click()" class="px-6 py-2.5 bg-dark-800 text-white rounded-xl text-sm font-bold border border-white/5 hover:bg-dark-700 transition-all">Select File</button>
            </div>
        </div>
    `);
    refreshIcons();
}

function handleCSVUpload(input, type) {
    const file = input.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
            let data = results.data;
            try {
                if (type === 'students') {
                    // Normalize rollNumber to integer
                    data = data.map(s => ({ ...s, rollNumber: parseInt(s.rollNumber) }));
                    const res = await fetch('/api/admin/students/bulk', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ collegeId: selectedCollegeId, students: data })
                    });
                    const resData = await res.json();
                    alert(resData.message);
                    loadStudentsList();
                } else {
                    // Questions: normalize options and correctAnswer
                    const questions = data.map(q => ({
                        section: q.section,
                        questionText: q.questionText,
                        options: [q.option0, q.option1, q.option2, q.option3],
                        correctAnswer: parseInt(q.correctAnswer)
                    }));
                    const res = await fetch('/api/admin/questions/bulk', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ examId: selectedExamId, questions })
                    });
                    const resData = await res.json();
                    alert(resData.message);
                    loadQuestions();
                }
                closeModal();
            } catch (err) {
                alert('Upload Error: ' + err.message);
            }
        }
    });
}

// ── Control Center (Exam Details) ────────────────────────────────────

function viewExamDetails(id) {
    selectedExamId = id;
    const exam = window.allExams.find(e => e._id === id);
    showTab('exam-details');
    document.getElementById('detailExamTitle').textContent = exam.title;
    showSubTab('leaderboard');
}

function showSubTab(subId) {
    document.querySelectorAll('.subtab-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`subtab-${subId}`).classList.add('active');
    
    document.querySelectorAll('.subtab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`subcontent-${subId}`).classList.remove('hidden');
    
    loadSubTabContent(subId);
    refreshIcons();
}

function loadSubTabContent(id) {
    switch (id) {
        case 'leaderboard': loadLeaderboard(); break;
        case 'questions': loadQuestions(); break;
        case 'analytics': loadAnalytics(); break;
    }
}

async function loadLeaderboard() {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '<tr><td colspan="4" class="px-8 py-10 text-center text-slate-500">Aggregating results...</td></tr>';
    try {
        const res = await fetch(`/api/admin/leaderboard?examId=${selectedExamId}`, { headers: getAuthHeaders() });
        const { leaderboard, totalQuestions } = await res.json();
        leaderboardData = leaderboard;
        window.totalQuestions = totalQuestions;
        
        if (leaderboard.length === 0) {
            list.innerHTML = '<tr><td colspan="4" class="px-8 py-20 text-center text-slate-500">No submissions recorded yet.</td></tr>';
            return;
        }

        list.innerHTML = leaderboard.map(u => `
            <tr class="group hover:bg-white/[0.02] transition-all">
                <td class="px-8 py-5">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-black ${u.rank === 1 ? 'bg-yellow-500/20 text-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.2)]' : 'bg-dark-800 text-slate-500'}">${u.rank}</div>
                </td>
                <td class="px-8 py-5">
                    <div class="text-white font-bold">${u.name}</div>
                    <div class="text-slate-500 text-[10px] uppercase font-bold tracking-widest">${u.rollNumber} • ${u.email}</div>
                </td>
                <td class="px-8 py-5 text-center">
                    <span class="text-lg font-black text-primary-400">${u.totalScore}</span>
                    <span class="text-slate-600 font-bold">/${totalQuestions}</span>
                </td>
                <td class="px-8 py-5 text-right text-slate-400 font-mono text-xs">
                    ${new Date(u.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        list.innerHTML = `<tr><td colspan="4" class="px-8 py-10 text-center text-red-400">${err.message}</td></tr>`;
    }
}

async function loadQuestions() {
    const list = document.getElementById('questionList');
    list.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500">Retrieving question bank...</div>';
    try {
        const res = await fetch(`/api/admin/questions?examId=${selectedExamId}`, { headers: getAuthHeaders() });
        examQuestions = await res.json();

        if (examQuestions.length === 0) {
            list.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500">The question bank is empty.</div>';
            return;
        }

        list.innerHTML = examQuestions.map((q, i) => `
            <div class="glass-card p-6 rounded-3xl relative">
                <div class="flex justify-between items-start mb-4">
                    <span class="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase text-slate-400 tracking-widest">${q.section || 'General'}</span>
                    <div class="flex gap-2">
                        <button onclick="openQuestionModal('${q._id}')" class="p-2 text-slate-500 hover:text-white transition-all"><i data-lucide="edit" class="w-4 h-4"></i></button>
                        <button onclick="deleteQuestion('${q._id}')" class="p-2 text-slate-500 hover:text-red-400 transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
                <h5 class="text-white font-bold mb-6 flex gap-3">
                    <span class="text-primary-500 font-mono">Q${i+1}.</span>
                    ${q.questionText}
                </h5>
                <div class="space-y-2">
                    ${q.options.map((opt, idx) => `
                        <div class="p-3 rounded-xl text-sm ${idx === q.correctAnswer ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-dark-900/50 text-slate-500 border border-white/5'}">
                            <span class="font-bold mr-2 opacity-50">${String.fromCharCode(65 + idx)}.</span> ${opt}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        refreshIcons();
    } catch (err) {
        list.innerHTML = `<div class="col-span-full py-20 text-center text-red-400">${err.message}</div>`;
    }
}

async function loadAnalytics() {
    const list = document.getElementById('analyticsList');
    list.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500">Computing statistics...</div>';
    try {
        const res = await fetch(`/api/admin/analytics?examId=${selectedExamId}`, { headers: getAuthHeaders() });
        const analytics = await res.json();

        if (analytics.length === 0) {
            list.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500">No data points for analysis.</div>';
            return;
        }

        list.innerHTML = analytics.map(q => {
            const correctP = Math.round((q.correctCount / q.totalStudents) * 100) || 0;
            const wrongP = Math.round((q.wrongCount / q.totalStudents) * 100) || 0;
            const skipP = 100 - correctP - wrongP;

            return `
                <div class="glass-card p-6 rounded-3xl">
                    <p class="text-white font-bold mb-4 line-clamp-2 text-sm">${q.questionText}</p>
                    <div class="h-1.5 w-full bg-dark-900 rounded-full overflow-hidden flex mb-4">
                        <div style="width: ${correctP}%" class="bg-emerald-500 h-full"></div>
                        <div style="width: ${wrongP}%" class="bg-red-500 h-full"></div>
                        <div style="width: ${skipP}%" class="bg-slate-700 h-full"></div>
                    </div>
                    <div class="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                        <div class="text-emerald-500">C: ${correctP}%</div>
                        <div class="text-red-400">W: ${wrongP}%</div>
                        <div class="text-slate-500">S: ${skipP}%</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        list.innerHTML = `<div class="col-span-full py-20 text-center text-red-400">${err.message}</div>`;
    }
}

// ── Question Management ──────────────────────────────────────────────

function openQuestionModal(id = null) {
    const q = id ? examQuestions.find(x => x._id === id) : { section: '', questionText: '', options: ['', '', '', ''], correctAnswer: 0 };
    setModalTitle(id ? 'Update Question' : 'Define Question');
    showModal(`
        <form onsubmit="saveQuestion(event, ${id ? `'${id}'` : 'null'})" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-semibold text-slate-400 mb-2">Category / Section</label>
                    <input type="text" name="section" value="${q.section}" placeholder="e.g. Logical Reasoning" required class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500">
                </div>
            </div>
            <div>
                <label class="block text-sm font-semibold text-slate-400 mb-2">Question Context</label>
                <textarea name="questionText" required rows="3" class="w-full px-5 py-3.5 bg-dark-900 border border-slate-800 rounded-2xl outline-none text-white focus:ring-2 focus:ring-primary-500">${q.questionText}</textarea>
            </div>
            <div class="space-y-4">
                <label class="block text-sm font-semibold text-slate-400">Options & Verification</label>
                ${q.options.map((opt, idx) => `
                    <div class="flex items-center gap-4 group">
                        <label class="flex-shrink-0 cursor-pointer">
                            <input type="radio" name="correctAnswer" value="${idx}" ${idx === q.correctAnswer ? 'checked' : ''} class="w-6 h-6 rounded-full accent-emerald-500">
                        </label>
                        <input type="text" name="option${idx}" value="${opt}" placeholder="Option ${String.fromCharCode(65 + idx)}" required class="flex-1 px-5 py-3 bg-dark-900 border border-slate-800 rounded-xl outline-none text-white focus:border-primary-500 transition-all">
                    </div>
                `).join('')}
            </div>
            <div class="flex gap-4 pt-6">
                <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-white/5 text-slate-300 rounded-2xl font-bold">Cancel</button>
                <button type="submit" class="flex-1 py-4 btn-primary text-white rounded-2xl font-bold shadow-lg">Save Question</button>
            </div>
        </form>
    `);
}

async function saveQuestion(e, id) {
    e.preventDefault();
    const body = {
        examId: selectedExamId,
        section: e.target.section.value,
        questionText: e.target.questionText.value,
        options: [e.target.option0.value, e.target.option1.value, e.target.option2.value, e.target.option3.value],
        correctAnswer: parseInt(e.target.correctAnswer.value)
    };
    try {
        const res = await fetch(id ? `/api/admin/questions/${id}` : '/api/admin/questions', {
            method: id ? 'PUT' : 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Question sync failed');
        closeModal();
        loadQuestions();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteQuestion(id) {
    if (!confirm('Remove this question from the bank?')) return;
    try {
        const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete');
        loadQuestions();
    } catch (err) {
        alert(err.message);
    }
}

// ── Export Features ──────────────────────────────────────────────────

function getSortedResults() {
    return [...leaderboardData].sort((a, b) => a.rollNumber - b.rollNumber);
}

function downloadCSV() {
    const data = getSortedResults();
    if (data.length === 0) return alert('No data to export');
    
    const headers = ['Rank', 'Name', 'Roll Number', 'Email', 'Score', 'Total Questions', 'Submitted At'];
    const rows = data.map(u => [
        u.rank,
        u.name,
        u.rollNumber,
        u.email,
        u.totalScore,
        window.totalQuestions,
        new Date(u.submittedAt).toLocaleString()
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Results_${document.getElementById('detailExamTitle').textContent}_RollSorted.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const data = getSortedResults();
    if (data.length === 0) return alert('No data to export');

    const title = document.getElementById('detailExamTitle').textContent;
    doc.setFontSize(20);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Official Exam Results — Sorted by Roll Number`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);

    const rows = data.map(u => [
        u.rollNumber,
        u.name,
        u.email,
        u.totalScore,
        window.totalQuestions,
        new Date(u.submittedAt).toLocaleTimeString()
    ]);

    doc.autoTable({
        startY: 45,
        head: [['Roll No', 'Name', 'Email', 'Score', 'Total', 'Time']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`Results_${title}_RollSorted.pdf`);
}

// ── Helpers ──────────────────────────────────────────────────────────

async function clearUsers() {
    if (!confirm('EXTREME DANGER: Erase all student results for this exam?')) return;
    try {
        const res = await fetch(`/api/admin/users?examId=${selectedExamId}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await res.json();
        alert(data.message);
        loadLeaderboard();
    } catch (err) {
        alert(err.message);
    }
}

function setModalTitle(text) {
    document.getElementById('modalTitle').textContent = text;
}

function showModal(content) {
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.body.style.overflow = '';
}
