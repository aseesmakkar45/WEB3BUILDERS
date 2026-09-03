import subprocess
import os

try:
    bin_path = r"C:\Users\lenovo\AppData\Roaming\npm\swytchcode.CMD"
    result = subprocess.run([bin_path, "search", "search"], capture_output=True, text=True, check=False)
    with open("swytchcode_search_output.txt", "w", encoding="utf-8") as f:
        f.write("STDOUT:\n")
        f.write(result.stdout)
        f.write("\nSTDERR:\n")
        f.write(result.stderr)
except Exception as e:
    with open("swytchcode_search_output.txt", "w", encoding="utf-8") as f:
        f.write(f"Error: {e}")
