# Slycat
<!--- [![TravisCI](https://travis-ci.org/sandialabs/slycat.svg?branch=master)](https://travis-ci.org/sandialabs/slycat)
[![Coverage Status](https://coveralls.io/repos/github/sandialabs/slycat/badge.svg?branch=master)](https://coveralls.io/github/sandialabs/slycat?branch=master)
[![Code Climate](https://codeclimate.com/github/sandialabs/slycat/badges/gpa.svg)](https://codeclimate.com/github/sandialabs/slycat)
[![Stories in Ready](https://badge.waffle.io/sandialabs/slycat.svg?label=ready&title=Ready)](http://waffle.io/sandialabs/slycat)
--->
[![Documentation Status](https://readthedocs.org/projects/slycat/badge/?version=latest)](https://slycat.readthedocs.io/en/latest/?badge=latest)


This is Slycat - a web-based ensemble analysis and visualization platform, created at [Sandia National Laboratories](http://www.sandia.gov).

# Quick Start

[Build Your own local slycat environment with docker-compose](https://github.com/sandialabs/slycat/tree/master/docker/compose/slycat-compose).

# Documentation

[Latest documentation can be found here](https://slycat.readthedocs.io/en/latest/).

# Slycat Data
A github repo of sample data that can be used by slycat is at [slycat-data](https://github.com/sandialabs/slycat-data).

****

# Ensemble analysis and Visualization

## Multiple Levels of Abstraction

* Ensemble summaries (correlations or similarities)

![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/ParameterSpaceExploration/LevelsOfAbstraction.png)

* Individual runs relative to the group (distributions or behaviors)

![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/ParameterSpaceExploration/LevelsOfAbstraction2.png)

* Run-specific data (numeric values, images, or videos)

![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/ParameterSpaceExploration/LevelsOfAbstraction3.png)

## Sensitivity Analysis
1. Model Understanding 
2. Model Validation
3. Model Simplification


![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/ParameterSpaceExploration/LevelsOfAbstraction4.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/ParameterSpaceExploration/LevelsOfAbstraction5.png)

## Parameter Space Exploration
1. Results Clustering
2. Design Optimization
3. Model Tuning

![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/ParameterSpaceExploration/ParameterSpaceExploration1.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/ParameterSpaceExploration/ParameterSpaceExploration2.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/ParameterSpaceExploration/ParameterSpaceExploration3.png)


## Anomaly Detection
1. Unique Features
2. Bugs

![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/Anomaly%20detection/AnomalyDetection1.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/Anomaly%20detection/AnomalyDetection2.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/Anomaly%20detection/AnomalyDetection3.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/Anomaly%20detection/AnomalyDetection4.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/Anomaly%20detection/AnomalyDetection5.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/Anomaly%20detection/AnomalyDetection6.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/Anomaly%20detection/AnomalyDetection7.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/docs/source/Sample-Images/Anomaly%20detection/AnomalyDetection8.png)

## Tests

If you use the development container, shell into it and run the tests as
described in the below sections.

If you aren't using the development container, here are some tips on getting
your environment set up for testing.

Make sure your PYTHONPATH is set correctly. You may need to add the slycat
packages directory for the unit tests to work:

```bash
PYTHONPATH=(path to slycat src)/packages
```

Also, you should install the same modules as slycat uses (e.g. CherryPy, pillow,
etc). For some tests, you'll also need testing modules imported by the current
tests in the codebase. At present these are:
- nose
- selenium
- pyvirtualdisplay (also install xvfb in the OS if needed)


### Unit Tests
Unit tests are mostly using py.test. If you have coverage, you can run them from
the root slycat folder with

```bash
py.test test/
```

If you have the coverage package, you can run the tests and generate both stdout
and html coverage output with


```bash
coverage run --source . -m py.test ; coverage html
```

You can leave off the _coverage html_ if you don't want the html output. By
default, the output will generate in the _htmlcov_ directory.

### Integration Tests

You can run behave tests by simply running behave since slycat uses the default
name, _features_.

### End-to-end Tests

Install and run the slycat-developer image as described above. Set the
SLYCAT_TEST_SERVER environment variable to the uri of your test server being
used for these tests. Then from the host (not inside the container), run

```bash
behave end-to-end-tests
```

A new browser instance will open up and will try to load slycat. You may need to
accept the https exception. Once you get to the login page, enter the default
username/password for the container (slycat:slycat). The tests should run, and
you may see the test suite interacting with the browser as it carries out its tests.
