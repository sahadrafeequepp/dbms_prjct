/**
 * Payroll Management System - API Client
 * Automatically connects to FastAPI backend if available,
 * otherwise seamlessly falls back to LocalStorage (Offline Mode).
 */

const API_BASE = window.location.origin.startsWith('http') ? '' : 'http://127.0.0.1:8000';

const API = {
  isBackendConnected: false,

  async init() {
    try {
      const res = await fetch(`${API_BASE}/api/stats`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        this.isBackendConnected = true;
        console.log('✅ Connected to FastAPI SQLite Backend');
        return true;
      }
    } catch (e) {
      this.isBackendConnected = false;
      console.log('⚡ Running in Standalone / Offline Client Mode (LocalStorage SQLite simulation)');
      return false;
    }
    return false;
  },

  async login(username, password) {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Login failed');
      }
      return await res.json();
    }
    return LocalDB.login(username, password);
  },

  async getStats(empId = null) {
    if (this.isBackendConnected) {
      const url = empId ? `${API_BASE}/api/stats?emp_id=${empId}` : `${API_BASE}/api/stats`;
      const res = await fetch(url);
      return await res.json();
    }
    // Fallback to local DB
    return LocalDB.getStats(empId);
  },

  async getEmployees(deptId = 'ALL', empId = null) {
    if (this.isBackendConnected) {
      let url = `${API_BASE}/api/employees?`;
      if (deptId && deptId !== 'ALL') url += `dept_id=${deptId}&`;
      if (empId) url += `emp_id=${empId}`;
      const res = await fetch(url);
      return await res.json();
    }
    return LocalDB.getEmployees(deptId, empId);
  },

  async createEmployee(data) {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    }
    return LocalDB.createEmployee(data);
  },

  async updateEmployee(id, data) {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    }
    return LocalDB.updateEmployee(id, data);
  },

  async deleteEmployee(id) {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/employees/${id}`, { method: 'DELETE' });
      return await res.json();
    }
    return LocalDB.deleteEmployee(id);
  },

  async getDepartments() {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/departments`);
      return await res.json();
    }
    return LocalDB.getDepartments();
  },

  async createDepartment(data) {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    }
    return LocalDB.createDepartment(data);
  },

  async deleteDepartment(id) {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/departments/${id}`, { method: 'DELETE' });
      return await res.json();
    }
    return LocalDB.deleteDepartment(id);
  },

  async getGrades() {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/grades`);
      return await res.json();
    }
    return LocalDB.getGrades();
  },

  async createGrade(data) {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    }
    return LocalDB.createGrade(data);
  },

  async deleteGrade(id) {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/grades/${id}`, { method: 'DELETE' });
      return await res.json();
    }
    return LocalDB.deleteGrade(id);
  },

  async getAttendance(month = 'June 2025', empId = null) {
    if (this.isBackendConnected) {
      let url = `${API_BASE}/api/attendance?month=${encodeURIComponent(month)}`;
      if (empId) url += `&emp_id=${empId}`;
      const res = await fetch(url);
      return await res.json();
    }
    return LocalDB.getAttendance(month, empId);
  },

  async createAttendance(data) {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    }
    return LocalDB.createAttendance(data);
  },

  async deleteAttendance(id) {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/attendance/${id}`, { method: 'DELETE' });
      return await res.json();
    }
    return LocalDB.deleteAttendance(id);
  },

  async getPayslips(empId = null) {
    if (this.isBackendConnected) {
      const url = empId ? `${API_BASE}/api/payslips?emp_id=${empId}` : `${API_BASE}/api/payslips`;
      const res = await fetch(url);
      return await res.json();
    }
    return LocalDB.getPayslips(empId);
  },

  async runPayroll(month) {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/payroll/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month })
      });
      return await res.json();
    }
    return LocalDB.runPayroll(month);
  },

  async resetDatabase() {
    if (this.isBackendConnected) {
      const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      return await res.json();
    }
    return LocalDB.reset();
  }
};

