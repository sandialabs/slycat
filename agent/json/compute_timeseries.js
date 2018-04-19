// Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
// DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
// retains certain rights in this software.

{
	"name": "compute_timeseries",
	"exec_path": "/home/slycat/install/conda/bin/python",
	"path": "/home/slycat/src/slycat/agent/slycat-agent-compute-timeseries.py",
	"description": "Compute a timeseries model data from hdf5 data, saving to files for the Slycat Web Server to ingest. This script loads data from a directory containing: One inputs.hdf5 file containing a single table. One timeseries-N.hdf5 file for each row in the input table.",
	"parameters": [{
			"name": "--directory",
			"description": "Directory containing hdf5 timeseries data (one inputs.hdf5 and multiple sub-directories with multiple timeseries-N.hdf5 files).",
			"example": "python slycat-agent-compute-timeseries.py --directory /path/to/hdf5_dir",
			"type": "string",
			"required": "TRUE",
			"default": "NULL"
		},
		{
			"name": "--timeseries-name",
			"description": "Name of the timeseries, i.e. sub-directory name in the input directory. If blank uses directory",
			"example": "python slycat-agent-compute-timeseries.py --timeseries-name example",
			"type": "string",
			"required": "FALSE",
			"default": "NULL"
		},
		{
			"name": "--cluster-sample-count",
			"description": "Sample count used for the uniform-pla and uniform-paa re-sampling algorithms.",
			"example": "python slycat-agent-compute-timeseries.py --cluster-sample-count 500",
			"type": "int",
			"required": "FALSE",
			"default": 1000
		},
		{
			"name": "--cluster-sample-type",
			"description": "the number you want printed by the test script",
			"example": "python slycat-agent-compute-timeseries.py --cluster-sample-type uniform-paa",
			"type": "string",
			"required": "FALSE",
			"default": "uniform-paa"
		},
		{
			"name": "--cluster-type",
			"description": "Hierarchical clustering method. choices = single, complete, average, weighted",
			"example": "python slycat-agent-compute-timeseries.py --cluster-type average",
			"type": "string",
			"required": "FALSE",
			"default": "average"
		},
		{
			"name": "--cluster-metric",
			"description": "Hierarchical clustering distance metric.",
			"example": "python slycat-agent-compute-timeseries.py --cluster-metric euclidean",
			"type": "string",
			"required": "FALSE",
			"default": "euclidean"
		},
		{
			"name": "--workdir",
			"description": "Working directory to store data to be processed during model creation",
			"example": "python slycat-agent-compute-timeseries.py --workdir /path/to/workdir",
			"type": "string",
			"required": "TRUE",
			"default": "NULL"
		},
		{
			"name": "--hash",
			"description": "Unique identifier for the output folder.",
			"example": "python slycat-agent-compute-timeseries.py --hash 123kndn23n23",
			"type": "string",
			"required": "TRUE",
			"default": "NULL"
		},
		{
			"name": "--profile",
			"description": "the number you want printed by the test script",
			"example": "python slycat-agent-compute-timeseries.py --profile ${profile}",
			"type": "string",
			"required": "FALSE",
			"default": "NULL"
		}
	]
}