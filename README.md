# Slycat
[![TravisCI](https://travis-ci.org/sandialabs/slycat.svg?branch=master)](https://travis-ci.org/sandialabs/slycat)
[![Coverage Status](https://coveralls.io/repos/github/sandialabs/slycat/badge.svg?branch=master)](https://coveralls.io/github/sandialabs/slycat?branch=master)
[![Code Climate](https://codeclimate.com/github/sandialabs/slycat/badges/gpa.svg)](https://codeclimate.com/github/sandialabs/slycat)
[![Stories in Ready](https://badge.waffle.io/sandialabs/slycat.svg?label=ready&title=Ready)](http://waffle.io/sandialabs/slycat)


This is Slycat - a web-based ensemble analysis and visualization platform, created at [Sandia National Laboratories](http://www.sandia.gov).

# Slycat Demo
You can try out slycat at https://myslycat.com

Username: demo  
Password: demo

The data in this demo instance of Slycat is erased on a regular basis, so please don't upload anything you intend to keep.

# [Slycat-data](https://github.com/sandialabs/slycat-data)
A github repo of sample data that can be used by slycat.

# Quick Start

## Run from docker hub image (fastest way to start playing with slycat)

1. Download and install [Docker](http://www.docker.com).
1. Pull the Slycat image with the following command:  
`docker pull slycat/slycat-developer`
2. Get Slycat running on localhost:  
`docker run -p 2222:22 -p 80:80 -p 443:443 -d --name slycat slycat/slycat-developer`  
3. Visit your local instance of Slycat at <https://localhost>  
You can log in with any username as long as the password is the same as the username. For example:  
Username: slycat  
Password: slycat  
Also, your browser will probably notify you of a privacy issue because we provide a self-signed certificate. You can proceed anyway.
4. You can ssh to your local slycat container:  
`ssh slycat@localhost -p 2222`  
The password is `slycat`
5. Once inside your container, you can update the Slycat source code like so:  
    a. `cd ~/src/slycat`  
    b. `git pull`  
Slycat will automatically restart to pick up any new changes.
6. To exit your container:  
`exit`
3. Once you're out of your container, you can stop Slycat:  
`docker stop slycat`
4. And start it back up:  
`docker start slycat`  
(don't run the `docker run` command from step 3 again, it's only required the first time you start Slycat)
5. Set up a firewall on the host machine if you are deploying Slycat. Port 2222 will be exposed on the host while the slycat-developer container is running. At the very least, use a firewall to block port 2222, since anyone will be able to ssh into your slycat-developer container using the same 'slycat' password as you. A better firewall configuration would block all ports except 80, 443, and 22 (or whichever port you use to ssh to the host).


# Slower Start

## Build/Run slycat image from scratch command line
* install [Docker](http://www.docker.com) 
* clone the slycat repo 
```bash
git clone https://github.com/sandialabs/slycat.git
```
* in a terminal shell move into the /open-source-build directory inside the repo
```bash
cd /open-source-docker/docker/open-source-build/
python build.py slycat-developer-image
```
* make the container
```bash
docker run -p 2222:22 -p 80:80 -p 443:443 -p 5984:5984 -d --name slycat-developer sandialabs/slycat-developer
```
* log into slycat and play around! https://localhost/login/slycat-login.html
* for logging into this quick container the only requirement is username = pasword
* root user:pass is slycat:slycat for the container
```bash
ssh slycat@localhost -p 2222
```

****

# Ensemble analysis and Visualization

## Multiple Levels of Abstraction

* Ensemble summaries (correlations or similarities)

![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/ParameterSpaceExploration/LevelsOfAbstraction.png)

* Individual runs relative to the group (distributions or behaviors)

![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/ParameterSpaceExploration/LevelsOfAbstraction2.png)

* Run-specific data (numeric values, images, or videos)

![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/ParameterSpaceExploration/LevelsOfAbstraction3.png)

##Sensitivity Analysis
1. Model Understanding 
2. Model Validation
3. Model Simplification


![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/ParameterSpaceExploration/LevelsOfAbstraction4.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/ParameterSpaceExploration/LevelsOfAbstraction5.png)

## Parameter Space Exploration
1. Results Clustering
2. Design Optimization
3. Model Tuning

![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/ParameterSpaceExploration/ParameterSpaceExploration1.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/ParameterSpaceExploration/ParameterSpaceExploration2.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/ParameterSpaceExploration/ParameterSpaceExploration3.png)


## Anomaly Detection
1. Unique Features
2. Bugs


![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/Anomaly%20detection/AnomalyDetection1.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/Anomaly%20detection/AnomalyDetection2.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/Anomaly%20detection/AnomalyDetection3.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/Anomaly%20detection/AnomalyDetection4.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/Anomaly%20detection/AnomalyDetection5.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/Anomaly%20detection/AnomalyDetection6.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/Anomaly%20detection/AnomalyDetection7.png)
![alt tag](https://github.com/sandialabs/slycat/blob/master/Sample-Images/Anomaly%20detection/AnomalyDetection8.png)

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
