"""
Payroll Management System - Database Engine
College of Engineering Vadakara - Group 4
SQLite Database Operations & Schema Management

Features:
- DDL Schema Execution (Tables, Constraints, Indexes, Triggers, Views)
- Transaction-Safe Payroll Generation (Stored Procedure Equivalent)
- Parameterized Query Functions for Views & Audit Logs
"""

import sqlite3
import os
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "payroll.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")
SEED_PATH = os.path.join(os.path.dirname(__file__), "seed.sql")

def get_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with row factory and foreign keys enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initializes tables, indexes, triggers, views, and seeds initial data."""
    conn = get_connection()
    cursor = conn.cursor()

    # Pre-migration: If employees table already exists from an earlier version, ensure sub_grade_id exists before creating indexes
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='employees';")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(employees);")
        emp_cols = [col["name"] for col in cursor.fetchall()]
        if "sub_grade_id" not in emp_cols:
            cursor.execute("ALTER TABLE employees ADD COLUMN sub_grade_id VARCHAR(10);")
            conn.commit()

    # Pre-migration: Ensure salary_sub_grades table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS salary_sub_grades (
            id VARCHAR(10) PRIMARY KEY,
            grade_id VARCHAR(10) NOT NULL,
            name VARCHAR(100) NOT NULL,
            basic_pay REAL NOT NULL CHECK (basic_pay > 0),
            allowances REAL NOT NULL DEFAULT 0.0 CHECK (allowances >= 0),
            deductions REAL NOT NULL DEFAULT 0.0 CHECK (deductions >= 0),
            description TEXT,
            FOREIGN KEY (grade_id) REFERENCES salary_grades(id) ON DELETE CASCADE ON UPDATE CASCADE
        );
    """)
    conn.commit()

    # 1. Execute DDL Schema (Tables, Constraints, Indexes, Triggers, Views)
    if os.path.exists(SCHEMA_PATH):
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            cursor.executescript(f.read())
        conn.commit()

    # 1B. Seed initial sub-grades if table is empty
    cursor.execute("SELECT COUNT(*) AS cnt FROM salary_sub_grades;")
    if cursor.fetchone()["cnt"] == 0:
        seed_sub_grades(conn)

    # 2. Check if database has been seeded
    cursor.execute("SELECT COUNT(*) AS cnt FROM departments;")
    if cursor.fetchone()["cnt"] == 0:
        # Seed from seed.sql if present, otherwise fallback to seed_data()
        if os.path.exists(SEED_PATH):
            with open(SEED_PATH, "r", encoding="utf-8") as f:
                cursor.executescript(f.read())
            conn.commit()
        else:
            seed_data(conn)

    # Assign default sub-grades to any employees that have NULL sub_grade_id
    cursor.execute("SELECT COUNT(*) AS cnt FROM employees WHERE sub_grade_id IS NULL;")
    if cursor.fetchone()["cnt"] > 0:
        cursor.execute("""
            UPDATE employees
            SET sub_grade_id = CASE grade_id
                WHEN 'G1' THEN 'SG1-B'
                WHEN 'G2' THEN 'SG2-B'
                WHEN 'G3' THEN 'SG3-B'
                ELSE 'SG1-B'
            END
            WHERE sub_grade_id IS NULL;
        """)
        conn.commit()

    # 3. Generate initial payslips for June 2025 using transaction procedure
    cursor.execute("SELECT COUNT(*) AS cnt FROM payslips;")
    if cursor.fetchone()["cnt"] == 0:
        generate_monthly_payroll("June 2025", conn=conn)

    conn.close()

