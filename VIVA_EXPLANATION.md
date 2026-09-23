# Advanced Database Features - Viva Preparation & Query Guide
**Project**: Automated Payroll Database Management System  
**Institution**: College of Engineering Vadakara (CEV)  
**Database**: SQLite (`payroll.db`) | **Backend**: Python (FastAPI)

---

## 1. Quick Viva Cheat Sheet (Examiner Q&A)

### Q1: What database features did your team implement in this project?
> **Answer**: We implemented 5 advanced DBMS features:
> 1. **Views**: Abstracted monthly payroll reporting and departmental cost aggregation.
> 2. **Triggers**: Automated net pay calculation (`net = gross - deductions`) and audit logging of salary revisions.
> 3. **Stored Procedure / Transaction Logic**: Atomic batch payroll generation ensuring full ACID compliance (`BEGIN`, `COMMIT`, `ROLLBACK`).
> 4. **B-Tree Indexes**: Query optimization on foreign keys and search predicates (`emp_id`, `dept_id`, `month`).
> 5. **Data Integrity Constraints**: Primary keys, Foreign keys with cascading rules, NOT NULL, UNIQUE, and CHECK domain constraints.

### Q2: Why doesn't SQLite use `CREATE PROCEDURE`?
> **Answer**: SQLite is an embedded, in-process relational database library rather than a client-server database engine like Oracle or MySQL. It does not include an internal procedural scripting runtime (like PL/SQL or T-SQL). Instead, stored procedure logic in SQLite applications is implemented as **transaction-safe application procedures** using Python/SQL transaction blocks (`BEGIN TRANSACTION`, `COMMIT`, and `ROLLBACK`). For enterprise engines, we also wrote the equivalent `CREATE PROCEDURE` SQL scripts for MySQL and PostgreSQL.

### Q3: How do indexes improve performance?
> **Answer**: Without an index, the database engine must perform a **Full Table Scan ($O(N)$ time complexity)**, inspecting every single record. A B-Tree index maintains a sorted tree structure, reducing lookups to **$O(\log N)$ time complexity**.

---

## 2. Views (`CREATE VIEW`)

### Concept in Simple Language
A **View** is a virtual table defined by a saved SQL query. It does not store redundant physical data on disk (unless materialized). When queried, the database dynamically executes the underlying query.

**Why use it?**
- **Simplification**: Hides complex multi-table `JOIN`s and aggregate calculations behind a clean table-like interface.
- **Security & Abstraction**: Allows developers or reporting analysts to see necessary columns without accessing raw tables directly.

---

### Implemented Views

#### View 1: `v_monthly_payroll_summary`
Combines `payslips`, `employees`, and `departments` to produce an employee-level payroll statement.
```sql
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
```

#### View 2: `v_department_salary_cost`
Aggregates total compensation expenses per department, comparing them against the allocated budget.
```sql
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
```

---

### 3 Sample Queries for Views (Demo Ready)

#### Query 1: Fetch payroll summary for a specific month
```sql
SELECT employee_name, designation, department_name, gross_pay, deductions, net_pay
FROM v_monthly_payroll_summary
WHERE month = 'June 2025'
ORDER BY net_pay DESC
LIMIT 5;
```
*Expected Output*: Returns top 5 earners with their gross, deductions, and calculated take-home pay.

#### Query 2: Filter payroll records by department
```sql
SELECT employee_name, basic_pay, allowances, leave_cut, net_pay
FROM v_monthly_payroll_summary
WHERE dept_id = 'D01' AND month = 'June 2025';
```
*Expected Output*: Displays breakdown exclusively for IT Department staff.

#### Query 3: Department budget utilization analysis
```sql
SELECT department_name, total_employees, total_gross_cost, allocated_budget, remaining_budget
FROM v_department_salary_cost
WHERE month = 'June 2025'
ORDER BY remaining_budget ASC;
```
*Expected Output*: Ranks departments by remaining budget surplus.

---

## 3. Database Triggers (`CREATE TRIGGER`)

### Concept in Simple Language
A **Trigger** is a set of SQL statements that automatically execute ("fire") in response to a specified event (`INSERT`, `UPDATE`, or `DELETE`) on a particular table.

