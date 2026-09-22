import pytest
from vulnchecker.scanner import scan, Package

@pytest.mark.asyncio
async def test_scan_package():
    packages = [
        Package(name="express", version="4.18.2", ecosystem="npm", type="dependency")
    ]
    
    results = await scan(packages)
    assert len(results) == 1
    assert results[0].package.name == "express"

@pytest.mark.asyncio
async def test_scan_empty():
    results = await scan([])
    assert len(results) == 0
