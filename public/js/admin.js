// Let's Test Administration Dashboard Controller (MongoDB Backend Edition)
let currentAdmin = JSON.parse(localStorage.getItem('admin')) || null;
let activePanel = 'overview';
let colleges = [];
let selectedCollegeId = '';
let currentEditingTestId = null;
let currentEditingStudentId = null;
let currentEditingCollegeId = null;
let activeStudentFilters = {
    rollMin: null,
    rollMax: null,
    totalMarksCond: 'any',
    totalMarksVal: null,
    totalMarksValMax: null,
    pctCond: 'any',
    pctVal: null,
    pctValMax: null,
    attendance: 'all'
};

let activeTestFilters = {
    statuses: ['Live', 'Upcoming', 'Completed'],
    dateCond: 'any',
    dateVal: null,
    dateValMax: null,
    sections: []
};

// Leaderboard/Analytics State
let leaderboardData = [];
let analyticsData = [];
let totalQuestions = 0;
let examQuestions = [];
let leaderboardSections = [];

// Student Analysis Charts Instances
let saRadarChartInst = null;
let saTrendChartInst = null;

// DOM Elements
const loginPanel = document.getElementById('loginPanel');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// ── Notification Engine ──────────────────────────────────────────────
function notify(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const borderColors = {
        success: 'border-emerald-500/30 text-emerald-400 background: rgba(16, 185, 129, 0.1);',
        error: 'border-red-500/30 text-red-400 background: rgba(239, 68, 68, 0.1);',
        info: 'border-rose-500/30 text-rose-400 background: rgba(255, 51, 68, 0.1);'
    };
    
    toast.className = 'glass-card toast-item page-enter';
    toast.style.cssText = `
        padding: 14px 24px;
        border-radius: 12px;
        border: 1px solid;
        margin-top: 10px;
        font-family: var(--font-heading);
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        ${borderColors[type] || borderColors.info}
    `;

    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.5s ease-out';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// ── Confirmation Prompts ─────────────────────────────────────────────
function confirmAction(title, message, iconType = 'warning') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirmOverlay');
        const t = document.getElementById('confirmTitle');
        const m = document.getElementById('confirmMessage');
        const proceedBtn = document.getElementById('confirmProceedBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const iconContainer = document.getElementById('confirmIconContainer');

        t.textContent = title.toUpperCase();
        m.textContent = message;

        if (iconContainer) {
            const confirmIcons = {
                warning: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
                student: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></svg>`,
                test: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/><path d="M14 2v6h6"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="19" x2="15" y2="19"/></svg>`,
                college: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>`,
                admin: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
                trash: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`
            };
            iconContainer.innerHTML = confirmIcons[iconType] || confirmIcons.warning;
        }

        overlay.classList.remove('hidden');
        overlay.classList.add('active');

        const cleanup = (val) => {
            overlay.classList.remove('active');
            overlay.classList.add('hidden');
            proceedBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(val);
        };

        proceedBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
    });
}

// ── Authentication Checks & Handlers ─────────────────────────────────
loginForm.onsubmit = async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');

    if (loginBtn) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
    }

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
        notify('Authentication successful', 'success');
    } catch (err) {
        loginError.textContent = err.message.toUpperCase();
        loginError.classList.remove('hidden');
    } finally {
        if (loginBtn) {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    }
};

function getAuthHeaders() { 
    return { 
        'x-admin-username': currentAdmin.username, 
        'x-admin-password': currentAdmin.password, 
        'Content-Type': 'application/json' 
    }; 
}

function handleLogout() { 
    localStorage.removeItem('admin'); 
    window.location.reload(); 
}

