/**
 * Payroll Management System - Data Visualization Module
 * High-fidelity Chart.js bar and spline line charts
 * Dynamically switches between Company Headcount & Payroll Trend (Admin)
 * and Personal Salary Components & Personal Net Pay Trend (Employee).
 */

let deptChartInstance = null;
let trendChartInstance = null;

const ChartsManager = {
  render(statsData) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9CA3AF' : '#6B7280';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const isEmployee = statsData && statsData.is_employee;

    // Update Titles
    const title1 = document.getElementById('dashChart1Title');
    const sub1 = document.getElementById('dashChart1Sub');
    const title2 = document.getElementById('dashChart2Title');
    const sub2 = document.getElementById('dashChart2Sub');

    if (isEmployee) {
      if (title1) title1.innerText = 'My Monthly Salary Components';
      if (sub1) sub1.innerText = 'Earnings vs Deductions';
      if (title2) title2.innerText = 'My Monthly Net Pay Trend';
      if (sub2) sub2.innerText = 'H1 FY2025 Disbursements';
    } else {
      if (title1) title1.innerText = 'Department-wise Employee Count';
      if (sub1) sub1.innerText = 'Active Headcount';
      if (title2) title2.innerText = 'Monthly Payroll Trend';
      if (sub2) sub2.innerText = 'H1 FY2025';
    }

    // -------------------------------------------------------------------------
    // 1. Chart 1: Bar Chart (Dept Headcount vs Personal Salary Breakdown)
    // -------------------------------------------------------------------------
    const ctxDept = document.getElementById('deptChartCanvas');
    if (ctxDept) {
      if (deptChartInstance) deptChartInstance.destroy();

      if (isEmployee) {
        // Personal salary breakdown
        const basic = statsData.basic_pay || 72000;
        const allow = statsData.allowances || 14000;
        const ded = statsData.total_deductions || 6000;
        const net = statsData.net_pay || 73500;

        deptChartInstance = new Chart(ctxDept, {
          type: 'bar',
          data: {
            labels: ['Basic Pay', 'Allowances', 'Deductions', 'Net Pay'],
            datasets: [{
              data: [basic, allow, ded, net],
              backgroundColor: ['#3B82F6', '#10B981', '#EF4444', '#6D5DFC'],
              borderRadius: 6,
              barThickness: 32
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: isDark ? '#1F2937' : '#111827',
                titleColor: '#FFF',
                bodyColor: '#FFF',
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  label: (ctx) => `₹ ${ctx.raw.toLocaleString('en-IN')}`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 } }
              },
              y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: {
                  color: textColor,
                  font: { family: 'Plus Jakarta Sans', size: 10 },
                  callback: (val) => val === 0 ? '₹ 0' : `₹ ${(val/1000).toFixed(0)}k`
                }
              }
            }
          }
        });
      } else {
        // Admin: Department-wise headcount
        const defaultLabels = ['IT', 'HR', 'Finance', 'Marketing', 'Operations'];
        const defaultCounts = [8, 4, 4, 3, 5];
        const colors = ['#3B82F6', '#6D5DFC', '#10B981', '#F59E0B', '#06B6D4'];

        let labels = defaultLabels;
        let data = defaultCounts;

        if (statsData && statsData.dept_distribution && statsData.dept_distribution.length > 0) {
          labels = statsData.dept_distribution.map(d => d.name.replace(' Department', ''));
          data = statsData.dept_distribution.map(d => d.count);
        }

        deptChartInstance = new Chart(ctxDept, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: colors.slice(0, labels.length),
              borderRadius: 6,
              barThickness: 28
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: isDark ? '#1F2937' : '#111827',
                titleColor: '#FFF',
                bodyColor: '#FFF',
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  label: (ctx) => `${ctx.raw} Employees`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 } }
              },
              y: {
                beginAtZero: true,
                max: 10,
                grid: { color: gridColor },
                ticks: { stepSize: 2, color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }
              }
            }
          }
        });
      }
    }

    // -------------------------------------------------------------------------
    // 2. Chart 2: Spline Line Chart (Company Trend vs Personal Net Pay Trend)
    // -------------------------------------------------------------------------
    const ctxTrend = document.getElementById('trendChartCanvas');
    if (ctxTrend) {
      if (trendChartInstance) trendChartInstance.destroy();

      const trendLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

      if (isEmployee) {
        // Employee monthly net take-home trend
        const myNet = statsData.net_pay || 73500;
        const trendData = [myNet, myNet, myNet, myNet, myNet, myNet];

        trendChartInstance = new Chart(ctxTrend, {
          type: 'line',
          data: {
            labels: trendLabels,
            datasets: [{
              data: trendData,
              borderColor: '#10B981',
              backgroundColor: (context) => {
                const chart = context.chart;
                const { ctx, chartArea } = chart;
                if (!chartArea) return null;
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
                gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                return gradient;
              },
              fill: true,
              tension: 0.3,
              borderWidth: 3,
              pointBackgroundColor: '#10B981',
              pointBorderColor: '#FFF',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: isDark ? '#1F2937' : '#111827',
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  label: (ctx) => `Net Disbursed: ₹ ${ctx.raw.toLocaleString('en-IN')}`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 } }
              },
              y: {
                beginAtZero: false,
                min: 40000,
                max: 100000,
                grid: { color: gridColor },
                ticks: {
                  stepSize: 20000,
                  color: textColor,
                  font: { family: 'Plus Jakarta Sans', size: 10 },
                  callback: (val) => `₹ ${(val/1000).toFixed(0)}k`
                }
              }
            }
          }
        });
      } else {
        // Admin monthly company payroll trend in Lakhs
        const trendData = [1.8, 2.2, 2.4, 2.7, 3.0, 3.425];

        trendChartInstance = new Chart(ctxTrend, {
          type: 'line',
          data: {
            labels: trendLabels,
            datasets: [{
              data: trendData,
              borderColor: '#6D5DFC',
              backgroundColor: (context) => {
                const chart = context.chart;
                const { ctx, chartArea } = chart;
                if (!chartArea) return null;
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, 'rgba(109, 93, 252, 0.28)');
                gradient.addColorStop(1, 'rgba(109, 93, 252, 0.0)');
                return gradient;
              },
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointBackgroundColor: '#6D5DFC',
              pointBorderColor: '#FFF',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 7
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: isDark ? '#1F2937' : '#111827',
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  label: (ctx) => `₹ ${ctx.raw} Lakhs (₹ 3,42,500)`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 } }
              },
              y: {
                beginAtZero: true,
                max: 5,
                grid: { color: gridColor },
                ticks: {
                  color: textColor,
                  font: { family: 'Plus Jakarta Sans', size: 10 },
                  callback: (val) => val === 0 ? '₹ 0' : `₹ ${val}L`
                }
              }
            }
          }
        });
      }
    }
  }
};
