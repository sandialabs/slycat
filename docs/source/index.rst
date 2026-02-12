.. slycat documentation master file, created by
   sphinx-quickstart on Mon Jul 28 14:35:30 2014.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Welcome!
========

This is Slycat™ - a web-based data science analysis and visualization platform,
created at `Sandia National Laboratories <http://www.sandia.gov>`_.

Slycat™ is a web-based system for analysis of large, high-dimensional
data, developed to provide a collaborative platform for remote analysis
of data ensembles. An *ensemble* is a collection of data sets, typically
produced through a series of related simulation runs. More generally, an
ensemble is a set of samples, each consisting of the same set of
variables, over a shared high-dimensional space describing a particular
problem domain. Ensemble analysis is a form of meta-analysis that looks
at the combined behaviors and features of a group of simulations in an
effort to understand and describe the underlying domain space. For
instance, sensitivity analysis uses ensembles to examine how simulation
input parameters and simulation results are correlated. By looking at
groups of runs as a whole, higher level patterns can be seen despite
variations in the individual runs.

The Slycat™ system integrates data management, scalable analysis, and
visualization via commodity web clients using a multi-tiered hierarchy
of computation and data storage. Analysis models are computed local or
on the Slycat™ server, and model artifacts are stored in a project
database. These artifacts are the basis for visualizations that are
delivered to users’ desktops through ordinary web browsers. Slycat™
currently provides two types of analysis: canonical correlation analysis
(CCA) to model relationships between inputs and output metrics, and time
series analysis featuring clustering and comparative visualization of
waveforms.

Design
======

Slycat™ incorporates several components:

* A Web Server that can load, transform, index, and analyze moderate amounts of data, storing the analysis results for later visualization.
* A web-based user interface that you use to pull your data into the Slycat™ Web Server, compute analyses, and view analysis results. You can use Slycat™ with any modern, standards-compliant browser, including Firefox, Safari, and Chrome.  There is no software to install on your workstation.
* A collection of command-line clients that can be used to push data into Slycat™ Web Server and control it remotely, if that suits your workflow better.

The Slycat™ Web Server provides easy collaboration and a graphical user
interface for analyses that have broad appeal.

.. toctree::
  :maxdepth: 2
  :caption: User Documentation

  manual/user-manual.rst

.. toctree::
  :maxdepth: 1
  :caption: Developer Documentation

  QuickStart.rst
  design.rst
  coding-guidelines.rst
  colophon.rst
  rest-api.rst
  python-api.rst

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`

