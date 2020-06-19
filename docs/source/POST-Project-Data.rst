POST Project Data
===================

.. http:post:: /api/projects/data/(pid)

    Creates a project level data object from a project ID. This data object can
    be used to create new models in the current project.

    :param pid: Unique project identifier.
    :type pid: string

    :requestheader Content-Type: multipart/form-data

    :form file: 
        (Required) CSV file to be uploaded. Must have the .csv extension.

    :form file_name: 
        (Required) Name of the CSV being uploaded.
