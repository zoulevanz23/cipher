import pytest
from vulnchecker.parser import parse_dependencies

def test_parse_package_json():
    package_json = '''
    {
        "dependencies": {
            "express": "^4.18.0",
            "lodash": "^4.17.21"
        },
        "devDependencies": {
            "jest": "^29.0.0"
        }
    }
    '''
    
    packages = parse_dependencies(package_json_str=package_json)
    assert len(packages) == 3
    
    package_names = [p.name for p in packages]
    assert "express" in package_names
    assert "lodash" in package_names
    assert "jest" in package_names

def test_parse_lock_file():
    lock_file = '''
    {
        "name": "test",
        "lockfileVersion": 2,
        "packages": {
            "node_modules/express": {
                "version": "4.18.2"
            }
        }
    }
    '''
    
    packages = parse_dependencies(lock_file_str=lock_file, lock_file_type="package-lock.json")
    assert len(packages) > 0
