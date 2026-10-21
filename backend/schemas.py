"""
Pydantic Validation Schemas for Automated Payroll DBMS
College of Engineering Vadakara (CEV) - Group 4
"""

from pydantic import BaseModel, Field
from typing import Optional


class LoginRequest(BaseModel):
    """User authentication payload."""
    username: str = Field(..., description="Username or registered email")
    password: str = Field(..., description="Account password")


class EmployeeCreate(BaseModel):
    """New employee onboarding payload."""
    name: str = Field(..., description="Full employee name")
    email: str = Field(..., description="Official organizational email")
    designation: str = Field(..., description="Job role / designation")
    dept_id: str = Field(..., description="Foreign key to departments (e.g. D01)")
    grade_id: str = Field(..., description="Foreign key to salary_grades (e.g. G2)")
    sub_grade_id: Optional[str] = Field(None, description="Foreign key to salary_sub_grades (e.g. SG2-B)")
    status: str = Field("Active", description="Employment status (Active, On Leave, Resigned)")
    avatar: Optional[str] = Field(None, description="Image URL for avatar profile")
    password: Optional[str] = Field("user123", description="Portal login password")
    username: Optional[str] = Field(None, description="Portal login username (defaults to email prefix)")
    role: Optional[str] = Field("EMPLOYEE", description="Role access: EMPLOYEE or ADMIN")


class EmployeeUpdate(BaseModel):
    """Employee record update payload."""
    name: Optional[str] = None
    email: Optional[str] = None
    designation: Optional[str] = None
    dept_id: Optional[str] = None
    grade_id: Optional[str] = None
    sub_grade_id: Optional[str] = None
    status: Optional[str] = None
    avatar: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


class DepartmentCreate(BaseModel):
    """Organizational department payload."""
    name: str = Field(..., description="Department name")
    manager: str = Field(..., description="Head of department / manager")
    budget: float = Field(500000.0, gt=0, description="Annual allocated operational budget in INR")
    description: Optional[str] = Field("", description="Operational responsibilities")


class GradeCreate(BaseModel):
    """Salary grade pay band payload."""
    name: str = Field(..., description="Pay band title (e.g. Lead / Principal Level 3)")
    basic_pay: float = Field(..., gt=0, description="Standard monthly basic pay in INR (must be > 0)")
    allowances: float = Field(0.0, ge=0, description="Standard allowances (HRA, DA, Special)")
    deductions: float = Field(0.0, ge=0, description="Standard statutory deductions (PF, ESI)")


class SalaryGradeUpdate(BaseModel):
    """Payload for updating salary band, demonstrating the audit trigger."""
    name: Optional[str] = Field(None, description="Updated grade name")
    basic_pay: Optional[float] = Field(None, gt=0, description="Updated basic pay (must be > 0)")
    allowances: Optional[float] = Field(None, ge=0, description="Updated allowances")
    deductions: Optional[float] = Field(None, ge=0, description="Updated deductions")
    changed_by: Optional[str] = Field("ADMIN_USER", description="Username performing the change")


class SubGradeCreate(BaseModel):
    """Salary sub-grade pay tier payload."""
    id: Optional[str] = Field(None, description="Optional custom sub-grade ID (e.g. SG1-D)")
    grade_id: str = Field(..., description="Parent salary grade ID (e.g. G1, G2, G3)")
    name: str = Field(..., description="Sub-grade title (e.g. Senior Associate - Specialist)")
    basic_pay: float = Field(..., gt=0, description="Customized basic pay in INR (must be > 0)")
    allowances: float = Field(0.0, ge=0, description="Customized allowances in INR")
    deductions: float = Field(0.0, ge=0, description="Customized standard deductions in INR")
    description: Optional[str] = Field("", description="Tier description or notes")


class SubGradeUpdate(BaseModel):
    """Payload for customizing sub-grade salary amounts and details."""
    name: Optional[str] = Field(None, description="Sub-grade title")
    basic_pay: Optional[float] = Field(None, gt=0, description="Customized basic pay (must be > 0)")
    allowances: Optional[float] = Field(None, ge=0, description="Customized allowances")
    deductions: Optional[float] = Field(None, ge=0, description="Customized deductions")
    description: Optional[str] = Field(None, description="Description notes")
    changed_by: Optional[str] = Field("ADMIN", description="Admin username making customization")


class AttendanceCreate(BaseModel):
    """Monthly attendance entry payload."""
    emp_id: str = Field(..., description="Employee ID (e.g. EMP001)")
    month: str = Field(..., description="Target payroll month (e.g. June 2025)")
    days_present: int = Field(..., ge=0, le=31, description="Days attended (max 31)")
    unpaid_leaves: int = Field(0, ge=0, le=31, description="Unpaid leave days causing loss-of-pay")


class PayrollRunRequest(BaseModel):
    """Batch payroll execution trigger payload."""
    month: str = Field("June 2025", description="Payroll calculation month")
    year: Optional[int] = Field(None, description="Optional year specification")
