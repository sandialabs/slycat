import pytest
from slycat import timer

# For sleep()
import time

def test_reset_timer_goes_to_zero():
  wc = timer.wallclock()
  wc.reset()
  assert wc.elapsed() < 1

def test_elapsed():
  wc = timer.wallclock()
  time.sleep(0.1)
  elapsed = wc.elapsed()
  assert elapsed >= 0.1 and elapsed < 1