# -----------------------------------------------------------------------------
# TRANSACTION-SAFE STORED PROCEDURE EQUIVALENT
# -----------------------------------------------------------------------------
def generate_monthly_payroll(month: str, year: Optional[int] = None, conn: Optional[sqlite3.Connection] = None) -> int:
    """
    DBMS Stored Procedure Equivalent: Generates payroll for all active employees
    inside a single atomic transaction. Rolls back completely on error.
    
    Uses parameterised SQL queries to prevent SQL injection.
    Triggers (trg_payslips_insert_net_pay) automatically compute net_salary.
    """
    # Normalize month string if separate year is provided
    month_key = f"{month} {year}".strip() if year else month.strip()
    
    close_on_finish = False
    if conn is None:
        conn = get_connection()
        close_on_finish = True

    try:
        # SQLite transaction management: disable auto-commit and begin explicit transaction
        conn.isolation_level = None
        cursor = conn.cursor()
        cursor.execute("BEGIN IMMEDIATE TRANSACTION;")

        # 1. Clear any existing records for this month (idempotent run)
        cursor.execute("DELETE FROM payslips WHERE month = ?;", (month_key,))

        # 2. Query active employees and their salary grade details with attendance
        # Uses sub-grade customized amounts if assigned; falls back cleanly to parent grade amounts
        query = """
        SELECT 
            e.id AS emp_id,
            e.name AS emp_name,
            e.status,
            e.grade_id,
            e.sub_grade_id,
            COALESCE(sg.basic_pay, g.basic_pay) AS basic_pay,
            COALESCE(sg.allowances, g.allowances) AS allowances,
            COALESCE(sg.deductions, g.deductions) AS base_deductions,
            COALESCE(a.unpaid_leaves, 0) AS unpaid_leaves
        FROM employees e
        JOIN salary_grades g ON e.grade_id = g.id
        LEFT JOIN salary_sub_grades sg ON e.sub_grade_id = sg.id
        LEFT JOIN attendance a ON e.id = a.emp_id AND a.month = ?
        WHERE e.status = 'Active'
        ORDER BY e.id ASC;
        """
        cursor.execute(query, (month_key,))
        active_employees = cursor.fetchall()

        if not active_employees:
            # Commit the delete even if no employees are active
            cursor.execute("COMMIT;")
            return 0

        # 3. Prepare payslip records for batch insertion
        payslips_to_insert = []
        for emp in active_employees:
            basic = float(emp["basic_pay"])
            allow = float(emp["allowances"])
            base_ded = float(emp["base_deductions"])
            leaves = int(emp["unpaid_leaves"])
            
            # Prorated leave deduction (based on 30 calendar days standard)
            leave_cut = round((basic / 30.0) * leaves, 2)
            total_deductions = round(base_ded + leave_cut, 2)
            gross = round(basic + allow, 2)
            
            # net_salary is populated, and also guaranteed/verified by SQLite Trigger
            net_calc = round(gross - total_deductions, 2)
            slip_id = f"PS-{month_key.replace(' ', '').upper()}-{emp['emp_id']}"

            payslips_to_insert.append((
                slip_id,
                emp["emp_id"],
                month_key,
                basic,
                allow,
                leave_cut,
                total_deductions,
                gross,
                net_calc
            ))

        # 4. Insert records using parameterized query
        insert_query = """
        INSERT INTO payslips (
            id, emp_id, month, basic_pay, allowances, leave_cut, deductions, gross_pay, net_salary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        cursor.executemany(insert_query, payslips_to_insert)

        # 5. Commit atomic transaction
        cursor.execute("COMMIT;")
        return len(payslips_to_insert)

    except Exception as exc:
        # On any error, rollback the entire transaction
        try:
            cursor.execute("ROLLBACK;")
        except Exception:
            pass
        raise RuntimeError(f"Payroll transaction failed and was rolled back: {str(exc)}") from exc
    finally:
        if close_on_finish:
            conn.close()

# Alias for backwards compatibility with earlier app versions
def run_payroll_calculation(conn: sqlite3.Connection, month: str) -> int:
    """Wrapper maintaining compatibility with existing code."""
    return generate_monthly_payroll(month=month, conn=conn)

# -----------------------------------------------------------------------------
# PARAMETERIZED QUERY FUNCTIONS FOR VIEWS & AUDIT
# -----------------------------------------------------------------------------
def get_monthly_payroll_summary(month: Optional[str] = None, dept_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Queries the VIEW 'v_monthly_payroll_summary' using parameterized SQL.
    Returns per-employee payroll breakdown with department details.
    """
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM v_monthly_payroll_summary WHERE 1=1"
    params = []

    if month and month != "ALL":
        query += " AND month = ?"
        params.append(month)
    if dept_id and dept_id != "ALL":
        query += " AND dept_id = ?"
        params.append(dept_id)

    query += " ORDER BY dept_id ASC, emp_id ASC;"
    cursor.execute(query, tuple(params))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_department_salary_costs(month: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Queries the VIEW 'v_department_salary_cost' using parameterized SQL.
    Returns departmental salary aggregation and remaining budget.
    """
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM v_department_salary_cost WHERE 1=1"
    params = []

    if month and month != "ALL":
        query += " AND month = ?"
        params.append(month)

    query += " ORDER BY dept_id ASC;"
    cursor.execute(query, tuple(params))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_salary_audit_logs(grade_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Queries the 'salary_audit_log' table populated by TRIGGER 'trg_salary_grades_update_audit'.
    """
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM salary_audit_log WHERE 1=1"
    params = []

    if grade_id:
        query += " AND grade_id = ?"
        params.append(grade_id)

    query += " ORDER BY audit_id DESC LIMIT ?;"
    params.append(limit)

    cursor.execute(query, tuple(params))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def update_salary_grade(grade_id: str, name: Optional[str] = None, basic_pay: Optional[float] = None, 
                        allowances: Optional[float] = None, deductions: Optional[float] = None,
                        changed_by: str = "ADMIN") -> Dict[str, Any]:
    """
    Updates salary_grades using parameterized queries, causing the
    database trigger 'trg_salary_grades_update_audit' to fire automatically.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Fetch current grade
    cursor.execute("SELECT * FROM salary_grades WHERE id = ?;", (grade_id,))
    current = cursor.fetchone()
    if not current:
        conn.close()
        raise ValueError(f"Salary Grade '{grade_id}' not found.")

    new_name = name if name is not None else current["name"]
    new_basic = basic_pay if basic_pay is not None else current["basic_pay"]
    new_allow = allowances if allowances is not None else current["allowances"]
    new_ded = deductions if deductions is not None else current["deductions"]

    # Parameterized update statement
    cursor.execute("""
        UPDATE salary_grades
        SET name = ?, basic_pay = ?, allowances = ?, deductions = ?
        WHERE id = ?;
    """, (new_name, new_basic, new_allow, new_ded, grade_id))
    conn.commit()

    # Fetch the newly inserted audit record
    cursor.execute("""
        SELECT * FROM salary_audit_log 
        WHERE grade_id = ? 
        ORDER BY audit_id DESC LIMIT 1;
    """, (grade_id,))
    audit_row = cursor.fetchone()

    conn.close()
    return {
        "status": "success",
        "grade_id": grade_id,
        "updated": {"basic_pay": new_basic, "allowances": new_allow, "deductions": new_ded},
        "audit_entry": dict(audit_row) if audit_row else None
    }

# -----------------------------------------------------------------------------
# SUB-GRADE MANAGEMENT & ADMIN CUSTOMIZATION
# -----------------------------------------------------------------------------
def get_sub_grades(grade_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns sub-grades with parent grade details, employee count, and calculated benchmarks.
    """
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    SELECT 
        sg.id,
        sg.grade_id,
        sg.name,
        ROUND(sg.basic_pay, 2) AS basic_pay,
        ROUND(sg.allowances, 2) AS allowances,
        ROUND(sg.deductions, 2) AS deductions,
        ROUND(sg.basic_pay + sg.allowances, 2) AS gross_benchmark,
        ROUND(sg.basic_pay + sg.allowances - sg.deductions, 2) AS net_benchmark,
        sg.description,
        g.name AS grade_name,
        g.basic_pay AS base_grade_basic_pay,
        COUNT(e.id) AS employee_count
    FROM salary_sub_grades sg
    JOIN salary_grades g ON sg.grade_id = g.id
    LEFT JOIN employees e ON sg.id = e.sub_grade_id
    WHERE 1=1
    """
    params = []
    if grade_id and grade_id != "ALL":
        query += " AND sg.grade_id = ?"
        params.append(grade_id)

    query += " GROUP BY sg.id ORDER BY sg.grade_id ASC, sg.basic_pay ASC;"
    cursor.execute(query, tuple(params))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_sub_grade_by_id(sub_grade_id: str) -> Optional[Dict[str, Any]]:
    """Fetches single sub-grade with parent grade information."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            sg.*,
            g.name AS grade_name,
            ROUND(sg.basic_pay + sg.allowances, 2) AS gross_benchmark,
            ROUND(sg.basic_pay + sg.allowances - sg.deductions, 2) AS net_benchmark
        FROM salary_sub_grades sg
        JOIN salary_grades g ON sg.grade_id = g.id
        WHERE sg.id = ?;
    """, (sub_grade_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_sub_grade(grade_id: str, name: str, basic_pay: float, 
                     allowances: float = 0.0, deductions: float = 0.0, 
                     description: str = "", custom_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Allows Admin to create a new sub-grade pay tier with customized amounts under any salary grade.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Validate parent grade exists
    cursor.execute("SELECT id FROM salary_grades WHERE id = ?;", (grade_id,))
    if not cursor.fetchone():
        conn.close()
        raise ValueError(f"Salary Grade '{grade_id}' does not exist.")

    # Determine unique sub-grade ID if not provided
    if custom_id and custom_id.strip():
        sub_id = custom_id.strip()
    else:
        cursor.execute("SELECT id FROM salary_sub_grades WHERE grade_id = ?;", (grade_id,))
        existing = [r["id"] for r in cursor.fetchall()]
        letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        sub_id = f"SG{grade_id.replace('G', '')}-A"
        for l in letters:
            candidate = f"SG{grade_id.replace('G', '')}-{l}"
            if candidate not in existing:
                sub_id = candidate
                break

    cursor.execute("""
        INSERT INTO salary_sub_grades (id, grade_id, name, basic_pay, allowances, deductions, description)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, (sub_id, grade_id, name.strip(), float(basic_pay), float(allowances), float(deductions), description.strip()))
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "message": f"Sub-grade '{sub_id}' created successfully under Grade {grade_id}",
        "id": sub_id
    }

