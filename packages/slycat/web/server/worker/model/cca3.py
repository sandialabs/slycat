# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import itertools
import slycat.web.server.worker.model
import StringIO

class implementation(slycat.web.server.worker.model.prototype):
  """Worker that computes a CCA model, given an input table, a set of input
  variable names, and a set of output variable names."""
  def __init__(self, security, pid, mid, name, marking, description):
    slycat.web.server.worker.model.prototype.__init__(self, security, "CCA model", pid, mid, "cca3", name, marking, description, incremental=True)

  def compute_model(self):
    from vtk import vtkDenseArray, vtkArrayData
    from titan.Web import vtkJSONArrayWriter
    from titan.Trilinos import vtkTrilinosCCA

    # Get required inputs ...
    data_table = self.load_table_artifact("data-table")
    input_columns = self.load_json_artifact("input-columns")
    output_columns = self.load_json_artifact("output-columns")
    scale_inputs = self.load_json_artifact("scale-inputs")

    # Transform the input data table to a form usable with the VTK CCA filter ...
    low = self.scidb.query_value("aql", "select low from dimensions(%s)" % data_table["columns"]).getInt64()
    high = self.scidb.query_value("aql", "select high from dimensions(%s)" % data_table["columns"]).getInt64()
    row_count = high + 1 if high >= low else 0

    x_array = vtkDenseArray["float64"]()
    x_array.Resize(row_count, len(input_columns))
    for j, input in enumerate(input_columns):
      with self.scidb.query("aql", "select %s from %s" % ("c%s" % input, data_table["columns"])) as results:
        for artifact in results:
          for i, value in enumerate(artifact):
            x_array.SetVariantValue(i, j, value.getDouble())

    y_array = vtkDenseArray["float64"]()
    y_array.Resize(row_count, len(output_columns))
    for j, output in enumerate(output_columns):
      with self.scidb.query("aql", "select %s from %s" % ("c%s" % output, data_table["columns"])) as results:
        for artifact in results:
          for i, value in enumerate(artifact):
            y_array.SetVariantValue(i, j, value.getDouble())

    cca_array_data = vtkArrayData()
    cca_array_data.AddArray(x_array)
    cca_array_data.AddArray(y_array)

    # Compute the CCA ...
    cca = vtkTrilinosCCA()
    cca.SetInputData(cca_array_data)
    cca.SetSigDigits(16)
    cca.ForcePositiveYCorrelation(True)
    if scale_inputs:
      cca.ScaleInputToUnitVarianceOn()
    cca.Update()

    # Extract results and store them in the model ...
#    x_canonical_coefficients = cca.GetOutput().GetArray(0)
#    y_canonical_coefficients = cca.GetOutput().GetArray(1)
    x_canonical_variables = cca.GetOutput().GetArray(2)
    y_canonical_variables = cca.GetOutput().GetArray(3)
    x_structure_correlation = cca.GetOutput().GetArray(4)
    y_structure_correlation = cca.GetOutput().GetArray(5)
    statistics = cca.GetOutput().GetArray(6)
#    warnings = cca.GetOutput().GetArray(7)

    def array_contents(array):
      array_data = vtkArrayData()
      array_data.AddArray(array)
      array_writer = vtkJSONArrayWriter()
      array_writer.SetWriteToOutputString(True)
      array_writer.SetInputData(array_data)
      array_writer.Write()
      return StringIO.StringIO(array_writer.GetOutputString())

    self.store_file_artifact("x-canonical-variables", array_contents(x_canonical_variables), "application/json", input=False)
    self.store_file_artifact("y-canonical-variables", array_contents(y_canonical_variables), "application/json", input=False)
    self.store_file_artifact("x-structure-correlation", array_contents(x_structure_correlation), "application/json", input=False)
    self.store_file_artifact("y-structure-correlation", array_contents(y_structure_correlation), "application/json", input=False)
    self.store_file_artifact("statistics", array_contents(statistics), "application/json", input=False)

    component_count = x_canonical_variables.GetExtents()[1].GetSize()
    sample_count = x_canonical_variables.GetExtents()[0].GetSize()

    # Store canonical variables (scatterplot data) as a component x sample matrix of x/y attributes ...
    self.start_array_artifact("canonical-variables", [("input", "double"), ("output", "double")], [("component", component_count, 1), ("sample", sample_count, sample_count)])
    for component in range(component_count):
      self.send_array_artifact_data("canonical-variables", list(itertools.chain.from_iterable([(x_canonical_variables.GetValue(i, component), y_canonical_variables.GetValue(i, component)) for i in range(sample_count)])))
    self.finish_array_artifact("canonical-variables", input=False)

    # Store structure correlations (barplot data) as a component x variable matrix of correlation attributes ...
    self.start_array_artifact("input-structure-correlation", [("correlation", "double")], [("component", component_count, 1), ("input", len(input_columns), len(input_columns))])
    for component in range(component_count):
      self.send_array_artifact_data("input-structure-correlation", [x_structure_correlation.GetValue(i, component) for i in range(len(input_columns))])
    self.finish_array_artifact("input-structure-correlation", input=False)

    self.start_array_artifact("output-structure-correlation", [("correlation", "double")], [("component", component_count, 1), ("output", len(output_columns), len(output_columns))])
    for component in range(component_count):
      self.send_array_artifact_data("output-structure-correlation", [y_structure_correlation.GetValue(i, component) for i in range(len(output_columns))])
    self.finish_array_artifact("output-structure-correlation", input=False)

    # Store statistics as a vector of component r2/p attributes
    self.start_array_artifact("cca-statistics", [("r2", "double"), ("p", "double")], [("component", component_count, 1)])
    for component in range(component_count):
      self.send_array_artifact_data("cca-statistics", [statistics.GetValue(0, component), statistics.GetValue(1, component)])
    self.finish_array_artifact("cca-statistics", input=False)