/**
 * LocalStorage Fallback Storage for offline use
 */
const INITIAL_SEED_STORAGE = {
  departments: [
    { id: 'D01', name: 'IT Department', manager: 'Anjali S Nair', budget: 1450000, description: 'Software engineering, infrastructure and cloud' },
    { id: 'D02', name: 'HR Department', manager: 'Varna V', budget: 450000, description: 'Talent recruitment, culture, and employee welfare' },
    { id: 'D03', name: 'Finance & Accounts', manager: 'Gopika M M', budget: 600000, description: 'Audits, payroll execution, and statutory compliance' },
    { id: 'D04', name: 'Marketing', manager: 'Sneha P S', budget: 520000, description: 'Digital campaigns, branding and market research' },
    { id: 'D05', name: 'Operations', manager: 'Vishnu R', budget: 780000, description: 'Logistics, office administration, and procurement' }
  ],
  grades: [
    { id: 'G1', name: 'Executive Level 1', basicPay: 32000, allowances: 6000, deductions: 2500 },
    { id: 'G2', name: 'Senior Associate Level 2', basicPay: 52000, allowances: 9500, deductions: 4200 },
    { id: 'G3', name: 'Lead / Principal Level 3', basicPay: 72000, allowances: 14000, deductions: 6000 }
  ],
  employees: [
    { id: 'EMP001', name: 'Raneem Muhammed', email: 'raneem@company.com', deptId: 'D01', gradeId: 'G3', designation: 'Principal Architect', status: 'Active', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
    { id: 'EMP002', name: 'Fathima Noushad', email: 'fathima@company.com', deptId: 'D02', gradeId: 'G2', designation: 'HR Specialist', status: 'Active', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' },
    { id: 'EMP003', name: 'Arjun K', email: 'arjun@company.com', deptId: 'D03', gradeId: 'G2', designation: 'Senior Accountant', status: 'Active', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
    { id: 'EMP004', name: 'Sneha P S', email: 'sneha@company.com', deptId: 'D04', gradeId: 'G1', designation: 'Marketing Lead', status: 'Active', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
    { id: 'EMP005', name: 'Vishnu R', email: 'vishnu@company.com', deptId: 'D05', gradeId: 'G3', designation: 'Operations Manager', status: 'On Leave', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
    { id: 'EMP006', name: 'Sahad Rafeeque', email: 'sahad@company.com', deptId: 'D01', gradeId: 'G3', designation: 'Database Administrator', status: 'Active', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80' },
    { id: 'EMP007', name: 'Varna V', email: 'varna@company.com', deptId: 'D02', gradeId: 'G3', designation: 'HR Lead & Admin', status: 'Active', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80' },
    { id: 'EMP008', name: 'Gopika M M', email: 'gopika@company.com', deptId: 'D03', gradeId: 'G2', designation: 'Financial Analyst', status: 'Active', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80' }
  ],
  attendance: [
    { id: 'ATT-001', empId: 'EMP001', month: 'June 2025', daysPresent: 22, unpaidLeaves: 0 },
    { id: 'ATT-002', empId: 'EMP002', month: 'June 2025', daysPresent: 21, unpaidLeaves: 1 }
  ],
  payslips: []
};

const LocalDB = {
  load() {
    try {
      const data = localStorage.getItem('PAYROLL_LOCAL_STORE');
      if (data) return JSON.parse(data);
    } catch(e) {}
    return JSON.parse(JSON.stringify(INITIAL_SEED_STORAGE));
  },
  save(db) {
    try { localStorage.setItem('PAYROLL_LOCAL_STORE', JSON.stringify(db)); } catch(e) {}
  },
  getStats(empId = null) {
    const db = this.load();
    if (empId) {
      const emp = db.employees.find(e => e.id === empId);
      const grade = db.grades.find(g => g.id === (emp ? (emp.grade_id || emp.gradeId) : 'G1')) || db.grades[0];
      const basic = grade.basicPay || 52000;
      const allow = grade.allowances || 9500;
      const ded = grade.deductions || 4200;
      const net = basic + allow - ded;
      return {
        is_employee: true,
        emp_id: empId,
        employee_name: emp ? emp.name : 'Employee',
        designation: emp ? emp.designation : 'Specialist',
        department: emp ? (emp.dept_name || 'IT Department') : 'IT Department',
        grade: grade.name,
        basic_pay: basic,
        allowances: allow,
        total_deductions: ded,
        monthly_payroll: basic + allow,
        net_pay: net,
        attendance_rate: 100,
        days_present: 22,
        unpaid_leaves: 0,
        total_employees: 1,
        total_departments: 1,
        dept_distribution: [
          { name: 'Basic', count: 6 },
          { name: 'Allow', count: 2 },
          { name: 'Deduct', count: 1 },
          { name: 'Net', count: 7 }
        ]
      };
    }
    return {
      is_employee: false,
      total_employees: db.employees.length,
      total_departments: db.departments.length,
      monthly_payroll: 342500,
      total_deductions: 48250,
      net_pay: 294250,
      attendance_rate: 96.2,
      dept_distribution: [
        { name: 'IT', count: 8 },
        { name: 'HR', count: 4 },
        { name: 'Finance', count: 4 },
        { name: 'Marketing', count: 3 },
        { name: 'Operations', count: 5 }
      ]
    };
  },
  getEmployees(deptId = 'ALL', empId = null) {
    const db = this.load();
    return db.employees.filter(e => {
      if (empId && e.id !== empId) return false;
      return deptId === 'ALL' || e.deptId === deptId || e.dept_id === deptId;
    });
  },
  createEmployee(data) {
    const db = this.load();
    const id = 'EMP' + String(db.employees.length + 1).padStart(3, '0');
    const newEmp = { id, ...data, deptId: data.dept_id || data.deptId, gradeId: data.grade_id || data.gradeId };
    db.employees.push(newEmp);

    if (!db.users) db.users = [];
    const username = (data.username && data.username.trim()) ? data.username.trim().toLowerCase() : data.email.split('@')[0].toLowerCase();
    const password = data.password || 'emp123';
    const role = data.role || 'EMPLOYEE';
    db.users.push({
      id: 'USR' + String(db.users.length + 1).padStart(2, '0'),
      username,
      email: data.email,
      password,
      role,
      emp_id: id
    });

    this.save(db);
    return { message: 'Created', id, username, password };
  },
  updateEmployee(id, data) {
    const db = this.load();
    const idx = db.employees.findIndex(e => e.id === id);
    if (idx !== -1) {
      db.employees[idx] = { ...db.employees[idx], ...data };
      this.save(db);
    }
    return { message: 'Updated' };
  },
  deleteEmployee(id) {
    const db = this.load();
    db.employees = db.employees.filter(e => e.id !== id);
    this.save(db);
    return { message: 'Deleted' };
  },
  getDepartments() {
    const db = this.load();
    return db.departments;
  },
  createDepartment(data) {
    const db = this.load();
    const id = 'D' + String(db.departments.length + 1).padStart(2, '0');
    db.departments.push({ id, ...data });
    this.save(db);
    return { message: 'Created', id };
  },
  deleteDepartment(id) {
    const db = this.load();
    db.departments = db.departments.filter(d => d.id !== id);
    this.save(db);
    return { message: 'Deleted' };
  },
  getGrades() {
    const db = this.load();
    return db.grades;
  },
  createGrade(data) {
    const db = this.load();
    const id = 'G' + String(db.grades.length + 1);
    db.grades.push({ id, ...data });
    this.save(db);
    return { message: 'Created', id };
  },
  deleteGrade(id) {
    const db = this.load();
    db.grades = db.grades.filter(g => g.id !== id);
    this.save(db);
    return { message: 'Deleted' };
  },
  getAttendance(month, empId = null) {
    const db = this.load();
    return db.attendance.filter(a => {
      const matchMonth = a.month === month;
      const matchEmp = empId ? (a.emp_id === empId || a.empId === empId) : true;
      return matchMonth && matchEmp;
    });
  },
  createAttendance(data) {
    const db = this.load();
    const id = 'ATT-' + String(db.attendance.length + 1).padStart(3, '0');
    db.attendance.push({ id, ...data, emp_id: data.emp_id || data.empId });
    this.save(db);
    return { message: 'Created', id };
  },
  deleteAttendance(id) {
    const db = this.load();
    db.attendance = db.attendance.filter(a => a.id !== id);
    this.save(db);
    return { message: 'Deleted' };
  },
  getPayslips(empId = null) {
    const db = this.load();
    if (!db.payslips || db.payslips.length === 0) {
      this.runPayroll('June 2025');
    }
    const slips = this.load().payslips || [];
    if (empId) {
      return slips.filter(s => s.emp_id === empId || s.empId === empId);
    }
    return slips;
  },
  runPayroll(month) {
    const db = this.load();
    const generated = db.employees.map(emp => {
      const grade = db.grades.find(g => g.id === (emp.grade_id || emp.gradeId)) || db.grades[0];
      const att = db.attendance.find(a => (a.emp_id || a.empId) === emp.id && a.month === month);
      const leaves = att ? att.unpaidLeaves || att.unpaid_leaves || 0 : 0;
      const leaveCut = Math.round((grade.basicPay / 30) * leaves);
      const deductions = (grade.deductions || 2500) + leaveCut;
      const gross = (grade.basicPay || 32000) + (grade.allowances || 6000);
      const net = gross - deductions;
      return {
        id: `PS-${month.replace(/\s+/g,'').toUpperCase()}-${emp.id}`,
        emp_id: emp.id,
        empId: emp.id,
        emp_name: emp.name,
        month,
        basic_pay: grade.basicPay,
        allowances: grade.allowances,
        deductions: deductions,
        gross_pay: gross,
        net_salary: net,
        leave_cut: leaveCut
      };
    });
    db.payslips = db.payslips.filter(s => s.month !== month).concat(generated);
    this.save(db);
    return { message: 'Payroll run complete', slips_generated: generated.length };
  },
  reset() {
    localStorage.removeItem('PAYROLL_LOCAL_STORE');
    return { message: 'Reset complete' };
  },
  login(username, password) {
    const u = username.toLowerCase().trim();
    const db = this.load();

    // Check newly registered employees in LocalDB
    if (db.users && db.users.length > 0) {
      const match = db.users.find(usr => (usr.username.toLowerCase() === u || usr.email.toLowerCase() === u) && usr.password === password);
      if (match) {
        const emp = db.employees.find(e => e.id === match.emp_id) || {};
        return {
          status: 'success',
          user: {
            id: match.id,
            username: match.username,
            email: match.email,
            role: match.role,
            name: emp.name || match.username,
            designation: emp.designation || 'Staff Member',
            avatar: emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            emp_id: match.emp_id
          }
        };
      }
    }

    if ((u === 'admin' || u === 'varna@cev.ac.in') && password === 'admin123') {
      return {
        status: 'success',
        user: {
          id: 'USR01',
          username: 'admin',
          email: 'varna@cev.ac.in',
          role: 'ADMIN',
          name: 'Varna V',
          designation: 'HR Lead & Admin',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
          emp_id: 'EMP007'
        }
      };
    } else if ((u === 'user' || u === 'raneem@company.com') && password === 'user123') {
      return {
        status: 'success',
        user: {
          id: 'USR02',
          username: 'user',
          email: 'raneem@company.com',
          role: 'EMPLOYEE',
          name: 'Raneem Muhammed',
          designation: 'Principal Architect',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          emp_id: 'EMP001'
        }
      };
    } else {
      throw new Error('Invalid username/email or password. Try demo accounts below.');
    }
  }
};
