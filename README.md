# Slycat

This is Slycat - a web-based data science analysis and visualization platform, created at [Sandia National Laboratories](http://www.sandia.gov).

The goal of the Slycat project is to develop the processes, tools and techniques to support data science, particularly analysis of large, high-dimensional data.

# Design

Slycat incorporates several components:

* A Web Server that can load, transform, index, and analyze moderate amounts of data, storing the analysis results for later visualization.
* A web-based user interface that you use to pull your data into the Slycat Web Server, compute
  analyses, and view analysis results. You can use Slycat with any modern,
  standards-compliant browser, including Firefox, Safari, and Chrome.  There is
  no software to install on your workstation.
* A collection of command-line clients that can be used to push data into
  Slycat Web Server and control it remotely, if that suits your workflow better.
* *New!* An Analysis Server that can load, transform, index, and analyze extremely large data, under interactive or automated control.

The Slycat Web Server provides easy collaboration and a graphical user interface for analyses that have broad appeal, while the Slycat Analysis Server provides highly-scalable, highly-interactive analysis for ad-hoc data exploration and power users who prefer an interactive shell interface / scripted environments.

To get started see our [Documentation](https://github.com/sandialabs/slycat/wiki).
