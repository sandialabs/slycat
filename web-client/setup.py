# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
# Under the terms of Contract DE-NA0003525 with National Technology and Engineering 
# Solutions of Sandia, LLC, the U.S. Government retains certain rights in this software.

# This script creates a Python distribution wheel for the Slycat
# web client.  When run, it copies the latest version of slycat.web.client
# into the slycat_web_client directory 
#
# S. Martin
# 10/23/2020

# To publish to PyPi, perform the following steps:
#
# $ rm -rf dist
# $ python setup.py sdist bdist_wheel
# $ twine upload dist/*
#
# To publish to testpypi, use:
#
# $ twine upload --repository-url https://test.pypi.org/legacy/ dist/*
#
# The first step builds the distribution, and the second step
# uploads to PyPi.  To install the package from another computer use:
#
# $ pip install slycat-web-client
#
# To install from testpypi, use:
#
# $ pip install --extra-index-url https://testpypi.python.org/pypi slycat-web-client 
#   --upgrade --trusted-host testpypi.python.org --proxy wwwproxy.sandia.gov:80
#
# NOTE: Any local changes to slycat/web/client/__init__.py will be overwritten
# when you run this command!  Changes should be made to pacakges/slycat/web/client

from shutil import copyfile

# copy slycat.web.client and slycat.darray into slycat_web_client directory. This
# makes the slycat_web_directory a Python package without other Slycat dependencies.
copyfile('../packages/slycat/web/client/__init__.py', 'slycat/web/client/__init__.py')
copyfile('../packages/slycat/darray.py', 'slycat/darray.py')

# also copy the __init__.py files, which include the Slycat version number
copyfile('../packages/slycat/__init__.py', 'slycat/__init__.py')
copyfile('../packages/slycat/web/__init__.py', 'slycat/web/__init__.py')

# get Slycat version
import slycat
VERSION = slycat.__version__

# development version
# VERSION = VERSION
VERSION = "3.1.2"

# get README.md
import pathlib

# directory containing this file
HERE = pathlib.Path(__file__).parent

# text of the web-client-readme.txt file
README = (HERE / "README.md").read_text()

# create distribution
import setuptools

# create Python distribution wheel
from setuptools import setup

setup(
    name="slycat-web-client",
    version=VERSION,
    description="Slycat web client utilties for interacting with the Slycat " +
                "data analysis and visualization server.",
    long_description=README,
    long_description_content_type="text/markdown",
    url="https://github.com/sandialabs/slycat",
    author="Shawn Martin",
    author_email="smartin@sandia.gov",
    license="Sandia",
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
    ],
    packages=setuptools.find_packages(),
    include_package_data=True,
    install_requires=["requests", "requests-kerberos",
                      "numpy", "cherrypy"],
    entry_points={
        "console_scripts": [
            "dac_tdms=slycat.web.client.dac_tdms:main",
            "dac_tdms_batch=slycat.web.client.dac_tdms_batch:main"
        ]
    },
)
