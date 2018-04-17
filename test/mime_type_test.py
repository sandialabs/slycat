# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import pytest
import os
from slycat import mime_type

csv_example = """MIME-Version: 1.0
Content-Type: dorg/csv
"""

sample_csv = 'test/fixtures/sample.csv'
empty_file = 'test/fixtures/empty'

def setup_module(self):
  csv = open(sample_csv, 'w')
  csv.write('1,1,2,3,5,8,13,-7')
  csv.close()

  empty = open(empty_file, 'w')
  empty.write('')
  empty.close()

def test_guess_csv_extension():
  assert str(mime_type.guess_extension('text/csv', False)) == '.csv'

def test_guess_extension_sets_none_if_not_guessed():
  assert mime_type.guess_extension('text/gorg', False) == None

def test_guess_type_defaults_to_application_octet():
  assert mime_type.guess_type(empty_file) == ('application/octet-stream', None)

def test_guess_type_given_filename():
  assert mime_type.guess_type(sample_csv) == ('text/csv', None)

def teardown_module(self):
  os.remove(sample_csv)
  os.remove(empty_file)
