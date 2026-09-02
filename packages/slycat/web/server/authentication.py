# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

from typing import Any
import cherrypy

def project_acl(project):
    """Extract ACL information from a project."""

    if "acl" not in project:
        return {
            "administrators": {},
            "writers": {},
            "readers": {},
            "groups": {"readers": [], "writers": []},
        }
    return project["acl"]

def is_server_administrator():
    """Return True if the current request is from a server administrator."""

    return (
        cherrypy.request.login in cherrypy.request.app.config["slycat"]["server-admins"]
    )

def is_project_administrator(project):
    """Return True if the current request is from a project administrator."""

    try:
        return cherrypy.request.login in [
            administrator["user"]
            for administrator in project_acl(project)["administrators"]
        ]
    except TypeError:
        cherrypy.log.error("error in acl for project %s" % project["_id"])
        return cherrypy.request.login in {
            "administrators": {},
            "writers": {},
            "readers": {},
            "groups": {"readers": [], "writers": []},
        }


def is_project_writer(project):
    """Return True if the current request is from a project writer."""

    try:
        acl = project_acl(project)

        acl_groups = acl.get("groups").get("writers") or []
        acl_writers = acl.get("writers") or []

        username = cherrypy.request.login

        user_groups = (
            cherrypy.request.app.config["slycat-web-server"]["directory"][
                "user_groups"
            ](username)["group_names"]
            or []
        )

        acl_writer_users = {
            writer.get("user") for writer in acl_writers if isinstance(writer, dict)
        }

        if username in acl_writer_users:
            return True
        return any(group in acl_groups for group in user_groups)

    except (TypeError, KeyError, AttributeError) as error:
        project_id = (
            project.get("_id", "<unknown>")
            if isinstance(project, dict)
            else "<unknown>"
        )
        import traceback

        cherrypy.log.error(traceback.format_exc())
        cherrypy.log.error(
            f"Error checking reader ACL for project {project_id}: {error}\n"
        )
        return False


def is_project_reader(project: Any) -> bool:
    """
    Return whether the current CherryPy request user has reader access to a project.

    A user is considered a project reader if either:

    1. Their username appears directly in the project's ACL ``readers`` list.
    2. At least one of their directory groups appears in the project's ACL ``groups`` list.

    Parameters
    ----------
    project : Any
        Project object or dictionary passed to ``project_acl``. The project is expected
        to contain an ``"_id"`` field for logging purposes if ACL parsing fails.

    Returns
    -------
    bool
        ``True`` if the current request user is explicitly listed as a reader or belongs
        to a group with read access. Otherwise, ``False``.

    Notes
    -----
    This function depends on the active CherryPy request context and expects:

    - ``cherrypy.request.login`` to contain the current username.
    - ``cherrypy.request.app.config["slycat-web-server"]["directory"]["user_groups"]``
      to be a callable that returns the user's groups.
    - ``project_acl(project)`` to return a dictionary containing optional ``"readers"``
      and ``"groups"`` entries.
    """

    try:
        acl = project_acl(project)

        acl_groups = acl.get("groups").get("readers") or []
        acl_readers = acl.get("readers") or []

        username = cherrypy.request.login

        user_groups = (
            cherrypy.request.app.config["slycat-web-server"]["directory"][
                "user_groups"
            ](username)["group_names"]
            or []
        )

        acl_reader_users = {
            reader.get("user") for reader in acl_readers if isinstance(reader, dict)
        }

        if username in acl_reader_users:
            return True

        return any(group in acl_groups for group in user_groups)

    except (TypeError, KeyError, AttributeError) as error:
        project_id = (
            project.get("_id", "<unknown>")
            if isinstance(project, dict)
            else "<unknown>"
        )
        import traceback

        cherrypy.log.error(traceback.format_exc())
        cherrypy.log.error(
            f"Error checking reader ACL for project {project_id}: {error}\n"
        )
        return False


def test_server_administrator():
    """Return True if the current request has server administrator privileges."""

    if is_server_administrator():
        return True
    return False

def test_project_administrator(project):
    """Return True if the current request has project administrator privileges."""

    if is_server_administrator():
        return True
    if is_project_administrator(project):
        return True
    return False

def test_project_writer(project):
    """Return True if the current request has project write privileges."""

    if is_server_administrator():
        return True
    if is_project_administrator(project):
        return True
    if is_project_writer(project):
        return True
    return False

def test_project_reader(project):
    """Return True if the current request has project read privileges."""

    if is_server_administrator():
        return True
    if is_project_administrator(project):
        return True
    if is_project_writer(project):
        return True
    if is_project_reader(project):
        return True
    return False

def require_server_administrator():
    """Raise an exception if the current request doesn't have server administrator privileges."""

    if not test_server_administrator():
        raise cherrypy.HTTPError(403)

def require_project_administrator(project):
    """Raise an exception if the current request doesn't have project administrator privileges."""

    if not test_project_administrator(project):
        raise cherrypy.HTTPError(403)

def require_project_writer(project):
    """Raise an exception if the current request doesn't have project write privileges."""

    if not test_project_writer(project):
        raise cherrypy.HTTPError(403)

def require_project_reader(project):
    """Raise an exception if the current request doesn't have project read privileges."""

    if not test_project_reader(project):
        raise cherrypy.HTTPError(403)
