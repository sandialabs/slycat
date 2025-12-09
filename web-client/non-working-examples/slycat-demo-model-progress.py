# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import datetime
import numpy
import slycat.web.client
import threading
import time


def generate_model(connection, pid, marking, index):
    def random_failure(probability):
        if numpy.random.uniform(0, 1) < probability:
            connection.update_model(
                mid,
                state="finished",
                result="failed",
                finished=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                message="RANDOM FAILURE!!!",
            )
            return True
        return False

    # Wait awhile before starting
    time.sleep(numpy.random.uniform(0, 5))

    mid = connection.post_project_models(
        pid,
        "generic",
        "Model %s %s" % (index, datetime.datetime.now(datetime.timezone.utc)),
        marking,
    )

    if random_failure(probability=0.01):
        return

    # Simulate uploading
    for index, progress in enumerate(numpy.linspace(0, 1, 4)):
        connection.update_model(
            mid, progress=progress, message="Uploading artifact %s" % index
        )
        if random_failure(probability=0.01):
            return
        time.sleep(numpy.random.uniform(0.1, 2))

    # Simulate computing
    for timestep, progress in enumerate(numpy.linspace(0, 1)):
        connection.update_model(
            mid, state="running", progress=progress, message="Timestep %s" % timestep
        )
        if random_failure(probability=0.005):
            return
        time.sleep(numpy.random.uniform(0.1, 0.5))

    # The model is ready
    connection.update_model(
        mid,
        state="finished",
        result="succeeded",
        finished=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        progress=1.0,
        message="",
    )


parser = slycat.web.client.ArgumentParser()
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument(
    "--model-count", type=int, default=8, help="Model count.  Default: %(default)s"
)
parser.add_argument(
    "--project-name",
    default="Demo Model Progress Project",
    help="New project name.  Default: %(default)s",
)
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)
pid = connection.find_or_create_project(arguments.project_name)

threads = [
    threading.Thread(
        target=generate_model, args=(connection, pid, arguments.marking, i)
    )
    for i in range(arguments.model_count)
]
for thread in threads:
    thread.start()
for thread in threads:
    thread.join()
