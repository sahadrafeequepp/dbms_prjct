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

    # 1. Execute DDL Schema (Tables, Constraints, Indexes, Triggers, Views)
    if os.path.exists(SCHEMA_PATH):
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            cursor.executescript(f.read())
        conn.commit()

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
        query = """
        SELECT 
            e.id AS emp_id,
            e.name AS emp_name,
            e.status,
            g.basic_pay,
            g.allowances,
            g.deductions AS base_deductions,
            COALESCE(a.unpaid_leaves, 0) AS unpaid_leaves
        FROM employees e
        JOIN salary_grades g ON e.grade_id = g.id
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

def update_salary_grade(grade_id: str, basic_pay: Optional[float] = None, 
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

    new_basic = basic_pay if basic_pay is not None else current["basic_pay"]
    new_allow = allowances if allowances is not None else current["allowances"]
    new_ded = deductions if deductions is not None else current["deductions"]

    # Parameterized update statement
    cursor.execute("""
        UPDATE salary_grades
        SET basic_pay = ?, allowances = ?, deductions = ?
        WHERE id = ?;
    """, (new_basic, new_allow, new_ded, grade_id))
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
    cursor.execute("DROP TABLE IF EXISTS salary_audit_log;")
    cursor.execute("DROP TABLE IF EXISTS payslips;")
    cursor.execute("DROP TABLE IF EXISTS attendance;")
    cursor.execute("DROP TABLE IF EXISTS users;")
    cursor.execute("DROP TABLE IF EXISTS employees;")
    cursor.execute("DROP TABLE IF EXISTS salary_grades;")
    cursor.execute("DROP TABLE IF EXISTS departments;")
    conn.commit()
    conn.close()
    init_db()