def update_sub_grade(sub_grade_id: str, name: Optional[str] = None, 
                     basic_pay: Optional[float] = None, 
                     allowances: Optional[float] = None, 
                     deductions: Optional[float] = None,
                     description: Optional[str] = None,
                     changed_by: str = "ADMIN") -> Dict[str, Any]:
    """
    Allows Admin to customize salary amounts (basic pay, allowances, deductions)
    and details for a sub-grade. Automatically fires trigger trg_salary_sub_grades_update_audit.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM salary_sub_grades WHERE id = ?;", (sub_grade_id,))
    current = cursor.fetchone()
    if not current:
        conn.close()
        raise ValueError(f"Sub-grade '{sub_grade_id}' not found.")

    new_name = name.strip() if name and name.strip() else current["name"]
    new_basic = float(basic_pay) if basic_pay is not None else current["basic_pay"]
    new_allow = float(allowances) if allowances is not None else current["allowances"]
    new_ded = float(deductions) if deductions is not None else current["deductions"]
    new_desc = description if description is not None else current["description"]

    # Parameterized update triggering audit log
    cursor.execute("""
        UPDATE salary_sub_grades
        SET name = ?, basic_pay = ?, allowances = ?, deductions = ?, description = ?
        WHERE id = ?;
    """, (new_name, new_basic, new_allow, new_ded, new_desc, sub_grade_id))
    conn.commit()

    # Fetch newly inserted audit log record
    cursor.execute("""
        SELECT * FROM salary_audit_log 
        WHERE grade_id = ? 
        ORDER BY audit_id DESC LIMIT 1;
    """, (sub_grade_id,))
    audit_row = cursor.fetchone()

    conn.close()
    return {
        "status": "success",
        "sub_grade_id": sub_grade_id,
        "updated": {
            "name": new_name,
            "basic_pay": new_basic,
            "allowances": new_allow,
            "deductions": new_ded,
            "gross_benchmark": round(new_basic + new_allow, 2),
            "net_benchmark": round(new_basic + new_allow - new_ded, 2)
        },
        "audit_entry": dict(audit_row) if audit_row else None
    }

def delete_sub_grade(sub_grade_id: str) -> bool:
    """Deletes a sub-grade tier. Unlinks any assigned employees to NULL."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE employees SET sub_grade_id = NULL WHERE sub_grade_id = ?;", (sub_grade_id,))
    cursor.execute("DELETE FROM salary_sub_grades WHERE id = ?;", (sub_grade_id,))
    conn.commit()
    conn.close()
    return True

