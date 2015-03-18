import subprocess

subprocess.call(["coverage", "run", "--source", "packages", "-m", "behave"])
subprocess.call(["coverage", "report"])
subprocess.call(["coverage", "html", "--directory", ".cover"])

