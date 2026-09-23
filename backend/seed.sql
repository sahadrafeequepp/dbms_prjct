-- ============================================================================
-- PAYROLL DATABASE MANAGEMENT SYSTEM - SEED DATA SCRIPT
-- College of Engineering Vadakara (CEV) - Group 4
-- Initial Demo Records: Departments, Salary Grades, Employees, Users, Attendance
-- ============================================================================

-- 1. SEED DEPARTMENTS
INSERT OR REPLACE INTO departments (id, name, manager, budget, description) VALUES
('D01', 'IT Department', 'Anjali S Nair', 1450000.0, 'Software engineering, infrastructure and cloud operations'),
('D02', 'HR Department', 'Varna V', 450000.0, 'Talent recruitment, culture, and employee welfare'),
('D03', 'Finance & Accounts', 'Gopika M M', 600000.0, 'Audits, payroll execution, and statutory compliance'),
('D04', 'Marketing', 'Sneha P S', 520000.0, 'Digital campaigns, branding and market research'),
('D05', 'Operations', 'Vishnu R', 780000.0, 'Logistics, office administration, and procurement');

-- 2. SEED SALARY GRADES
INSERT OR REPLACE INTO salary_grades (id, name, basic_pay, allowances, deductions) VALUES
('G1', 'Executive Level 1', 32000.0, 6000.0, 2500.0),
('G2', 'Senior Associate Level 2', 52000.0, 9500.0, 4200.0),
('G3', 'Lead / Principal Level 3', 72000.0, 14000.0, 6000.0);

-- 3. SEED EMPLOYEES
INSERT OR REPLACE INTO employees (id, name, email, designation, dept_id, grade_id, status, avatar) VALUES
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
('EMP024', 'Vivek Chandran', 'vivek@company.com', 'Store In-Charge', 'D05', 'G1', 'Active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80');

-- 4. SEED USERS (Role-Based Authentication)
INSERT OR REPLACE INTO users (id, username, email, password, role, emp_id) VALUES
('USR_ADMIN', 'admin', 'varna@cev.ac.in', 'admin123', 'ADMIN', 'EMP007'),
('USR_USER', 'user', 'raneem@company.com', 'user123', 'EMPLOYEE', 'EMP001'),
('USR_SAHAD', 'sahad', 'sahad@company.com', 'user123', 'EMPLOYEE', 'EMP006'),
('USR_GOPIKA', 'gopika', 'gopika@company.com', 'admin123', 'ADMIN', 'EMP008'),
('USR_EMP001', 'raneem', 'raneem@company.com', 'user123', 'EMPLOYEE', 'EMP001'),
('USR_EMP002', 'fathima', 'fathima@company.com', 'user123', 'EMPLOYEE', 'EMP002'),
('USR_EMP003', 'arjun', 'arjun@company.com', 'user123', 'EMPLOYEE', 'EMP003'),
('USR_EMP004', 'sneha', 'sneha@company.com', 'user123', 'EMPLOYEE', 'EMP004'),
('USR_EMP005', 'vishnu', 'vishnu@company.com', 'user123', 'EMPLOYEE', 'EMP005'),
('USR_EMP006', 'sahad_emp', 'sahad.emp@company.com', 'user123', 'EMPLOYEE', 'EMP006'),
('USR_EMP007', 'varna', 'varna@company.com', 'admin123', 'ADMIN', 'EMP007'),
('USR_EMP008', 'gopika_emp', 'gopika.emp@company.com', 'admin123', 'ADMIN', 'EMP008'),
('USR_EMP009', 'anjali', 'anjali@company.com', 'user123', 'EMPLOYEE', 'EMP009'),
('USR_EMP010', 'kiran', 'kiran@company.com', 'user123', 'EMPLOYEE', 'EMP010'),
('USR_EMP011', 'devika', 'devika@company.com', 'user123', 'EMPLOYEE', 'EMP011'),
('USR_EMP012', 'manoj', 'manoj@company.com', 'user123', 'EMPLOYEE', 'EMP012'),
('USR_EMP013', 'siddharth', 'siddharth@company.com', 'user123', 'EMPLOYEE', 'EMP013'),
('USR_EMP014', 'pooja', 'pooja@company.com', 'user123', 'EMPLOYEE', 'EMP014'),
('USR_EMP015', 'naveen', 'naveen@company.com', 'user123', 'EMPLOYEE', 'EMP015'),
('USR_EMP016', 'lakshmi', 'lakshmi@company.com', 'user123', 'EMPLOYEE', 'EMP016'),
('USR_EMP017', 'rahul', 'rahul@company.com', 'user123', 'EMPLOYEE', 'EMP017'),
('USR_EMP018', 'gayathri', 'gayathri@company.com', 'user123', 'EMPLOYEE', 'EMP018'),
('USR_EMP019', 'abhishek', 'abhishek@company.com', 'user123', 'EMPLOYEE', 'EMP019'),
('USR_EMP020', 'meera', 'meera@company.com', 'user123', 'EMPLOYEE', 'EMP020'),
('USR_EMP021', 'harish', 'harish@company.com', 'user123', 'EMPLOYEE', 'EMP021'),
('USR_EMP022', 'deepa', 'deepa@company.com', 'user123', 'EMPLOYEE', 'EMP022'),
('USR_EMP023', 'roshan', 'roshan@company.com', 'user123', 'EMPLOYEE', 'EMP023'),
('USR_EMP024', 'vivek', 'vivek@company.com', 'user123', 'EMPLOYEE', 'EMP024');

-- 5. SEED ATTENDANCE RECORDS (June 2025)
INSERT OR REPLACE INTO attendance (id, emp_id, month, days_present, unpaid_leaves) VALUES
('ATT-001', 'EMP001', 'June 2025', 22, 0),
('ATT-002', 'EMP002', 'June 2025', 21, 1),
('ATT-003', 'EMP003', 'June 2025', 22, 0),
('ATT-004', 'EMP004', 'June 2025', 20, 2),
('ATT-005', 'EMP005', 'June 2025', 18, 4),
('ATT-006', 'EMP006', 'June 2025', 22, 0),
('ATT-007', 'EMP007', 'June 2025', 22, 0),
('ATT-008', 'EMP008', 'June 2025', 21, 1),
('ATT-009', 'EMP009', 'June 2025', 22, 0),
('ATT-010', 'EMP010', 'June 2025', 22, 0),
('ATT-011', 'EMP011', 'June 2025', 20, 2),
('ATT-012', 'EMP012', 'June 2025', 22, 0),
('ATT-013', 'EMP013', 'June 2025', 21, 1),
('ATT-014', 'EMP014', 'June 2025', 22, 0),
('ATT-015', 'EMP015', 'June 2025', 22, 0),
('ATT-016', 'EMP016', 'June 2025', 19, 3),
('ATT-017', 'EMP017', 'June 2025', 22, 0),
('ATT-018', 'EMP018', 'June 2025', 18, 4),
('ATT-019', 'EMP019', 'June 2025', 22, 0),
('ATT-020', 'EMP020', 'June 2025', 22, 0),
('ATT-021', 'EMP021', 'June 2025', 20, 2),
('ATT-022', 'EMP022', 'June 2025', 22, 0),
('ATT-023', 'EMP023', 'June 2025', 22, 0),
('ATT-024', 'EMP024', 'June 2025', 21, 1);
