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


The Slycat™ system integrates scalable analysis, visualization, HPC file system access, and data management, via commodity web clients using a multi-tiered hierarchy of computation and data storage. The web-based service delivers a collaborative platform for researchers and engineers to coproduce an analysis and share their results and discoveries. The system is access-controlled to allow project owners to designate who can see the analysis models and who can change models in the project. Most analysis models are computed on the Slycat™ server with model artifacts stored in a project database. These artifacts are the basis for visualizations that are delivered to users’ desktops through ordinary web browsers. Storing features of an ensemble on the Slycat™ server leaves the big data in place on HPC systems and gives users fast interaction and exploration while remaining scalable.

Exploring remote simulation artifacts, such as images and 3D surfaces, is made easy through the Slycat™ agent architecture. The Parameter Space model enables a user to connect features in a plotted numerical domain to explanatory images or artifacts stored on an remote system. These images can convey real or concrete intuition about why particular samples have similar features in an abstract quantitative space.

**Slycat™ Analysis Models**

A handful of analysis models provides complimentary views into a dataset or ensemble. Often one model reveals a unique pattern or a group of outliers in the data, and another model allows deeper exploration of the data to discover the cause of the pattern or outliers.  Here is a brief overview of models.

* **Canonical Correlation Analysis (CCA) Model:** Reveals relationships between simulation input parameters and output responses (or generically, between independents variables and dependent variables). Excels at analysis for sensitivity and parametric studies.

* **Parameter Space Model:** An exploratory visual interface that combines a filterable scatterplot representation with remote Slycat™ agent access to images, videos, and other media-based ensemble data.

* **Timeseries Model:** Features clustering and comparative visualization for time-varying measurements or signals, such as simulation heartbeat files and waveforms.

* **Dial-A-Cluster Model:** Allows interactive visualization of multivariate time series data.

* **VideoSwarm Model:** Slycat™ watches hundreds of simulation animation results and illustrates their similarity (or dissimilarity) through time, along with live videos to accompany the quantitative clustering.


**Slycat™ Interaction & Usage**

The Slycat™ service is composed of the Slycat™ server, a user’s client (often a web browser) interacting with the server, and the remote system agent launched and controlled by the server. The typical user interaction is via a web browser, such as Firefox, Chrome, or Safari. However, the Slycat™ server’s RESTful API enables multiple usage and interaction paradigms. There are many options for Slycat™ clients:

* A web browser enables a user to both create analysis models and to explore their data.

* The :ref:`slypi-ref-label` enables automated or scripted model creation and extended analysis and post-processing.

* The Sandia Analyst Workbench (SAW) enables automated post-processing and Slycat™ model creation from SAW (leveraging either the Slycat-SAW Integration or the SlyPI library).

* The RESTful API enables users to engage Slycat™ directly from their own code.

* A Slycat™ analysis or visualization may be embedded in a focused engineering or simulation application, providing reusable, as-a-service visualization and analytics components.



.. toctree::
  :maxdepth: 3
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

