# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import sys

names = [line.strip()[1:-1] for line in open("cars.names")]
data = [line.split() for line in open("cars.data")]
data = [["NaN" if field == "NA" else float(field) for field in row] for row in data]

sys.stdout.write("Model,MPG,Cylinders,Displacement,Horsepower,Weight,Acceleration,Year,Origin\n")
for name, fields in zip(names, data):
  sys.stdout.write("%s\n" % ",".join([name] + [str(field) for field in fields]))