**Why use it?**
- **Automated Calculations**: Guarantees business rules (e.g. `net_salary = gross - deductions`) without depending on application code.
- **Audit Trails**: Non-repudiation and tracking of sensitive salary modifications.

---

### Implemented Triggers

#### Trigger 1A & 1B: Auto-Calculate Net Pay
```sql
-- Runs automatically whenever a new payslip is inserted
CREATE TRIGGER IF NOT EXISTS trg_payslips_insert_net_pay
AFTER INSERT ON payslips
FOR EACH ROW
BEGIN
    UPDATE payslips
    SET net_salary = NEW.gross_pay - NEW.deductions
    WHERE id = NEW.id;
END;

-- Runs automatically if gross_pay or deductions are updated
CREATE TRIGGER IF NOT EXISTS trg_payslips_update_net_pay
AFTER UPDATE OF gross_pay, deductions ON payslips
FOR EACH ROW
BEGIN
    UPDATE payslips
    SET net_salary = NEW.gross_pay - NEW.deductions
    WHERE id = NEW.id;
END;
```

#### Trigger 2: Salary Revision Audit Log
```sql
-- Automatically records before-and-after values whenever basic pay or allowances change
CREATE TRIGGER IF NOT EXISTS trg_salary_grades_update_audit
AFTER UPDATE OF basic_pay, allowances, deductions ON salary_grades
FOR EACH ROW
WHEN (OLD.basic_pay != NEW.basic_pay OR OLD.allowances != NEW.allowances OR OLD.deductions != NEW.deductions)
BEGIN
    INSERT INTO salary_audit_log (
        grade_id, grade_name,
        old_basic_pay, new_basic_pay,
        old_allowances, new_allowances,
        old_deductions, new_deductions,
        changed_by, changed_at, action_type
    ) VALUES (
        OLD.id, OLD.name,
        OLD.basic_pay, NEW.basic_pay,
        OLD.allowances, NEW.allowances,
        OLD.deductions, NEW.deductions,
        'SYSTEM_ADMIN', CURRENT_TIMESTAMP, 'UPDATE'
    );
END;
```

---

### 3 Sample Queries for Triggers (Demo Ready)

#### Query 1: Demonstrate net pay auto-calculation on INSERT
```sql
-- Insert a test payslip intentionally passing net_salary = 0.0
INSERT OR REPLACE INTO payslips (id, emp_id, month, basic_pay, allowances, leave_cut, deductions, gross_pay, net_salary)
VALUES ('PS-DEMO-001', 'EMP001', 'DemoMonth', 40000, 10000, 0, 5000, 50000, 0.0);

-- Query the row: net_salary is automatically updated to 45000.0 by the trigger!
SELECT id, gross_pay, deductions, net_salary 
FROM payslips 
WHERE id = 'PS-DEMO-001';
```

#### Query 2: Demonstrate auto-recalculation on UPDATE
```sql
-- Update deductions on the test slip
UPDATE payslips 
SET deductions = 8000 
WHERE id = 'PS-DEMO-001';

-- Trigger updates net_salary = 50000 - 8000 = 42000.0
SELECT id, gross_pay, deductions, net_salary 
FROM payslips 
WHERE id = 'PS-DEMO-001';
```

#### Query 3: Demonstrate Salary Audit Trail
```sql
-- Update salary band G1
UPDATE salary_grades 
SET basic_pay = 36000.0 
WHERE id = 'G1';

-- Inspect the audit log table populated by the trigger
SELECT audit_id, grade_id, grade_name, old_basic_pay, new_basic_pay, changed_by, changed_at
FROM salary_audit_log
ORDER BY audit_id DESC
LIMIT 1;
```

---

## 4. Stored Procedure & Transaction-Safe Execution

### Concept in Simple Language
A **Stored Procedure** is a prepared collection of SQL and procedural logic stored and executed on the database server.
A **Transaction** guarantees the **ACID** properties:
- **Atomicity**: Either all payroll records for the month are created, or none are.
- **Consistency**: All foreign keys and check constraints remain valid.
- **Isolation**: Concurrent queries do not see halfway-inserted payroll batches.
- **Durability**: Once committed, generated payslips survive crashes.

