"""
Payroll Management System - Database Engine
College of Engineering Vadakara - Group 4
SQLite Database Operations & Schema Management
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "payroll.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

def get_connection():
    """Returns a SQLite connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initializes tables and seeds initial project data if empty."""
    conn = get_connection()
    cursor = conn.cursor()
    
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        cursor.executescript(f.read())
    conn.commit()

    # Check if empty, then seed
    cursor.execute("SELECT COUNT(*) AS cnt FROM departments;")
    if cursor.fetchone()["cnt"] == 0:
        seed_data(conn)
    else:
        # Ensure every employee has an active user account
        seed_users(cursor)
        conn.commit()
    conn.close()

def seed_users(cursor):
    """Generates portal login credentials for every employee in the organization."""
    # 1. Quick demo alias accounts
    alias_users = [
        ('USR_ADMIN', 'admin', 'varna@cev.ac.in', 'admin123', 'ADMIN', 'EMP007'),
        ('USR_USER', 'user', 'raneem@company.com', 'user123', 'EMPLOYEE', 'EMP001'),
        ('USR_SAHAD', 'sahad', 'sahad@company.com', 'user123', 'EMPLOYEE', 'EMP006'),
        ('USR_GOPIKA', 'gopika', 'gopika@company.com', 'admin123', 'ADMIN', 'EMP008')
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO users (id, username, email, password, role, emp_id)
        VALUES (?, ?, ?, ?, ?, ?);
    """, alias_users)

    # 2. Automatically generate login accounts for EVERY employee in employees table
    cursor.execute("SELECT id, name, email FROM employees;")
    employees = cursor.fetchall()
    for emp in employees:
        emp_id = emp["id"]
        email = emp["email"]
        username = email.split("@")[0].lower()
        role = "ADMIN" if emp_id in ("EMP007", "EMP008") else "EMPLOYEE"
        password = "admin123" if role == "ADMIN" else "user123"
        user_id = f"USR_{emp_id}"
        cursor.execute("""
            INSERT OR IGNORE INTO users (id, username, email, password, role, emp_id)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (user_id, username, email, password, role, emp_id))

def seed_data(conn):
    """Inserts initial project demo records for Group 4 DBMS project."""
    cursor = conn.cursor()

    departments = [
        ('D01', 'IT Department', 'Anjali S Nair', 1450000.0, 'Software engineering, infrastructure and cloud'),
        ('D02', 'HR Department', 'Varna V', 450000.0, 'Talent recruitment, culture, and employee welfare'),
        ('D03', 'Finance & Accounts', 'Gopika M M', 600000.0, 'Audits, payroll execution, and statutory compliance'),
        ('D04', 'Marketing', 'Sneha P S', 520000.0, 'Digital campaigns, branding and market research'),
        ('D05', 'Operations', 'Vishnu R', 780000.0, 'Logistics, office administration, and procurement')
    ]
    cursor.executemany("INSERT INTO departments (id, name, manager, budget, description) VALUES (?, ?, ?, ?, ?);", departments)

    grades = [
        ('G1', 'Executive Level 1', 32000.0, 6000.0, 2500.0),
        ('G2', 'Senior Associate Level 2', 52000.0, 9500.0, 4200.0),
        ('G3', 'Lead / Principal Level 3', 72000.0, 14000.0, 6000.0)
    ]
    cursor.executemany("INSERT INTO salary_grades (id, name, basic_pay, allowances, deductions) VALUES (?, ?, ?, ?, ?);", grades)

    employees = [
        ('EMP001', 'Raneem Muhammed', 'raneem@company.com', 'Principal Architect', 'D01', 'G3', 'Active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'),
        ('EMP002', 'Fathima Noushad', 'fathima@company.com', 'HR Specialist', 'D02', 'G2', 'Active', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80'),
        ('EMP003', 'Arjun K', 'arjun@company.com', 'Senior Accountant', 'D03', 'G2', 'Active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'),
        ('EMP004', 'Sneha P S', 'sneha@company.com', 'Marketing Lead', 'D04', 'G1', 'Active', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'),
        ('EMP005', 'Vishnu R', 'vishnu@company.com', 'Operations Manager', 'D05', 'G3', 'On Leave', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80'),
        ('EMP006', 'Sahad Rafeeque', 'sahad@company.com', 'Database Administrator', 'D01', 'G3', 'Active', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80'),
        ('EMP007', 'Varna V', 'varna@company.com', 'HR Lead & Admin', 'D02', 'G3', 'Active', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80'),
        ('EMP008', 'Gopika M M', 'gopika@company.com', 'Financial Analyst', 'D03', 'G2', 'Active', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80'),
        ('EMP009', 'Anjali S Nair', 'anjali@company.com', 'Full Stack Engineer', 'D01', 'G2', 'Active', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80'),
        ('EMP010', 'Kiran Mohan', 'kiran@company.com', 'DevOps Associate', 'D01', 'G1', 'Active', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80'),
        ('EMP011', 'Devika Menon', 'devika@company.com', 'Content Strategist', 'D04', 'G2', 'Active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'),
        ('EMP012', 'Manoj Kumar', 'manoj@company.com', 'Facilities Supervisor', 'D05', 'G1', 'Active', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80'),
        ('EMP013', 'Siddharth S', 'siddharth@company.com', 'Security Analyst', 'D01', 'G2', 'Active', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80'),
        ('EMP014', 'Pooja Pillai', 'pooja@company.com', 'Talent Coordinator', 'D02', 'G1', 'Active', 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=100&auto=format&fit=crop&q=80'),
        ('EMP015', 'Naveen George', 'naveen@company.com', 'Logistics Planner', 'D05', 'G2', 'Active', 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=100&auto=format&fit=crop&q=80'),
        ('EMP016', 'Lakshmi Rajan', 'lakshmi@company.com', 'Accounts Assistant', 'D03', 'G1', 'Active', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&auto=format&fit=crop&q=80'),
        ('EMP017', 'Rahul Varma', 'rahul@company.com', 'Data Scientist', 'D01', 'G3', 'Active', 'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=100&auto=format&fit=crop&q=80'),
        ('EMP018', 'Gayathri S', 'gayathri@company.com', 'Social Media Exec', 'D04', 'G1', 'On Leave', 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=100&auto=format&fit=crop&q=80'),
        ('EMP019', 'Abhishek Roy', 'abhishek@company.com', 'Junior Developer', 'D01', 'G1', 'Active', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80'),
        ('EMP020', 'Meera Nambiar', 'meera@company.com', 'HR Generalist', 'D02', 'G2', 'Active', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&auto=format&fit=crop&q=80'),
        ('EMP021', 'Harish Babu', 'harish@company.com', 'Field Operations', 'D05', 'G2', 'Active', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80'),
        ('EMP022', 'Deepa Krishnan', 'deepa@company.com', 'QA Automation Lead', 'D01', 'G2', 'Active', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80'),
        ('EMP023', 'Roshan Thomas', 'roshan@company.com', 'Tax & Compliance Mgr', 'D03', 'G3', 'Active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80'),
        ('EMP024', 'Vivek Chandran', 'vivek@company.com', 'Store In-Charge', 'D05', 'G1', 'Active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80')
    ]
    cursor.executemany("INSERT INTO employees (id, name, email, designation, dept_id, grade_id, status, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?);", employees)

    seed_users(cursor)

    attendance = [
        ('ATT-001', 'EMP001', 'June 2025', 22, 0),
        ('ATT-002', 'EMP002', 'June 2025', 21, 1),
        ('ATT-003', 'EMP003', 'June 2025', 22, 0),
        ('ATT-004', 'EMP004', 'June 2025', 20, 2),
        ('ATT-005', 'EMP005', 'June 2025', 18, 4),
        ('ATT-006', 'EMP006', 'June 2025', 22, 0),
        ('ATT-007', 'EMP007', 'June 2025', 22, 0),
        ('ATT-008', 'EMP008', 'June 2025', 21, 1)
    ]
    cursor.executemany("INSERT INTO attendance (id, emp_id, month, days_present, unpaid_leaves) VALUES (?, ?, ?, ?, ?);", attendance)

    conn.commit()

    # Generate initial payslips for June 2025
    run_payroll_calculation(conn, 'June 2025')

def run_payroll_calculation(conn, month):
    """Executes DBMS payroll calculation logic using SQL JOINs."""
    cursor = conn.cursor()
    # Delete existing payslips for this month
    cursor.execute("DELETE FROM payslips WHERE month = ?;", (month,))

    # Calculate using JOIN between employees, grades, and attendance
    query = """
    SELECT 
        e.id AS emp_id,
        g.basic_pay,
        g.allowances,
        g.deductions,
        COALESCE(a.unpaid_leaves, 0) AS unpaid_leaves
    FROM employees e
    JOIN salary_grades g ON e.grade_id = g.id
    LEFT JOIN attendance a ON e.id = a.emp_id AND a.month = ?;
    """
    cursor.execute(query, (month,))
    rows = cursor.fetchall()

    payslips_to_insert = []
    for r in rows:
        basic = r['basic_pay']
        allow = r['allowances']
        base_ded = r['deductions']
        leaves = r['unpaid_leaves']
        leave_cut = round((basic / 30.0) * leaves)
        total_deductions = base_ded + leave_cut
        gross = basic + allow
        net = gross - total_deductions
        slip_id = f"PS-{month.replace(' ', '').upper()}-{r['emp_id']}"

        payslips_to_insert.append((
            slip_id, r['emp_id'], month, basic, allow, leave_cut, total_deductions, gross, net
        ))

    insert_query = """
    INSERT INTO payslips (id, emp_id, month, basic_pay, allowances, leave_cut, deductions, gross_pay, net_salary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """
    cursor.executemany(insert_query, payslips_to_insert)
    conn.commit()
    return len(payslips_to_insert)

def authenticate_user(username_or_email, password):
    """Validates credentials and returns user details with linked employee profile.
    Supports login by username, email, or Employee ID (e.g. EMP001, EMP002).
    Default password: 'admin123' for Admins, 'user123' for Employees.
    """
    conn = get_connection()
    cursor = conn.cursor()
    clean_input = username_or_email.strip().lower()
    clean_pass = password.strip()

    # 1. Search in users table
    query = """
    SELECT u.id, u.username, u.email, u.role, u.emp_id,
           e.name, e.designation, e.avatar, e.dept_id, e.grade_id, d.name AS dept_name
    FROM users u
    LEFT JOIN employees e ON u.emp_id = e.id
    LEFT JOIN departments d ON e.dept_id = d.id
    WHERE (LOWER(u.username) = ? OR LOWER(u.email) = ? OR LOWER(u.emp_id) = ?) AND u.password = ?;
    """
    cursor.execute(query, (clean_input, clean_input, clean_input, clean_pass))
    row = cursor.fetchone()

    # 2. Fallback: Check employees master table directly by emp_id, email, or username prefix
    if not row:
        cursor.execute("""
            SELECT e.id AS emp_id, e.name, e.email, e.designation, e.avatar, e.dept_id, e.grade_id, d.name AS dept_name
            FROM employees e
            LEFT JOIN departments d ON e.dept_id = d.id
            WHERE LOWER(e.id) = ? OR LOWER(e.email) = ? OR LOWER(SUBSTR(e.email, 1, INSTR(e.email, '@') - 1)) = ?;
        """, (clean_input, clean_input, clean_input))
        emp = cursor.fetchone()
        if emp:
            role = "ADMIN" if emp["emp_id"] in ("EMP007", "EMP008") else "EMPLOYEE"
            expected_pass = "admin123" if role == "ADMIN" else "user123"
            if clean_pass == expected_pass:
                # Auto-provision into users table so it is saved
                u_id = f"USR_{emp['emp_id']}"
                username = emp["email"].split("@")[0].lower()
                cursor.execute("""
                    INSERT OR REPLACE INTO users (id, username, email, password, role, emp_id)
                    VALUES (?, ?, ?, ?, ?, ?);
                """, (u_id, username, emp["email"], clean_pass, role, emp["emp_id"]))
                conn.commit()

                cursor.execute(query, (clean_input, clean_input, clean_input, clean_pass))
                row = cursor.fetchone()

    conn.close()
    if row:
        return dict(row)
    return None

def reset_db():
    """Drops and re-creates everything to pristine seed state."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS payslips;")
    cursor.execute("DROP TABLE IF EXISTS attendance;")
    cursor.execute("DROP TABLE IF EXISTS users;")
    cursor.execute("DROP TABLE IF EXISTS employees;")
    cursor.execute("DROP TABLE IF EXISTS salary_grades;")
    cursor.execute("DROP TABLE IF EXISTS departments;")
    conn.commit()
    conn.close()
    init_db()
