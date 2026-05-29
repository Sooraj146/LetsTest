// Admin Panel Logic
let currentAdmin = JSON.parse(localStorage.getItem('admin')) || null;
let currentTab = 'exams';
let selectedExamId = null;
let colleges = [];
let selectedCollegeId = ''; // For main admin filter

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
        
        if (!res.ok) throw new Error(data.message || 'Login failed');
        
        currentAdmin = { ...data, password }; // Store password for header-based auth
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
    document.getElementById('adminRoleLabel').textContent = currentAdmin.role + ' admin';
    
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
    
    // Update sidebar UI
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    const activeTabBtn = document.getElementById(`tab-${tabId}`);
    if (activeTabBtn) activeTabBtn.classList.add('active');
    
    // Update content visibility
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`content-${tabId}`).classList.add('active');
    
    // Update Header
    const titles = {
        colleges: ['Colleges', 'Manage educational institutions'],
        accounts: ['Mini Admins', 'Manage college-level administrators'],
        exams: ['Exams', 'Create and manage test sessions'],
        students: ['Students', 'Manage pre-populated student lists'],
        'exam-details': ['Exam Details', 'View results and manage questions']
    };
    document.getElementById('tabTitle').textContent = titles[tabId][0];
    document.getElementById('tabDescription').textContent = titles[tabId][1];
    
    loadCurrentTab();
}

function loadCurrentTab() {
    if (currentAdmin.role === 'main') {
        selectedCollegeId = document.getElementById('collegeFilter').value;
    }

    switch (currentTab) {
        case 'colleges': loadCollegesList(); break;
        case 'accounts': loadAccountsList(); break;
        case 'exams': loadExamsGrid(); break;
        case 'students': loadStudentsList(); break;
    }
}

// ── Colleges Management ──────────────────────────────────────────────

