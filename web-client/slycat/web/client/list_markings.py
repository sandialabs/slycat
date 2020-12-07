# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

# This script lists the markings supported by the Slycat server.

import slycat.web.client
import numpy

# call to server to get markings and display results
def main(connection):

    # get markings
    markings = connection.get_configuration_markings()

    # output markings
    type_width = numpy.max([len(marking["type"]) for marking in markings])
    label_width = numpy.max([len(marking["label"]) for marking in markings])
    print()
    print("{:>{}} {:<{}}".format("Marking", type_width, "Description", label_width))
    print("{:>{}} {:<{}}".format("-" * type_width, type_width, "-" * label_width, label_width))
    for marking in markings:
        print("{:>{}} {:<{}}".format(marking["type"], type_width, marking["label"], label_width))
    print()

# command line entry point
if __name__ == "__main__":

    # get arguments for connecting to Slycat server
    parser = slycat.web.client.ArgumentParser(
        description="Display available marking types supported by the Slycat server.")
    arguments = parser.parse_args()

    # connect and get markings
    connection = slycat.web.client.connect(arguments)

    # call server to get markings
    main(connection)