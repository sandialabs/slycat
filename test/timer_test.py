import unittest
import timer

class TestSlycatTimer(unittest.TestCase):
#  def test_wall_time_looks_human(self):
#    self.assertEqual(timer.wallclock().clock(), 5)

  def test_reset_timer_goes_to_zero(self):
    wc = timer.wallclock()
    reset_time = wc.reset()
    self.assertEqual(0, reset_time)