// ── Dashboard Controller ─────────────────────────────────────────────
const AdminDashboard = {
    init() {
        if (currentAdmin) {
            showDashboard();
        } else {
            loginPanel.classList.remove('hidden');
        }
    },

    setupSidebar() {
        const nameEl = document.getElementById('sidebarName');
        const roleEl = document.getElementById('sidebarRole');
        const avatarEl = document.getElementById('sidebarAvatar');
        const menuEl = document.getElementById('sidebarMenu');

        if (nameEl) nameEl.textContent = currentAdmin.username;
        if (roleEl) roleEl.textContent = currentAdmin.role === 'main' ? 'Super Admin' : 'College Admin';
        if (avatarEl) avatarEl.textContent = currentAdmin.username.substring(0, 2).toUpperCase();

        let menuHtml = `
            <a class="sidebar-menu-item active" data-panel="overview">
                <svg viewBox="0 0 24 24" width="20" height="20" style="fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                <span>Overview</span>
            </a>
        `;

        if (currentAdmin.role === 'main') {
            menuHtml += `
                <a class="sidebar-menu-item" data-panel="colleges">
                    <svg viewBox="0 0 24 24" width="20" height="20" style="fill:currentColor;"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
                    <span>Colleges</span>
                </a>
                <a class="sidebar-menu-item" data-panel="admins">
                    <svg viewBox="0 0 24 24" width="20" height="20" style="fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <span>College Admins</span>
                </a>
            `;
        }

        menuHtml += `
            <a class="sidebar-menu-item" data-panel="students">
                <svg viewBox="0 0 24 24" width="20" height="20" style="fill:currentColor;"><path d="M16 9c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-8 3c1.66 0 3-1.34 3-3S9.66 6 8 6 5 7.34 5 9s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V20h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                <span>Students</span>
            </a>
            <a class="sidebar-menu-item" data-panel="tests">
                <svg viewBox="0 0 24 24" width="20" height="20" style="fill:currentColor;"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                <span>Tests</span>
            </a>
        `;

        if (menuEl) {
            menuEl.innerHTML = menuHtml;
            const items = menuEl.querySelectorAll('.sidebar-menu-item');
            items.forEach(item => {
                item.addEventListener('click', (e) => {
                    items.forEach(i => i.classList.remove('active'));
                    const target = e.currentTarget;
                    target.classList.add('active');
                    this.switchPanel(target.getAttribute('data-panel'));
                });
            });
        }
    },

    setupTopbar() {
        const badgeEl = document.getElementById('topbarAffiliation');
        if (badgeEl) {
            if (currentAdmin.role === 'mini') {
                badgeEl.textContent = currentAdmin.college?.name || 'Authorized Admin';
                badgeEl.classList.remove('hidden');
            } else {
                badgeEl.textContent = 'Main Administration';
                badgeEl.classList.remove('hidden');
            }
        }
    },

    async setupFilters() {
        // Setup Colleges dropdown filter
        const stdColFilter = document.getElementById('filterStudentCollege');
        const testColFilter = document.getElementById('filterTestCollege');
        const admCollegeSelect = document.getElementById('admCollege');
        const stdCollegeSelect = document.getElementById('stdCollege');
        const tCollegeSelect = document.getElementById('tCollege');

        if (currentAdmin.role === 'mini') {
            selectedCollegeId = currentAdmin.college?._id;
            
            // Hide college selectors for mini admins
            const filterStudentCollegeWrapper = document.getElementById('filterStudentCollegeWrapper');
            if (filterStudentCollegeWrapper) filterStudentCollegeWrapper.style.display = 'none';
            
            const filterTestCollegeWrapper = document.getElementById('filterTestCollegeWrapper');
            if (filterTestCollegeWrapper) filterTestCollegeWrapper.style.display = 'none';

            if (stdCollegeSelect) stdCollegeSelect.closest('.input-group').style.display = 'none';
            if (tCollegeSelect) tCollegeSelect.closest('.input-group').style.display = 'none';
        } else {
            // Main Admin selects colleges dynamically
            await this.fetchCollegesList();
            
            if (colleges.length > 0) {
                selectedCollegeId = colleges[0]._id;
            }
            
            const optionHtml = colleges.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
            
            if (stdColFilter) {
                stdColFilter.innerHTML = optionHtml;
                stdColFilter.value = selectedCollegeId;
                stdColFilter.onchange = () => {
                    selectedCollegeId = stdColFilter.value;
                    if (testColFilter) testColFilter.value = selectedCollegeId;
                    this.renderStudentsList();
                };
            }
            if (testColFilter) {
                testColFilter.innerHTML = optionHtml;
                testColFilter.value = selectedCollegeId;
                testColFilter.onchange = () => {
                    selectedCollegeId = testColFilter.value;
                    if (stdColFilter) stdColFilter.value = selectedCollegeId;
                    this.renderTestsList();
                };
            }
            if (admCollegeSelect) {
                admCollegeSelect.innerHTML = '<option value="" disabled selected>Choose College</option>' + optionHtml;
            }
            if (stdCollegeSelect) {
                stdCollegeSelect.innerHTML = '<option value="" disabled selected>Choose College</option>' + optionHtml;
            }
            if (tCollegeSelect) {
                tCollegeSelect.innerHTML = '<option value="" disabled selected>Choose College</option>' + optionHtml;
            }
        }

        // Handle other filters
        const stdFilterBtn = document.getElementById('btnStudentFilter');
        if (stdFilterBtn) {
            stdFilterBtn.onclick = () => this.openModal('studentFilterModal');
        }
        const testFilterBtn = document.getElementById('btnTestFilter');
        if (testFilterBtn) {
            testFilterBtn.onclick = () => {
                this.populateTestSectionsFilter();
                this.openModal('testFilterModal');
            };
        }
    },

    bindForms() {
        // Add/Update College
        const addColForm = document.getElementById('addCollegeForm');
        if (addColForm) {
            addColForm.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('colName').value.trim();
                const domain = document.getElementById('colDomain').value.trim();

                const isUpdate = document.getElementById('addCollegeSubmitBtn')?.textContent === 'Save Changes';
                const method = isUpdate ? 'PUT' : 'POST';
                const url = isUpdate ? `/api/admin/colleges/${currentEditingCollegeId}` : '/api/admin/colleges';

                try {
                    const res = await fetch(url, {
                        method,
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ name, domain })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Error processing request');
                    notify(isUpdate ? 'College updated successfully' : 'College added successfully', 'success');
                    addColForm.reset();
                    this.closeActiveModal('addCollegeModal');
                    await this.setupFilters();
                    this.renderPanel('colleges');
                } catch (err) { notify(err.message, 'error'); }
            };
        }

        // Add/Update College Admin
        const addAdmForm = document.getElementById('addAdminForm');
        if (addAdmForm) {
            addAdmForm.onsubmit = async (e) => {
                e.preventDefault();
                const username = document.getElementById('admUser').value.trim();
                const password = document.getElementById('admPass').value;
                const collegeId = document.getElementById('admCollege').value;
                
                const isUpdate = document.getElementById('addAdminSubmitBtn').textContent === 'Save Changes';
                const method = isUpdate ? 'PUT' : 'POST';
                const url = isUpdate ? `/api/admin/accounts/${currentEditingStudentId}` : '/api/admin/accounts';

                try {
                    const res = await fetch(url, {
                        method,
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ username, password, collegeId })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Error processing request');
                    notify(isUpdate ? 'Admin updated successfully' : 'Admin registered successfully', 'success');
                    addAdmForm.reset();
                    this.closeActiveModal('addAdminModal');
                    this.renderPanel('admins');
                } catch (err) { notify(err.message, 'error'); }
            };
        }

        // Add Student
        const addStdForm = document.getElementById('addStudentForm');
        if (addStdForm) {
            addStdForm.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('stdName').value.trim();
                const rollNumber = Number(document.getElementById('stdRoll').value);
                const email = '';
                const branch = '';
                const semester = '';
                const collegeId = currentAdmin.role === 'mini' ? selectedCollegeId : document.getElementById('stdCollege').value;

                try {
                    const res = await fetch('/api/admin/students', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ name, rollNumber, email, branch, semester, collegeId })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Error creating student');
                    notify('Candidate enrolled successfully', 'success');
                    addStdForm.reset();
                    this.closeActiveModal('addStudentModal');
                    this.renderPanel('students');
                } catch (err) { notify(err.message, 'error'); }
            };
        }

        // Edit Student
        const editStdForm = document.getElementById('editStudentForm');
        if (editStdForm) {
            editStdForm.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('editStdName').value.trim();
                const rollNumber = Number(document.getElementById('editStdRoll').value);
                const email = '';
                const branch = '';
                const semester = '';

                try {
                    const res = await fetch(`/api/admin/students/${currentEditingStudentId}`, {
                        method: 'PUT',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ name, rollNumber, email, branch, semester })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Error updating student');
                    notify('Student records synchronized', 'success');
                    editStdForm.reset();
                    this.closeActiveModal('editStudentModal');
                    this.renderPanel('students');
                } catch (err) { notify(err.message, 'error'); }
            };
        }

        // Add/Update Test
        const addTstForm = document.getElementById('addTestForm');
        if (addTstForm) {
            addTstForm.onsubmit = async (e) => {
                e.preventDefault();
                const title = document.getElementById('tTitle').value.trim();
                const startTime = document.getElementById('tStartTime').value ? new Date(document.getElementById('tStartTime').value).toISOString() : null;
                const endTime = document.getElementById('tEndTime').value ? new Date(document.getElementById('tEndTime').value).toISOString() : null;
                const collegeId = currentAdmin.role === 'mini' ? selectedCollegeId : document.getElementById('tCollege').value;

                const isUpdate = document.getElementById('addTestSubmitBtn').textContent === 'Save Changes';
                const method = isUpdate ? 'PUT' : 'POST';
                const url = isUpdate ? `/api/admin/exams/${currentEditingTestId}` : '/api/admin/exams';

                try {
                    const res = await fetch(url, {
                        method,
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ title, startTime, endTime, collegeId })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Error processing exam');
                    notify(isUpdate ? 'Exam modified successfully' : 'Exam launched successfully', 'success');
                    addTstForm.reset();
                    this.closeActiveModal('addTestModal');
                    this.renderPanel('tests');
                } catch (err) { notify(err.message, 'error'); }
            };
        }

        // Question Bank compiler form handler
        const qbankForm = document.getElementById('qbankQuestionForm');
        if (qbankForm) {
            qbankForm.onsubmit = async (e) => {
                e.preventDefault();
                const qId = document.getElementById('qbankEditQuestionId').value;
                const questionText = document.getElementById('qbText').value.trim();
                const options = [
                    document.getElementById('qbOpt0').value.trim(),
                    document.getElementById('qbOpt1').value.trim(),
                    document.getElementById('qbOpt2').value.trim(),
                    document.getElementById('qbOpt3').value.trim()
                ];
                const correctAnswer = Number(document.getElementById('qbCorrect').value);
                const section = document.getElementById('qbSection').value.trim();

                const isEdit = !!qId;
                const url = isEdit ? `/api/admin/questions/${qId}` : '/api/admin/questions';
                const method = isEdit ? 'PUT' : 'POST';
                const body = { examId: currentEditingTestId, section, questionText, options, correctAnswer: String(correctAnswer) };

                try {
                    const res = await fetch(url, {
                        method,
                        headers: getAuthHeaders(),
                        body: JSON.stringify(body)
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Error saving question');
                    notify('Question synchronized successfully', 'success');
                    this.hideQuestionForm();
                    this.loadQuestions().then(() => this.renderQuestionsTab());
                } catch (err) { notify(err.message, 'error'); }
            };
        }

        // Local Search binds
        const searchBinds = [
            { id: 'collegSearch', run: () => this.renderCollegesList() },
            { id: 'adminSearch', run: () => this.renderAdminsList() },
            { id: 'studentSearch', run: () => this.renderStudentsList() },
            { id: 'testSearch', run: () => this.renderTestsList() }
        ];
        searchBinds.forEach(sb => {
            const el = document.getElementById(sb.id);
            if (el) el.oninput = sb.run;
        });
    },

    switchPanel(panelId) {
        activePanel = panelId;
        document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));
        
        const activeEl = document.getElementById(`panel-${panelId}`);
        if (activeEl) activeEl.classList.add('active');

        const titles = {
            overview: 'SYSTEM OVERVIEW',
            colleges: 'COLLEGE MANAGEMENT',
            admins: 'COLLEGE ADMIN ACCOUNTS',
            students: 'ENROLLED CANDIDATES',
            tests: 'TEST & EXAM DECK'
        };
        const titleEl = document.getElementById('topbarPanelTitle');
        if (titleEl) titleEl.textContent = titles[panelId] || 'ADMIN COMMAND DECK';

        this.renderPanel(panelId);
    },

    renderPanel(panelId) {
        switch (panelId) {
            case 'overview': this.renderOverview(); break;
            case 'colleges': this.renderColleges(); break;
            case 'admins': this.renderAdmins(); break;
            case 'students': this.renderStudents(); break;
            case 'tests': this.renderTests(); break;
        }
    },

    // ── Panel 1: Overview Dashboard ──────────────────────────────────
    async renderOverview() {
        try {
            // Stats counts
            let stdCount = 0;
            let tstCount = 0;

            if (currentAdmin.role === 'main') {
                await this.fetchCollegesList();
                const resAdmins = await fetch('/api/admin/accounts', { headers: getAuthHeaders() });
                const admins = await resAdmins.json();
                
                document.getElementById('statValColleges').textContent = colleges.length;
                document.getElementById('statValAdmins').textContent = admins.length;
            } else {
                const cardCol = document.getElementById('statCardColleges');
                const cardAdm = document.getElementById('statCardAdmins');
                if (cardCol) cardCol.style.display = 'none';
                if (cardAdm) cardAdm.style.display = 'none';
            }

            // Students count
            const stdQueryUrl = currentAdmin.role === 'main' ? '/api/admin/students' : `/api/admin/students?collegeId=${selectedCollegeId}`;
            const resStds = await fetch(stdQueryUrl, { headers: getAuthHeaders() });
            if (resStds.ok) {
                const stds = await resStds.json();
                stdCount = stds.length;
            }
            document.getElementById('statValStudents').textContent = stdCount;

            // Exams count
            let exams = [];
            const examsUrl = currentAdmin.role === 'main' ? '/api/admin/exams' : `/api/admin/exams?collegeId=${selectedCollegeId}`;
            const resTsts = await fetch(examsUrl, { headers: getAuthHeaders() });
            if (resTsts.ok) {
                exams = await resTsts.json();
            }
            tstCount = exams.length;
            document.getElementById('statValTests').textContent = tstCount;

            // Set up live exam countdown ticker
            this.overviewExams = exams;
            this.updateLiveExamTicker();

            if (this.overviewTickerInterval) {
                clearInterval(this.overviewTickerInterval);
            }
            this.overviewTickerInterval = setInterval(() => {
                if (activePanel !== 'overview') {
                    clearInterval(this.overviewTickerInterval);
                    this.overviewTickerInterval = null;
                    return;
                }
                this.updateLiveExamTicker();
            }, 1000);

            // Render Logs
            const logsFeed = document.getElementById('activityFeedList');
            if (logsFeed) {
                const logsUrl = currentAdmin.role === 'main' ? '/api/admin/logs' : `/api/admin/logs?collegeId=${selectedCollegeId}`;
                const resLogs = await fetch(logsUrl, { headers: getAuthHeaders() });
                if (resLogs.ok) {
                    const logs = await resLogs.json();
                    if (logs.length === 0) {
                        logsFeed.innerHTML = '<p class="text-center" style="color:var(--text-muted); font-size:0.85rem; padding: 20px;">No administrative events logged.</p>';
                    } else {
                        logsFeed.innerHTML = logs.map(log => {
                            let dotClass = '';
                            if (log.type === 'danger') dotClass = 'activity-item__dot--danger';
                            else if (log.type === 'warning') dotClass = 'activity-item__dot--warning';
                            return `
                                <div class="activity-item" style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="display: flex; gap: 16px; align-items: flex-start; flex-grow: 1;">
                                        <div class="activity-item__dot ${dotClass}"></div>
                                        <div class="activity-item__content">
                                            <div class="activity-item__text">${log.text}</div>
                                            <div class="activity-item__time">${log.time}</div>
                                        </div>
                                    </div>
                                    <button class="btn-table-action btn-table-action--delete tooltip" data-tooltip="Delete Log" onclick="AdminDashboard.deleteLog('${log.id}')" style="align-self: center; margin-left: 12px; flex-shrink: 0;">
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                    </button>
                                </div>
                            `;
                        }).join('');
                    }
                }
            }
        } catch (err) { console.error(err); }
    },

    updateLiveExamTicker() {
        const tickerEl = document.getElementById('liveExamTicker');
        if (!tickerEl) return;

        const exams = this.overviewExams || [];
        const now = new Date();
        const activeItems = [];

        exams.forEach(exam => {
            const start = new Date(exam.startTime);
            const end = new Date(exam.endTime);
            const isLive = now >= start && now <= end;
            const startDiffMs = start - now;
            const startsInOneHour = startDiffMs > 0 && startDiffMs <= 60 * 60 * 1000;

            if (isLive) {
                const msLeft = end - now;
                const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000));
                const minsLeft = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
                const secsLeft = Math.floor((msLeft % (60 * 1000)) / 1000);
                
                const pad = (n) => String(n).padStart(2, '0');
                const timeStr = `${pad(hoursLeft)}:${pad(minsLeft)}:${pad(secsLeft)}`;

                activeItems.push(`
                    <div class="live-ticker-item live-pulse">
                        <div class="live-ticker-left">
                            <span class="live-dot-pulse"></span>
                            <span class="live-ticker-badge live">LIVE</span>
                            <span class="live-ticker-title">${exam.title}</span>
                        </div>
                        <div class="live-ticker-right">
                            <span>Attempted: <strong>${exam.studentCount || 0} Candidates</strong></span>
                            <span class="divider">|</span>
                            <span>Remaining: <strong class="countdown-text">${timeStr}</strong></span>
                        </div>
                    </div>
                `);
            } else if (startsInOneHour) {
                const msLeft = start - now;
                const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000));
                const minsLeft = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
                const secsLeft = Math.floor((msLeft % (60 * 1000)) / 1000);

                const pad = (n) => String(n).padStart(2, '0');
                const timeStr = `${pad(hoursLeft)}:${pad(minsLeft)}:${pad(secsLeft)}`;

                // Format duration
                const durationMs = end - start;
                const durationHrs = Math.floor(durationMs / (60 * 60 * 1000));
                const durationMins = Math.round((durationMs % (60 * 60 * 1000)) / (60 * 1000));
                const durationStr = `${durationHrs}h ${durationMins}m`;

                activeItems.push(`
                    <div class="live-ticker-item upcoming-alert">
                        <div class="live-ticker-left">
                            <span class="upcoming-dot"></span>
                            <span class="live-ticker-badge upcoming">UPCOMING</span>
                            <span class="live-ticker-title">${exam.title}</span>
                            <span class="live-ticker-meta">(Sections: ${exam.sections?.join(', ') || 'General'} · Time: ${durationStr})</span>
                        </div>
                        <div class="live-ticker-right">
                            <span>Starts in: <strong class="countdown-text text-amber">${timeStr}</strong></span>
                        </div>
                    </div>
                `);
            }
        });

        if (activeItems.length > 0) {
            tickerEl.innerHTML = activeItems.join('');
            tickerEl.style.display = 'flex';
        } else {
            tickerEl.innerHTML = '';
            tickerEl.style.display = 'none';
        }
    },

    async deleteLog(id) {
        const ok = await confirmAction('Delete Log Entry', 'Are you sure you want to permanently delete this log entry?', 'trash');
        if (!ok) return;
        try {
            const res = await fetch(`/api/admin/logs/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Delete log failed');
            notify('Log entry removed', 'success');
            this.renderOverview();
        } catch (err) { notify(err.message, 'error'); }
    },

    async clearAllLogs() {
        const ok = await confirmAction('Purge Activity Logs', 'Are you sure you want to delete all activity logs? This action is irreversible.', 'trash');
        if (!ok) return;
        try {
            const logsUrl = currentAdmin.role === 'main' ? '/api/admin/logs' : `/api/admin/logs?collegeId=${selectedCollegeId}`;
            const res = await fetch(logsUrl, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Clear logs failed');
            notify('Activity logs purged', 'success');
            this.renderOverview();
        } catch (err) { notify(err.message, 'error'); }
    },

    // ── Panel 2: Colleges ────────────────────────────────────────────
    async renderColleges() {
        await this.fetchCollegesList();
        this.renderCollegesList();

        const trigger = document.getElementById('btnAddCollegeModal');
        if (trigger) {
            trigger.onclick = () => {
                const modalTitle = document.getElementById('addCollegeModalTitle');
                if (modalTitle) modalTitle.textContent = 'Create College Node';
                const submitBtn = document.getElementById('addCollegeSubmitBtn');
                if (submitBtn) submitBtn.textContent = 'Integrate Node';
                document.getElementById('addCollegeForm')?.reset();
                this.openModal('addCollegeModal');
            };
        }
    },

    async fetchCollegesList() {
        try {
            const res = await fetch('/api/admin/colleges', { headers: getAuthHeaders() });
            colleges = await res.json();
        } catch (err) { console.error('Fetch colleges failed', err); }
    },

    renderCollegesList() {
        const query = (document.getElementById('collegSearch')?.value || '').toLowerCase();
        const cardGrid = document.getElementById('collegCardGrid');
        if (!cardGrid) return;

        const filtered = colleges.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.domain.toLowerCase().includes(query)
        );

        if (filtered.length === 0) {
            cardGrid.innerHTML = `<p class="text-center" style="color: var(--text-muted); grid-column: 1/-1; padding: 24px;">No matching colleges found.</p>`;
            return;
        }

        cardGrid.innerHTML = filtered.map(c => `
            <div class="college-card glass-card">
              <div class="college-card__header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
                <div style="display: flex; flex-direction: column; gap: 4px; flex-grow: 1;">
                  <strong class="college-card__name" style="font-size: 1.25rem; color: #fff; font-family: var(--font-heading); font-weight: 900;">${c.name}</strong>
                  <span class="domain-badge-gradient" style="align-self: flex-start; margin-top: 4px;">${c.domain}</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px; flex-shrink: 0;">
                  <button class="btn-table-action tooltip tooltip--bottom" data-tooltip="Modify College" onclick="AdminDashboard.openEditCollegeModal('${c._id}')">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                  </button>
                  <button class="btn-table-action btn-table-action--delete tooltip tooltip--bottom" data-tooltip="Delete College" onclick="AdminDashboard.deleteCollege('${c._id}')">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
                  </button>
                </div>
              </div>
              <div class="college-card__stats-grid" style="margin-bottom: 0;">
                <div class="college-stat-card">
                  <div class="college-stat-icon" style="color: var(--accent-cyan);">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div class="college-stat-info">
                    <span class="college-stat-number">${c.studentCount ?? 0}</span>
                    <span class="college-stat-title">Candidates</span>
                  </div>
                </div>
                <div class="college-stat-card">
                  <div class="college-stat-icon" style="color: var(--accent-orange);">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div class="college-stat-info">
                    <span class="college-stat-number">${c.examCount ?? 0}</span>
                    <span class="college-stat-title">Assessments</span>
                  </div>
                </div>
              </div>
            </div>
        `).join('');
    },

    openEditCollegeModal(id) {
        const college = colleges.find(c => c._id === id);
        if (!college) return;
        currentEditingCollegeId = id;

        const modalTitle = document.getElementById('addCollegeModalTitle');
        if (modalTitle) modalTitle.textContent = 'Modify College Node';
        const submitBtn = document.getElementById('addCollegeSubmitBtn');
        if (submitBtn) submitBtn.textContent = 'Save Changes';

        document.getElementById('colName').value = college.name;
        document.getElementById('colDomain').value = college.domain;

        this.openModal('addCollegeModal');
    },

    async deleteCollege(id) {
        const ok = await confirmAction('Delete College', 'All associated exam data and college admin accounts will be deleted. Continue?', 'college');
        if (!ok) return;
        try {
            const res = await fetch(`/api/admin/colleges/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Delete request failed');
            notify('College removed', 'success');
            this.renderPanel('colleges');
        } catch (err) { notify(err.message, 'error'); }
    },

    // ── Panel 3: Admins ─────────────────────────────────────────────
    async renderAdmins() {
        this.renderAdminsList();
        const trigger = document.getElementById('btnAddAdminModal');
        if (trigger) {
            trigger.onclick = () => {
                document.getElementById('addAdminModalTitle').textContent = 'Register College Administrator';
                document.getElementById('addAdminSubmitBtn').textContent = 'Initialize Keys';
                document.getElementById('addAdminForm').reset();
                this.openModal('addAdminModal');
            };
        }
    },

    async renderAdminsList() {
        const query = (document.getElementById('adminSearch')?.value || '').toLowerCase();
        const groupsContainer = document.getElementById('adminGroupsContainer');
        if (!groupsContainer) return;

        try {
            const res = await fetch('/api/admin/accounts', { headers: getAuthHeaders() });
            const admins = await res.json();
            window.allAdmins = admins;

            const filtered = admins.filter(a => a.username.toLowerCase().includes(query));

            if (filtered.length === 0) {
                groupsContainer.innerHTML = `<p class="text-center" style="color: var(--text-muted); padding: 24px;">No admin accounts cataloged.</p>`;
                return;
            }

            // Group by college name
            const grouped = {};
            filtered.forEach(a => {
                const collegeName = a.collegeId ? a.collegeId.name : 'Unknown College';
                if (!grouped[collegeName]) grouped[collegeName] = [];
                grouped[collegeName].push(a);
            });

            groupsContainer.innerHTML = Object.keys(grouped).map(collegeName => {
                const groupAdmins = grouped[collegeName];
                const cardsHtml = groupAdmins.map(a => `
                    <div class="admin-card glass-card" style="display: flex; justify-content: space-between; align-items: center; gap: 24px; width: 100%; padding: 16px 24px;">
                      <div style="display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0;">
                        <div class="admin-card__shield" style="color: var(--accent-cyan); margin-bottom: 0; flex-shrink: 0;">
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                        <div class="admin-card__userinfo" style="min-width: 0;">
                          <span class="admin-card__label">USERNAME</span>
                          <strong class="admin-card__username" style="font-size: 1.15rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${a.username}</strong>
                        </div>
                      </div>
                      <div class="admin-card__credential" style="flex: 2; border: none; background: transparent; padding: 0; margin-bottom: 0; display: flex; align-items: center; gap: 12px; min-width: 280px;">
                        <div class="admin-card__key-icon" style="color: var(--accent-orange); flex-shrink: 0;">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                        <div class="admin-card__passinfo" style="display: flex; flex-direction: row; align-items: center; gap: 12px; min-width: 0; flex-wrap: wrap;">
                          <span class="admin-card__label" style="margin-bottom: 0; font-size: 0.65rem;">DECRYPT KEY:</span>
                          <span class="reveal-password" data-password="${a.password}">••••••••</span>
                        </div>
                      </div>
                      <div class="admin-card__actions" style="border-top: none; padding-top: 0; margin-top: 0; display: flex; gap: 12px; align-items: center; justify-content: flex-end; flex-shrink: 0;">
                        <button class="btn-table-action tooltip" data-tooltip="Modify Admin" onclick="AdminDashboard.openEditAdminModal('${a._id}')">
                          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                        </button>
                        <button class="btn-table-action btn-table-action--delete tooltip" data-tooltip="Revoke Access" onclick="AdminDashboard.deleteAdmin('${a._id}')">
                          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
                        </button>
                      </div>
                    </div>
                `).join('');

                return `
                    <fieldset class="admin-group-fieldset">
                      <legend class="admin-group-legend">
                        <svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align: middle; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; display: inline-block; margin-right: 8px; color: var(--accent-cyan);"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
                        <span>${collegeName}</span>
                      </legend>
                      <div class="admin-cards-grid">
                        ${cardsHtml}
                      </div>
                    </fieldset>
                `;
            }).join('');
        } catch (err) { groupsContainer.innerHTML = `<p class="text-center text-red-500" style="padding: 24px;">${err.message}</p>`; }
    },

    openEditAdminModal(id) {
        const admin = window.allAdmins.find(a => a._id === id);
        if (!admin) return;
        currentEditingStudentId = id; // reuse as editing account ID
        
        document.getElementById('addAdminModalTitle').textContent = 'Modify Administrator Credentials';
        document.getElementById('addAdminSubmitBtn').textContent = 'Save Changes';
        document.getElementById('admUser').value = admin.username;
        document.getElementById('admPass').value = admin.password;
        document.getElementById('admCollege').value = admin.collegeId ? admin.collegeId._id : '';

        this.openModal('addAdminModal');
    },

    async deleteAdmin(id) {
        const ok = await confirmAction('Revoke Access', 'Are you sure you want to delete this administrator account?', 'admin');
        if (!ok) return;
        try {
            const res = await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Revoke request failed');
            notify('Admin credentials deleted', 'success');
            this.renderPanel('admins');
        } catch (err) { notify(err.message, 'error'); }
    },

    // ── Panel 4: Students ────────────────────────────────────────────
    async renderStudents() {
        this.renderStudentsList();
        
        const trigger = document.getElementById('btnAddStudentModal');
        if (trigger) trigger.onclick = () => this.openModal('addStudentModal');
    },

    async renderStudentsList() {
        const tableBody = document.querySelector('#studentsTable tbody');
        if (!tableBody) return;

        const query = (document.getElementById('studentSearch')?.value || '').toLowerCase();
        let targetCol = selectedCollegeId;
        if (currentAdmin.role === 'main') {
            targetCol = document.getElementById('filterStudentCollege')?.value || selectedCollegeId;
        }

        tableBody.innerHTML = `<tr><td colspan="6" class="text-left" style="color:var(--text-muted); padding:16px 20px;">Syncing Student Database...</td></tr>`;

        try {
            const res = await fetch(`/api/admin/students?collegeId=${targetCol}`, { headers: getAuthHeaders() });
            const data = await res.json();
            window.allStudents = data;

            // Sort all students in the selected college to assign ranks
            const rankedStudents = [...data].sort((a, b) => {
                if (b.totalMarks !== a.totalMarks) {
                    return b.totalMarks - a.totalMarks;
                }
                return b.testCount - a.testCount;
            });
            
            // Assign ranks (with tie support)
            let currentRank = 0;
            let lastMarks = -1;
            let lastCount = -1;
            rankedStudents.forEach((student, index) => {
                if (student.totalMarks !== lastMarks || student.testCount !== lastCount) {
                    currentRank = index + 1;
                    lastMarks = student.totalMarks;
                    lastCount = student.testCount;
                }
                student.collegeRank = currentRank;
            });

            // Apply advanced filters
            let filtered = data;
            if (activeStudentFilters.rollMin !== null) {
                filtered = filtered.filter(s => s.rollNumber >= activeStudentFilters.rollMin);
            }
            if (activeStudentFilters.rollMax !== null) {
                filtered = filtered.filter(s => s.rollNumber <= activeStudentFilters.rollMax);
            }

            // Total Marks filter
            if (activeStudentFilters.totalMarksCond === 'greater') {
                filtered = filtered.filter(s => s.totalMarks > activeStudentFilters.totalMarksVal);
            } else if (activeStudentFilters.totalMarksCond === 'less') {
                filtered = filtered.filter(s => s.totalMarks < activeStudentFilters.totalMarksVal);
            } else if (activeStudentFilters.totalMarksCond === 'between') {
                filtered = filtered.filter(s => s.totalMarks >= activeStudentFilters.totalMarksVal && s.totalMarks <= activeStudentFilters.totalMarksValMax);
            }

            // Percentage filter
            if (activeStudentFilters.pctCond === 'greater') {
                filtered = filtered.filter(s => s.avgPercentage > activeStudentFilters.pctVal);
            } else if (activeStudentFilters.pctCond === 'less') {
                filtered = filtered.filter(s => s.avgPercentage < activeStudentFilters.pctVal);
            } else if (activeStudentFilters.pctCond === 'between') {
                filtered = filtered.filter(s => s.avgPercentage >= activeStudentFilters.pctVal && s.avgPercentage <= activeStudentFilters.pctValMax);
            }

            // Attendance filter
            if (activeStudentFilters.attendance === 'attended') {
                filtered = filtered.filter(s => s.testCount > 0);
            } else if (activeStudentFilters.attendance === 'not_attended') {
                filtered = filtered.filter(s => s.testCount === 0);
            }

            // Apply search filters
            filtered = filtered.filter(s => 
                s.name.toLowerCase().includes(query) ||
                s.rollNumber.toString().includes(query)
            );

            // Render active filter tags
            const activeFiltersContainer = document.getElementById('studentActiveFilters');
            if (activeFiltersContainer) {
                const badges = [];
                if (activeStudentFilters.rollMin !== null || activeStudentFilters.rollMax !== null) {
                    const min = activeStudentFilters.rollMin !== null ? activeStudentFilters.rollMin : 'Min';
                    const max = activeStudentFilters.rollMax !== null ? activeStudentFilters.rollMax : 'Max';
                    badges.push(`Roll: ${min}-${max}`);
                }
                if (activeStudentFilters.totalMarksCond !== 'any') {
                    const cond = activeStudentFilters.totalMarksCond;
                    const val = activeStudentFilters.totalMarksVal;
                    const valMax = activeStudentFilters.totalMarksValMax;
                    if (cond === 'greater') badges.push(`Marks: >${val}`);
                    else if (cond === 'less') badges.push(`Marks: <${val}`);
                    else if (cond === 'between') badges.push(`Marks: ${val}-${valMax}`);
                }
                if (activeStudentFilters.pctCond !== 'any') {
                    const cond = activeStudentFilters.pctCond;
                    const val = activeStudentFilters.pctVal;
                    const valMax = activeStudentFilters.pctValMax;
                    if (cond === 'greater') badges.push(`Score: >${val}%`);
                    else if (cond === 'less') badges.push(`Score: <${val}%`);
                    else if (cond === 'between') badges.push(`Score: ${val}%-${valMax}%`);
                }
                if (activeStudentFilters.attendance !== 'all') {
                    badges.push(activeStudentFilters.attendance === 'attended' ? 'Attended Tests' : 'No Tests');
                }

                if (badges.length === 0) {
                    activeFiltersContainer.innerHTML = '';
                } else {
                    activeFiltersContainer.innerHTML = badges.map(b => `
                        <span class="active-filter-badge" style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); color: var(--accent-cyan); padding: 4px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; letter-spacing: 0.05em; font-family: var(--font-heading);">
                            ${b}
                        </span>
                    `).join('');
                }
            }

            if (filtered.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-left" style="color: var(--text-muted); padding:16px 20px;">No candidates enrolled under selected filters.</td></tr>`;
                return;
            }

            tableBody.innerHTML = filtered.map(s => {
                const avgScore = s.testCount > 0 ? `${s.avgPercentage}%` : '-';
                const rankHtml = s.testCount > 0 
                    ? `<span class="table-badge table-badge--red" style="font-weight: 800; color: #ffffff !important; font-size: 0.82rem !important; width: 24px !important; height: 24px !important; border-radius: 50% !important; padding: 0 !important; display: inline-flex !important; align-items: center; justify-content: center; font-family: var(--font-mono);">${s.collegeRank}</span>`
                    : `<span class="table-badge table-badge--gray" style="font-weight: 800; color: var(--text-muted) !important; font-size: 0.82rem !important; width: 24px !important; height: 24px !important; border-radius: 50% !important; padding: 0 !important; display: inline-flex !important; align-items: center; justify-content: center; font-family: var(--font-mono); background: rgba(255,255,255,0.03) !important; border: 1px solid rgba(255,255,255,0.08) !important;">-</span>`;
                return `
                    <tr>
                      <td>
                        <div style="display: flex; align-items: baseline; justify-content: flex-start; gap: 8px;">
                          <span style="font-weight: 800; font-size: 1.1rem; color: var(--accent-cyan); font-family: var(--font-mono);">${s.rollNumber}.</span>
                          <span style="font-weight: 700; font-size: 0.92rem; color: #ffffff; text-transform: uppercase; font-family: var(--font-heading); letter-spacing: 0.05em;">${s.name.toUpperCase()}</span>
                        </div>
                      </td>
                      <td><span style="font-family: var(--font-mono); font-size: 0.88rem; color: #ffffff; font-weight: 600;">${s.testCount}</span></td>
                      <td><span style="font-family: var(--font-mono); font-size: 0.88rem; color: #ffffff; font-weight: 600;">${s.totalMarks}</span></td>
                      <td><span style="font-weight: 700; color: #ffffff; font-family:var(--font-mono); font-size: 0.88rem;">${avgScore}</span></td>
                      <td>${rankHtml}</td>
                      <td>
                        <div class="action-group" style="justify-content: flex-start; gap: 8px;">
                          <button class="btn-table-action btn-table-action--analysis tooltip" data-tooltip="Performance Analysis" onclick="AdminDashboard.openStudentAnalysisModal('${s._id}')">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/></svg>
                          </button>
                          <button class="btn-table-action btn-table-action--edit tooltip" data-tooltip="Edit Records" onclick="AdminDashboard.openEditStudentModal('${s._id}')">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                          </button>
                          <button class="btn-table-action btn-table-action--delete tooltip" data-tooltip="Expell Candidate" onclick="AdminDashboard.expellStudent('${s._id}')">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                `;
            }).join('');
        } catch (err) { tableBody.innerHTML = `<tr><td colspan="6" class="text-left text-red-500" style="padding:16px 20px;">${err.message}</td></tr>`; }
    },

    openEditStudentModal(id) {
        const student = window.allStudents.find(s => s._id === id);
        if (!student) return;
        currentEditingStudentId = id;

        document.getElementById('editStdName').value = student.name;
        document.getElementById('editStdRoll').value = student.rollNumber;

        this.openModal('editStudentModal');
    },

    async expellStudent(id) {
        const ok = await confirmAction('Expell Candidate', 'Expelling this student will erase all registration profiles. Continue?', 'student');
        if (!ok) return;
        try {
            const res = await fetch(`/api/admin/students/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Expell request failed');
            notify('Student roster updated', 'success');
            this.renderPanel('students');
        } catch (err) { notify(err.message, 'error'); }
    },

    async purgeAllStudents() {
        const ok = await confirmAction('Purge Student Roster', 'Are you sure you want to delete all student records for this institution? This action is permanent and cannot be undone.', 'trash');
        if (!ok) return;
        try {
            const targetCol = selectedCollegeId;
            if (!targetCol) throw new Error('No institution selected');
            
            const res = await fetch(`/api/admin/students?collegeId=${targetCol}`, { 
                method: 'DELETE', 
                headers: getAuthHeaders() 
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Purge roster request failed');
            notify(data.message || 'Student roster purged successfully', 'success');
            this.renderPanel('students');
        } catch (err) { notify(err.message, 'error'); }
    },

    // ── Student Analysis Modal & Performance dashboard ──────────────────
    async openStudentAnalysisModal(studentId) {
        currentEditingStudentId = studentId;
        
        // Reset state
        const content = document.getElementById('saContent');
        if (content) {
            content.classList.add('hidden');
            content.classList.remove('active');
        }
        const loader = document.getElementById('saLoader');
        if (loader) loader.classList.remove('hidden');
        
        const noRadar = document.getElementById('saNoRadarData');
        if (noRadar) noRadar.classList.add('hidden');
        const noTrend = document.getElementById('saNoTrendData');
        if (noTrend) noTrend.classList.add('hidden');

        try {
            const res = await fetch(`/api/admin/students/${studentId}/analysis`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Analysis fetch failed');
            const data = await res.json();

            // Populate Header
            document.getElementById('saName').textContent = data.student.name;
            document.getElementById('saRoll').textContent = data.student.rollNumber;

            // Populate Top Metrics
            document.getElementById('saGPA').textContent = `${data.metrics.gpa}%`;
            document.getElementById('saPrecision').textContent = `${data.metrics.precision}%`;
            document.getElementById('saParticipation').textContent = `${data.metrics.participation}%`;
            document.getElementById('saTestsTaken').textContent = `${data.metrics.testsTaken}/${data.metrics.testsAssigned}`;
            
            // Find Mastery
            let bestSec = 'N/A';
            let bestScore = -1;
            Object.entries(data.radarData || {}).forEach(([sec, score]) => {
                if (score > bestScore) { bestScore = score; bestSec = sec; }
            });
            document.getElementById('saMastery').textContent = bestScore > 0 ? bestSec : 'N/A';

            // Render Charts
            this.renderSARadarChart(data.radarData);
            this.renderSATrendChart(data.trendData);

            // Show Content
            setTimeout(() => {
                if (loader) loader.classList.add('hidden');
                if (content) {
                    content.classList.remove('hidden');
                    setTimeout(() => content.classList.add('active'), 50);
                }
            }, 500);

            this.openModal('studentAnalysisModal');
        } catch (err) { notify(err.message, 'error'); }
    },

    renderSARadarChart(radarData) {
        const canvas = document.getElementById('saRadarChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (saRadarChartInst) saRadarChartInst.destroy();

        const labels = Object.keys(radarData);
        const data = Object.values(radarData);

        if (labels.length === 0) {
            document.getElementById('saNoRadarData').classList.remove('hidden');
            return;
        } else {
            document.getElementById('saNoRadarData').classList.add('hidden');
        }

        saRadarChartInst = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels.map(l => l.length > 15 ? l.substring(0, 15) + '...' : l),
                datasets: [{
                    label: 'Mastery Level (%)',
                    data: data,
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(99, 102, 241, 1)',
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
                        ticks: { display: false },
                        min: 0,
                        max: 100
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    },

    renderSATrendChart(trendData) {
        const canvas = document.getElementById('saTrendChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (saTrendChartInst) saTrendChartInst.destroy();

        if (!trendData || trendData.length === 0) {
            document.getElementById('saNoTrendData').classList.remove('hidden');
            return;
        } else {
            document.getElementById('saNoTrendData').classList.add('hidden');
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
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
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
                        backgroundColor: 'rgba(18, 7, 7, 0.9)', titleFont: { size: 12, weight: 'bold' }, padding: 12, cornerRadius: 8 
                    }
                }
            }
        });
    },

    openBulkStudentModal() {
        this.openModal('bulkStudentModal');
    },

    handleCSVUpload(input) {
        const file = input.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                let data = results.data;
                try {
                    // Normalize fields
                    const students = data.map(s => ({
                        name: s.name.toUpperCase(),
                        rollNumber: Number(s.rollNumber),
                        email: s.email || '',
                        branch: s.branch || '',
                        semester: s.semester || '6th Semester'
                    })).filter(s => s.name && !isNaN(s.rollNumber));

                    if (students.length === 0) throw new Error('No valid records parsed from CSV.');

                    const res = await fetch('/api/admin/students/bulk', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ collegeId: selectedCollegeId, students })
                    });
                    const resData = await res.json();
                    if (!res.ok) throw new Error(resData.message || 'Bulk upload failed');

                    notify(resData.message, 'success');
                    this.closeActiveModal('bulkStudentModal');
                    this.renderPanel('students');
                } catch (err) { notify(err.message, 'error'); }
            }
        });
    },

    // ── Panel 5: Tests & Control Deck Modal ──────────────────────────
    async renderTests() {
        this.renderTestsList();
        const trigger = document.getElementById('btnCreateTestModal');
        if (trigger) {
            trigger.onclick = () => {
                document.getElementById('addTestModalTitle').textContent = 'Create Test Module';
                document.getElementById('addTestSubmitBtn').textContent = 'Initialize Exam Shell';
                document.getElementById('addTestForm').reset();
                this.openModal('addTestModal');
            };
        }
    },

    async renderTestsList() {
        const gridContainer = document.getElementById('testCardGrid');
        if (!gridContainer) return;

        const query = (document.getElementById('testSearch')?.value || '').toLowerCase();
        let targetCol = selectedCollegeId;
        if (currentAdmin.role === 'main') {
            targetCol = document.getElementById('filterTestCollege')?.value || selectedCollegeId;
        }

        gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Syncing Examinations deck...</div>`;

        try {
            const res = await fetch(`/api/admin/exams?collegeId=${targetCol}`, { headers: getAuthHeaders() });
            const data = await res.json();
            window.allTests = data;

            // Dynamically collect all unique sections across loaded tests
            const sectionSet = new Set();
            data.forEach(t => {
                if (t.sections) {
                    t.sections.forEach(s => {
                        if (s) sectionSet.add(s.trim());
                    });
                }
            });
            window.allAvailableSections = Array.from(sectionSet).sort();

            // Filter by search query
            let filtered = data.filter(t => 
                t.title.toLowerCase().includes(query)
            );

            // Filter by status (Live, Upcoming, Completed)
            filtered = filtered.filter(t => {
                const now = new Date();
                let status = 'Live';
                if (t.startTime && now < new Date(t.startTime)) status = 'Upcoming';
                else if (t.endTime && now > new Date(t.endTime)) status = 'Completed';
                
                return activeTestFilters.statuses.includes(status);
            });

            // Filter by start date condition
            if (activeTestFilters.dateCond !== 'any') {
                filtered = filtered.filter(t => {
                    if (!t.startTime) return false;
                    const startTime = new Date(t.startTime);
                    
                    if (activeTestFilters.dateCond === 'after') {
                        return startTime >= new Date(activeTestFilters.dateVal);
                    } else if (activeTestFilters.dateCond === 'before') {
                        return startTime <= new Date(activeTestFilters.dateVal);
                    } else if (activeTestFilters.dateCond === 'between') {
                        return startTime >= new Date(activeTestFilters.dateVal) && startTime <= new Date(activeTestFilters.dateValMax);
                    }
                    return true;
                });
            }

            // Filter by sections checkbox
            if (activeTestFilters.sections.length > 0) {
                filtered = filtered.filter(t => {
                    if (!t.sections || t.sections.length === 0) return false;
                    return t.sections.some(s => activeTestFilters.sections.includes(s.trim()));
                });
            }

            // Sort: Live tests first, followed by Upcoming, then Completed last
            const getTestStatus = (t) => {
                const now = new Date();
                if (t.startTime && now < new Date(t.startTime)) return 'Upcoming';
                if (t.endTime && now > new Date(t.endTime)) return 'Completed';
                return 'Live';
            };

            const statusOrder = { 'Live': 1, 'Upcoming': 2, 'Completed': 3 };
            filtered.sort((a, b) => {
                const statusA = getTestStatus(a);
                const statusB = getTestStatus(b);
                if (statusOrder[statusA] !== statusOrder[statusB]) {
                    return statusOrder[statusA] - statusOrder[statusB];
                }
                const timeA = a.startTime ? new Date(a.startTime) : new Date(0);
                const timeB = b.startTime ? new Date(b.startTime) : new Date(0);
                return timeA - timeB;
            });

            // Render active filter badges
            const activeFiltersContainer = document.getElementById('testActiveFilters');
            if (activeFiltersContainer) {
                const badges = [];
                if (activeTestFilters.statuses.length < 3) {
                    badges.push(`Status: ${activeTestFilters.statuses.join(', ')}`);
                }
                if (activeTestFilters.dateCond !== 'any') {
                    const cond = activeTestFilters.dateCond;
                    const val = activeTestFilters.dateVal ? new Date(activeTestFilters.dateVal).toLocaleDateString() : '';
                    const valMax = activeTestFilters.dateValMax ? new Date(activeTestFilters.dateValMax).toLocaleDateString() : '';
                    if (cond === 'after') badges.push(`Starts > ${val}`);
                    else if (cond === 'before') badges.push(`Starts < ${val}`);
                    else if (cond === 'between') badges.push(`Starts: ${val}-${valMax}`);
                }
                if (activeTestFilters.sections.length > 0) {
                    badges.push(`Sec: ${activeTestFilters.sections.join(', ')}`);
                }

                if (badges.length === 0) {
                    activeFiltersContainer.innerHTML = '';
                } else {
                    activeFiltersContainer.innerHTML = badges.map(b => `
                        <span class="active-filter-badge" style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); color: var(--accent-cyan); padding: 4px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; letter-spacing: 0.05em; font-family: var(--font-heading);">
                            ${b}
                        </span>
                    `).join('');
                }
            }

            if (filtered.length === 0) {
                gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No exams found.</div>`;
                return;
            }

            const getSectionColor = (secName) => {
                return {
                    bg: 'rgba(99, 102, 241, 0.08)',
                    text: '#6366f1',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                };
            };

            gridContainer.innerHTML = filtered.map(t => {
                const startStr = t.startTime ? new Date(t.startTime).toLocaleString([], {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'LIVE NOW';
                const endStr = t.endTime ? new Date(t.endTime).toLocaleString([], {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'INDEFINITE';
                
                // Determine Exam Status
                const now = new Date();
                let statusText = 'Live';
                let statusColor = '#ef4444'; // Rose Red
                let statusBg = 'rgba(239, 68, 68, 0.1)';

                if (t.startTime && now < new Date(t.startTime)) {
                    statusText = 'Upcoming';
                    statusColor = '#00b0ff'; // Blue
                    statusBg = 'rgba(0, 176, 255, 0.1)';
                } else if (t.endTime && now > new Date(t.endTime)) {
                    statusText = 'Completed';
                    statusColor = '#00e676'; // Green
                    statusBg = 'rgba(0, 230, 118, 0.1)';
                }

                const sectionsHtml = t.sections && t.sections.length > 0
                    ? t.sections.map(sec => {
                        const secColor = getSectionColor(sec);
                        const capitalized = sec.charAt(0).toUpperCase() + sec.slice(1).toLowerCase();
                        return `<div class="test-card__section-tag" style="background: ${secColor.bg}; color: ${secColor.text}; border: ${secColor.border};">${capitalized}</div>`;
                    }).join('')
                    : `<div class="test-card__section-tag" style="background: rgba(255,255,255,0.03); color: var(--text-muted); border: 1px solid rgba(255,255,255,0.08);">NO SECTIONS</div>`;

                let statusClass = '';
                if (statusText === 'Upcoming') statusClass = 'status-upcoming';
                else if (statusText === 'Live') statusClass = 'status-live';
                else if (statusText === 'Completed') statusClass = 'status-completed';

                return `
                    <div class="test-card glass-card ${statusClass}">
                      <div class="test-card__header">
                        <div class="test-card__title-section">
                          <strong class="test-card__name" title="${t.title}">${t.title}</strong>
                          <div class="test-card__status-badge" style="color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusColor}30;">
                            ${statusText}
                          </div>
                        </div>
                        <div class="test-card__actions">
                          <button class="test-card__action-btn tooltip tooltip--bottom" data-tooltip="Configure Exam" onclick="AdminDashboard.openEditTestModal('${t._id}')">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                          </button>
                          <button class="test-card__action-btn test-card__action-btn--delete tooltip tooltip--bottom" data-tooltip="Purge Exam Shell" onclick="AdminDashboard.deleteExam('${t._id}')">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                      
                      <div class="test-card__body">
                        <div class="test-card__time-row">
                          <div class="test-card__time-item">
                            <span class="test-card__time-label">Starts</span>
                            <span class="test-card__time-value">${startStr}</span>
                          </div>
                          <div class="test-card__time-item test-card__time-item--end">
                            <span class="test-card__time-label">Ends</span>
                            <span class="test-card__time-value">${endStr}</span>
                          </div>
                        </div>
                        
                        <div class="test-card__meta-row">
                          <div class="test-card__meta-item">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-orange);"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            <span class="test-card__meta-label">Attended:</span>
                            <span class="test-card__meta-value">${t.studentCount ?? 0}</span>
                          </div>
                          <div class="test-card__meta-item">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-cyan);"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <span class="test-card__meta-label">Questions:</span>
                            <span class="test-card__meta-value">${t.questionCount ?? 0}</span>
                          </div>
                        </div>
                        
                        <div class="test-card__sections-row">
                          ${sectionsHtml}
                        </div>
                      </div>
                      
                      <div class="test-card__footer">
                        <button class="btn btn--primary" onclick="AdminDashboard.openQuestionBank('${t._id}')">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V3.5A2.5 2.5 0 0 1 6.5 1M20 3v14H6.5"/></svg>
                          Question Bank
                        </button>
                        <button class="btn btn--secondary" onclick="AdminDashboard.openTestStatistics('${t._id}')">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                          Statistics
                        </button>
                      </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            const gridContainer = document.getElementById('testCardGrid');
            if (gridContainer) gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">${err.message}</div>`;
        }
    },

    openEditTestModal(id) {
        const exam = window.allTests.find(t => t._id === id);
        if (!exam) return;
        currentEditingTestId = id;

        const fmt = (d) => {
            if (!d) return '';
            const dateObj = new Date(d);
            const offset = dateObj.getTimezoneOffset() * 60000;
            return new Date(dateObj.getTime() - offset).toISOString().slice(0, 16);
        };

        document.getElementById('addTestModalTitle').textContent = 'Launch Parameter Adjustments';
        document.getElementById('addTestSubmitBtn').textContent = 'Save Changes';
        document.getElementById('tTitle').value = exam.title;
        document.getElementById('tStartTime').value = fmt(exam.startTime);
        document.getElementById('tEndTime').value = fmt(exam.endTime);
        if (currentAdmin.role === 'main' && document.getElementById('tCollege')) {
            document.getElementById('tCollege').value = exam.collegeId ? exam.collegeId._id || exam.collegeId : '';
        }

        this.openModal('addTestModal');
    },

    async deleteExam(id) {
        const ok = await confirmAction('Purge Exam', 'EXTREME CRITICAL WARNING: This will permanently delete this exam shell and purge all student results profiles. Proceed?', 'test');
        if (!ok) return;
        try {
            const res = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Deletion failed');
            notify('Exam shell purged', 'success');
            this.renderPanel('tests');
        } catch (err) { notify(err.message, 'error'); }
    },

    // ── Question Bank & Test Statistics Modals Controllers ──────────────────────
    openQuestionBank(testId) {
        currentEditingTestId = testId;
        const exam = window.allTests?.find(t => t._id === testId);
        if (exam) {
            document.getElementById('qbankTestTitle').textContent = exam.title;
        }
        this.hideQuestionForm();
        this.openModal('questionBankModal');
        this.loadQuestions().then(() => this.renderQuestionsTab());
    },

    openTestStatistics(testId) {
        currentEditingTestId = testId;
        const exam = window.allTests?.find(t => t._id === testId);
        if (exam) {
            document.getElementById('statsTestTitle').textContent = exam.title;
        }
        this.openModal('testStatsModal');
        this.switchStatsTab('attempts');
    },

    switchStatsTab(tabId) {
        const btnAttempts = document.getElementById('btnStatsTabAttempts');
        const btnMetrics = document.getElementById('btnStatsTabMetrics');
        const panelAttempts = document.getElementById('stats-tab-attempts');
        const panelMetrics = document.getElementById('stats-tab-metrics');

        if (tabId === 'attempts') {
            if (btnAttempts) btnAttempts.classList.add('active');
            if (btnMetrics) btnMetrics.classList.remove('active');
            if (panelAttempts) {
                panelAttempts.classList.add('active');
                panelAttempts.style.display = '';
            }
            if (panelMetrics) {
                panelMetrics.classList.remove('active');
                panelMetrics.style.display = '';
            }
            this.loadLeaderboard().then(() => this.renderAttemptsTab());
        } else {
            if (btnAttempts) btnAttempts.classList.remove('active');
            if (btnMetrics) btnMetrics.classList.add('active');
            if (panelAttempts) {
                panelAttempts.classList.remove('active');
                panelAttempts.style.display = '';
            }
            if (panelMetrics) {
                panelMetrics.classList.add('active');
                panelMetrics.style.display = '';
            }
            this.loadLeaderboard().then(() => this.loadQuestions()).then(() => this.loadAnalytics()).then(() => this.renderMetricsTab());
        }
    },

    // ── Question Bank Operations ────────────────────────────────
    async loadQuestions() {
        try {
            const res = await fetch(`/api/admin/questions?examId=${currentEditingTestId}`, { headers: getAuthHeaders() });
            examQuestions = await res.json();
        } catch (err) { console.error('Fetch questions failed', err); }
    },

    renderQuestionsTab() {
        const listEl = document.getElementById('qbankQuestionsList');
        if (!listEl) return;

        if (examQuestions.length === 0) {
            listEl.innerHTML = '<p class="text-center" style="color:var(--text-muted); font-size:0.88rem; padding: 30px;">Question bank index is empty. Click Add Question or CSV Import to start.</p>';
            return;
        }

        // Group questions by section
        const grouped = {};
        examQuestions.forEach(q => {
            const sec = q.section || 'General';
            if (!grouped[sec]) grouped[sec] = [];
            grouped[sec].push(q);
        });

        let html = '';
        let displayNum = 1;
        Object.keys(grouped).forEach(sectionName => {
            const secQuestions = grouped[sectionName];
            html += `
                <fieldset class="admin-group-fieldset" style="margin-bottom: 28px;">
                  <legend class="admin-group-legend">
                    ${sectionName} <span style="font-family: var(--font-body) !important; font-weight: 500; font-size: 0.85rem; letter-spacing: 0;">(${secQuestions.length} Questions)</span>
                  </legend>
                  <div class="qbank-section-questions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            `;

            secQuestions.forEach((q, idx) => {
                html += `
                    <div class="question-item" style="margin-bottom: 0;">
                      <div class="question-item__header">
                        <div class="question-item__title">
                          <span class="qbank-qnum">Q${displayNum++}.</span> ${q.questionText}
                        </div>
                        <div style="display:flex; gap:12px; align-items:center;">
                          <button class="btn-table-action" onclick="AdminDashboard.openEditQuestion('${q._id}')">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                          </button>
                          <button class="btn-table-action btn-table-action--delete" onclick="AdminDashboard.deleteQuestion('${q._id}')">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                          </button>
                        </div>
                      </div>
                      <div class="question-item__options-list">
                        ${q.options.map((opt, oIdx) => `
                          <div class="question-item__option ${oIdx === Number(q.correctAnswer) ? 'question-item__option--correct' : ''}">
                            ${String.fromCharCode(65 + oIdx)}. ${opt}
                          </div>
                        `).join('')}
                      </div>
                    </div>
                `;
            });

            html += `
                  </div>
                </fieldset>
            `;
        });

        listEl.innerHTML = html;
    },

    openEditQuestion(qId) {
        const q = examQuestions.find(item => item._id === qId);
        if (!q) return;

        this.openModal('qbankFormModal');

        document.getElementById('qbankFormTitle').textContent = 'Modify Question Statement';
        document.getElementById('qbSubmitBtn').textContent = 'Sync Changes';

        document.getElementById('qbankEditQuestionId').value = qId;
        document.getElementById('qbText').value = q.questionText;
        document.getElementById('qbOpt0').value = q.options[0] || '';
        document.getElementById('qbOpt1').value = q.options[1] || '';
        document.getElementById('qbOpt2').value = q.options[2] || '';
        document.getElementById('qbOpt3').value = q.options[3] || '';
        document.getElementById('qbCorrect').value = q.correctAnswer;
        document.getElementById('qbSection').value = q.section || 'Section A';
    },

    resetQuestionForm() {
        document.getElementById('qbankFormTitle').textContent = 'Compile New Question';
        document.getElementById('qbSubmitBtn').textContent = 'Compile Question';
        const form = document.getElementById('qbankQuestionForm');
        if (form) form.reset();
        document.getElementById('qbankEditQuestionId').value = '';
    },

    hideQuestionForm() {
        this.closeActiveModal('qbankFormModal');
        this.resetQuestionForm();
    },

    toggleQuestionForm() {
        this.openModal('qbankFormModal');
        this.resetQuestionForm();
    },

    async deleteQuestion(id) {
        const ok = await confirmAction('Delete Question', 'Erase this question item from this exam bank?', 'trash');
        if (!ok) return;
        try {
            const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Deletion failed');
            notify('Question purged', 'warning');
            this.loadQuestions().then(() => this.renderQuestionsTab());
        } catch (err) { notify(err.message, 'error'); }
    },

    triggerBulkImportModal() {
        const fileInput = document.getElementById('csvFileInput');
        if (fileInput) fileInput.value = '';
        const infoEl = document.getElementById('csvFileInfo');
        if (infoEl) {
            infoEl.textContent = '';
            infoEl.style.display = 'none';
        }
        const btnInject = document.getElementById('btnInjectQuestions');
        if (btnInject) {
            btnInject.style.opacity = '0.5';
            btnInject.style.pointerEvents = 'none';
        }
        document.getElementById('csvImportText').value = '';
        this.openModal('bulkImportModal');
    },

    handleCSVFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const infoEl = document.getElementById('csvFileInfo');
        if (infoEl) {
            infoEl.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            infoEl.style.display = 'block';
        }

        const btnInject = document.getElementById('btnInjectQuestions');
        if (btnInject) {
            btnInject.style.opacity = '1';
            btnInject.style.pointerEvents = 'auto';
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            document.getElementById('csvImportText').value = text;
        };
        reader.readAsText(file);
    },

    async processBulkImport() {
        const text = document.getElementById('csvImportText').value.trim();
        if (!text) return notify('CSV values required', 'error');

        const parseCSVLine = (line) => {
            const result = [];
            let cur = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(cur.trim());
                    cur = '';
                } else {
                    cur += char;
                }
            }
            result.push(cur.trim());
            return result;
        };

        const lines = text.split('\n');
        const questions = [];
        lines.forEach(line => {
            if (!line.trim()) return;
            const parts = parseCSVLine(line);
            if (parts.length < 7) return;

            const section = parts[0] || 'General';
            const questionText = parts[1];
            const options = [parts[2], parts[3], parts[4], parts[5]];
            const correctText = parts[6].trim().toLowerCase();

            let correctAnswer = 0;
            for (let i = 0; i < 4; i++) {
                if (options[i] && options[i].trim().toLowerCase() === correctText) {
                    correctAnswer = i;
                    break;
                }
            }

            questions.push({
                section: section.toUpperCase(),
                questionText,
                options,
                correctAnswer: String(correctAnswer)
            });
        });

        if (questions.length === 0) return notify('No valid questions parsed', 'error');

        try {
            const res = await fetch('/api/admin/questions/bulk', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ examId: currentEditingTestId, questions })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Bulk import failed');
            notify(data.message, 'success');
            this.closeActiveModal('bulkImportModal');
            this.loadQuestions().then(() => this.renderQuestionsTab());
        } catch (err) { notify(err.message, 'error'); }
    },

    exportQuestionsCSV() {
        if (examQuestions.length === 0) return notify('No questions to export', 'info');
        
        const formatCSVField = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        let csvContent = 'Section,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectAnswer\n';
        examQuestions.forEach(q => {
            const correctOptionText = q.options[Number(q.correctAnswer)] || '';
            const line = [
                formatCSVField(q.section || 'General'),
                formatCSVField(q.questionText),
                formatCSVField(q.options[0] || ''),
                formatCSVField(q.options[1] || ''),
                formatCSVField(q.options[2] || ''),
                formatCSVField(q.options[3] || ''),
                formatCSVField(correctOptionText)
            ].join(',');
            csvContent += line + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Questions_Export_${currentEditingTestId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        notify('Question bank exported', 'success');
    },

    async clearAllQuestions() {
        const ok = await confirmAction('Purge Questions', 'EXTREME DANGER: Erase ALL questions inside this exam bank?', 'trash');
        if (!ok) return;
        try {
            const res = await fetch(`/api/admin/questions?examId=${currentEditingTestId}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Clear failed');
            notify('All questions purged', 'danger');
            this.loadQuestions().then(() => this.renderQuestionsTab());
        } catch (err) { notify(err.message, 'error'); }
    },

    // ── Tab 2: Participation results ─────────────────────────────────
    async loadLeaderboard() {
        try {
            const res = await fetch(`/api/admin/leaderboard?examId=${currentEditingTestId}`, { headers: getAuthHeaders() });
            const data = await res.json();
            leaderboardData = data.leaderboard;
            totalQuestions = data.totalQuestions;
        } catch (err) { console.error('Leaderboard fetch failed', err); }
    },

    renderAttemptsTab() {
        const partBody = document.querySelector('#statsParticipationTable tbody');
        if (!partBody) return;

        if (leaderboardData.length === 0) {
            partBody.innerHTML = `<tr><td colspan="10" class="text-center" style="color:var(--text-muted); padding:24px;">No attempted student profiles cataloged yet.</td></tr>`;
            return;
        }

        // Aggregate unique sections
        const sectionsSet = new Set();
        leaderboardData.forEach(u => {
            if (u.sectionScores) Object.keys(u.sectionScores).forEach(sec => sectionsSet.add(sec));
        });
        leaderboardSections = Array.from(sectionsSet).sort();

        // Re-construct thead
        const thead = document.getElementById('statsParticipationThead');
        let theadHtml = `
            <tr>
              <th>Roll Number</th>
              <th>Candidate Name</th>
              <th>Time Taken</th>
        `;
        leaderboardSections.forEach(sec => {
            theadHtml += `<th>${sec}</th>`;
        });
        theadHtml += `<th>Total Score</th></tr>`;
        thead.innerHTML = theadHtml;

        // Render rows
        partBody.innerHTML = leaderboardData.map(r => {
            const timeTaken = formatDuration(r.durationMs);
            let secHtml = '';
            leaderboardSections.forEach(sec => {
                secHtml += `<td>${r.sectionScores[sec] || 0}</td>`;
            });

            return `
                <tr>
                  <td><span style="font-family:var(--font-mono); font-size:0.85rem;">${r.rollNumber}</span></td>
                  <td>
                    <div style="display:flex; flex-direction:column; gap:2px; align-items:flex-start;">
                      <strong style="color:#fff; font-size:0.95rem;">${r.name}</strong>
                      <span style="font-size:0.75rem; color:var(--text-muted); font-weight:400; font-family:var(--font-body);">${r.email}</span>
                    </div>
                  </td>
                  <td><span style="font-family:var(--font-mono);">${timeTaken}</span></td>
                  ${secHtml}
                  <td><span style="font-weight:700; color:#ffffff; font-family:var(--font-mono);">${r.totalScore} / ${totalQuestions}</span></td>
                </tr>
            `;
        }).join('');
    },

    downloadCSV() {
        if (leaderboardData.length === 0) return notify('No results data to export', 'info');

        const baseHeaders = ['Rank', 'Name', 'Roll Number', 'Email'];
        const sectionHeaders = leaderboardSections.map(sec => sec.toUpperCase());
        const endHeaders = ['Total Score', 'Total Questions', 'Time Taken'];
        const headers = [...baseHeaders, ...sectionHeaders, ...endHeaders];

        const rows = leaderboardData.map(u => {
            const baseData = [u.rank, u.name, u.rollNumber, u.email];
            const sectionData = leaderboardSections.map(sec => u.sectionScores[sec] || 0);
            const endData = [u.totalScore, totalQuestions, formatDuration(u.durationMs)];
            return [...baseData, ...sectionData, ...endData];
        });

        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `Results_Exam_${currentEditingTestId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        notify('CSV Export complete', 'success');
    },

    downloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        if (leaderboardData.length === 0) return notify('No results data to export', 'info');

        const exam = window.allTests?.find(t => t._id === currentEditingTestId) || { title: 'Exam Results' };

        // Header rectangle background
        doc.setFillColor(18, 7, 7);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 51, 68);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('EXAMINATION RESULTS REPORT', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        doc.text(exam.title.toUpperCase(), 14, 28);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

        // Headers
        const baseHead = ['Rank', 'Roll No.', 'Candidate Name'];
        const sectionHead = leaderboardSections.map(sec => sec.substring(0, 8));
        const endHead = ['Total Score', 'Time Taken'];
        const headRow = [...baseHead, ...sectionHead, ...endHead];

        const rows = leaderboardData.map(u => {
            const baseData = [u.rank, u.rollNumber, u.name.toUpperCase()];
            const sectionData = leaderboardSections.map(sec => u.sectionScores[sec] || 0);
            const endData = [`${u.totalScore}/${totalQuestions}`, formatDuration(u.durationMs)];
            return [...baseData, ...sectionData, ...endData];
        });

        doc.autoTable({
            startY: 45,
            head: [headRow],
            body: rows,
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [255, 51, 68], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { top: 45 }
        });

        doc.save(`Results_${exam.title.replace(/\s+/g, '_')}.pdf`);
        notify('Official PDF Document generated', 'success');
    },

    async clearParticipation() {
        const ok = await confirmAction('Purge Results', 'EXTREME CRITICAL WARNING: Erase all student test answers and total score outcomes? This cannot be undone.', 'trash');
        if (!ok) return;
        try {
            const res = await fetch(`/api/admin/users?examId=${currentEditingTestId}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Purge failed');
            notify('Results outcomes wiped successfully', 'danger');
            this.loadLeaderboard().then(() => this.renderAttemptsTab());
        } catch (err) { notify(err.message, 'error'); }
    },

    // ── Tab 3: Performance Metrics charts ───────────────────────────
    async loadAnalytics() {
        try {
            const res = await fetch(`/api/admin/analytics?examId=${currentEditingTestId}`, { headers: getAuthHeaders() });
            analyticsData = await res.json();
        } catch (err) { console.error('Fetch analytics failed', err); }
    },

    renderMetricsTab() {
        const svg = document.getElementById('metricsDonutSvg');
        const centerVal = document.getElementById('donutCenterValue');
        const centerLbl = document.getElementById('donutCenterLabel');
        const legendEl = document.getElementById('donutLegend');
        const detailTitle = document.getElementById('metricsDetailTitle');
        const barChartEl = document.getElementById('metricsBarChart');
        const qDetailEl = document.getElementById('metricsQuestionDetail');

        if (!svg || !centerVal) return;

        // Clear previous state
        svg.innerHTML = '';
        if (legendEl) legendEl.innerHTML = '';
        if (barChartEl) barChartEl.innerHTML = '';
        if (qDetailEl) qDetailEl.innerHTML = '';
        if (detailTitle) detailTitle.textContent = 'Click a section on the donut to view details';

        // No data guard
        if (leaderboardData.length === 0 || examQuestions.length === 0) {
            centerVal.textContent = '—';
            centerLbl.textContent = 'No Data';
            if (detailTitle) detailTitle.textContent = 'No submissions available';
            return;
        }

        // ── Compute overall total score percentage ──
        const scores = leaderboardData.map(u => u.totalScore);
        const totalScoreSum = scores.reduce((a, b) => a + b, 0);
        const maxPossible = leaderboardData.length * totalQuestions;
        const overallPct = maxPossible > 0 ? ((totalScoreSum / maxPossible) * 100).toFixed(1) : '0.0';

        centerVal.textContent = `${overallPct}%`;
        centerLbl.textContent = 'Overall Score';

        // ── Section aggregation ──
        const sections = [...new Set(examQuestions.map(q => q.section || 'General'))];
        const sectionColors = [
            '#6366f1', '#06b6d4', '#f59e0b', '#ef4444',
            '#10b981', '#a855f7', '#ec4899', '#14b8a6',
            '#f97316', '#8b5cf6', '#22d3ee', '#84cc16'
        ];

        const sectionData = sections.map((sec, i) => {
            const secQuestions = examQuestions.filter(q => (q.section || 'General') === sec);
            const qCount = secQuestions.length;

            // Calculate section success rate
            let secScoreSum = 0;
            let count = 0;
            leaderboardData.forEach(r => {
                if (r.sectionScores && r.sectionScores[sec] !== undefined) {
                    secScoreSum += r.sectionScores[sec];
                    count++;
                }
            });
            const avgSecScore = count > 0 ? (secScoreSum / count) : 0;
            const successRate = qCount > 0 ? ((avgSecScore / qCount) * 100).toFixed(1) : '0.0';

            return {
                name: sec,
                questionCount: qCount,
                successRate,
                color: sectionColors[i % sectionColors.length]
            };
        });

        // ── Draw SVG Donut ──
        const cx = 100, cy = 100, r = 78, strokeWidth = 28;
        const circumference = 2 * Math.PI * r;
        const totalQ = examQuestions.length;
        let cumulativeOffset = 0;

        // Background circle
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', cx);
        bgCircle.setAttribute('cy', cy);
        bgCircle.setAttribute('r', r);
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', 'rgba(255,255,255,0.04)');
        bgCircle.setAttribute('stroke-width', strokeWidth);
        svg.appendChild(bgCircle);

        sectionData.forEach((sec, idx) => {
            const fraction = sec.questionCount / totalQ;
            const arcLength = circumference * fraction;
            const gapSize = sections.length > 1 ? 4 : 0;
            const visibleArc = Math.max(arcLength - gapSize, 2);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', r);
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', sec.color);
            circle.setAttribute('stroke-width', strokeWidth);
            circle.setAttribute('stroke-dasharray', `${visibleArc} ${circumference - visibleArc}`);
            circle.setAttribute('stroke-dashoffset', `${-cumulativeOffset - gapSize / 2}`);
            circle.setAttribute('stroke-linecap', 'butt');
            circle.setAttribute('class', 'donut-arc');
            circle.setAttribute('data-section', sec.name);
            circle.style.transformOrigin = 'center';
            circle.style.transform = 'rotate(-90deg)';
            circle.style.cursor = 'pointer';
            circle.style.transition = 'filter 0.25s ease, stroke-width 0.25s ease';
            circle.style.filter = 'drop-shadow(0 0 3px ' + sec.color + '40)';

            // Hover: update center text to section success %
            circle.addEventListener('mouseenter', () => {
                centerVal.textContent = `${sec.successRate}%`;
                centerLbl.textContent = sec.name;
                circle.style.strokeWidth = strokeWidth + 6;
                circle.style.filter = `drop-shadow(0 0 12px ${sec.color}90)`;
            });
            circle.addEventListener('mouseleave', () => {
                centerVal.textContent = `${overallPct}%`;
                centerLbl.textContent = 'Overall Score';
                circle.style.strokeWidth = strokeWidth;
                circle.style.filter = `drop-shadow(0 0 3px ${sec.color}40)`;
            });

            // Click: drill down into this section
            circle.addEventListener('click', () => {
                AdminDashboard.selectDonutSection(sec.name, sec.color);
                // Highlight active arc
                svg.querySelectorAll('.donut-arc').forEach(a => {
                    a.style.opacity = a.getAttribute('data-section') === sec.name ? '1' : '0.3';
                });
            });

            svg.appendChild(circle);
            cumulativeOffset += arcLength;
        });

        // ── Legend ──
        if (legendEl) {
            legendEl.innerHTML = sectionData.map(sec => `
                <div class="donut-legend-item" onclick="AdminDashboard.selectDonutSection('${sec.name.replace(/'/g, "\\'")}', '${sec.color}')">
                    <span class="donut-legend-dot" style="background:${sec.color};"></span>
                    <span class="donut-legend-text">${sec.name}</span>
                    <span class="donut-legend-count">${sec.questionCount}Q · ${sec.successRate}%</span>
                </div>
            `).join('');
        }

        // ── Auto-select first section by default ──
        if (sectionData.length > 0) {
            const firstSec = sectionData[0];
            this.selectDonutSection(firstSec.name, firstSec.color);
        }
    },

    selectDonutSection(sectionName, sectionColor) {
        const detailTitle = document.getElementById('metricsDetailTitle');
        const barChartEl = document.getElementById('metricsBarChart');
        const qDetailEl = document.getElementById('metricsQuestionDetail');
        const svg = document.getElementById('metricsDonutSvg');

        if (detailTitle) detailTitle.textContent = sectionName;
        if (qDetailEl) qDetailEl.innerHTML = '';

        // Highlight active arc on donut
        if (svg) {
            svg.querySelectorAll('.donut-arc').forEach(a => {
                a.style.opacity = a.getAttribute('data-section') === sectionName ? '1' : '0.3';
            });
        }

        // Filter analytics data for this section
        const sectionQuestions = analyticsData.filter(q => (q.section || 'General') === sectionName);

        if (!barChartEl) return;

        if (sectionQuestions.length === 0) {
            barChartEl.innerHTML = '<p class="metrics-empty-msg">No analytics data available for this section.</p>';
            return;
        }

        const totalStudents = sectionQuestions[0]?.totalStudents || 0;
        
        // Determine tick scale step based on submitted candidate entries
        let step = 2;
        if (totalStudents > 45) {
            step = 10;
        } else if (totalStudents >= 20) {
            step = 5;
        }

        // Align chart max limit to next tick multiple
        const maxLimit = Math.ceil(totalStudents / step) * step || step;

        const ticks = [];
        for (let val = maxLimit; val >= 0; val -= step) {
            ticks.push(val);
        }

        const gridInterval = 280 / (ticks.length - 1);
        const barsInlineStyle = `background-size: 100% ${gridInterval}px;`;

        barChartEl.innerHTML = `
            <div class="metrics-histogram">
                <div class="metrics-histogram__body">
                    <div class="metrics-y-axis">
                        ${ticks.map(t => `<span>${t}</span>`).join('')}
                    </div>
                    <div class="metrics-histogram__bars" style="${barsInlineStyle}">
                        ${sectionQuestions.map((q, idx) => {
                            const cFlex = q.correctCount > 0 ? `flex-grow: ${q.correctCount};` : 'display: none;';
                            const wFlex = q.wrongCount > 0 ? `flex-grow: ${q.wrongCount};` : 'display: none;';
                            const barStackHeightPct = ((q.correctCount + q.wrongCount) / maxLimit) * 100;
                            return `
                                <div class="metrics-histogram__group" onclick="AdminDashboard.showQuestionDetail('${q._id}')" title="Correct: ${q.correctCount}, Incorrect: ${q.wrongCount}">
                                    <div class="metrics-histogram__column-flow">
                                        <div class="metrics-histogram__bar-stack" style="height:${barStackHeightPct}%;">
                                            <div class="metrics-histogram__bar metrics-histogram__bar--correct" style="${cFlex}" data-count="${q.correctCount}"></div>
                                            <div class="metrics-histogram__bar metrics-histogram__bar--wrong" style="${wFlex}" data-count="${q.wrongCount}"></div>
                                        </div>
                                        <div class="metrics-histogram__bar-spacer" style="flex-grow: 1;"></div>
                                    </div>
                                    <div class="metrics-histogram__label">Q${idx + 1}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="metrics-histogram__legend">
                    <div class="metrics-histogram__legend-item">
                        <span class="metrics-histogram__legend-dot" style="background:linear-gradient(180deg, #00e676, #00bfa5);"></span>
                        Correct
                    </div>
                    <div class="metrics-histogram__legend-item">
                        <span class="metrics-histogram__legend-dot" style="background:linear-gradient(180deg, #ff1744, #d50000);"></span>
                        Incorrect
                    </div>
                </div>
            </div>
        `;
    },

    showQuestionDetail(questionId) {
        const qDetailEl = document.getElementById('metricsQuestionDetail');
        if (!qDetailEl) return;

        const aData = analyticsData.find(q => q._id === questionId);
        if (!aData) return;

        // Find the full question from examQuestions to get correct answer and options
        const fullQ = examQuestions.find(q => q._id === questionId);
        let correctAnswerText = '—';
        if (fullQ && fullQ.options) {
            const index = Number(fullQ.correctAnswer);
            correctAnswerText = fullQ.options[index] || '—';
        }
        const sectionName = aData.section || 'General';

        // Find question number within its section
        const sectionQuestions = analyticsData.filter(q => (q.section || 'General') === sectionName);
        const qNumInSection = sectionQuestions.findIndex(q => q._id === questionId) + 1;

        qDetailEl.innerHTML = `
            <div class="metrics-qdetail-card">
                <div class="metrics-qdetail-header">
                    <span class="metrics-qdetail-badge">${sectionName}</span>
                    <span class="metrics-qdetail-qnum">Question ${qNumInSection}</span>
                </div>
                <p class="metrics-qdetail-text">${aData.questionText}</p>
                <div class="metrics-qdetail-answer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e676" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Correct Answer: <strong>${correctAnswerText}</strong></span>
                </div>
                <div class="metrics-qdetail-stats">
                    <div class="metrics-qdetail-stat metrics-qdetail-stat--correct">
                        <div class="metrics-qdetail-stat__count">${aData.correctCount}</div>
                        <div class="metrics-qdetail-stat__label">Correct</div>
                    </div>
                    <div class="metrics-qdetail-stat metrics-qdetail-stat--wrong">
                        <div class="metrics-qdetail-stat__count">${aData.wrongCount}</div>
                        <div class="metrics-qdetail-stat__label">Incorrect</div>
                    </div>
                    <div class="metrics-qdetail-stat metrics-qdetail-stat--unattempted">
                        <div class="metrics-qdetail-stat__count">${aData.unattemptedCount}</div>
                        <div class="metrics-qdetail-stat__label">Not Attempted</div>
                    </div>
                </div>
            </div>
        `;
    },

    // ── Helper Modal triggers ────────────────────────────────────────
    openModal(modalId) {
        const overlay = document.getElementById(modalId);
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    closeActiveModal(modalId) {
        const overlay = document.getElementById(modalId);
        if (overlay) {
            overlay.classList.remove('active');
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },

    handleCollegeFilterChange() {
        const filter = document.getElementById('collegeFilter');
        if (filter) selectedCollegeId = filter.value;
        this.renderPanel(activePanel);
    },

    toggleFilterInputVisibility(type) {
        const cond = document.getElementById(`filterStd${type}Cond`).value;
        const valWrapper = document.getElementById(`filterStd${type}ValWrapper`);
        const valInput = document.getElementById(`filterStd${type}Val`);
        const maxInput = document.getElementById(`filterStd${type}ValMax`);
        const lbl = document.getElementById(`lblFilterStd${type}Val`);

        if (cond === 'any') {
            valWrapper.style.display = 'none';
        } else {
            valWrapper.style.display = 'block';
            if (cond === 'between') {
                maxInput.style.display = 'block';
                lbl.textContent = type === 'Pct' ? 'Percentage Range (%)' : 'Marks Range';
            } else {
                maxInput.style.display = 'none';
                lbl.textContent = cond === 'greater' 
                    ? (type === 'Pct' ? 'Minimum Percentage (%)' : 'Minimum Marks')
                    : (type === 'Pct' ? 'Maximum Percentage (%)' : 'Maximum Marks');
            }
        }
    },

    applyStudentFilters() {
        const minRollVal = document.getElementById('filterStdRollMin').value;
        const maxRollVal = document.getElementById('filterStdRollMax').value;
        
        activeStudentFilters.rollMin = minRollVal !== '' ? Number(minRollVal) : null;
        activeStudentFilters.rollMax = maxRollVal !== '' ? Number(maxRollVal) : null;

        activeStudentFilters.totalMarksCond = document.getElementById('filterStdTotalMarksCond').value;
        const totalMarksVal = document.getElementById('filterStdTotalMarksVal').value;
        const totalMarksValMax = document.getElementById('filterStdTotalMarksValMax').value;
        activeStudentFilters.totalMarksVal = totalMarksVal !== '' ? Number(totalMarksVal) : null;
        activeStudentFilters.totalMarksValMax = totalMarksValMax !== '' ? Number(totalMarksValMax) : null;

        activeStudentFilters.pctCond = document.getElementById('filterStdPctCond').value;
        const pctVal = document.getElementById('filterStdPctVal').value;
        const pctValMax = document.getElementById('filterStdPctValMax').value;
        activeStudentFilters.pctVal = pctVal !== '' ? Number(pctVal) : null;
        activeStudentFilters.pctValMax = pctValMax !== '' ? Number(pctValMax) : null;

        activeStudentFilters.attendance = document.getElementById('filterStdAttendance').value;

        this.closeActiveModal('studentFilterModal');
        this.renderStudentsList();
    },

    resetStudentFilters() {
        document.getElementById('studentFilterForm').reset();
        activeStudentFilters = {
            rollMin: null,
            rollMax: null,
            totalMarksCond: 'any',
            totalMarksVal: null,
            totalMarksValMax: null,
            pctCond: 'any',
            pctVal: null,
            pctValMax: null,
            attendance: 'all'
        };
        this.toggleFilterInputVisibility('TotalMarks');
        this.toggleFilterInputVisibility('Pct');

        this.closeActiveModal('studentFilterModal');
        this.renderStudentsList();
    },

    toggleTestDateFilterVisibility() {
        const cond = document.getElementById('filterTestDateCond').value;
        const valWrapper = document.getElementById('filterTestDateValWrapper');
        const valInput = document.getElementById('filterTestDateVal');
        const maxInput = document.getElementById('filterTestDateValMax');
        const lbl = document.getElementById('lblFilterTestDateVal');

        if (cond === 'any') {
            valWrapper.style.display = 'none';
        } else {
            valWrapper.style.display = 'block';
            if (cond === 'between') {
                maxInput.style.display = 'block';
                lbl.textContent = 'Date Range';
            } else {
                maxInput.style.display = 'none';
                lbl.textContent = cond === 'after' ? 'Starts After' : 'Starts Before';
            }
        }
    },

    applyTestFilters() {
        const statuses = [];
        if (document.getElementById('filterTestStatusLive').checked) statuses.push('Live');
        if (document.getElementById('filterTestStatusIncoming').checked) statuses.push('Upcoming');
        if (document.getElementById('filterTestStatusCompleted').checked) statuses.push('Completed');
        activeTestFilters.statuses = statuses;

        activeTestFilters.dateCond = document.getElementById('filterTestDateCond').value;
        activeTestFilters.dateVal = document.getElementById('filterTestDateVal').value || null;
        activeTestFilters.dateValMax = document.getElementById('filterTestDateValMax').value || null;

        const selectedSecs = [];
        document.querySelectorAll('.filter-sec-checkbox:checked').forEach(cb => {
            selectedSecs.push(cb.value);
        });
        activeTestFilters.sections = selectedSecs;

        this.closeActiveModal('testFilterModal');
        this.renderTestsList();
    },

    resetTestFilters() {
        document.getElementById('filterTestStatusLive').checked = true;
        document.getElementById('filterTestStatusIncoming').checked = true;
        document.getElementById('filterTestStatusCompleted').checked = true;
        document.getElementById('filterTestDateCond').value = 'any';
        document.getElementById('filterTestDateVal').value = '';
        document.getElementById('filterTestDateValMax').value = '';
        
        activeTestFilters = {
            statuses: ['Live', 'Upcoming', 'Completed'],
            dateCond: 'any',
            dateVal: null,
            dateValMax: null,
            sections: []
        };

        this.toggleTestDateFilterVisibility();
        this.closeActiveModal('testFilterModal');
        this.renderTestsList();
    },

    populateTestSectionsFilter() {
        const container = document.getElementById('filterTestSectionsContainer');
        if (!container) return;
        
        const sections = window.allAvailableSections || [];
        if (sections.length === 0) {
            container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">No exam sections found in database.</span>`;
            return;
        }

        container.innerHTML = sections.map(sec => {
            const checked = activeTestFilters.sections.length === 0 || activeTestFilters.sections.includes(sec) ? 'checked' : '';
            return `
                <label style="display: flex; align-items: center; gap: 6px; color: #fff; font-size: 0.85rem; cursor: pointer; padding: 4px 8px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 4px; user-select: none;">
                  <input type="checkbox" class="filter-sec-checkbox" value="${sec}" ${checked} style="accent-color: var(--accent-red); cursor: pointer;">
                  ${sec}
                </label>
            `;
        }).join('');
    }
};

// ── Sync Helper ──────────────────────────────────────────────────────
function showDashboard() {
    loginPanel.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    
    // Core brand settings
    AdminDashboard.setupSidebar();
    AdminDashboard.setupTopbar();
    
    AdminDashboard.setupFilters().then(() => {
        AdminDashboard.switchPanel('overview');
        AdminDashboard.bindForms();
    });
}

function formatDuration(ms) {
    if (!ms || isNaN(ms) || ms <= 0) return '0s';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    
    let parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
}

// Global exposure
window.AdminDashboard = AdminDashboard;
window.logout = handleLogout;

document.addEventListener('DOMContentLoaded', () => {
    AdminDashboard.init();
});
