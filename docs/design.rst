.. _design:

Design
======

Because Slycat™ is a system for analysis of data ensembles, and ensembles
typically include orders of magnitude more data than individual simulation
runs, managing data movement is an integral part of the Slycat™ design.
Ideally, we want to perform one-time computation on the host where data lives
so that only an analytical model -- typically orders of magnitude smaller than
the original data -- is moved across the network to the Slycat™ host.  This
leads to the following Slycat™ architectural design:

.. image:: remote-computation.*

In the above case, large data on an HPC platform is analyzed in-place to
produce greatly reduced model artifacts that are stored by the Slycat™ web
server.  Later, these artifacts are delivered -- incrementally and on-demand --
to interactive clients.

However, it isn't always possible to reduce the analytical workflow to an
ideal, reduced-size model.  For example, users may wish to interactively browse
through the raw outputs of an ensemble of simulations.  For this case, Slycat™
provides a remote "agent" process that can access data on an HPC platform,
packaging and compressing it on-demand for live delivery to interactive
clients:

.. image:: remote-retrieval.*

As an example, this mode of interaction is ideal for browsing through output
image series on a remote server - in addition to delivering individual images,
the agent can compress images on-the-fly into video streams for live playback.
