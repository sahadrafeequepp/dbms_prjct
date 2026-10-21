/**
 * Payroll Management System - Application Controller
 * Handles tabs, modals, tables, search, theme toggle, and CRUD workflows.
 */

let appData = {
  stats: null,
  employees: [],
  departments: [],
  grades: [],
  subGrades: [],
  attendance: [],
  payslips: []
};

let currentUser = null;

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------
let pendingAuthCallback = null;

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await API.init();
  await checkAuth();
});

// Global 401 Unauthorized Interceptor
window.handleUnauthorizedAccess = function() {
  if (currentUser) {
    showToast('Your session has expired. Please sign in again.');
    logoutUser();
  } else {
    requireAuth('access this DBMS resource');
  }
};

// -----------------------------------------------------------------------------
// AUTHENTICATION & ROLE-BASED ACCESS
// -----------------------------------------------------------------------------
async function checkAuth() {
  // 1. Try to restore session from persistent cookie via API
  try {
    const user = await API.getMe();
    if (user) {
      currentUser = user;
      localStorage.setItem('payroll_auth_user', JSON.stringify(currentUser));
      applyRoleAccess(currentUser);
      closeModal('loginModal');
      await loadAndRenderAll();
      return true;
    }
  } catch (e) {
    console.warn('Session check error:', e);
  }

  // 2. Check localStorage fallback (Offline demo mode)
  const savedUser = localStorage.getItem('payroll_auth_user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      applyRoleAccess(currentUser);
      closeModal('loginModal');
      await loadAndRenderAll();
      return true;
    } catch (e) { }
  }

  // 3. Default View: Logged-Out Public Landing Page
  currentUser = null;
  applyGuestState();
  await loadGuestSummary();
  return false;
}

function applyGuestState() {
  currentUser = null;
  document.body.classList.remove('role-admin', 'role-employee');
  document.body.classList.add('role-guest');

  // Topbar: show "Sign In" button, hide user profile
  const guestArea = document.getElementById('topbarGuestArea');
  const userArea = document.getElementById('topbarUserArea');
  if (guestArea) guestArea.style.display = 'flex';
  if (userArea) userArea.style.display = 'none';

  // Make Overview (Landing) the active view
  switchNav('landing');
}

async function loadGuestSummary() {
  try {
    const stats = await API.getStats();
    if (stats) {
      const empCountEl = document.getElementById('landing-count-emp');
      const deptCountEl = document.getElementById('landing-count-dept');
      if (empCountEl && stats.total_employees) empCountEl.innerText = stats.total_employees;
      if (deptCountEl && stats.total_departments) deptCountEl.innerText = stats.total_departments;
    }
  } catch (e) {
    // Graceful offline fallback
  }
}

function requireAuth(actionName = 'access this feature', callback = null) {
  if (currentUser) {
    return true;
  }

  pendingAuthCallback = callback;
  openLoginModal(actionName ? `Please sign in to ${actionName}` : 'Sign in to access DBMS management features');
  return false;
}

function openLoginModal(noticeText = '') {
  const promptEl = document.getElementById('loginPromptNotice');
  if (promptEl) {
    if (noticeText) {
      promptEl.innerText = `🔒 ${noticeText}`;
      promptEl.style.display = 'block';
    } else {
      promptEl.style.display = 'none';
    }
  }
  openModal('loginModal');
}

function applyRoleAccess(user) {
  if (!user) return;
  const isAdmin = user.role === 'ADMIN';
  document.body.classList.remove('role-admin', 'role-employee', 'role-guest');
  document.body.classList.add(isAdmin ? 'role-admin' : 'role-employee');

  // Topbar: hide "Sign In" button, show user profile
  const guestArea = document.getElementById('topbarGuestArea');
  const userArea = document.getElementById('topbarUserArea');
  if (guestArea) guestArea.style.display = 'none';
  if (userArea) userArea.style.display = 'block';

  const nameEl = document.getElementById('topbarUserName');
  const roleBadgeEl = document.getElementById('topbarRoleBadge');
  const avatarEl = document.getElementById('topbarAvatar');
  const dropNameEl = document.getElementById('dropdownUserName');
  const dropEmailEl = document.getElementById('dropdownUserEmail');

  if (nameEl) nameEl.innerText = user.name;
  if (dropNameEl) dropNameEl.innerText = user.name;
  if (dropEmailEl) dropEmailEl.innerText = `${user.email} • ${user.role}`;
  if (avatarEl && user.avatar) avatarEl.src = user.avatar;

  if (roleBadgeEl) {
    roleBadgeEl.innerText = user.role;
    roleBadgeEl.className = `role-badge ${isAdmin ? 'role-badge-admin' : 'role-badge-employee'}`;
  }

  // Update Welcome Banner
  const welcomeH2 = document.querySelector('.welcome-text h2');
  const welcomeP = document.querySelector('.welcome-text p');
  if (welcomeH2) {
    const firstName = user.name.split(' ')[0];
    welcomeH2.innerHTML = `Good Evening, ${firstName} 👋 <span class="role-badge ${isAdmin ? 'role-badge-admin' : 'role-badge-employee'}" style="font-size:12px; margin-left:8px; vertical-align:middle;">${user.role}</span>`;
  }
  if (welcomeP) {
    welcomeP.innerText = isAdmin
      ? "Here's what's happening with your company payroll system today."
      : "Welcome to your employee self-service portal. View payslips, salary certificates & attendance.";
  }

  // Toggle Admin-only controls
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
}

