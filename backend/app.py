"""
FastAPI REST API Backend for Payroll Database Management System
Group 4: Sahad Rafeeque P P, Varna V, Gopika M M
College of Engineering Vadakara (CEV)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional, List
import os
import uvicorn

from backend.database import (
    get_connection,
    init_db,
    reset_db,
    run_payroll_calculation,
    generate_monthly_payroll,
    authenticate_user,
    get_monthly_payroll_summary,
    get_department_salary_costs,
    get_salary_audit_logs,
    update_salary_grade
)
from backend.schemas import (
    LoginRequest,
    EmployeeCreate,
    EmployeeUpdate,
    DepartmentCreate,
    GradeCreate,
    SalaryGradeUpdate,
    AttendanceCreate,
    PayrollRunRequest
)

# Initialize database tables and initial project seeds
init_db()

app = FastAPI(
    title="Automated Payroll DBMS API",
    description="REST API for College DBMS Project - Group 4 (CEV)",
    version="2.0.0"
)

# Enable CORS for local development & decoupled frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# AUTHENTICATION & ROLE-BASED ACCESS
# -----------------------------------------------------------------------------
@app.post("/api/auth/login")
def login(payload: LoginRequest):
    user = authenticate_user(payload.username.strip(), payload.password.strip())
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username/email or password")
    
    return {
        "status": "success",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "name": user["name"] or ("Varna V" if user["role"] == "ADMIN" else "Employee"),
            "designation": user["designation"] or ("Administrator" if user["role"] == "ADMIN" else "Staff Member"),
            "avatar": user["avatar"] or ("https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80" if user["role"] == "ADMIN" else "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"),
            "emp_id": user["emp_id"],
            "dept_id": user["dept_id"],
            "dept_name": user["dept_name"],
            "grade_id": user["grade_id"]
        }
    }

# -----------------------------------------------------------------------------
# STATS & DASHBOARD AGGREGATIONS
# -----------------------------------------------------------------------------
@app.get("/api/stats")
def get_dashboard_stats(emp_id: Optional[str] = None):
    conn = get_connection()
    c = conn.cursor()

    if emp_id:
        # Personal Employee Stats
        c.execute("""
            SELECT e.*, d.name AS dept_name, g.name AS grade_name, g.basic_pay, g.allowances, g.deductions
            FROM employees e
            JOIN departments d ON e.dept_id = d.id
            JOIN salary_grades g ON e.grade_id = g.id
            WHERE e.id = ?;
        """, (emp_id,))
        emp = c.fetchone()
        
        c.execute("""
            SELECT * FROM payslips WHERE emp_id = ? ORDER BY generated_date DESC LIMIT 1;
        """, (emp_id,))
        latest_slip = c.fetchone()

        c.execute("""
            SELECT * FROM attendance WHERE emp_id = ? AND month = 'June 2025';
        """, (emp_id,))
        att = c.fetchone()

        conn.close()

        if emp:
            days_present = att["days_present"] if att else 22
            unpaid_leaves = att["unpaid_leaves"] if att else 0
            att_rate = round((days_present / 22.0) * 100, 1)
            net_salary = latest_slip["net_salary"] if latest_slip else (emp["basic_pay"] + emp["allowances"] - emp["deductions"])
            gross_pay = latest_slip["gross_pay"] if latest_slip else (emp["basic_pay"] + emp["allowances"])
            deductions = latest_slip["deductions"] if latest_slip else emp["deductions"]

            return {
                "is_employee": True,
                "emp_id": emp["id"],
                "employee_name": emp["name"],
                "designation": emp["designation"],
                "department": emp["dept_name"],
                "grade": emp["grade_name"],
                "basic_pay": emp["basic_pay"],
                "allowances": emp["allowances"],
                "total_deductions": deductions,
                "monthly_payroll": gross_pay,
                "net_pay": net_salary,
                "attendance_rate": att_rate,
                "days_present": days_present,
                "unpaid_leaves": unpaid_leaves,
                "total_employees": 1,
                "total_departments": 1,
                "dept_distribution": [
                    {"name": "Basic", "count": 6},
                    {"name": "Allow", "count": 2},
                    {"name": "Deduct", "count": 1},
                    {"name": "Net", "count": 7}
                ]
            }

    # Company-wide stats for Admin
    c.execute("SELECT COUNT(*) AS total_employees FROM employees;")
    total_emp = c.fetchone()["total_employees"]

    c.execute("SELECT COUNT(*) AS total_departments FROM departments;")
    total_dept = c.fetchone()["total_departments"]

    c.execute("""
        SELECT 
            COALESCE(SUM(gross_pay), 342500) AS total_gross,
            COALESCE(SUM(deductions), 48250) AS total_deductions,
            COALESCE(SUM(net_salary), 294250) AS total_net
        FROM payslips 
        WHERE month = 'June 2025';
    """)
    payroll_stat = c.fetchone()

    # Department wise counts
    c.execute("""
        SELECT d.name, COUNT(e.id) AS count
        FROM departments d
        LEFT JOIN employees e ON d.id = e.dept_id
        GROUP BY d.id, d.name
        ORDER BY d.id;
    """)
    dept_counts = [dict(row) for row in c.fetchall()]

    conn.close()
    return {
        "is_employee": False,
        "total_employees": total_emp,
        "total_departments": total_dept,
        "monthly_payroll": payroll_stat["total_gross"],
        "total_deductions": payroll_stat["total_deductions"],
        "net_pay": payroll_stat["total_net"],
        "attendance_rate": 96.2,
        "dept_distribution": dept_counts
    }

# -----------------------------------------------------------------------------
# EMPLOYEES CRUD
# -----------------------------------------------------------------------------
@app.get("/api/employees")
def list_employees(dept_id: Optional[str] = None, emp_id: Optional[str] = None):
    conn = get_connection()
    c = conn.cursor()
    query = """
        SELECT e.*, d.name AS dept_name, g.name AS grade_name, g.basic_pay, g.allowances, g.deductions
        FROM employees e
        JOIN departments d ON e.dept_id = d.id
        JOIN salary_grades g ON e.grade_id = g.id
        WHERE 1=1
    """
    params = []
    if emp_id:
        query += " AND e.id = ?"
        params.append(emp_id)
    if dept_id and dept_id != "ALL":
        query += " AND e.dept_id = ?"
        params.append(dept_id)
    query += " ORDER BY e.id ASC;"
    
    c.execute(query, tuple(params))
    employees = [dict(row) for row in c.fetchall()]
    conn.close()
    return employees

@app.post("/api/employees")
def create_employee(payload: EmployeeCreate):
    conn = get_connection()
    c = conn.cursor()
    
    # 1. Generate Employee ID (EMP001, EMP002, ...)
    c.execute("SELECT id FROM employees;")
    rows = c.fetchall()
    nums = [int(r["id"].replace("EMP", "")) for r in rows if r["id"].startswith("EMP") and r["id"][3:].isdigit()]
    next_num = max(nums) + 1 if nums else 1
    new_id = f"EMP{next_num:03d}"

    avatar = payload.avatar or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    role = payload.role if payload.role in ("ADMIN", "EMPLOYEE") else "EMPLOYEE"
    default_pass = "admin123" if role == "ADMIN" else "user123"
    password = payload.password.strip() if payload.password and payload.password.strip() else default_pass
    username = payload.username.strip().lower() if payload.username and payload.username.strip() else payload.email.split("@")[0].lower()

    try:
        # 2. Insert into employees master table
        c.execute("""
            INSERT INTO employees (id, name, email, designation, dept_id, grade_id, status, avatar)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (new_id, payload.name, payload.email, payload.designation, payload.dept_id, payload.grade_id, payload.status, avatar))

        # 3. Generate User ID (USR01, USR02, ...)
        c.execute("SELECT id FROM users;")
        u_rows = c.fetchall()
        u_nums = [int(r["id"].replace("USR", "")) for r in u_rows if r["id"].startswith("USR") and r["id"][3:].isdigit()]
        next_u_num = max(u_nums) + 1 if u_nums else 1
        new_user_id = f"USR{next_u_num:02d}"

        # 4. Insert login account into users table
        c.execute("""
            INSERT INTO users (id, username, email, password, role, emp_id)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (new_user_id, username, payload.email, password, role, new_id))

        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))
    
    conn.close()
    return {
        "message": f"Employee {new_id} created successfully with portal login '{username}'",
        "id": new_id,
        "username": username,
        "role": role
    }

@app.put("/api/employees/{emp_id}")
def update_employee(emp_id: str, payload: EmployeeCreate):
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("""
            UPDATE employees 
            SET name = ?, email = ?, designation = ?, dept_id = ?, grade_id = ?, status = ?
            WHERE id = ?;
        """, (payload.name, payload.email, payload.designation, payload.dept_id, payload.grade_id, payload.status, emp_id))

        # Update login credentials if provided
        if payload.password and payload.password.strip():
            c.execute("UPDATE users SET password = ? WHERE emp_id = ?;", (payload.password.strip(), emp_id))
        if payload.role in ("ADMIN", "EMPLOYEE"):
            c.execute("UPDATE users SET role = ? WHERE emp_id = ?;", (payload.role, emp_id))
            
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))
    conn.close()
    return {"message": f"Employee {emp_id} updated"}

@app.delete("/api/employees/{emp_id}")
def delete_employee(emp_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM employees WHERE id = ?;", (emp_id,))
    conn.commit()
    conn.close()
    return {"message": f"Employee {emp_id} deleted"}

# -----------------------------------------------------------------------------
# DEPARTMENTS CRUD
# -----------------------------------------------------------------------------
@app.get("/api/departments")
def list_departments():
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT d.*, COUNT(e.id) AS member_count
        FROM departments d
        LEFT JOIN employees e ON d.id = e.dept_id
        GROUP BY d.id
        ORDER BY d.id ASC;
    """)
    departments = [dict(row) for row in c.fetchall()]
    conn.close()
    return departments

