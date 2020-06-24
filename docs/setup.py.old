import os
import shutil
import subprocess

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
docs_dir = os.path.join(root_dir, "docs")
build_dir = os.path.join(docs_dir, "_build")

# Always build the documentation from scratch.
if os.path.exists(build_dir):
  shutil.rmtree(build_dir)

# Generate the HTML documentation.
subprocess.check_call(["make", "html"], cwd=docs_dir)
