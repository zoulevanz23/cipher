import pytest
from vulnchecker.config import should_ignore

def test_should_ignore():
    config = {
        "ignore": ["lodash", "axios"],
        "ignore_until": {
            "react": "2024-12-31"
        }
    }
    
    assert should_ignore("lodash", config) == True
    assert should_ignore("axios", config) == True
    assert should_ignore("express", config) == False

def test_defaults():
    config = {
        "ignore": [],
        "ignore_until": {}
    }
    
    assert should_ignore("any-package", config) == False
