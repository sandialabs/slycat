// Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
// DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
// retains certain rights in this software.

{
	"name": "timeseries_to_hdf5",
	"exec_path": "/home/slycat/install/conda/bin/python",
	"path": "/home/slycat/src/slycat/agent/slycat-timeseries-to-hdf5.py",
	"description": "Stage data to hdf5 format for Slycat computation.",
	"parameters": [{
			"name": "--output-directory",
			"description": "Output directory containing hdf5 files.",
			"example": "python slycat-timeseries-to-hdf5.py --output-directory /path/to/out_data-dir",
			"type": "string",
			"required": "TRUE",
			"default": "NULL"
		},
		{
			"name": "--id-column",
			"description": "Inputs file id column name. needs to be the first column in the csv",
			"example": "python slycat-timeseries-to-hdf5.py --id-column name",
			"type": "string",
			"required": "FALSE",
			"default": "NULL"
		},
		{
			"name": "--inputs-file",
			"description": "The name of the delimited text file containing input data.",
			"example": "python slycat-timeseries-to-hdf5.py --inputs-file /path/to/input/file",
			"type": "string",
			"required": "TRUE",
			"default": "NULL"
		},
		{
			"name": "--inputs-file-delimiter",
			"description": "Field delimiter.  By default, fields will be delimited with any whitespace except a newline.",
			"example": "python slycat-timeseries-to-hdf5.py --inputs-file-delimiter ,",
			"type": "string",
			"required": "TRUE",
			"default": "NULL"
		},
		{
			"name": "--parallel-jobs",
			"description": "Number of parallel jobs to run.",
			"example": "python slycat-timeseries-to-hdf5.py --parallel-jobs 4",
			"type": "int",
			"required": "FALSE",
			"default": "number of cores on the machine"
		},
		{
			"name": "--force",
			"description": "Overwrite existing data.",
			"example": "python slycat-timeseries-to-hdf5.py --force",
			"type": "bool",
			"required": "FALSE",
			"default": "NULL"
		}
	]
}