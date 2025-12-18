import subprocess
import sys
import os

def run_js_tests():
    print("Executing Vitest regression suite via python wrapper...")
    try:
        # Use shell=True for Windows powershell environment
        result = subprocess.run(["npm", "run", "test"], shell=True, check=True)
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"Tests failed with exit code: {e.returncode}")
        return False
    except FileNotFoundError:
        print("Error: 'npm' command not found. Ensure Node.js is installed.")
        return False

if __name__ == "__main__":
    success = run_js_tests()
    if success:
        print("Regression tests passed!")
        sys.exit(0)
    else:
        sys.exit(1)
