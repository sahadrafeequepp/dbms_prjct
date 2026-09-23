-- ============================================================================
-- PAYROLL DATABASE MANAGEMENT SYSTEM - ADVANCED DDL SCHEMA
-- College of Engineering Vadakara (CEV)
-- Group 4: Sahad Rafeeque P P, Varna V, Gopika M M
--
-- Features implemented:
-- 1. Relational Tables with Full Constraints (PK, FK, NOT NULL, UNIQUE, CHECK)
-- 2. Audit Table for Salary Revision Tracking
-- 3. B-Tree Indexes on High-Frequency Query Columns
-- 4. Database Triggers (Net Pay Auto-Calculation, Salary Audit Logging)
-- 5. Analytical Database Views (Monthly Payroll Summary, Dept Salary Costs)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. DEPARTMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    manager VARCHAR(100) NOT NULL,
    budget REAL NOT NULL DEFAULT 500000.0 CHECK (budget > 0),
    description TEXT
);

-- ----------------------------------------------------------------------------
-- 2. SALARY GRADES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_grades (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    basic_pay REAL NOT NULL CHECK (basic_pay > 0),
    allowances REAL NOT NULL DEFAULT 0.0 CHECK (allowances >= 0),
    deductions REAL NOT NULL DEFAULT 0.0 CHECK (deductions >= 0)
);

-- ----------------------------------------------------------------------------
-- 3. EMPLOYEES MASTER TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    designation VARCHAR(100) NOT NULL,
    dept_id VARCHAR(10) NOT NULL,
    grade_id VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Resigned', 'Suspended')),
    avatar TEXT,
    FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (grade_id) REFERENCES salary_grades(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ----------------------------------------------------------------------------
-- 4. USERS & ROLES AUTHENTICATION TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'EMPLOYEE')),
    emp_id VARCHAR(10),
    FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- ----------------------------------------------------------------------------
-- 5. ATTENDANCE LOG TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(20) PRIMARY KEY,
    emp_id VARCHAR(10) NOT NULL,
    month VARCHAR(30) NOT NULL,
    days_present INTEGER NOT NULL CHECK (days_present >= 0 AND days_present <= 31),
    unpaid_leaves INTEGER NOT NULL DEFAULT 0 CHECK (unpaid_leaves >= 0 AND unpaid_leaves <= 31),
    UNIQUE (emp_id, month),
    FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ----------------------------------------------------------------------------