@app.post("/api/departments")
def create_department(payload: DepartmentCreate):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM departments;")
    rows = c.fetchall()
    nums = [int(r["id"].replace("D", "")) for r in rows if r["id"].startswith("D") and r["id"][1:].isdigit()]
    next_num = max(nums) + 1 if nums else 1
    new_id = f"D{next_num:02d}"

    c.execute("""
        INSERT INTO departments (id, name, manager, budget, description)
        VALUES (?, ?, ?, ?, ?);
    """, (new_id, payload.name, payload.manager, payload.budget, payload.description))
    conn.commit()
    conn.close()
    return {"message": "Department created", "id": new_id}

@app.delete("/api/departments/{dept_id}")
def delete_department(dept_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM departments WHERE id = ?;", (dept_id,))
    conn.commit()
    conn.close()
    return {"message": f"Department {dept_id} deleted"}

# -----------------------------------------------------------------------------
# SALARY GRADES CRUD
# -----------------------------------------------------------------------------
@app.get("/api/grades")
def list_grades():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM salary_grades ORDER BY id ASC;")
    grades = [dict(row) for row in c.fetchall()]
    conn.close()
    return grades

@app.post("/api/grades")
def create_grade(payload: GradeCreate):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM salary_grades;")
    rows = c.fetchall()
    nums = [int(r["id"].replace("G", "")) for r in rows if r["id"].startswith("G") and r["id"][1:].isdigit()]
    next_num = max(nums) + 1 if nums else 1
    new_id = f"G{next_num}"

    c.execute("""
        INSERT INTO salary_grades (id, name, basic_pay, allowances, deductions)
        VALUES (?, ?, ?, ?, ?);
    """, (new_id, payload.name, payload.basic_pay, payload.allowances, payload.deductions))
    conn.commit()
    conn.close()
    return {"message": "Salary grade created", "id": new_id}

@app.delete("/api/grades/{grade_id}")
def delete_grade(grade_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM salary_grades WHERE id = ?;", (grade_id,))
    conn.commit()
    conn.close()
    return {"message": f"Salary grade {grade_id} deleted"}

@app.put("/api/grades/{grade_id}")
def edit_grade(grade_id: str, payload: SalaryGradeUpdate):
    """Updates salary grade and triggers the audit log trigger."""
    try:
        result = update_salary_grade(
            grade_id=grade_id,
            basic_pay=payload.basic_pay,
            allowances=payload.allowances,
            deductions=payload.deductions,
            changed_by=payload.changed_by or "ADMIN_USER"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -----------------------------------------------------------------------------
# ATTENDANCE CRUD
# -----------------------------------------------------------------------------
@app.get("/api/attendance")
def list_attendance(month: Optional[str] = "June 2025", emp_id: Optional[str] = None):
    conn = get_connection()
    c = conn.cursor()
    query = """
        SELECT a.*, e.name AS emp_name, g.basic_pay
        FROM attendance a
        JOIN employees e ON a.emp_id = e.id
        JOIN salary_grades g ON e.grade_id = g.id
        WHERE a.month = ?
    """
    params = [month]
    if emp_id:
        query += " AND a.emp_id = ?"
        params.append(emp_id)
    query += " ORDER BY a.id ASC;"

    c.execute(query, tuple(params))
    attendance = [dict(row) for row in c.fetchall()]
    conn.close()
    return attendance

@app.post("/api/attendance")
def create_attendance(payload: AttendanceCreate):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM attendance;")
    rows = c.fetchall()
    nums = [int(r["id"].replace("ATT-", "")) for r in rows if r["id"].startswith("ATT-") and r["id"][4:].isdigit()]
    next_num = max(nums) + 1 if nums else 1
    new_id = f"ATT-{next_num:03d}"

    c.execute("""
        INSERT INTO attendance (id, emp_id, month, days_present, unpaid_leaves)
        VALUES (?, ?, ?, ?, ?);
    """, (new_id, payload.emp_id, payload.month, payload.days_present, payload.unpaid_leaves))
    conn.commit()
    conn.close()
    return {"message": "Attendance logged", "id": new_id}

@app.delete("/api/attendance/{att_id}")
def delete_attendance(att_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM attendance WHERE id = ?;", (att_id,))
    conn.commit()
    conn.close()
    return {"message": f"Attendance {att_id} deleted"}

# -----------------------------------------------------------------------------
# PAYSLIPS & PAYROLL RUN
# -----------------------------------------------------------------------------
@app.get("/api/payslips")
def list_payslips(emp_id: Optional[str] = None):
    conn = get_connection()
    c = conn.cursor()
    query = """
        SELECT p.*, e.name AS emp_name, e.designation, d.name AS dept_name, e.grade_id
        FROM payslips p
        JOIN employees e ON p.emp_id = e.id
        JOIN departments d ON e.dept_id = d.id
        WHERE 1=1
    """
    params = []
    if emp_id:
        query += " AND p.emp_id = ?"
        params.append(emp_id)
    query += " ORDER BY p.generated_date DESC, p.id DESC;"

    c.execute(query, tuple(params))
    payslips = [dict(row) for row in c.fetchall()]
    conn.close()
    return payslips

@app.post("/api/payroll/run")
def execute_payroll_run(payload: PayrollRunRequest):
    try:
        count = generate_monthly_payroll(month=payload.month, year=payload.year)
        return {"message": f"Payroll successfully generated for {payload.month}", "slips_generated": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# ADVANCED DBMS FEATURES: VIEWS, PROCEDURES & AUDIT LOGS
# -----------------------------------------------------------------------------
@app.get("/api/views/monthly-payroll-summary")
def api_monthly_payroll_summary(month: Optional[str] = None, dept_id: Optional[str] = None):
    """Fetches records from SQL VIEW v_monthly_payroll_summary using parameterized query."""
    try:
        records = get_monthly_payroll_summary(month=month, dept_id=dept_id)
        return {"status": "success", "count": len(records), "data": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/views/department-salary-cost")
def api_department_salary_cost(month: Optional[str] = None):
    """Fetches records from SQL VIEW v_department_salary_cost using parameterized query."""
    try:
        records = get_department_salary_costs(month=month)
        return {"status": "success", "count": len(records), "data": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/audit/salary-changes")
def api_salary_audit_logs(grade_id: Optional[str] = None, limit: int = 50):
    """Fetches audit logs populated by the SQLite salary change trigger."""
    try:
        logs = get_salary_audit_logs(grade_id=grade_id, limit=limit)
        return {"status": "success", "count": len(logs), "data": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/payroll/generate")
def api_generate_monthly_payroll(payload: PayrollRunRequest):
    """
    Stored Procedure equivalent: Executes atomic, transaction-safe
    payroll generation for all active employees. Rolls back on error.
    """
    try:
        count = generate_monthly_payroll(month=payload.month, year=payload.year)
        return {
            "status": "success",
            "message": f"Transaction committed: Generated {count} payslips for {payload.month}",
            "records_generated": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset")
def reset_database():
    reset_db()
    return {"message": "Database reset to project seed data"}

# -----------------------------------------------------------------------------
# STATIC FILE SERVING (FRONTEND)
# -----------------------------------------------------------------------------
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=True)
