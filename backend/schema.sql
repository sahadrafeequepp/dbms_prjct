-- ============================================================================
-- PAYROLL DATABASE MANAGEMENT SYSTEM - DDL SCHEMA
-- College of Engineering Vadakara (CEV)
-- Group 4: Sahad Rafeeque P P, Varna V, Gopika M M
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    manager VARCHAR(100) NOT NULL,
    budget REAL NOT NULL DEFAULT 500000.0,
    description TEXT
);

-- 2. SALARY GRADES TABLE
CREATE TABLE IF NOT EXISTS salary_grades (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    basic_pay REAL NOT NULL,
    allowances REAL NOT NULL DEFAULT 0.0,
    deductions REAL NOT NULL DEFAULT 0.0
);

-- 3. EMPLOYEES MASTER TABLE
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    designation VARCHAR(100) NOT NULL,
    dept_id VARCHAR(10) NOT NULL,
    grade_id VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    avatar TEXT,
    FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (grade_id) REFERENCES salary_grades(id) ON DELETE RESTRICT
);

-- 4. USERS & ROLES AUTHENTICATION TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'EMPLOYEE')),
    emp_id VARCHAR(10),
    FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- 5. ATTENDANCE LOG TABLE
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(20) PRIMARY KEY,
    emp_id VARCHAR(10) NOT NULL,
    month VARCHAR(30) NOT NULL,
    days_present INTEGER NOT NULL CHECK (days_present >= 0 AND days_present <= 31),
    unpaid_leaves INTEGER NOT NULL DEFAULT 0 CHECK (unpaid_leaves >= 0),
    FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 6. PAYSLIP ARCHIVE TABLE
CREATE TABLE IF NOT EXISTS payslips (
    id VARCHAR(50) PRIMARY KEY,
    emp_id VARCHAR(10) NOT NULL,
    month VARCHAR(30) NOT NULL,
    basic_pay REAL NOT NULL,
    allowances REAL NOT NULL,
    leave_cut REAL NOT NULL DEFAULT 0.0,
    deductions REAL NOT NULL,
    gross_pay REAL NOT NULL,
    net_salary REAL NOT NULL,
    generated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(dept_id);
CREATE INDEX IF NOT EXISTS idx_emp_grade ON employees(grade_id);
CREATE INDEX IF NOT EXISTS idx_user_auth ON users(username, password);
CREATE INDEX IF NOT EXISTS idx_att_month ON attendance(month);
CREATE INDEX IF NOT EXISTS idx_payslip_month ON payslips(month);