-- 6. PAYSLIPS (PAYROLL RECORDS) TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payslips (
    id VARCHAR(50) PRIMARY KEY,
    emp_id VARCHAR(10) NOT NULL,
    month VARCHAR(30) NOT NULL,
    basic_pay REAL NOT NULL CHECK (basic_pay > 0),
    allowances REAL NOT NULL DEFAULT 0.0 CHECK (allowances >= 0),
    leave_cut REAL NOT NULL DEFAULT 0.0 CHECK (leave_cut >= 0),
    deductions REAL NOT NULL DEFAULT 0.0 CHECK (deductions >= 0),
    gross_pay REAL NOT NULL CHECK (gross_pay >= 0),
    net_salary REAL NOT NULL DEFAULT 0.0,
    generated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (emp_id, month),
    FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ----------------------------------------------------------------------------
-- 7. SALARY AUDIT LOG TABLE (TRIGGER DESTINATION)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_audit_log (
    audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    grade_id VARCHAR(10) NOT NULL,
    grade_name VARCHAR(100) NOT NULL,
    old_basic_pay REAL NOT NULL,
    new_basic_pay REAL NOT NULL,
    old_allowances REAL NOT NULL,
    new_allowances REAL NOT NULL,
    old_deductions REAL NOT NULL,
    new_deductions REAL NOT NULL,
    changed_by VARCHAR(50) DEFAULT 'ADMIN',
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    action_type VARCHAR(20) DEFAULT 'UPDATE'
);

-- ============================================================================
-- 8. INDEXES FOR QUERY OPTIMIZATION
-- ============================================================================
-- Index foreign keys and search filter predicates for O(log N) lookup
CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(dept_id);
CREATE INDEX IF NOT EXISTS idx_emp_grade ON employees(grade_id);
CREATE INDEX IF NOT EXISTS idx_emp_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_user_auth ON users(username, password);
CREATE INDEX IF NOT EXISTS idx_att_month ON attendance(month);
CREATE INDEX IF NOT EXISTS idx_att_emp_month ON attendance(emp_id, month);
CREATE INDEX IF NOT EXISTS idx_payslip_emp_id ON payslips(emp_id);
CREATE INDEX IF NOT EXISTS idx_payslip_month ON payslips(month);
CREATE INDEX IF NOT EXISTS idx_payslip_emp_month ON payslips(emp_id, month);
CREATE INDEX IF NOT EXISTS idx_audit_grade ON salary_audit_log(grade_id);

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- TRIGGER 1A: Auto-calculate net_pay = gross - deductions on INSERT
CREATE TRIGGER IF NOT EXISTS trg_payslips_insert_net_pay
AFTER INSERT ON payslips
FOR EACH ROW
BEGIN
    UPDATE payslips
    SET net_salary = NEW.gross_pay - NEW.deductions
    WHERE id = NEW.id;
END;

-- TRIGGER 1B: Auto-calculate net_pay = gross - deductions on UPDATE of components
CREATE TRIGGER IF NOT EXISTS trg_payslips_update_net_pay
AFTER UPDATE OF gross_pay, deductions ON payslips
FOR EACH ROW
BEGIN
    UPDATE payslips
    SET net_salary = NEW.gross_pay - NEW.deductions
    WHERE id = NEW.id;
END;

-- TRIGGER 2: Log every salary change into salary_audit_log table
CREATE TRIGGER IF NOT EXISTS trg_salary_grades_update_audit
AFTER UPDATE OF basic_pay, allowances, deductions ON salary_grades
FOR EACH ROW
WHEN (OLD.basic_pay != NEW.basic_pay OR OLD.allowances != NEW.allowances OR OLD.deductions != NEW.deductions)
BEGIN
    INSERT INTO salary_audit_log (
        grade_id,
        grade_name,
        old_basic_pay,
        new_basic_pay,
        old_allowances,
        new_allowances,
        old_deductions,
        new_deductions,
        changed_by,
        changed_at,
        action_type
    ) VALUES (
        OLD.id,
        OLD.name,
        OLD.basic_pay,
        NEW.basic_pay,
        OLD.allowances,
        NEW.allowances,
        OLD.deductions,
        NEW.deductions,
        'SYSTEM_ADMIN',
        CURRENT_TIMESTAMP,
        'UPDATE'
    );
END;

-- ============================================================================
-- 10. DATABASE VIEWS
-- ============================================================================

-- VIEW 1: Monthly payroll summary (employee, department, gross, deductions, net pay)
CREATE VIEW IF NOT EXISTS v_monthly_payroll_summary AS
SELECT 
    p.id AS payslip_id,
    p.emp_id,
    e.name AS employee_name,
    e.designation,
    d.id AS dept_id,
    d.name AS department_name,
    p.month,
    ROUND(p.basic_pay, 2) AS basic_pay,
    ROUND(p.allowances, 2) AS allowances,
    ROUND(p.leave_cut, 2) AS leave_cut,
    ROUND(p.deductions, 2) AS deductions,
    ROUND(p.gross_pay, 2) AS gross_pay,
    ROUND(p.net_salary, 2) AS net_pay,
    p.generated_date
FROM payslips p
JOIN employees e ON p.emp_id = e.id
JOIN departments d ON e.dept_id = d.id;

-- VIEW 2: Department-wise salary cost
CREATE VIEW IF NOT EXISTS v_department_salary_cost AS
SELECT 
    d.id AS dept_id,
    d.name AS department_name,
    ROUND(d.budget, 2) AS allocated_budget,
    p.month,
    COUNT(DISTINCT p.emp_id) AS total_employees,
    ROUND(SUM(p.basic_pay), 2) AS total_basic_pay,
    ROUND(SUM(p.allowances), 2) AS total_allowances,
    ROUND(SUM(p.deductions), 2) AS total_deductions,
    ROUND(SUM(p.gross_pay), 2) AS total_gross_cost,
    ROUND(SUM(p.net_salary), 2) AS total_net_payout,
    ROUND(AVG(p.net_salary), 2) AS avg_net_payout,
    ROUND(d.budget - SUM(p.gross_pay), 2) AS remaining_budget
FROM departments d
JOIN employees e ON d.id = e.dept_id
JOIN payslips p ON e.id = p.emp_id
GROUP BY d.id, d.name, d.budget, p.month;
