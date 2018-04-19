{
    "name": "test",
    "exec_path": "/home/slycat/install/conda/bin/python",
    "path": "/home/slycat/src/slycat/agent/test_run_remote_command.py",
    "description": "this is a test script for building testing and launching scripts",
    "parameters": [
        {
            "name": "--number",
            "description": "the number you want printed by the test script",
            "example": "python test_run_remote_command.py --number 2",
            "type": "integer",
		    "required": "FALSE",
            "default": 1
        }
    ]
}