def seed_sub_grades(conn: sqlite3.Connection):
    """Inserts initial sub-grade bands into salary_sub_grades."""
    initial_sub_grades = [
        ('SG1-A', 'G1', 'Executive Level 1 - Junior', 28000.0, 5000.0, 2200.0, 'Entry-level executive with standard starter compensation'),
        ('SG1-B', 'G1', 'Executive Level 1 - Standard', 32000.0, 6000.0, 2500.0, 'Core executive band with standard benefits'),
        ('SG1-C', 'G1', 'Executive Level 1 - Senior', 36000.0, 7000.0, 2800.0, 'Experienced executive with enhanced allowance package'),

        ('SG2-A', 'G2', 'Senior Associate - Level 2A', 48000.0, 8500.0, 3800.0, 'Associate tier with core allowances'),
        ('SG2-B', 'G2', 'Senior Associate - Level 2B', 52000.0, 9500.0, 4200.0, 'Standard senior associate pay scale'),
        ('SG2-C', 'G2', 'Senior Associate - Level 2C (Specialist)', 58000.0, 11000.0, 4800.0, 'Specialist senior associate with higher allowances'),

        ('SG3-A', 'G3', 'Lead / Principal - Grade 3A', 68000.0, 12500.0, 5500.0, 'Team lead base pay structure'),
        ('SG3-B', 'G3', 'Lead / Principal - Grade 3B', 72000.0, 14000.0, 6000.0, 'Principal engineer / Manager standard tier'),
        ('SG3-C', 'G3', 'Lead / Principal - Grade 3C (Distinguished)', 82000.0, 16500.0, 7000.0, 'Distinguished / Staff grade tier with maximum allowances')
    ]
    cursor = conn.cursor()
    cursor.executemany("""
        INSERT OR REPLACE INTO salary_sub_grades (id, grade_id, name, basic_pay, allowances, deductions, description)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, initial_sub_grades)
    conn.commit()

# -----------------------------------------------------------------------------
# USER AUTHENTICATION & LOOKUP
# -----------------------------------------------------------------------------
def authenticate_user(username_or_email: str, password: str) -> Optional[Dict[str, Any]]:
    """Validates credentials and returns user details with linked employee profile."""
    conn = get_connection()
    cursor = conn.cursor()
    clean_input = username_or_email.strip().lower()
    if clean_input == "user":
        clean_input = "raneem"
    clean_pass = password.strip()

    # Search in users table
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

    # Fallback auto-provision for seed employees
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
    return dict(row) if row else None

def seed_data(conn: sqlite3.Connection):
    """Fallback Python seeder if seed.sql is not present."""
    if os.path.exists(SEED_PATH):
        with open(SEED_PATH, "r", encoding="utf-8") as f:
            conn.cursor().executescript(f.read())
        conn.commit()

def reset_db():
    """Drops and re-creates everything to pristine seed state."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DROP VIEW IF EXISTS v_monthly_payroll_summary;")
    cursor.execute("DROP VIEW IF EXISTS v_department_salary_cost;")
    cursor.execute("DROP TRIGGER IF EXISTS trg_payslips_insert_net_pay;")
    cursor.execute("DROP TRIGGER IF EXISTS trg_payslips_update_net_pay;")
    cursor.execute("DROP TRIGGER IF EXISTS trg_salary_grades_update_audit;")
    cursor.execute("DROP TRIGGER IF EXISTS trg_salary_sub_grades_update_audit;")
    cursor.execute("DROP TABLE IF EXISTS salary_audit_log;")
    cursor.execute("DROP TABLE IF EXISTS payslips;")
    cursor.execute("DROP TABLE IF EXISTS attendance;")
    cursor.execute("DROP TABLE IF EXISTS users;")
    cursor.execute("DROP TABLE IF EXISTS employees;")
    cursor.execute("DROP TABLE IF EXISTS salary_sub_grades;")
    cursor.execute("DROP TABLE IF EXISTS salary_grades;")
    cursor.execute("DROP TABLE IF EXISTS departments;")
    conn.commit()
    conn.close()
    init_db()
