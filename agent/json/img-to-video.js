{
  "name": "img-to-video",
  "exec_path": "/home/slycat/install/conda/bin/python",
  "path": "/home/slycat/src/slycat/agent/slycat-img-to-video.py",
  "description": "turn images from a folder into a video",
  "parameters": [
      {
          "name": "--input",
          "description": "path to folder containing images",
          "example": "python test_run_remote_command.py --input /path/to/folder",
          "type": "string",
          "required": "TRUE",
          "default": "NULL"
      },
      {
        "name": "--verbose",
        "description": "print in verbose mode",
        "example": "python test_run_remote_command.py --number 2",
        "type": "bool",
        "required": "FALSE",
        "default": "FALSE"
    }
  ]
}