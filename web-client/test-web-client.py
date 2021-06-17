# This script does unit/integration testing on slycat.web.client.
#
# To run the tests, type:
# $ python -m unittest test-web-client.py
#
# Modify SLYCAT_CONNECTION to use a slycat server running on
# either localhost or qual.
# 
# NOTE: Models are created but not destroyed.
#
# S. Martin
# 11/17/2020

import unittest
import warnings

# slycat web client code to test
import slycat.web.client
import slycat.web.client.list_markings as list_markings
import slycat.web.client.list_projects as list_projects
import slycat.web.client.cca_random as cca_random
import slycat.web.client.dac_tdms as dac_tdms

# slycat connection parameters for localhost
SLYCAT_CONNECTION = ['--user', 'slycat', '--password', 'slycat',
                     '--port', '9000', '--no-verify']

# test marking for localhost
TEST_MARKING = ['--marking', 'faculty']

# slycat connection for qual
# SLYCAT_CONNECTION = ['--host', 'https://slycat-srn-qual1.sandia.gov',
#                      '--kerberos']

# test marking for qual
# TEST_MARKING = ['--marking', 'ouo3']

# testing project name
TEST_PROJECT = ['--project-name', 'Unit/Integration Testing']

# test landmakrs
TEST_LANDMARKS = ['--num-landmarks', '30']

# tdms data information
TDMS_FILE = ['../../dac-switchtubes/4A3392_99_092920_101_Setup.tdms']
TDMS_ZIP = ['../../dac-switchtubes/2A8181_02_000001_Data Package/2A8181_02_000001_001.zip']

# turn off warnings for all tests
def ignore_warnings(test_func):
    def do_test(self, *args, **kwargs):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            test_func(self, *args, **kwargs)
    return do_test

# tests a few of the different pieces of slycat.web.client, 
# set connection information in paramters above
class TestSlycatWebClient(unittest.TestCase):

    # connect to local host
    def connect_to_server(self, arguments=None):

        # call parser with Slycat docker arguments
        parser = slycat.web.client.ArgumentParser()
        if not arguments:
            arguments = parser.parse_args(SLYCAT_CONNECTION)
        
        # connect to Slycat
        connection = slycat.web.client.connect(arguments)
        
        return arguments, connection

    @ignore_warnings
    def test_connection(self):
        """
        Test that we can connect to Slycat.
        """

        self.connect_to_server()

    @ignore_warnings
    def test_list_markings(self):
        """
        Test list markings on localhost.
        """

        # list markings
        arguments, connection = self.connect_to_server()
        list_markings.main(connection)

    @ignore_warnings
    def test_list_projects(self):
        """
        Test list projects on localhost.
        """

        # list projects
        arguments, connection = self.connect_to_server()
        list_projects.main(arguments, connection)

    @ignore_warnings
    def test_random_cca(self):
        """
        Test random CCA model creation.
        """

        # create random CCA model
        arguments = cca_random.parse_arguments(SLYCAT_CONNECTION + TEST_MARKING +
                                               TEST_PROJECT)
        arguments, connection = self.connect_to_server(arguments)
        mid = cca_random.main(arguments, connection)

    @ignore_warnings
    def test_dac_tdms(self):
        """
        Test DAC TDMS loader.
        """

        # create TDMS model from one file
        tdms_parser = dac_tdms.parser()
        arguments = tdms_parser.parse_args(SLYCAT_CONNECTION + TDMS_FILE +
                                           TEST_MARKING + TEST_PROJECT)
        dac_tdms.create_model(arguments, dac_tdms.log)

    @ignore_warnings
    def test_dac_tdms_zip(self):
        """
        Test DAC TDMS zip loader.
        """

        # create TDMS model from zip file
        tdms_parser = dac_tdms.parser()
        arguments = tdms_parser.parse_args(SLYCAT_CONNECTION + TDMS_ZIP +
                                           TEST_MARKING + TEST_PROJECT)
        dac_tdms.create_model(arguments, dac_tdms.log)

    @ignore_warnings
    def test_dac_tdms_zip_landmarks(self):
        """
        Test DAC TDMS zip loader with landmarks.
        """

        # create TDMS model from zip file
        tdms_parser = dac_tdms.parser()
        arguments = tdms_parser.parse_args(SLYCAT_CONNECTION + TDMS_ZIP +
                                           TEST_MARKING + TEST_PROJECT + TEST_LANDMARKS)
        dac_tdms.create_model(arguments, dac_tdms.log)

if __name__ == '__main__':
    unittest.main()
