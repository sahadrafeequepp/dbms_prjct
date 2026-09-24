# Payroll Database Management System (DBMS Project)

An enterprise-grade, modern SaaS-styled **Automated Payroll Management System** with Role-Based Access Control (**Admin** & **Employee** access) and a cleanly decoupled **Frontend** and **Backend**.

**Institution:** College of Engineering Vadakara (CEV)  
**Academic Group:** Group 4  
**Team Members:**
- Sahad Rafeeque P P
- Varna V (Lead / Administrator)
- Gopika M M

---

## 💎 Advanced DBMS Features 

The system incorporates 5 advanced database management concepts:

1. **Database Views**:
   - `v_monthly_payroll_summary`: Computes employee-level payroll breakdown joining `payslips`, `employees`, and `departments`.
   - `v_department_salary_cost`: Aggregates total compensation expenses per department against allocated budget.
2. **Database Triggers**:
   - `trg_payslips_insert_net_pay`: Auto-calculates `net_salary = gross_pay - deductions` on every payslip insert.
   - `trg_payslips_update_net_pay`: Automatically synchronizes `net_salary` when gross pay or deductions are modified.
   - `trg_salary_grades_update_audit`: Automatically captures old and new salary components into `salary_audit_log`.
3. **Stored Procedure & Transaction Safety**:
   - `generate_monthly_payroll(month, year)`: Transaction-safe routine executing atomic batch payroll calculation inside `BEGIN IMMEDIATE TRANSACTION; ... COMMIT;` with automatic `ROLLBACK;` upon error.
4. **B-Tree Indexes**:
   - Fast $O(\log N)$ query optimizations on foreign keys and filter columns (`idx_emp_dept`, `idx_emp_grade`, `idx_emp_status`, `idx_payslip_emp_id`, `idx_payslip_month`, `idx_payslip_emp_month`, `idx_att_emp_month`).
5. **Data Integrity Constraints**:
   - `PRIMARY KEY`, `FOREIGN KEY` (with `ON DELETE RESTRICT` and `CASCADE`), `NOT NULL`, `UNIQUE`, and `CHECK` domain constraints (e.g. `basic_pay > 0`, `days_present BETWEEN 0 AND 31`).


---

## 🔐 Login & Role-Based Access Control (RBAC)

The system includes an authentication system with two primary access roles:

| Role | Login Identifier (Username / Email / Employee ID) | Default Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin`, `varna@cev.ac.in`, `EMP007`, `gopika` | **`admin123`** | **Full Company Control**: Add/Edit/Delete staff, manage departments & salary bands, execute payroll runs, view all analytics, reset database. |
| **EMPLOYEE** | **ANY Employee ID** (`EMP001` - `EMP024`), **Username** (`raneem`, `fathima`, `arjun`, `sneha`, `vishnu`, etc.), or **Work Email** | **`user123`** | **Personal Self-Service Portal**: View personal salary components & payslips, attendance history, and isolated personal profile. |

> [!TIP]
> **Every employee in the company** can sign in using their Employee ID (e.g. `EMP002`, `EMP003`, `EMP005`) or Email prefix with default password **`user123`**! On the login dialog, click **"🛡️ Admin (Varna V)"** or **"👤 Employee (Raneem)"** for 1-click demo autofill.

---

## 🏗️ Project Architecture (Frontend & Backend Separation)

```
dbms_prjct/
├── backend/                  # ⚙️ BACKEND (Python + FastAPI + SQLite)
│   ├── __init__.py           # Python package marker
│   ├── app.py                # REST API routes, View queries, Audit logs, and Launcher
│   ├── schemas.py            # Pydantic request & validation models
│   ├── database.py           # SQLite connection, transaction procedures, and query functions
│   ├── schema.sql            # Clean DDL (Tables, Constraints, Indexes, Triggers, Views)
│   ├── seed.sql              # Standalone SQL Seed Data Script
│   └── payroll.db            # Real SQLite relational database file
│
├── frontend/                 # 🎨 FRONTEND (HTML5 + Modular CSS + Modular JS)
│   ├── index.html            # Clean HTML markup (no inline CSS/JS clutter)
│   ├── css/
│   │   └── style.css         # Dedicated CSS stylesheet (design tokens, themes, cards)
│   └── js/
│       ├── api.js            # API client (calls FastAPI backend; falls back offline)
│       ├── charts.js         # Chart.js visualization engine
│       └── app.js            # Main UI controller (tabs, modals, tables, search, RBAC)
│
├── run.py                    # 🚀 1-Click Launcher (Starts backend & opens browser)
├── VIVA_EXPLANATION.md       # 🎓 Complete Viva Voce Guide & 15 Sample SQL Queries
└── README.md                 # Updated project documentation & ER schema
```

---

## 🗄️ Relational Schema (ER Model)

- **DEPARTMENTS** (`id` [PK], `name` [UNIQUE], `manager`, `budget` [CHECK > 0], `description`)
- **SALARY_GRADES** (`id` [PK], `name` [UNIQUE], `basic_pay` [CHECK > 0], `allowances` [CHECK >= 0], `deductions` [CHECK >= 0])
- **EMPLOYEES** (`id` [PK], `name`, `email` [UNIQUE], `designation`, `dept_id` [FK RESTRICT], `grade_id` [FK RESTRICT], `status` [CHECK], `avatar`)
- **USERS** (`id` [PK], `username` [UNIQUE], `email` [UNIQUE], `password`, `role` [CHECK 'ADMIN', 'EMPLOYEE'], `emp_id` [FK SET NULL])
- **ATTENDANCE** (`id` [PK], `emp_id` [FK CASCADE], `month`, `days_present` [CHECK 0..31], `unpaid_leaves` [CHECK 0..31], `UNIQUE(emp_id, month)`)
- **PAYSLIPS** (`id` [PK], `emp_id` [FK CASCADE], `month`, `basic_pay` [CHECK > 0], `allowances`, `leave_cut`, `deductions`, `gross_pay`, `net_salary`, `generated_date`, `UNIQUE(emp_id, month)`)
- **SALARY_AUDIT_LOG** (`audit_id` [PK], `grade_id`, `grade_name`, `old_basic_pay`, `new_basic_pay`, `old_allowances`, `new_allowances`, `old_deductions`, `new_deductions`, `changed_by`, `changed_at`, `action_type`)

---

## 🚀 How to Run

### Method 1: Start Full-Stack (Backend + Frontend)
```powershell
python run.py
```
- **Web App**: http://127.0.0.1:8000
- **Interactive Swagger API Docs**: http://127.0.0.1:8000/docs

### Method 2: Standalone Frontend Mode
Open `frontend/index.html` directly in any web browser without running a server.