### Implementation: Transaction-Safe Python/SQL Routine
In SQLite, this is executed with `BEGIN IMMEDIATE TRANSACTION;`, bulk operations, and `COMMIT` or `ROLLBACK` on exception:

```python
def generate_monthly_payroll(month: str, year: Optional[int] = None, conn=None) -> int:
    conn.isolation_level = None
    cursor = conn.cursor()
    try:
        cursor.execute("BEGIN IMMEDIATE TRANSACTION;")
        
        # 1. Delete prior records for the month
        cursor.execute("DELETE FROM payslips WHERE month = ?;", (month,))
        
        # 2. Select only active employees
        cursor.execute("""
            SELECT e.id, g.basic_pay, g.allowances, g.deductions, COALESCE(a.unpaid_leaves, 0) AS unpaid_leaves
            FROM employees e
            JOIN salary_grades g ON e.grade_id = g.id
            LEFT JOIN attendance a ON e.id = a.emp_id AND a.month = ?
            WHERE e.status = 'Active';
        """, (month,))
        employees = cursor.fetchall()
        
        # 3. Insert payslips with prorated leave deductions
        # ... calculation and cursor.executemany ...
        
        cursor.execute("COMMIT;")
        return len(employees)
    except Exception as exc:
        cursor.execute("ROLLBACK;")
        raise exc
```

### MySQL / PostgreSQL Equivalent (Bonus for Viva Examiners!)
If the examiner asks: *"How would this look as a native MySQL Stored Procedure?"*

```sql
-- MySQL Enterprise Stored Procedure
DELIMITER //
CREATE PROCEDURE generate_monthly_payroll(IN p_month VARCHAR(30))
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Rollback on any database error
        ROLLBACK;
    END;

    START TRANSACTION;

    DELETE FROM payslips WHERE month = p_month;

    INSERT INTO payslips (id, emp_id, month, basic_pay, allowances, leave_cut, deductions, gross_pay, net_salary)
    SELECT 
        CONCAT('PS-', REPLACE(p_month, ' ', ''), '-', e.id),
        e.id,
        p_month,
        g.basic_pay,
        g.allowances,
        ROUND((g.basic_pay / 30.0) * COALESCE(a.unpaid_leaves, 0), 2),
        ROUND(g.deductions + (g.basic_pay / 30.0) * COALESCE(a.unpaid_leaves, 0), 2),
        ROUND(g.basic_pay + g.allowances, 2),
        ROUND((g.basic_pay + g.allowances) - (g.deductions + (g.basic_pay / 30.0) * COALESCE(a.unpaid_leaves, 0)), 2)
    FROM employees e
    JOIN salary_grades g ON e.grade_id = g.id
    LEFT JOIN attendance a ON e.id = a.emp_id AND a.month = p_month
    WHERE e.status = 'Active';

    COMMIT;
END //
DELIMITER ;
```

---

### 3 Sample Queries / Demonstrations for Procedures

#### Query 1: Execute payroll procedure via REST API / Python
```bash
# Triggers atomic batch generation for July 2025
curl -X POST "http://127.0.0.1:8000/api/payroll/generate" \
     -H "Content-Type: application/json" \
     -d '{"month": "July 2025"}'
```

#### Query 2: Verify active employees only
```sql
-- Notice that employees with status = 'On Leave' (e.g. EMP005) are omitted from payroll
SELECT e.id, e.name, e.status, p.month
FROM employees e
LEFT JOIN payslips p ON e.id = p.emp_id AND p.month = 'June 2025'
WHERE e.status != 'Active';
```

#### Query 3: Verify rollback safety
If an error occurs midway, zero partial records are committed:
```sql
SELECT COUNT(*) FROM payslips WHERE month = 'FailedRunMonth';
-- Returns 0 because ROLLBACK was executed
```

---

## 5. B-Tree Indexes (`CREATE INDEX`)

### Concept in Simple Language
An **Index** is an auxiliary data structure (typically a balanced B-Tree) that maintains sorted pointers to rows.
Instead of scanning every row in a table ($O(N)$), the database navigates the tree in **$O(\log N)$** time.

