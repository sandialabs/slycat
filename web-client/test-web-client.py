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
import slycat.web.client.ps_csv as ps_csv
import slycat.web.client.dac_gen as dac_gen
import slycat.web.client.dac_run_chart as dac_run_chart

# slycat connection parameters for localhost
SLYCAT_CONNECTION = ['--user', 'slycat', '--password', 'slycat',
                     '--port', '9000', '--no-verify']

# test marking for localhost
TEST_MARKING = ['--marking', 'faculty']

# slycat connection for qual
SLYCAT_CONNECTION = ['--host', 'https://slycat-srn-qual1.sandia.gov',
                     '--kerberos']

# slycat connection for prod2
SLYCAT_CONNECTION = ['--host', 'https://slycat-prod2.sandia.gov',
                     '--kerberos']

# test marking for qual/prod2
TEST_MARKING = ['--marking', 'ouo3']

# testing project name
TEST_PROJECT = ['--project-name', 'Unit/Integration Testing']

# test landmakrs
TEST_LANDMARKS = ['--num-landmarks', '30', '--model-name', 'DAC Landmarks']

# test PCA
TEST_PCA_COMPS = ['--num-PCA-comps', '10', '--model-name', 'DAC PCA']

# tdms data information
TDMS_FILE = ['../../dac-switchtubes/4A3392_99_092920_101_Setup.tdms']
TDMS_ZIP = ['../../dac-switchtubes/2A8181_02_000001_Data Package/2A8181_02_000001_001.zip']

# DAC run chart files
RUN_CHART_DIR = ['../../dac-switchtubes/']
RUN_CHART_PART_NUM = ['2A1828']
RUN_CHART_OUTPUT = ['../../dac-switchtubes/TestRunChart.zip']
RUN_CHART_INFER = ['--infer-last-value']

# parameter space files
CARS_FILE = ['../../slycat-data/cars.csv']
PP_FILE = ['../../slycat-data/punch_plate_10_random_samples_3D.csv']

# DAC PCA weather file
DAC_PCA_FILE = ['../../slycat-data/dial-a-cluster/weather-dac-gen-pca.zip']

# input/output columns for cars data file
CARS_INPUT = ['--input-columns', 'Model', 'Cylinders', 'Displacement', 'Weight',
              'Year', 'Origin']
CARS_OUTPUT = ['--output-columns', 'MPG', 'Horsepower', 'Acceleration']

# input/output/media for punch plate file
PP_INPUT = ['--input-columns', 'velocity', 'friction', 
            'density_1', 'density_2', 'density_3', 
            'youngs_1', 'youngs_2', 'youngs_3']
PP_OUTPUT = ['--output-columns',
             'element_10616_punch_tip_STRESS_xx_MIN', 'element_10616_punch_tip_STRESS_xx_MAX',
             'element_10616_punch_tip_STRESS_yy_MIN', 'element_10616_punch_tip_STRESS_yy_MAX',
             'element_10616_punch_tip_STRESS_zz_MIN', 'element_10616_punch_tip_STRESS_zz_MAX',
             'element_10616_punch_tip_STRESS_xy_MIN', 'element_10616_punch_tip_STRESS_xy_MAX',
             'element_10616_punch_tip_STRESS_yz_MIN', 'element_10616_punch_tip_STRESS_yz_MAX',
             'element_10616_punch_tip_STRESS_zx_MIN', 'element_10616_punch_tip_STRESS_zx_MAX']
PP_MEDIA = ['--media-columns', '3D']
PP_HOSTNAME = [] # ['--media-hostname', 'slycat']
PP_STRIP = [] # ['--strip', '1']

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

    # test dac tdms loader with PCA
    @ignore_warnings
    def test_dac_tdms_pca(self):
        """
        Test DAC TDMS zip loader using PCA.
        """

        # create TDMS model using PCA from zip file
        tdms_parser = dac_tdms.parser()
        arguments = tdms_parser.parse_args(SLYCAT_CONNECTION + TDMS_ZIP +
                                           TEST_MARKING + TEST_PROJECT + TEST_PCA_COMPS)
        dac_tdms.create_model(arguments, dac_tdms.log)

    # test dac run chart loader
    @ignore_warnings
    def test_dac_run_chart(self):
        """
        Test DAC Run Chart creation script.
        """

        # create run chart model from 2A1828
        run_chart_parser = dac_run_chart.parser()
        arguments = run_chart_parser.parse_args(SLYCAT_CONNECTION + 
                        RUN_CHART_DIR + RUN_CHART_PART_NUM + RUN_CHART_OUTPUT +
                        RUN_CHART_INFER + TEST_MARKING + TEST_PROJECT)
        dac_run_chart.create_model(arguments, dac_run_chart.log)

    @ignore_warnings
    def test_ps_cars(self):
        """
        Test Parameter Space loader with cars.csv file.
        """

        # create PS model from cars.csv
        ps_parser = ps_csv.parser()
        arguments = ps_parser.parse_args(SLYCAT_CONNECTION + CARS_FILE + CARS_INPUT + 
                                         CARS_OUTPUT + TEST_MARKING + TEST_PROJECT)
        ps_csv.create_model(arguments, ps_csv.log)

    @ignore_warnings
    def test_ps_punch_plate(self):
        """
        Test Parameter Space loader with punch_plate_10_random_samples_3D.csv file.
        """

        # create PS model from punch_plate file
        ps_parser = ps_csv.parser()
        arguments = ps_parser.parse_args(SLYCAT_CONNECTION + PP_FILE + PP_INPUT + 
                                         PP_OUTPUT + PP_MEDIA + PP_HOSTNAME + PP_STRIP +
                                         TEST_MARKING + TEST_PROJECT)
        ps_csv.create_model(arguments, ps_csv.log)        

    @ignore_warnings
    def test_dac_gen(self):
        """
        Test Dial-A-Cluster generic .zip loader with weather data.
        """

        # create DAC model from weather data using PCA
        dac_parser = dac_gen.parser()
        arguments = dac_parser.parse_args(SLYCAT_CONNECTION + DAC_PCA_FILE + 
                                          TEST_MARKING + TEST_PROJECT)
        dac_gen.create_model(arguments, dac_gen.log)

if __name__ == '__main__':
    unittest.main()