async function loadCollegesList() {
    const list = document.getElementById('collegeList');
    list.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center">Loading...</td></tr>';
    
    try {
        const res = await fetch('/api/admin/colleges', { headers: getAuthHeaders() });
        const data = await res.json();
        colleges = data; // Keep sync
        
        list.innerHTML = data.map(c => `
            <tr>
                <td class="px-6 py-4 font-medium text-white">${c.name}</td>
                <td class="px-6 py-4 text-slate-400 font-mono text-sm">${c.domain}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="openCollegeModal('${c._id}')" class="text-primary-400 hover:text-white mr-3">Edit</button>
                    <button onclick="deleteCollege('${c._id}')" class="text-red-400 hover:text-red-300">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        list.innerHTML = `<tr><td colspan="3" class="px-6 py-4 text-center text-red-400">${err.message}</td></tr>`;
    }
}

function openCollegeModal(id = null) {
    const college = id ? colleges.find(c => c._id === id) : { name: '', domain: '' };
    showModal(`
        <h2 class="text-2xl font-bold text-white mb-6">${id ? 'Edit' : 'Add'} College</h2>
        <form onsubmit="saveCollege(event, ${id ? `'${id}'` : 'null'})" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">College Name</label>
                <input type="text" name="name" value="${college.name}" required class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Email Domain (e.g. @gectcr.ac.in)</label>
                <input type="text" name="domain" value="${college.domain}" required class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white">
            </div>
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="closeModal()" class="flex-1 py-2 border border-dark-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" class="flex-1 py-2 bg-primary-600 text-white rounded-lg font-bold">Save</button>
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
        const res = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed to save college');
        closeModal();
        loadCollegesList();
        loadColleges(); // Update filter
    } catch (err) {
        alert(err.message);
    }
}

async function deleteCollege(id) {
    if (!confirm('Are you sure? This will not delete associated data but may cause issues.')) return;
    try {
        const res = await fetch(`/api/admin/colleges/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete');
        loadCollegesList();
        loadColleges();
    } catch (err) {
        alert(err.message);
    }
}

// ── Mini Admins Management ───────────────────────────────────────────

async function loadAccountsList() {
    const list = document.getElementById('accountList');
    list.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center">Loading...</td></tr>';
    
    try {
        const res = await fetch('/api/admin/accounts', { headers: getAuthHeaders() });
        const accounts = await res.json();
        
        list.innerHTML = accounts.map(a => `
            <tr>
                <td class="px-6 py-4 font-medium text-white">${a.username}</td>
                <td class="px-6 py-4 text-slate-400">${a.collegeId?.name || 'Unknown'}</td>
                <td class="px-6 py-4 text-slate-500 font-mono text-xs">${a.password}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="openAccountModal('${a._id}')" class="text-primary-400 hover:text-white mr-3">Edit</button>
                    <button onclick="deleteAccount('${a._id}')" class="text-red-400 hover:text-red-300">Delete</button>
                </td>
            </tr>
        `).join('');
        // Store accounts globally if needed for editing
        window.allAccounts = accounts;
    } catch (err) {
        list.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-400">${err.message}</td></tr>`;
    }
}

function openAccountModal(id = null) {
    const acc = id ? window.allAccounts.find(a => a._id === id) : { username: '', password: '', collegeId: { _id: '' } };
    showModal(`
        <h2 class="text-2xl font-bold text-white mb-6">${id ? 'Edit' : 'Add'} Mini Admin</h2>
        <form onsubmit="saveAccount(event, ${id ? `'${id}'` : 'null'})" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Username</label>
                <input type="text" name="username" value="${acc.username}" required class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input type="text" name="password" value="${acc.password}" required class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">College</label>
                <select name="collegeId" required class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white">
                    <option value="" disabled>Select College</option>
                    ${colleges.map(c => `<option value="${c._id}" ${c._id === acc.collegeId?._id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="closeModal()" class="flex-1 py-2 border border-dark-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" class="flex-1 py-2 bg-primary-600 text-white rounded-lg font-bold">Save</button>
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
        const res = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed to save account');
        closeModal();
        loadAccountsList();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteAccount(id) {
    if (!confirm('Are you sure?')) return;
    try {
        const res = await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete');
        loadAccountsList();
    } catch (err) {
        alert(err.message);
    }
}

// ── Exam Management ──────────────────────────────────────────────────

async function loadExamsGrid() {
    const grid = document.getElementById('examGrid');
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">Loading exams...</div>';
    
    try {
        const res = await fetch(`/api/exams?collegeId=${selectedCollegeId}`);
        const exams = await res.json();
        window.allExams = exams;

        if (exams.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">No exams created for this college.</div>';
            return;
        }

        grid.innerHTML = exams.map(exam => `
            <div class="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:border-primary-500/50 transition-all group">
                <div>
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-xl font-bold text-white group-hover:text-primary-400 transition-all">${exam.title}</h3>
                        <div class="flex gap-2">
                            <button onclick="openExamModal('${exam._id}')" class="p-1 text-slate-500 hover:text-white transition-all"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                            <button onclick="deleteExam('${exam._id}')" class="p-1 text-slate-500 hover:text-red-400 transition-all"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                        </div>
                    </div>
                    <div class="space-y-2 text-sm text-slate-400">
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <span>${exam.startTime ? new Date(exam.startTime).toLocaleString() : 'Open Start'}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <span>${exam.endTime ? new Date(exam.endTime).toLocaleString() : 'No Deadline'}</span>
                        </div>
                    </div>
                </div>
                <button onclick="viewExamDetails('${exam._id}')" class="mt-6 w-full py-2 bg-dark-800 hover:bg-primary-600 text-slate-300 hover:text-white rounded-lg text-sm font-semibold transition-all">View Details & Questions</button>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<div class="col-span-full text-center py-10 text-red-400">${err.message}</div>`;
    }
}

function openExamModal(id = null) {
    const exam = id ? window.allExams.find(e => e._id === id) : { title: '', startTime: '', endTime: '' };
    
    // Format dates for input type datetime-local (YYYY-MM-DDTHH:mm)
    const fmt = (d) => d ? new Date(d).toISOString().slice(0, 16) : '';

    showModal(`
        <h2 class="text-2xl font-bold text-white mb-6">${id ? 'Edit' : 'Create'} Exam</h2>
        <form onsubmit="saveExam(event, ${id ? `'${id}'` : 'null'})" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Exam Title</label>
                <input type="text" name="title" value="${exam.title}" required class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white focus:border-primary-500">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1">Start Time</label>
                    <input type="datetime-local" name="startTime" value="${fmt(exam.startTime)}" class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white focus:border-primary-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1">End Time</label>
                    <input type="datetime-local" name="endTime" value="${fmt(exam.endTime)}" class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white focus:border-primary-500">
                </div>
            </div>
            <p class="text-xs text-slate-500">Leave times empty for a permanently open exam.</p>
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="closeModal()" class="flex-1 py-2 border border-dark-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" class="flex-1 py-2 bg-primary-600 text-white rounded-lg font-bold">Save Exam</button>
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
        collegeId: selectedCollegeId
    };
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/exams/${id}` : '/api/admin/exams';
        const res = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to save exam');
        }
        closeModal();
        loadExamsGrid();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteExam(id) {
    if (!confirm('Are you sure you want to delete this exam? ALL associated questions and results will be lost!')) return;
    try {
        const res = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete');
        loadExamsGrid();
    } catch (err) {
        alert(err.message);
    }
}

// ── Student Management ───────────────────────────────────────────────

async function loadStudentsList() {
    const list = document.getElementById('studentList');
    list.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center">Loading students...</td></tr>';
    
    try {
        const res = await fetch(`/api/admin/students?collegeId=${selectedCollegeId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        window.allStudents = data;

        document.getElementById('studentCount').textContent = `Total: ${data.length}`;
        
        if (data.length === 0) {
            list.innerHTML = '<tr><td colspan="3" class="px-6 py-10 text-center text-slate-500">No students found for this college.</td></tr>';
            return;
        }

        list.innerHTML = data.map(s => `
            <tr>
                <td class="px-6 py-4 font-mono text-primary-400">${s.rollNumber}</td>
                <td class="px-6 py-4 font-medium text-white">${s.name}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="deleteStudent('${s._id}')" class="text-red-400 hover:text-red-300">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        list.innerHTML = `<tr><td colspan="3" class="px-6 py-4 text-center text-red-400">${err.message}</td></tr>`;
    }
}

function openStudentModal() {
    showModal(`
        <h2 class="text-2xl font-bold text-white mb-6">Add Student</h2>
        <form onsubmit="saveStudent(event)" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Roll Number</label>
                <input type="number" name="rollNumber" required class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                <input type="text" name="name" required class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white">
            </div>
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="closeModal()" class="flex-1 py-2 border border-dark-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" class="flex-1 py-2 bg-primary-600 text-white rounded-lg font-bold">Add Student</button>
            </div>
        </form>
    `);
}

async function saveStudent(e) {
    e.preventDefault();
    const body = { 
        name: e.target.name.value, 
        rollNumber: e.target.rollNumber.value,
        collegeId: selectedCollegeId
    };
    try {
        const res = await fetch('/api/admin/students', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to add student');
        }
        closeModal();
        loadStudentsList();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteStudent(id) {
    if (!confirm('Remove this student?')) return;
    try {
        const res = await fetch(`/api/admin/students/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete');
        loadStudentsList();
    } catch (err) {
        alert(err.message);
    }
}

// ── Exam Details (Sub-Tabs) ──────────────────────────────────────────

function viewExamDetails(id) {
    selectedExamId = id;
    const exam = window.allExams.find(e => e._id === id);
    showTab('exam-details');
    document.getElementById('tabTitle').textContent = exam.title;
    document.getElementById('tabDescription').textContent = 'Results, Questions and Analytics';
    showSubTab('leaderboard');
}

function showSubTab(subTabId) {
    document.querySelectorAll('.subtab-item').forEach(el => el.classList.remove('active', 'bg-primary-600', 'text-white'));
    document.querySelectorAll('.subtab-item').forEach(el => el.classList.add('bg-dark-800', 'text-slate-400'));
    
    const btn = document.getElementById(`subtab-${subTabId}`);
    btn.classList.remove('bg-dark-800', 'text-slate-400');
    btn.classList.add('active', 'bg-primary-600', 'text-white');
    
    document.querySelectorAll('.subtab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`subcontent-${subTabId}`).classList.remove('hidden');
    
    loadSubTabContent(subTabId);
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
    list.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center">Loading results...</td></tr>';
    try {
        const res = await fetch(`/api/admin/leaderboard?examId=${selectedExamId}`, { headers: getAuthHeaders() });
        const { leaderboard, totalQuestions } = await res.json();
        
        if (leaderboard.length === 0) {
            list.innerHTML = '<tr><td colspan="4" class="px-6 py-10 text-center text-slate-500">No submissions yet.</td></tr>';
            return;
        }

        list.innerHTML = leaderboard.map(u => `
            <tr>
                <td class="px-6 py-4">
                    <span class="w-8 h-8 rounded-full flex items-center justify-center font-bold ${u.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-dark-800 text-slate-400'}">${u.rank}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="text-white font-medium">${u.name}</div>
                    <div class="text-slate-500 text-xs">${u.rollNumber} • ${u.email}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-primary-400 font-bold text-lg">${u.totalScore} <span class="text-slate-600 text-xs font-normal">/ ${totalQuestions}</span></div>
                </td>
                <td class="px-6 py-4 text-slate-400 text-sm">
                    ${new Date(u.submittedAt).toLocaleTimeString()}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        list.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-400">${err.message}</td></tr>`;
    }
}

async function loadQuestions() {
    const list = document.getElementById('questionList');
    list.innerHTML = '<div class="text-center py-10 text-slate-500">Loading questions...</div>';
    try {
        const res = await fetch(`/api/admin/questions?examId=${selectedExamId}`, { headers: getAuthHeaders() });
        const questions = await res.json();
        window.examQuestions = questions;

        if (questions.length === 0) {
            list.innerHTML = '<div class="text-center py-10 text-slate-500">No questions added yet.</div>';
            return;
        }

        list.innerHTML = questions.map((q, i) => `
            <div class="glass-panel p-6 rounded-xl border-l-4 ${q.correctAnswer ? 'border-l-primary-500' : 'border-l-red-500'}">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="text-xs uppercase tracking-widest text-slate-500 font-bold">${q.section || 'General'}</span>
                        <h4 class="text-lg text-white font-medium mt-1">${i + 1}. ${q.questionText}</h4>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openQuestionModal('${q._id}')" class="text-slate-500 hover:text-white"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                        <button onclick="deleteQuestion('${q._id}')" class="text-slate-500 hover:text-red-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${q.options.map((opt, idx) => `
                        <div class="px-4 py-2 rounded-lg text-sm ${idx === q.correctAnswer ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-dark-800 text-slate-400'}">
                            ${String.fromCharCode(65 + idx)}. ${opt}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = `<div class="text-center py-10 text-red-400">${err.message}</div>`;
    }
}

async function loadAnalytics() {
    const list = document.getElementById('analyticsList');
    list.innerHTML = '<div class="text-center py-10 text-slate-500">Generating analytics...</div>';
    try {
        const res = await fetch(`/api/admin/analytics?examId=${selectedExamId}`, { headers: getAuthHeaders() });
        const analytics = await res.json();

        if (analytics.length === 0) {
            list.innerHTML = '<div class="text-center py-10 text-slate-500">No data to analyze.</div>';
            return;
        }

        list.innerHTML = analytics.map(q => {
            const correctPercent = Math.round((q.correctCount / q.totalStudents) * 100) || 0;
            const wrongPercent = Math.round((q.wrongCount / q.totalStudents) * 100) || 0;
            const skipPercent = 100 - correctPercent - wrongPercent;

            return `
                <div class="glass-panel p-6 rounded-xl">
                    <p class="text-white mb-4"><span class="text-slate-500 font-mono mr-2">#</span> ${q.questionText}</p>
                    <div class="h-4 w-full bg-dark-800 rounded-full overflow-hidden flex mb-2">
                        <div style="width: ${correctPercent}%" class="bg-emerald-500 h-full" title="Correct"></div>
                        <div style="width: ${wrongPercent}%" class="bg-red-500 h-full" title="Wrong"></div>
                        <div style="width: ${skipPercent}%" class="bg-slate-700 h-full" title="Unattempted"></div>
                    </div>
                    <div class="flex justify-between text-xs font-medium uppercase tracking-wider mt-3">
                        <div class="text-emerald-500">Correct: ${q.correctCount} (${correctPercent}%)</div>
                        <div class="text-red-400">Wrong: ${q.wrongCount} (${wrongPercent}%)</div>
                        <div class="text-slate-500">Skipped: ${q.unattemptedCount} (${skipPercent}%)</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        list.innerHTML = `<div class="text-center py-10 text-red-400">${err.message}</div>`;
    }
}

// ── Question Modal ──────────────────────────────────────────────────

function openQuestionModal(id = null) {
    const q = id ? window.examQuestions.find(x => x._id === id) : { section: '', questionText: '', options: ['', '', '', ''], correctAnswer: 0 };
    
    showModal(`
        <h2 class="text-2xl font-bold text-white mb-6">${id ? 'Edit' : 'Add'} Question</h2>
        <form onsubmit="saveQuestion(event, ${id ? `'${id}'` : 'null'})" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Section (e.g. Verbal, Logic)</label>
                <input type="text" name="section" value="${q.section}" required class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white focus:border-primary-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Question Text</label>
                <textarea name="questionText" required rows="3" class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white focus:border-primary-500">${q.questionText}</textarea>
            </div>
            <div class="space-y-3">
                <label class="block text-sm font-medium text-slate-300">Options & Correct Answer</label>
                ${q.options.map((opt, idx) => `
                    <div class="flex items-center gap-3">
                        <input type="radio" name="correctAnswer" value="${idx}" ${idx === q.correctAnswer ? 'checked' : ''} class="w-4 h-4 text-primary-600">
                        <input type="text" name="option${idx}" value="${opt}" placeholder="Option ${String.fromCharCode(65 + idx)}" required class="flex-1 px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white focus:border-primary-500">
                    </div>
                `).join('')}
            </div>
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="closeModal()" class="flex-1 py-2 border border-dark-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" class="flex-1 py-2 bg-primary-600 text-white rounded-lg font-bold">Save Question</button>
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
        options: [
            e.target.option0.value,
            e.target.option1.value,
            e.target.option2.value,
            e.target.option3.value
        ],
        correctAnswer: parseInt(e.target.correctAnswer.value)
    };
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/questions/${id}` : '/api/admin/questions';
        const res = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed to save question');
        closeModal();
        loadQuestions();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteQuestion(id) {
    if (!confirm('Delete this question?')) return;
    try {
        const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete');
        loadQuestions();
    } catch (err) {
        alert(err.message);
    }
}

// ── Bulk Upload ─────────────────────────────────────────────────────

function openBulkModal() {
    showModal(`
        <h2 class="text-2xl font-bold text-white mb-2">Bulk Upload</h2>
        <p class="text-slate-400 text-sm mb-6">Paste JSON array of questions. Format:<br><code class="text-xs bg-black/30 p-1 block mt-2">[{"section": "...", "questionText": "...", "options": ["A","B","C","D"], "correctAnswer": 0}]</code></p>
        <form onsubmit="handleBulkUpload(event)" class="space-y-4">
            <textarea name="jsonContent" required rows="10" placeholder="[{...}]" class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg outline-none text-white font-mono text-xs focus:border-primary-500"></textarea>
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="closeModal()" class="flex-1 py-2 border border-dark-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" class="flex-1 py-2 bg-primary-600 text-white rounded-lg font-bold">Upload All</button>
            </div>
        </form>
    `);
}

async function handleBulkUpload(e) {
    e.preventDefault();
    try {
        const questions = JSON.parse(e.target.jsonContent.value);
        const res = await fetch('/api/admin/questions/bulk', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ examId: selectedExamId, questions })
        });
        const data = await res.json();
        alert(data.message);
        closeModal();
        loadQuestions();
    } catch (err) {
        alert('Invalid JSON or Upload Error: ' + err.message);
    }
}

// ── Misc ─────────────────────────────────────────────────────────────

async function clearUsers() {
    if (!confirm('EXTREME DANGER: This will delete ALL results for this exam forever. Continue?')) return;
    try {
        const res = await fetch(`/api/admin/users?examId=${selectedExamId}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await res.json();
        alert(data.message);
        loadLeaderboard();
    } catch (err) {
        alert(err.message);
    }
}

// Modal Helpers
function showModal(content) {
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}
