"""
1-Click Launcher for Payroll Database Management System
College of Engineering Vadakara - Group 4
Starts FastAPI SQLite Backend and opens the Frontend in browser.
"""

import sys
import webbrowser
import threading
import time
import uvicorn

def open_browser():
    time.sleep(1.2)
    print(">> Opening Payroll Register in your browser at http://127.0.0.1:8000 ...")
    try:
        webbrowser.open("http://127.0.0.1:8000")
    except Exception as e:
        print(f"Could not open browser automatically: {e}")

if __name__ == "__main__":
    print("=" * 65)
    print("   AUTOMATED PAYROLL MANAGEMENT SYSTEM (DBMS PROJECT)")
    print("   Group 4: Sahad Rafeeque P P, Varna V, Gopika M M")
    print("   College of Engineering Vadakara (CEV)")
    print("=" * 65)
    print("Starting FastAPI Backend with SQLite database...")
    print("Interactive Swagger API Docs: http://127.0.0.1:8000/docs")
    print("Frontend Dashboard: http://127.0.0.1:8000")
    print("=" * 65)

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=False)
