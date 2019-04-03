# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""Slycat uses `CouchDB <http://couchdb.apache.org>`_ as its primary storage
for projects, models, bookmarks, metadata, and small model artifacts.  For
large model artifacts such as :mod:`darrays<slycat.darray>`, the CouchDB
database stores links to HDF5 files stored on disk.
"""

from __future__ import absolute_import

import cherrypy
import abc
import uuid

import couchdb

class Database:
    """interface for the database"""

    def __init__(self, database):
        self._database = database

    @abc.abstractmethod
    def __getitem__(self, *arguments, **keywords):
        """
        returns an item base on an ID being passed
        :param arguments: 
        :param keywords: 
        :return: 
        """
        pass

    @abc.abstractmethod
    def delete(self, *arguments, **keywords):
        """
        delete a document from the database
        :param arguments: 
        :param keywords: 
        :return: status of the deletion
        """
        pass

    @abc.abstractmethod
    def get_attachment(self, *arguments, **keywords):
        """
        get attachment from the database
        :param arguments: 
        :param keywords: 
        :return: 
        """
        pass

    @abc.abstractmethod
    def put_attachment(self, *arguments, **keywords):
        """
        put an item in the database
        :param arguments: 
        :param keywords: 
        :return: 
        """
        pass

    @abc.abstractmethod
    def save(self, *arguments, **keywords):
        """
        save change to database, generally as a json doc
        :param arguments: 
        :param keywords: 
        :return: 
        """
        pass

    # TODO: find all occurances and rework loggic to move away from this
    @abc.abstractmethod
    def view(self, *arguments, **keywords):
        """
        deprecated needs to be scrubbed from the code
        :param arguments: 
        :param keywords: 
        :return: 
        """
        pass
    @abc.abstractmethod
    def scan(self, path, **keywords):
        """
        given a db scan for all docs with a certain field
        :param path: 
        :param keywords: 
        :return: 
        """
        pass

    @abc.abstractmethod
    def get(self, type, id):
        """
        get document based on the type and id given
        :param type: 
        :param id: 
        :return: 
        """
        pass

    @abc.abstractmethod
    def write_file(self, document, content, content_type):
        """
        add attachemnt to the database
        :param document: 
        :param content: 
        :param content_type: 
        :return: 
        """
        pass

    def __repr__(self):
        """
        adding this so we can use the cache decorator
        :return:
        """
        return "<slycat.web.server.database.Database instance>"


def connect():
    """Connect to a CouchDB database.

    Returns
    -------
    database : :class:`slycat.web.server.database.couchdb.Database`
    """
    server = couchdb.client.Server(url=cherrypy.tree.apps[""].config["slycat"]["couchdb-host"])
    database = Database(server[cherrypy.tree.apps[""].config["slycat"]["couchdb-database"]])
    return database