async function handleLoginSubmit(event) {
  if (event) event.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorEl = document.getElementById('loginErrorMsg');
  const submitBtn = document.getElementById('loginSubmitBtn');

  if (errorEl) errorEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.innerText = 'Signing in...';

  try {
    const res = await API.login(username, password);
    currentUser = res.user;
    localStorage.setItem('payroll_auth_user', JSON.stringify(currentUser));
    applyRoleAccess(currentUser);
    closeModal('loginModal');
    showToast(`Welcome back, ${currentUser.name}! (${currentUser.role} Access)`);
    await loadAndRenderAll();

    // If an action or navigation was pending, execute it now!
    if (typeof pendingAuthCallback === 'function') {
      const cb = pendingAuthCallback;
      pendingAuthCallback = null;
      cb();
    } else {
      // Default transition from landing to dashboard
      const activeTab = document.querySelector('.tab-content.active');
      if (!activeTab || activeTab.id === 'tab-landing') {
        switchNav('dashboard');
      }
    }
  } catch (err) {
    if (errorEl) {
      errorEl.innerText = err.message || 'Invalid username or password';
      errorEl.style.display = 'block';
    } else {
      showToast(err.message || 'Login failed');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Sign In to Dashboard</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
  }
}

function quickFillLogin(username, password) {
  document.getElementById('loginUsername').value = username;
  document.getElementById('loginPassword').value = password;
  handleLoginSubmit();
}

async function logoutUser() {
  await API.logout();
  currentUser = null;
  localStorage.removeItem('payroll_auth_user');
  applyGuestState();
  closeAllDropdowns();
  showToast('Signed out successfully.');
}

async function loadAndRenderAll() {
  try {
    const isEmployee = currentUser && currentUser.role === 'EMPLOYEE';
    const empId = isEmployee ? currentUser.emp_id : null;

    appData.stats = await API.getStats(empId);
    appData.employees = await API.getEmployees('ALL', empId);
    appData.departments = isEmployee ? [] : await API.getDepartments();
    appData.grades = isEmployee ? [] : await API.getGrades();
    appData.subGrades = isEmployee ? [] : await API.getSubGrades();
    appData.attendance = await API.getAttendance('June 2025', empId);
    appData.payslips = await API.getPayslips(empId);

    renderDashboardStats();
    renderRecentEmployeesTable();
    renderEmployeesTable();
    if (!isEmployee) {
      renderDepartmentsGrid();
      renderSalarySubGradesTable();
      renderSalaryGradesTable();
      populateDeptFilterOptions();
    }
    renderAttendanceTable();
    renderPayslipsTable();
    ChartsManager.render(appData.stats);
    if (currentUser) applyRoleAccess(currentUser);
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

// -----------------------------------------------------------------------------
// THEME HANDLING
// -----------------------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem('payroll_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('payroll_theme', next);
  ChartsManager.render(appData.stats);
  showToast(`Switched to ${next.toUpperCase()} theme`);
}

// -----------------------------------------------------------------------------
// NAVIGATION TABS
// -----------------------------------------------------------------------------
// NAVIGATION TABS
// -----------------------------------------------------------------------------
function switchNav(tabId) {
  if (tabId !== 'landing' && !currentUser) {
    const tabNames = {
      'dashboard': 'Dashboard',
      'employees': 'Employees Directory',
      'departments': 'Departments',
      'grades': 'Salary Grades',
      'attendance': 'Attendance Records',
      'payslips': 'Payslips',
      'payroll-run': 'Payroll Processing',
      'reports': 'System Reports',
      'settings': 'Settings'
    };
    const name = tabNames[tabId] || 'this section';
    requireAuth(`view ${name}`, () => switchNav(tabId));
    return;
  }

  const adminOnlyTabs = ['employees', 'departments', 'grades', 'payroll-run', 'reports', 'settings'];
  if (currentUser && currentUser.role === 'EMPLOYEE' && adminOnlyTabs.includes(tabId)) {
    showToast('Access restricted: Only Admin can view organizational records.');
    return;
  }

  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const targetPane = document.getElementById('tab-' + tabId);
  if (targetPane) targetPane.classList.add('active');

  const targetNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (targetNavItem) targetNavItem.classList.add('active');

  if (tabId === 'dashboard') {
    setTimeout(() => { if (appData.stats) ChartsManager.render(appData.stats); }, 50);
  } else if (tabId === 'attendance') {
    renderAttendanceTable();
  } else if (tabId === 'payslips') {
    renderPayslipsTable();
  }
}

// -----------------------------------------------------------------------------
// RENDERING FUNCTIONS
// -----------------------------------------------------------------------------
function formatINR(amount) {
  return '₹ ' + Math.round(Number(amount) || 0).toLocaleString('en-IN');
}

function renderDashboardStats() {
  const s = appData.stats || {};
  const isEmployee = currentUser && currentUser.role === 'EMPLOYEE';

  renderRecentActivity(isEmployee);

  if (isEmployee) {
    // Stat Card 1: My Role
    const label1 = document.querySelectorAll('.stat-card .stat-label')[0];
    const val1 = document.getElementById('dash-total-emp');
    const badge1 = document.querySelectorAll('.stat-card .stat-footer-badge')[0];
    if (label1) label1.innerText = 'My Role';
    if (val1) {
      val1.innerText = s.designation || 'Specialist';
      val1.style.fontSize = '17px';
    }
    if (badge1) badge1.innerHTML = `<span>${s.department || 'IT Department'}</span>`;

    // Stat Card 2: My Salary Grade
    const label2 = document.querySelectorAll('.stat-card .stat-label')[1];
    const val2 = document.getElementById('dash-total-dept');
    const neutral2 = document.querySelectorAll('.stat-card .stat-footer-neutral')[0];
    if (label2) label2.innerText = 'Salary Grade';
    if (val2) {
      val2.innerText = s.grade || 'G3';
      val2.style.fontSize = '24px';
    }
    if (neutral2) neutral2.innerText = `${formatINR(s.basic_pay || 72000)} Base Pay`;

    // Stat Card 3: My Take-Home Net Pay
    const label3 = document.querySelectorAll('.stat-card .stat-label')[2];
    const val3 = document.getElementById('dash-payroll-cost');
    const badge3 = document.querySelectorAll('.stat-card .stat-footer-badge')[1];
    if (label3) label3.innerText = 'My Net Pay';
    if (val3) val3.innerText = formatINR(s.net_pay || 73500);
    if (badge3) badge3.innerHTML = `<span>June 2025 Disbursed</span>`;

    // Stat Card 4: My Attendance
    const label4 = document.querySelectorAll('.stat-card .stat-label')[3];
    const val4 = document.getElementById('dash-attendance-rate');
    const badge4 = document.querySelectorAll('.stat-card .stat-footer-badge')[2];
    if (label4) label4.innerText = 'My Attendance';
    if (val4) val4.innerText = `${s.attendance_rate || 100}%`;
    if (badge4) badge4.innerHTML = `<span>${s.days_present || 22} Days Present • ${s.unpaid_leaves || 0} Leaves</span>`;

    // Upcoming Payroll Banner for Employee
    const upBannerLabel = document.querySelector('.upcoming-banner .label');
    const upBannerDate = document.querySelector('.upcoming-banner .date');
    const upBannerSub = document.querySelector('.upcoming-banner .sub');
    const upBtn = document.querySelector('.btn-run-payroll');
    if (upBannerLabel) upBannerLabel.innerText = 'My Next Pay Date';
    if (upBannerDate) upBannerDate.innerText = '30 Jun 2025';
    if (upBannerSub) upBannerSub.innerText = `Scheduled credit: ${formatINR(s.net_pay || 73500)}`;
    if (upBtn) {
      upBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg> View My Slip`;
      upBtn.onclick = () => openPayslipGeneratorModal();
    }

    // Summary box
    document.getElementById('sum-employees-count').innerText = '1 (Me)';
    document.getElementById('sum-gross-pay').innerText = formatINR(s.monthly_payroll || 86000);
    document.getElementById('sum-deductions').innerText = formatINR(s.total_deductions || 12500);
    document.getElementById('sum-net-pay').innerText = formatINR(s.net_pay || 73500);

    // Table title
    const tableTitle = document.getElementById('dashTableTitle') || document.querySelector('#tab-dashboard .custom-table').closest('.card').querySelector('.card-title');
    if (tableTitle) tableTitle.innerText = 'My Profile Details';
    return;
  }

  // Admin Mode Defaults
  document.getElementById('nav-emp-count').innerText = s.total_employees || appData.employees.length;
  document.getElementById('nav-dept-count').innerText = s.total_departments || appData.departments.length;

  document.getElementById('dash-total-emp').innerText = s.total_employees || appData.employees.length;
  document.getElementById('dash-total-dept').innerText = s.total_departments || appData.departments.length;
  document.getElementById('dash-payroll-cost').innerText = formatINR(s.monthly_payroll || 342500);
  document.getElementById('dash-attendance-rate').innerText = '96.2%';

  // Reset Card Labels
  const labels = document.querySelectorAll('.stat-card .stat-label');
  if (labels[0]) labels[0].innerText = 'Total Employees';
  if (labels[1]) labels[1].innerText = 'Departments';
  if (labels[2]) labels[2].innerText = 'Monthly Payroll';
  if (labels[3]) labels[3].innerText = 'Attendance Rate';

  const val1 = document.getElementById('dash-total-emp');
  if (val1) val1.style.fontSize = '26px';
  const val2 = document.getElementById('dash-total-dept');
  if (val2) val2.style.fontSize = '26px';

  document.getElementById('sum-employees-count').innerText = s.total_employees || appData.employees.length;
  document.getElementById('sum-gross-pay').innerText = formatINR(s.monthly_payroll || 342500);
  document.getElementById('sum-deductions').innerText = formatINR(s.total_deductions || 48250);
  document.getElementById('sum-net-pay').innerText = formatINR(s.net_pay || 294250);

  const upBannerLabel = document.querySelector('.upcoming-banner .label');
  const upBannerDate = document.querySelector('.upcoming-banner .date');
  const upBannerSub = document.querySelector('.upcoming-banner .sub');
  const upBtn = document.querySelector('.btn-run-payroll');
  if (upBannerLabel) upBannerLabel.innerText = 'Next Payroll Run';
  if (upBannerDate) upBannerDate.innerText = '30 Jun 2025';
  if (upBannerSub) upBannerSub.innerText = 'Process payroll for June 2025';
  if (upBtn) {
    upBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Payroll`;
    upBtn.onclick = () => openPayrollModal();
  }

  const tableTitle = document.getElementById('dashTableTitle') || document.querySelector('#tab-dashboard .custom-table').closest('.card').querySelector('.card-title');
  if (tableTitle) tableTitle.innerText = 'Recent Employees';

  // Reports tab
  document.getElementById('rep-total-emp').innerText = `${s.total_employees || appData.employees.length} Staff`;
  document.getElementById('rep-gross-outflow').innerText = formatINR(s.monthly_payroll || 342500);
  document.getElementById('rep-deductions').innerText = formatINR(s.total_deductions || 48250);
  document.getElementById('rep-net-disbursed').innerText = formatINR(s.net_pay || 294250);
}

function renderRecentActivity(isEmployee) {
  const container = document.getElementById('dashActivityList');
  if (!container) return;

  if (isEmployee) {
    container.innerHTML = `
      <div class="activity-item">
        <div class="activity-icon-badge act-purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/></svg>
        </div>
        <div class="activity-details">
          <div class="activity-title">June 2025 Salary Credited</div>
          <div class="activity-subtitle">Net pay transferred to salary account</div>
        </div>
        <div class="activity-time">Today</div>
      </div>

      <div class="activity-item">
        <div class="activity-icon-badge act-blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="m9 16 2 2 4-4"/></svg>
        </div>
        <div class="activity-details">
          <div class="activity-title">Biometric Attendance Verified</div>
          <div class="activity-subtitle">22 days present • 100% record logged</div>
        </div>
        <div class="activity-time">Yesterday</div>
      </div>

      <div class="activity-item">
        <div class="activity-icon-badge act-green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <div class="activity-details">
          <div class="activity-title">Salary Certificate Ready</div>
          <div class="activity-subtitle">Digitally stamped certificate available</div>
        </div>
        <div class="activity-time">2 days ago</div>
      </div>

      <div class="activity-item">
        <div class="activity-icon-badge act-orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        </div>
        <div class="activity-details">
          <div class="activity-title">Tax & Statutory Compliance</div>
          <div class="activity-subtitle">PF and statutory deductions updated</div>
        </div>
        <div class="activity-time">3 days ago</div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="activity-item">
        <div class="activity-icon-badge act-green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
        </div>
        <div class="activity-details">
          <div class="activity-title">New employee added</div>
          <div class="activity-subtitle">Anjali S Nair (IT Department)</div>
        </div>
        <div class="activity-time">2 hours ago</div>
      </div>

      <div class="activity-item">
        <div class="activity-icon-badge act-purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/></svg>
        </div>
        <div class="activity-details">
          <div class="activity-title">Payslip generated</div>
          <div class="activity-subtitle">for June 2025 (24 employees)</div>
        </div>
        <div class="activity-time">4 hours ago</div>
      </div>

      <div class="activity-item">
        <div class="activity-icon-badge act-blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="m9 16 2 2 4-4"/></svg>
        </div>
        <div class="activity-details">
          <div class="activity-title">Attendance updated</div>
          <div class="activity-subtitle">for 10 Jun 2025</div>
        </div>
        <div class="activity-time">6 hours ago</div>
      </div>

      <div class="activity-item">
        <div class="activity-icon-badge act-orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/></svg>
        </div>
        <div class="activity-details">
          <div class="activity-title">Department added</div>
          <div class="activity-subtitle">R&D Department</div>
        </div>
        <div class="activity-time">1 day ago</div>
      </div>
    `;
  }
}

function renderRecentEmployeesTable() {
  const tbody = document.getElementById('recentEmployeesTableBody');
  const isEmployee = currentUser && currentUser.role === 'EMPLOYEE';
  const list = isEmployee ? appData.employees.slice(0, 1) : appData.employees.slice(0, 5);

  tbody.innerHTML = list.map(emp => {
    const isLeave = emp.status === 'On Leave';
    const deptName = emp.dept_name || getDeptName(emp.dept_id || emp.deptId);
    return `
      <tr>
        <td class="mono" style="font-size:12px; color:var(--text-sub);">${emp.id}</td>
        <td>
          <div class="emp-avatar-cell">
            <img src="${emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}" class="emp-avatar" alt="${emp.name}">
            <div>
              <div style="font-weight:700; color:var(--text-main);">${emp.name}</div>
              <div style="font-size:11px; color:var(--text-muted);">${emp.email}</div>
            </div>
          </div>
        </td>
        <td>${deptName}</td>
        <td class="mono font-semibold">
          ${emp.grade_id || emp.gradeId}
          ${emp.sub_grade_id ? `<span class="subgrade-badge" style="font-size:10px; padding:1px 5px; margin-left:4px;">${emp.sub_grade_id}</span>` : ''}
        </td>
        <td>
          <span class="status-badge ${isLeave ? 'badge-leave' : 'badge-active'}">
            ${emp.status}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderEmployeesTable() {
  const filter = document.getElementById('filterEmpDept').value;
  const tbody = document.getElementById('allEmployeesTableBody');
  const filtered = appData.employees.filter(e => filter === 'ALL' || (e.dept_id || e.deptId) === filter);

  tbody.innerHTML = filtered.map(emp => {
    const isLeave = emp.status === 'On Leave';
    const deptName = emp.dept_name || getDeptName(emp.dept_id || emp.deptId);
    const basic = emp.basic_pay || 52000;

    return `
      <tr>
        <td class="mono font-semibold" style="color:var(--primary); font-size:12px;">${emp.id}</td>
        <td>
          <div class="emp-avatar-cell">
            <img src="${emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}" class="emp-avatar">
            <div style="font-weight:700;">${emp.name}</div>
          </div>
        </td>
        <td style="font-size:12px; color:var(--text-muted);">${emp.email}</td>
        <td>${emp.designation}</td>
        <td><span class="dept-stat-pill">${deptName}</span></td>
        <td class="mono font-semibold">
          ${emp.grade_id || emp.gradeId}
          ${emp.sub_grade_id ? `<span class="subgrade-badge" style="font-size:10px; padding:1px 5px; margin-left:4px;">${emp.sub_grade_id}</span>` : ''}
          &bull; ${formatINR(basic)}
        </td>
        <td>
          <span class="status-badge ${isLeave ? 'badge-leave' : 'badge-active'}">${emp.status}</span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button onclick="openEntityModal('employee', '${emp.id}')" class="admin-only" style="color:var(--primary); font-size:12px; font-weight:600; margin-right:10px; background:none; border:none; cursor:pointer;">Edit</button>
          <button onclick="deleteEntity('employee', '${emp.id}')" class="admin-only" style="color:var(--rose); font-size:12px; font-weight:600; background:none; border:none; cursor:pointer;">Delete</button>
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No employees found.</td></tr>`;
}

function renderDepartmentsGrid() {
  const container = document.getElementById('deptCardsContainer');
  container.innerHTML = appData.departments.map(dept => {
    const count = dept.member_count !== undefined
      ? dept.member_count
      : appData.employees.filter(e => (e.dept_id || e.deptId) === dept.id).length;

    return `
      <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <span class="mono" style="font-size:11px; font-weight:700; color:var(--primary); background:var(--primary-light); padding:3px 8px; border-radius:6px;">${dept.id}</span>
            <span class="dept-stat-pill">${count} Members</span>
          </div>
          <h3 style="font-size:16px; font-weight:700; color:var(--text-main); margin-bottom:4px;">${dept.name}</h3>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px; line-height:1.4;">${dept.description || 'Core organizational operational unit.'}</p>
          
          <div style="font-size:12px; margin-bottom:6px;">
            <span style="color:var(--text-sub);">Department Head:</span> 
            <strong style="color:var(--text-main);">${dept.manager}</strong>
          </div>
          <div style="font-size:12px;">
            <span style="color:var(--text-sub);">Allocated Budget:</span> 
            <strong class="mono" style="color:var(--emerald);">${formatINR(dept.budget)}</strong>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px; padding-top:14px; border-top:1px solid var(--border-subtle);">
          <button onclick="openEntityModal('department', '${dept.id}')" class="admin-only" style="font-size:12px; font-weight:600; color:var(--primary); background:none; border:none; cursor:pointer;">Edit</button>
          <button onclick="deleteEntity('department', '${dept.id}')" class="admin-only" style="font-size:12px; font-weight:600; color:var(--rose); background:none; border:none; cursor:pointer;">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderSalarySubGradesTable(filterGrade = null) {
  const tbody = document.getElementById('salarySubGradesTableBody');
  if (!tbody) return;

  const activeFilter = filterGrade || (document.getElementById('subGradeFilterSelect') ? document.getElementById('subGradeFilterSelect').value : 'ALL');
  let list = appData.subGrades || [];
  if (activeFilter && activeFilter !== 'ALL') {
    list = list.filter(sg => sg.grade_id === activeFilter);
  }

  // Update stat cards
  const gradeCountEl = document.getElementById('statGradeCount');
  if (gradeCountEl) gradeCountEl.innerText = `${appData.grades.length} Bands`;

  const subGradeCountEl = document.getElementById('statSubGradeCount');
  if (subGradeCountEl) subGradeCountEl.innerText = `${appData.subGrades.length} Tiers`;

  const countLabel = document.getElementById('subGradeTableCountLabel');
  if (countLabel) countLabel.innerText = `Showing ${list.length} of ${appData.subGrades.length} sub-grades`;

  if (appData.subGrades.length > 0) {
    const totalNet = appData.subGrades.reduce((sum, s) => {
      const basic = Number(s.basic_pay || s.basicPay || 0);
      const allow = Number(s.allowances || 0);
      const ded = Number(s.deductions || 0);
      return sum + (basic + allow - ded);
    }, 0);
    const avgNet = Math.round(totalNet / appData.subGrades.length);
    const avgNetEl = document.getElementById('statAvgNetPay');
    if (avgNetEl) avgNetEl.innerText = formatINR(avgNet);
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:28px; color:var(--text-muted);">No sub-grades found for the selected filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(sg => {
    const basic = Number(sg.basic_pay || sg.basicPay || 0);
    const allow = Number(sg.allowances || 0);
    const ded = Number(sg.deductions || 0);
    const gross = basic + allow;
    const net = gross - ded;
    const staffCount = sg.employee_count !== undefined 
      ? sg.employee_count 
      : appData.employees.filter(e => (e.sub_grade_id || e.subGradeId) === sg.id).length;

    return `
      <tr>
        <td><span class="subgrade-badge">${sg.id}</span></td>
        <td><span class="parent-grade-badge">${sg.grade_id}</span></td>
        <td>
          <div style="font-weight:700; color:var(--text);">${sg.name}</div>
          ${sg.description ? `<div style="font-size:11px; color:var(--text-muted); max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sg.description}</div>` : ''}
        </td>
        <td class="mono font-semibold" style="color:var(--text);">${formatINR(basic)}</td>
        <td class="mono" style="color:var(--emerald);">${formatINR(allow)}</td>
        <td class="mono" style="color:var(--rose);">${formatINR(ded)}</td>
        <td class="mono font-semibold">${formatINR(gross)}</td>
        <td class="mono font-semibold" style="color:var(--emerald);">${formatINR(net)}</td>
        <td>
          <span style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:12px; background:var(--bg-surface-secondary); color:var(--text-muted);">
            👥 ${staffCount} staff
          </span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn-customize-amount admin-only" onclick="openCustomizeSubGradeModal('${sg.id}')" title="Edit Sub-Grade">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Edit / Customize
          </button>
          <button onclick="deleteEntity('subgrade', '${sg.id}')" class="admin-only" style="color:var(--rose); font-size:12px; font-weight:600; margin-left:10px; background:none; border:none; cursor:pointer;">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterSubGradesByGrade(gradeId) {
  renderSalarySubGradesTable(gradeId);
}

function renderSalaryGradesTable() {
  const tbody = document.getElementById('salaryGradesTableBody');
  if (!tbody) return;
  tbody.innerHTML = appData.grades.map(g => {
    const basic = g.basic_pay || g.basicPay || 0;
    const allow = g.allowances || 0;
    const ded = g.deductions || 0;
    const gross = basic + allow;
    const net = gross - ded;

    return `
      <tr>
        <td class="mono font-semibold" style="color:var(--primary);">${g.id}</td>
        <td style="font-weight:700;">${g.name}</td>
        <td class="mono">${formatINR(basic)}</td>
        <td class="mono" style="color:var(--emerald);">${formatINR(allow)}</td>
        <td class="mono" style="color:var(--rose);">${formatINR(ded)}</td>
        <td class="mono font-semibold">${formatINR(gross)}</td>
        <td class="mono font-semibold" style="color:var(--primary);">${formatINR(net)}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button onclick="openEntityModal('grade', '${g.id}')" class="admin-only" style="color:var(--primary); font-size:12px; font-weight:600; margin-right:10px; background:none; border:none; cursor:pointer;">Edit</button>
          <button onclick="deleteEntity('grade', '${g.id}')" class="admin-only" style="color:var(--rose); font-size:12px; font-weight:600; background:none; border:none; cursor:pointer;">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function renderAttendanceTable() {
  const month = document.getElementById('attendanceMonthFilter').value;
  const isEmployee = currentUser && currentUser.role === 'EMPLOYEE';
  const empId = isEmployee ? currentUser.emp_id : null;
  appData.attendance = await API.getAttendance(month, empId);
  const tbody = document.getElementById('attendanceTableBody');
  const isAdmin = currentUser && currentUser.role === 'ADMIN';

  tbody.innerHTML = appData.attendance.map(att => {
    const days = att.days_present !== undefined ? att.days_present : att.daysPresent;
    const leaves = att.unpaid_leaves !== undefined ? att.unpaid_leaves : att.unpaidLeaves;
    const empName = att.emp_name || getEmployeeName(att.emp_id || att.empId);
    const pct = Math.round((days / 22) * 100);

    return `
      <tr>
        <td class="mono text-sub" style="font-size:12px;">${att.id}</td>
        <td>
          <div style="font-weight:700;">${empName}</div>
          <div style="font-size:11px; color:var(--text-sub);">${att.emp_id || att.empId}</div>
        </td>
        <td>${att.month}</td>
        <td class="mono font-semibold">${days} Days</td>
        <td class="mono font-semibold" style="color:${leaves > 0 ? 'var(--rose)' : 'var(--text-muted)'};">${leaves} Days</td>
        <td>
          <span class="status-badge ${pct >= 90 ? 'badge-active' : 'badge-leave'}">${pct}%</span>
        </td>
        <td class="mono" style="color:${leaves > 0 ? 'var(--rose)' : 'var(--emerald)'};">
          ${leaves > 0 ? `${leaves} days loss-of-pay` : 'Full Pay'}
        </td>
        <td style="text-align: right;">
          ${isAdmin
        ? `<button onclick="deleteEntity('attendance', '${att.id}')" style="color:var(--rose); font-size:12px; font-weight:600;">Delete</button>`
        : `<span class="badge-active" style="padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">Verified</span>`
      }
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No attendance logged for ${month}.</td></tr>`;
}

function renderPayslipsTable() {
  const tbody = document.getElementById('payslipsTableBody');
  tbody.innerHTML = appData.payslips.map(s => {
    const empName = s.emp_name || getEmployeeName(s.emp_id || s.empId);
    const basic = s.basic_pay !== undefined ? s.basic_pay : s.basicPay;
    const net = s.net_salary !== undefined ? s.net_salary : s.netSalary;

    return `
      <tr>
        <td class="mono" style="font-size:12px; color:var(--text-sub);">${s.id}</td>
        <td>
          <div style="font-weight:700;">${empName}</div>
          <div style="font-size:11px; color:var(--text-sub);">${s.emp_id || s.empId}</div>
        </td>
        <td>${s.month}</td>
        <td class="mono">${formatINR(basic)}</td>
        <td class="mono" style="color:var(--emerald);">${formatINR(s.allowances)}</td>
        <td class="mono" style="color:var(--rose);">${formatINR(s.deductions)}</td>
        <td class="mono font-semibold" style="color:var(--primary);">${formatINR(net)}</td>
        <td style="text-align: right;">
          <button class="btn-secondary" style="padding:4px 10px; font-size:12px;" onclick="viewCertificate('${s.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            View Certificate
          </button>
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No payslips generated yet.</td></tr>`;
}

function populateDeptFilterOptions() {
  const sel = document.getElementById('filterEmpDept');
  sel.innerHTML = `<option value="ALL">All Departments</option>` + appData.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------
function getDeptName(deptId) {
  const d = appData.departments.find(x => x.id === deptId);
  return d ? d.name : 'General';
}
function getEmployeeName(empId) {
  const e = appData.employees.find(x => x.id === empId);
  return e ? e.name : 'Unknown';
}

// -----------------------------------------------------------------------------
// CERTIFICATE VIEWER
// -----------------------------------------------------------------------------
function viewCertificate(slipId) {
  const slip = appData.payslips.find(s => s.id === slipId) || appData.payslips[0];
  if (!slip) {
    showToast('Please execute a payroll run first.');
    return;
  }
  const emp = appData.employees.find(e => e.id === (slip.emp_id || slip.empId)) || {};
  const deptName = slip.dept_name || getDeptName(emp.dept_id || emp.deptId);

  document.getElementById('cert-slip-id').innerText = slip.id;
  document.getElementById('cert-month').innerText = slip.month;
  document.getElementById('cert-emp-name').innerText = slip.emp_name || emp.name || 'Staff';
  document.getElementById('cert-emp-id').innerText = slip.emp_id || emp.id || 'EMP001';
  document.getElementById('cert-dept').innerText = deptName;
  const subGradeInfo = emp.sub_grade_id ? ` (Sub-Grade: ${emp.sub_grade_id})` : '';
  document.getElementById('cert-grade').innerText = `${emp.grade_id || emp.gradeId || 'G2'}${subGradeInfo} &bull; ${emp.designation || 'Specialist'}`;

  const basic = slip.basic_pay !== undefined ? slip.basic_pay : slip.basicPay;
  const net = slip.net_salary !== undefined ? slip.net_salary : slip.netSalary;
  const leaveCut = slip.leave_cut || 0;

  document.getElementById('cert-basic').innerText = formatINR(basic);
  document.getElementById('cert-allow').innerText = formatINR(slip.allowances);
  document.getElementById('cert-deduct').innerText = '- ' + formatINR(slip.deductions - leaveCut);
  document.getElementById('cert-leave-cut').innerText = '- ' + formatINR(leaveCut);
  document.getElementById('cert-net').innerText = formatINR(net);

  openModal('payslipModal');
}

function openPayslipGeneratorModal() {
  if (!requireAuth('generate or download payslips', () => openPayslipGeneratorModal())) return;
  if (currentUser && currentUser.role === 'EMPLOYEE' && currentUser.emp_id) {
    const mySlip = appData.payslips.find(s => (s.emp_id || s.empId) === currentUser.emp_id);
    if (mySlip) {
      viewCertificate(mySlip.id);
      return;
    }
  }
  if (appData.payslips.length > 0) {
    viewCertificate(appData.payslips[0].id);
  } else {
    executePayrollRun();
  }
}

// -----------------------------------------------------------------------------
// PAYROLL RUN
// -----------------------------------------------------------------------------
async function executePayrollRun() {
  if (!requireAuth('execute payroll calculations')) return;
  if (currentUser && currentUser.role !== 'ADMIN') {
    showToast('Access restricted: Only Admin can execute company payroll runs.');
    return;
  }
  const month = document.getElementById('runCycleMonth') ? document.getElementById('runCycleMonth').value : 'June 2025';
  showToast(`Running payroll calculations for ${month}...`);
  const res = await API.runPayroll(month);
  await loadAndRenderAll();
  switchNav('payslips');
  showToast(res.message || 'Payroll calculations complete!');
}

function openPayrollModal() {
  if (!requireAuth('run payroll calculations', () => openPayrollModal())) return;
  switchNav('payroll-run');
}

// -----------------------------------------------------------------------------
// MODAL ENTITY FORMS (ADD / EDIT)
// -----------------------------------------------------------------------------
let activeEntity = null;
let activeEditId = null;

function openEntityModal(entityType, editId = null) {
  if (!requireAuth(`manage ${entityType} records`, () => openEntityModal(entityType, editId))) return;
  if (currentUser && currentUser.role !== 'ADMIN') {
    showToast(`Access restricted: Only Admin can modify ${entityType} records.`);
    return;
  }
  activeEntity = entityType;
  activeEditId = editId;

  const titleEl = document.getElementById('entityModalTitle');
  const btnEl = document.getElementById('entitySubmitBtn');
  const fieldsContainer = document.getElementById('entityModalFields');

  if (entityType === 'employee') {
    titleEl.innerText = editId ? 'Edit Employee' : 'Add New Employee';
    btnEl.innerText = editId ? 'Save Changes' : 'Create Employee';
    const rec = editId ? appData.employees.find(e => e.id === editId) : null;

    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" class="form-control" data-key="name" value="${rec ? rec.name : ''}" placeholder="e.g. John Doe" required>
      </div>
      <div class="form-group">
        <label class="form-label">Work Email</label>
        <input type="email" class="form-control" data-key="email" value="${rec ? rec.email : ''}" placeholder="john@company.com" required>
      </div>
      <div class="form-group">
        <label class="form-label">Designation</label>
        <input type="text" class="form-control" data-key="designation" value="${rec ? rec.designation : ''}" placeholder="e.g. Senior Software Engineer" required>
      </div>
      <div class="form-group">
        <label class="form-label">Department</label>
        <select class="form-control" data-key="dept_id">
          ${appData.departments.map(d => `<option value="${d.id}" ${rec && (rec.dept_id || rec.deptId) === d.id ? 'selected' : ''}>${d.id} - ${d.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Salary Grade</label>
        <select class="form-control" id="modalGradeSelect" data-key="grade_id" onchange="updateEmployeeModalSubGrades(this.value)">
          ${appData.grades.map(g => `<option value="${g.id}" ${rec && (rec.grade_id || rec.gradeId) === g.id ? 'selected' : ''}>${g.id} - ${g.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Sub-Grade Pay Tier (Customized Amount)</label>
        <select class="form-control" id="modalSubGradeSelect" data-key="sub_grade_id" onchange="updateEmployeeModalSalaryPreview(this.value)">
          <!-- Populated dynamically based on chosen grade -->
        </select>
        <div id="modalSubGradePreview" class="subgrade-preview-card"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" data-key="status">
          <option value="Active" ${rec && rec.status === 'Active' ? 'selected' : ''}>Active</option>
          <option value="On Leave" ${rec && rec.status === 'On Leave' ? 'selected' : ''}>On Leave</option>
        </select>
      </div>

      <div style="margin: 18px 0 10px 0; padding-top: 12px; border-top: 1px dashed var(--border-subtle);">
        <span style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary);">
          🔑 Portal Login Credentials
        </span>
      </div>
      <div class="form-group">
        <label class="form-label">Login Username (Portal)</label>
        <input type="text" class="form-control" data-key="username" value="${rec ? (rec.username || (rec.email ? rec.email.split('@')[0].toLowerCase() : '')) : ''}" placeholder="Defaults to email prefix">
      </div>
      <div class="form-group">
        <label class="form-label">Access Role</label>
        <select class="form-control" data-key="role" onchange="const p = document.getElementById('modalUserPassword'); if(p && !${Boolean(editId)}) p.value = this.value === 'ADMIN' ? 'admin123' : 'user123';">
          <option value="EMPLOYEE" ${(!rec || rec.role !== 'ADMIN') ? 'selected' : ''}>Employee (Personal Self-Service Portal Only)</option>
          <option value="ADMIN" ${rec && rec.role === 'ADMIN' ? 'selected' : ''}>Administrator (Full Company-wide Access)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${rec ? 'Reset Password (optional)' : 'Initial Password'}</label>
        <input type="text" class="form-control" id="modalUserPassword" data-key="password" value="" placeholder="${rec ? 'Leave blank to keep existing password' : 'Default: user123'}" ${rec ? '' : 'required'}>
        <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 4px;">${rec ? 'Leave blank to preserve current credentials.' : 'Default is <code>user123</code> for Employees, <code>admin123</code> for Admins.'}</span>
      </div>
    `;
  } else if (entityType === 'department') {
    titleEl.innerText = editId ? 'Edit Department' : 'Add Department';
    btnEl.innerText = editId ? 'Save Changes' : 'Create Department';
    const rec = editId ? appData.departments.find(d => d.id === editId) : null;
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label">Department Name</label>
        <input type="text" class="form-control" data-key="name" value="${rec ? rec.name : ''}" placeholder="e.g. Research & Development" required>
      </div>
      <div class="form-group">
        <label class="form-label">Manager</label>
        <input type="text" class="form-control" data-key="manager" value="${rec ? rec.manager : ''}" placeholder="e.g. Dr. Ramesh K" required>
      </div>
      <div class="form-group">
        <label class="form-label">Annual Allocated Budget (₹)</label>
        <input type="number" class="form-control" data-key="budget" placeholder="600000" value="${rec ? (rec.budget || 0) : 600000}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-control" data-key="description" value="${rec ? (rec.description || '') : ''}" placeholder="Department purpose">
      </div>
    `;
  } else if (entityType === 'grade') {
    titleEl.innerText = editId ? 'Edit Salary Grade' : 'Add Salary Grade';
    btnEl.innerText = editId ? 'Save Changes' : 'Create Salary Grade';
    const rec = editId ? appData.grades.find(g => g.id === editId) : null;
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label">Grade Name</label>
        <input type="text" class="form-control" data-key="name" value="${rec ? rec.name : ''}" placeholder="e.g. Senior Staff Band 2" required>
      </div>
      <div class="form-group">
        <label class="form-label">Basic Pay (₹)</label>
        <input type="number" class="form-control" data-key="basic_pay" value="${rec ? (rec.basic_pay || rec.basicPay || 0) : 50000}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Allowances (₹)</label>
        <input type="number" class="form-control" data-key="allowances" value="${rec ? (rec.allowances || 0) : 15000}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Deductions (₹)</label>
        <input type="number" class="form-control" data-key="deductions" value="${rec ? (rec.deductions || 0) : 5000}" required>
      </div>
    `;
  } else if (entityType === 'attendance') {
    titleEl.innerText = 'Log Attendance';
    btnEl.innerText = 'Save Attendance';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label">Employee</label>
        <select class="form-control" data-key="emp_id">
          ${appData.employees.map(e => `<option value="${e.id}">${e.id} - ${e.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Month</label>
        <select class="form-control" data-key="month">
          <option value="June 2025" selected>June 2025</option>
          <option value="July 2025">July 2025</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Days Present (Max 22)</label>
        <input type="number" class="form-control" data-key="days_present" value="22" max="31" min="0" required>
      </div>
      <div class="form-group">
        <label class="form-label">Unpaid Leaves (Loss of Pay)</label>
        <input type="number" class="form-control" data-key="unpaid_leaves" value="0" min="0" required>
      </div>
    `;
  }

  openModal('entityModal');

  // If employee modal opened, populate sub-grade dropdown
  if (entityType === 'employee') {
    const rec = editId ? appData.employees.find(e => e.id === editId) : null;
    const initialGrade = rec ? (rec.grade_id || rec.gradeId) : (appData.grades[0] ? appData.grades[0].id : 'G1');
    const initialSub = rec ? (rec.sub_grade_id || rec.subGradeId) : null;
    updateEmployeeModalSubGrades(initialGrade, initialSub);
  }
}

function updateEmployeeModalSubGrades(gradeId, selectedSubId = null) {
  const select = document.getElementById('modalSubGradeSelect');
  if (!select) return;

  const relevant = (appData.subGrades || []).filter(sg => sg.grade_id === gradeId);
  let optionsHtml = `<option value="">Standard Base Grade (No Sub-Grade)</option>`;
  if (relevant.length > 0) {
    optionsHtml += relevant.map(sg => {
      const basic = Number(sg.basic_pay || sg.basicPay || 0);
      const allow = Number(sg.allowances || 0);
      const ded = Number(sg.deductions || 0);
      const net = basic + allow - ded;
      const isSel = selectedSubId ? sg.id === selectedSubId : false;
      return `<option value="${sg.id}" ${isSel ? 'selected' : ''}>${sg.id} - ${sg.name} (${formatINR(net)}/mo net)</option>`;
    }).join('');
  }
  select.innerHTML = optionsHtml;

  const targetSubId = selectedSubId || null;
  updateEmployeeModalSalaryPreview(targetSubId);
}

function updateEmployeeModalSalaryPreview(subGradeId) {
  const previewEl = document.getElementById('modalSubGradePreview');
  if (!previewEl) return;

  const sg = (appData.subGrades || []).find(s => s.id === subGradeId);
  if (!sg) {
    const gradeSelect = document.getElementById('modalGradeSelect');
    const g = gradeSelect ? (appData.grades || []).find(gr => gr.id === gradeSelect.value) : null;
    if (g) {
      const basic = Number(g.basic_pay || g.basicPay || 0);
      const allow = Number(g.allowances || 0);
      const ded = Number(g.deductions || 0);
      previewEl.innerHTML = `💵 <strong>Standard Pay:</strong> Basic ${formatINR(basic)} | Allowances ${formatINR(allow)} | Deductions ${formatINR(ded)} | <span style="color:var(--emerald); font-weight:700;">Net ${formatINR(basic + allow - ded)}</span>`;
    } else {
      previewEl.innerHTML = `No custom tier selected.`;
    }
    return;
  }

  const basic = Number(sg.basic_pay || sg.basicPay || 0);
  const allow = Number(sg.allowances || 0);
  const ded = Number(sg.deductions || 0);
  const gross = basic + allow;
  const net = gross - ded;

  previewEl.innerHTML = `
    <div style="font-weight:700; color:var(--primary); margin-bottom:2px;">✨ Customized Tier: ${sg.name}</div>
    <div>Basic: <strong>${formatINR(basic)}</strong> &bull; Allowances: <strong style="color:var(--emerald);">${formatINR(allow)}</strong> &bull; Deductions: <strong style="color:var(--rose);">${formatINR(ded)}</strong> &bull; Take-Home Net: <strong style="color:var(--emerald);">${formatINR(net)}</strong></div>
  `;
}

async function handleEntitySubmit(event) {
  if (event) event.preventDefault();
  const inputs = document.querySelectorAll('#entityModalFields [data-key]');
  const data = {};

  for (const el of inputs) {
    let val = el.value.trim();
    if (el.type === 'number') val = Number(val) || 0;
    if (!val && val !== 0 && el.hasAttribute('required')) {
      el.focus();
      showToast(`Please enter ${el.dataset.key}`);
      return;
    }
    data[el.dataset.key] = val;
  }

  const submitBtn = document.getElementById('entitySubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Saving...';
  }

  try {
    if (activeEntity === 'employee') {
      if (activeEditId) {
        if (!data.password) delete data.password;
        await API.updateEmployee(activeEditId, data);
        showToast(`Updated employee ${activeEditId}`);
      } else {
        await API.createEmployee(data);
        showToast(`Added new employee`);
      }
    } else if (activeEntity === 'department') {
      if (activeEditId) {
        await API.updateDepartment(activeEditId, data);
        showToast(`Updated department ${activeEditId}`);
      } else {
        await API.createDepartment(data);
        showToast(`Added new department`);
      }
    } else if (activeEntity === 'grade') {
      if (activeEditId) {
        await API.updateGrade(activeEditId, data);
        showToast(`Updated salary grade ${activeEditId}`);
      } else {
        await API.createGrade(data);
        showToast(`Added new salary grade`);
      }
    } else if (activeEntity === 'attendance') {
      await API.createAttendance(data);
      showToast(`Attendance recorded`);
    }

    closeModal('entityModal');
    await loadAndRenderAll();
  } catch (err) {
    console.error('Error in handleEntitySubmit:', err);
    showToast(`Error: ${err.message || 'Operation failed'}`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = activeEditId ? 'Save Changes' : 'Save Record';
    }
  }
}

async function deleteEntity(entityType, id) {
  if (currentUser && currentUser.role !== 'ADMIN') {
    showToast(`Access restricted: Only Admin can delete ${entityType} records.`);
    return;
  }
  if (!confirm(`Are you sure you want to delete this ${entityType} (${id})?`)) return;

  if (entityType === 'employee') await API.deleteEmployee(id);
  else if (entityType === 'department') await API.deleteDepartment(id);
  else if (entityType === 'grade') await API.deleteGrade(id);
  else if (entityType === 'subgrade') await API.deleteSubGrade(id);
  else if (entityType === 'attendance') await API.deleteAttendance(id);

  showToast(`Deleted ${id}`);
  await loadAndRenderAll();
}

async function confirmReset() {
  if (!requireAuth('reset the DBMS database')) return;
  if (currentUser && currentUser.role !== 'ADMIN') {
    showToast('Access restricted: Only Admin can reset the database.');
    return;
  }
  if (confirm('Restore the demo seed dataset for Group 4 DBMS project?')) {
    await API.resetDatabase();
    await loadAndRenderAll();
    showToast('Database reset to project seed data.');
  }
}

// -----------------------------------------------------------------------------
// SEARCH & EXPORT
// -----------------------------------------------------------------------------
function handleGlobalSearch(query) {
  if (!currentUser) {
    requireAuth('search DBMS employee and payroll records');
    return;
  }
  const q = query.toLowerCase().trim();
  if (!q) {
    renderRecentEmployeesTable();
    return;
  }
  const filtered = appData.employees.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.id.toLowerCase().includes(q) ||
    e.email.toLowerCase().includes(q) ||
    (e.dept_name || getDeptName(e.dept_id || e.deptId)).toLowerCase().includes(q)
  );

  const tbody = document.getElementById('recentEmployeesTableBody');
  tbody.innerHTML = filtered.slice(0, 5).map(emp => `
    <tr>
      <td class="mono font-semibold" style="color:var(--primary); font-size:12px;">${emp.id}</td>
      <td>
        <div class="emp-avatar-cell">
          <img src="${emp.avatar}" class="emp-avatar">
          <div style="font-weight:700;">${emp.name}</div>
        </div>
      </td>
      <td>${emp.dept_name || getDeptName(emp.dept_id || emp.deptId)}</td>
      <td class="mono font-semibold">${emp.grade_id || emp.gradeId}</td>
      <td><span class="status-badge badge-active">${emp.status}</span></td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--text-muted);">No matching records found.</td></tr>`;
}

function exportData(type) {
  let content = '';
  let filename = `payroll_report_${Date.now()}`;
  let mimeType = 'text/plain';

  if (type === 'json') {
    content = JSON.stringify(appData, null, 2);
    filename += '.json';
    mimeType = 'application/json';
  } else if (type === 'csv') {
    const headers = ['Employee ID', 'Name', 'Department', 'Designation', 'Grade', 'Status'];
    const rows = appData.employees.map(e => [
      e.id,
      `"${e.name}"`,
      `"${e.dept_name || getDeptName(e.dept_id || e.deptId)}"`,
      `"${e.designation}"`,
      e.grade_id || e.gradeId,
      e.status
    ].join(','));
    content = [headers.join(','), ...rows].join('\n');
    filename += '.csv';
    mimeType = 'text/csv';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  closeModal('exportModal');
  showToast(`Exported ${filename} successfully!`);
}

// -----------------------------------------------------------------------------
// MODAL HELPERS & DROPDOWNS
// -----------------------------------------------------------------------------
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function openExportModal() {
  if (!requireAuth('export company reports', () => openExportModal())) return;
  if (currentUser && currentUser.role !== 'ADMIN') {
    showToast('Access restricted: Only Admin can export company reports.');
    return;
  }
  openModal('exportModal');
}

function toggleDropdown(id) {
  const el = document.getElementById(id);
  const isVisible = el.classList.contains('show');
  closeAllDropdowns();
  if (!isVisible) el.classList.add('show');
}
function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-profile-pill') && !e.target.closest('.notification-btn') && !e.target.closest('.dropdown-menu')) {
    closeAllDropdowns();
  }
});

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--emerald);"><polyline points="20 6 9 17 4 12"/></svg>
    <span>${msg}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// -----------------------------------------------------------------------------
// SUB-GRADE SALARY AMOUNT CUSTOMIZER CONTROLLER
// -----------------------------------------------------------------------------
function openCustomizeSubGradeModal(subGradeId = null) {
  if (!requireAuth('customize salary sub-grade amounts', () => openCustomizeSubGradeModal(subGradeId))) return;
  if (currentUser && currentUser.role !== 'ADMIN') {
    showToast('Access restricted: Only Admin can customize sub-grade pay structures.');
    return;
  }

  const titleEl = document.getElementById('subGradeModalTitle');
  const subtitleEl = document.getElementById('subGradeModalSubtitle');
  const submitBtnText = document.getElementById('subGradeSubmitBtnText');
  const parentSelect = document.getElementById('sgParentGrade');
  const codeInput = document.getElementById('sgCodeId');
  const nameInput = document.getElementById('sgName');
  const basicInput = document.getElementById('sgBasicPay');
  const allowInput = document.getElementById('sgAllowances');
  const dedInput = document.getElementById('sgDeductions');
  const descInput = document.getElementById('sgDescription');
  const editModeInput = document.getElementById('sgEditMode');
  const originalIdInput = document.getElementById('sgOriginalId');

  // Populate parent grade dropdown
  parentSelect.innerHTML = appData.grades.map(g => `<option value="${g.id}">${g.id} - ${g.name}</option>`).join('');

  if (subGradeId) {
    // Edit / Customize Mode
    const sg = (appData.subGrades || []).find(s => s.id === subGradeId);
    if (!sg) {
      showToast(`Sub-grade ${subGradeId} not found.`);
      return;
    }

    editModeInput.value = 'edit';
    originalIdInput.value = sg.id;
    titleEl.innerText = `Customize Amount: ${sg.id}`;
    subtitleEl.innerText = `Adjust basic pay, allowances and deductions. This updates payslip formulas and logs to DBMS audit log.`;
    submitBtnText.innerText = 'Save Customized Amounts';

    parentSelect.value = sg.grade_id;
    parentSelect.disabled = true; // Cannot re-parent during edit
    codeInput.value = sg.id;
    codeInput.disabled = true;
    nameInput.value = sg.name;
    basicInput.value = sg.basic_pay || sg.basicPay || 0;
    allowInput.value = sg.allowances || 0;
    dedInput.value = sg.deductions || 0;
    descInput.value = sg.description || '';
  } else {
    // Add / Create Mode
    editModeInput.value = 'create';
    originalIdInput.value = '';
    titleEl.innerText = 'Add New Salary Sub-Grade';
    subtitleEl.innerText = 'Create a granular compensation tier with custom basic pay, allowances, and deductions.';
    submitBtnText.innerText = 'Create Sub-Grade Tier';

    const defaultGrade = appData.grades[0] ? appData.grades[0].id : 'G1';
    parentSelect.value = defaultGrade;
    parentSelect.disabled = false;
    codeInput.disabled = false;

    // Suggest code
    const existing = (appData.subGrades || []).filter(s => s.grade_id === defaultGrade);
    const nextLetter = String.fromCharCode(65 + existing.length);
    codeInput.value = `SG${defaultGrade.replace('G', '')}-${nextLetter}`;

    const parentG = appData.grades.find(g => g.id === defaultGrade);
    nameInput.value = `${parentG ? parentG.name : 'Executive'} - Tier ${nextLetter}`;
    basicInput.value = parentG ? (parentG.basic_pay || parentG.basicPay || 35000) : 35000;
    allowInput.value = parentG ? (parentG.allowances || 5000) : 5000;
    dedInput.value = parentG ? (parentG.deductions || 2500) : 2500;
    descInput.value = '';
  }

  handleSubGradeParentGradeChange();
  recalcSubGradeModalPreview();
  openModal('subGradeModal');
}

function handleSubGradeParentGradeChange() {
  const parentSelect = document.getElementById('sgParentGrade');
  const codeInput = document.getElementById('sgCodeId');
  const nameInput = document.getElementById('sgName');
  const basicInput = document.getElementById('sgBasicPay');
  const hintEl = document.getElementById('sgBaseBasicHint');
  const editMode = document.getElementById('sgEditMode').value;

  const gradeId = parentSelect.value;
  const parentG = appData.grades.find(g => g.id === gradeId);

  if (parentG && hintEl) {
    const parentBasic = parentG.basic_pay || parentG.basicPay || 0;
    hintEl.innerText = `Base grade basic: ${formatINR(parentBasic)}`;
  }

  if (editMode === 'create') {
    const existing = (appData.subGrades || []).filter(s => s.grade_id === gradeId);
    const nextLetter = String.fromCharCode(65 + existing.length);
    codeInput.value = `SG${gradeId.replace('G', '')}-${nextLetter}`;
    if (!nameInput.value || nameInput.value.includes('Tier')) {
      nameInput.value = `${parentG ? parentG.name : 'Grade'} - Tier ${nextLetter}`;
    }
    if (parentG && (!basicInput.value || Number(basicInput.value) === 0)) {
      basicInput.value = parentG.basic_pay || parentG.basicPay || 35000;
    }
  }

  recalcSubGradeModalPreview();
}

function recalcSubGradeModalPreview() {
  const basic = Number(document.getElementById('sgBasicPay').value) || 0;
  const allow = Number(document.getElementById('sgAllowances').value) || 0;
  const ded = Number(document.getElementById('sgDeductions').value) || 0;

  const gross = basic + allow;
  const net = gross - ded;

  const grossEl = document.getElementById('sgPreviewGross');
  const netEl = document.getElementById('sgPreviewNet');

  if (grossEl) grossEl.innerText = formatINR(gross);
  if (netEl) netEl.innerText = formatINR(net);
}

async function handleSubGradeSubmit(event) {
  event.preventDefault();
  if (currentUser && currentUser.role !== 'ADMIN') {
    showToast('Only Admin can customize sub-grade salary tiers.');
    return;
  }

  const editMode = document.getElementById('sgEditMode').value;
  const origId = document.getElementById('sgOriginalId').value;
  const gradeId = document.getElementById('sgParentGrade').value;
  const codeId = document.getElementById('sgCodeId').value.trim().toUpperCase();
  const name = document.getElementById('sgName').value.trim();
  const basicPay = Number(document.getElementById('sgBasicPay').value) || 0;
  const allowances = Number(document.getElementById('sgAllowances').value) || 0;
  const deductions = Number(document.getElementById('sgDeductions').value) || 0;
  const description = document.getElementById('sgDescription').value.trim();

  if (!codeId || !name || basicPay <= 0) {
    showToast('Please enter a valid Sub-Grade code, title, and positive basic pay.');
    return;
  }

  const submitBtn = document.getElementById('subGradeSubmitBtn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    if (editMode === 'edit') {
      await API.updateSubGrade(origId, {
        name,
        basic_pay: basicPay,
        allowances,
        deductions,
        description,
        changed_by: currentUser ? currentUser.username : 'ADMIN'
      });
      showToast(`Customized amounts saved for ${origId}! Logged to DBMS audit log.`);
    } else {
      await API.createSubGrade({
        id: codeId,
        grade_id: gradeId,
        name,
        basic_pay: basicPay,
        allowances,
        deductions,
        description
      });
      showToast(`Created sub-grade tier ${codeId} with customized amounts!`);
    }

    closeModal('subGradeModal');
    await loadAndRenderAll();
  } catch (err) {
    console.error('Error submitting sub-grade:', err);
    showToast(`Error: ${err.message || 'Failed to save sub-grade'}`);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