### Implemented Indexes & Why Each Helps
| Index Name | Target Table & Columns | Why it Helps |
| :--- | :--- | :--- |
| `idx_emp_dept` | `employees(dept_id)` | Accelerates `JOIN`s between `departments` and `employees`. |
| `idx_emp_grade` | `employees(grade_id)` | Optimizes payroll salary grade lookups during batch calculation. |
| `idx_emp_status` | `employees(status)` | Speeds up filtering for active employees (`status = 'Active'`). |
| `idx_att_emp_month` | `attendance(emp_id, month)` | Composite index for instantaneous single-employee monthly attendance lookup. |
| `idx_payslip_month` | `payslips(month)` | Speeds up filtering views and reports by month. |
| `idx_payslip_emp_month`| `payslips(emp_id, month)` | Fast lookup for payslip duplicates and personal employee history. |

---

### 3 Sample Queries Showing Indexes in Action

#### Query 1: Explain query plan verifying Index usage for monthly filter
```sql
EXPLAIN QUERY PLAN
SELECT * FROM payslips WHERE month = 'June 2025';
```
*Examiner output*: Shows `SEARCH payslips USING INDEX idx_payslip_month (month=?)` instead of `SCAN payslips`.

#### Query 2: Composite index verification on attendance
```sql
EXPLAIN QUERY PLAN
SELECT * FROM attendance WHERE emp_id = 'EMP001' AND month = 'June 2025';
```
*Examiner output*: Shows `SEARCH attendance USING COVERING INDEX idx_att_emp_month (emp_id=? AND month=?)`.

#### Query 3: Foreign Key Join optimization
```sql
EXPLAIN QUERY PLAN
SELECT e.name, d.name 
FROM employees e 
JOIN departments d ON e.dept_id = d.id;
```
*Examiner output*: Shows fast indexed lookup using `idx_emp_dept`.

---

## 6. Constraints & Data Integrity

### Implemented Constraints
1. **PRIMARY KEY**:
   - `departments(id)`, `salary_grades(id)`, `employees(id)`, `payslips(id)`, `attendance(id)`.
   - Guarantees entity uniqueness.
2. **FOREIGN KEY**:
   - `employees(dept_id) REFERENCES departments(id) ON DELETE RESTRICT` (prevents accidental deletion of a department that still has staff).
   - `payslips(emp_id) REFERENCES employees(id) ON DELETE CASCADE` (payslips clean up if employee record is deleted).
3. **NOT NULL**:
   - Compulsory fields like employee names, emails, designations, pay numbers.
4. **UNIQUE**:
   - `employees(email)`, `users(username)`, `departments(name)`.
   - Composite `UNIQUE(emp_id, month)` on `attendance` and `payslips` prevents double payroll runs.
5. **CHECK Constraints**:
   - `basic_pay > 0`: Prevents invalid negative/zero salaries.
   - `budget > 0`: Prevents negative departmental budgets.
   - `days_present >= 0 AND days_present <= 31`: Validates calendar days.
   - `status IN ('Active', 'On Leave', 'Resigned', 'Suspended')`: Domain integrity.

---

### 3 Sample Queries Demonstrating Constraints Blocking Bad Data

#### Query 1: CHECK constraint blocking negative salary
```sql
-- Attempt to insert salary grade with negative basic pay
INSERT INTO salary_grades (id, name, basic_pay, allowances, deductions)
VALUES ('G_INVALID', 'Invalid Grade', -15000, 0, 0);
-- Result: SQLite IntegrityError: CHECK constraint failed: basic_pay > 0
```

#### Query 2: CHECK constraint blocking invalid calendar days
```sql
-- Attempt to log 35 days in a month
INSERT INTO attendance (id, emp_id, month, days_present, unpaid_leaves)
VALUES ('ATT_ERR', 'EMP001', 'June 2025', 35, 0);
-- Result: SQLite IntegrityError: CHECK constraint failed: days_present <= 31
```

#### Query 3: UNIQUE constraint blocking duplicate monthly payslip
```sql
-- Attempt to insert two payslips for EMP001 in June 2025
INSERT INTO payslips (id, emp_id, month, basic_pay, allowances, leave_cut, deductions, gross_pay, net_salary)
VALUES ('PS-DUP', 'EMP001', 'June 2025', 50000, 5000, 0, 2000, 55000, 53000);
-- Result: SQLite IntegrityError: UNIQUE constraint failed: payslips.emp_id, payslips.month
```
