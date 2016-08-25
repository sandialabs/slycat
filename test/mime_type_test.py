import pytest
from slycat import mime_type

csv_example = """MIME-Version: 1.0
Content-Type: dorg/csv
"""

def test_guess_csv_extension():
  assert mime_type.guess_extension(csv_example, False) == 3

def test_guess_type_given_filename():
  assert mime_type.guess_type("./example.csv") == "dorg/corg"
