import pytest
from vulnchecker.history import save_scan, get_history, get_scan

def test_save_and_get_scan():
    user_id = 1
    summary = {
        "total_packages": 10,
        "vulnerable_packages": 2,
        "total_vulnerabilities": 5
    }
    results = [{"package": "test", "vulnerabilities": []}]
    fixes = [{"package": "test", "current_version": "1.0.0", "recommended_version": "1.0.1"}]
    
    scan_id = save_scan(user_id, summary, results, fixes, "test-project")
    assert scan_id > 0
    
    # Retrieve the scan
    scan = get_scan(scan_id)
    assert scan is not None
    assert scan["project_name"] == "test-project"

def test_get_history():
    user_id = 1
    # Save a few scans
    for i in range(3):
        save_scan(user_id, {"total_packages": i}, [], [], f"project-{i}")
    
    history = get_history(user_id, limit=10)
    assert len(history) == 3
