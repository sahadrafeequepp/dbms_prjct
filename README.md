# Payroll Database Management System (DBMS Project)

An enterprise-grade, modern SaaS-styled **Automated Payroll Management System** with Role-Based Access Control (**Admin** & **Employee** access) and a cleanly decoupled **Frontend** and **Backend**.

**Institution:** College of Engineering Vadakara (CEV)  
**Academic Group:** Group 4  
**Team Members:**
- Sahad Rafeeque P P
- Varna V (Lead / Administrator)
- Gopika M M

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
│   ├── app.py                # REST API routes and endpoints
│   ├── schemas.py            # Pydantic request & validation models
│   ├── database.py           # SQLite connection, SQL relational joins, and seeders
│   ├── schema.sql            # Clean SQL DDL statements (Tables, Keys, Constraints)
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
└── README.md                 # Updated project documentation & ER schema
```

---

## 🗄️ Relational Schema (ER Model)

- **USERS** (`id` [PK], `username`, `email`, `password`, `role` [CHECK 'ADMIN', 'EMPLOYEE'], `emp_id` [FK])
- **EMPLOYEES** (`id` [PK], `name`, `email`, `designation`, `dept_id` [FK], `grade_id` [FK], `status`, `avatar`)
- **DEPARTMENTS** (`id` [PK], `name`, `manager`, `budget`, `description`)
- **SALARY_GRADES** (`id` [PK], `name`, `basic_pay`, `allowances`, `deductions`)
- **ATTENDANCE** (`id` [PK], `emp_id` [FK], `month`, `days_present`, `unpaid_leaves`)
- **PAYSLIPS** (`id` [PK], `emp_id` [FK], `month`, `basic_pay`, `allowances`, `leave_cut`, `deductions`, `gross_pay`, `net_salary`, `generated_date`)

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
