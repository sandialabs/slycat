# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
# Under the terms of Contract DE-NA0003525 with National Technology and Engineering
# Solutions of Sandia, LLC, the U.S. Government retains certain rights in this software.

"""
LDAP-backed directory plugin for Slycat.

This module implements a Slycat directory provider that resolves user and group
information from an LDAP server. It exposes initialization and lookup functions
that are registered with Slycat through ``register_slycat_plugin``.

The module supports:

- Looking up a user by uid.
- Caching basic user information after lookup.
- Looking up LDAP groups associated with a user through the ``memberOf`` attribute.
- Searching LDAP groups by common name, ``cn``.
- Registering the directory implementation under the name ``ldap``.

Expected LDAP-related configuration values are supplied through ``init()`` and
stored in the module-level ``configuration`` dictionary.

Primary entry points
--------------------
init(...)
    Configure the LDAP server, bind credentials, search bases, attributes, and timeout.

user(uid)
    Return cached or LDAP-fetched user information for a uid.

user_groups(uid)
    Query and log LDAP groups for a uid.

groups(search_string)
    Search LDAP groups matching a supplied string.

register_slycat_plugin(context)
    Register this module as a Slycat directory plugin.
"""

import cherrypy
import datetime
import traceback

# Module-level configuration shared by all lookup functions.
#
# Values are populated by init(). The cache is used by user() to avoid repeated
# LDAP queries for the same uid during the process lifetime.
configuration = {
    "user-cache": {},
    "user-groups-cache": {},
    "server": None,
    "base": None,
    "who": None,
    "cred": None,
    "attrlist": None,
    "ldapEmail": None,
    "timeout": None,
    "people_base_dn": None,
    "group_base_dn": None,
}

def init(
    server,
    base,
    who="",
    cred="",
    people_base_dn="",
    group_base_dn="",
    attrlist=["uid", "displayName", "mail"],
    ldapEmail="mail",
    timeout=datetime.timedelta(seconds=5),
):
    """
    Initialize the LDAP directory configuration.

    This function is called by the Slycat plugin system when the LDAP directory
    provider is configured. It stores LDAP connection information and search
    parameters in the module-level ``configuration`` dictionary.

    Parameters
    ----------
    server : str
        LDAP server URI, for example ``ldap://host`` or ``ldaps://host``.
    base : str
        Base DN used by ``user()`` when searching for users.
    who : str, optional
        Bind DN or bind identity. An empty string may be used for anonymous bind
        if the LDAP server permits it.
    cred : str, optional
        Bind credential/password. An empty string may be used when appropriate.
    people_base_dn : str, optional
        Base DN used by ``get_user_groups()`` for locating user entries.
    group_base_dn : str, optional
        Base DN used by ``groups()`` for locating group entries.
    attrlist : list[str], optional
        LDAP attributes to retrieve for user lookups. Defaults to
        ``["uid", "displayName", "mail"]``.
    ldapEmail : str, optional
        Attribute name containing the user's email address. Defaults to ``mail``.
    timeout : datetime.timedelta, optional
        LDAP network timeout. Defaults to five seconds.

    Returns
    -------
    None
    """

    global configuration
    configuration["server"] = server
    configuration["base"] = base
    configuration["who"] = who
    configuration["cred"] = cred
    configuration["attrlist"] = attrlist
    configuration["ldapEmail"] = ldapEmail
    configuration["timeout"] = timeout
    configuration["people_base_dn"] = people_base_dn
    configuration["group_base_dn"] = group_base_dn


def user(uid):
    """
    Look up a user by LDAP uid.

    If the user has already been retrieved, the cached value is returned.
    Otherwise, this function connects to LDAP, searches for a user entry matching
    ``uid=<uid>`` under ``configuration["base"]``, and caches selected attributes.

    The returned dictionary contains:

    - ``name``: User display name from the LDAP ``displayName`` attribute.
    - ``email``: User email address from the configured email attribute.

    If ``uid`` is empty or false, an empty user record is returned.

    Parameters
    ----------
    uid : str
        User identifier to look up.

    Returns
    -------
    dict
        Dictionary with ``name`` and ``email`` keys.

    Raises
    ------
    cherrypy.HTTPError
        404 if the user or LDAP object is not found.
        500 for unexpected LDAP or runtime errors.
    """

    global configuration

    if uid:
        # Only perform an LDAP query if this uid is not already cached.
        if uid not in configuration["user-cache"]:
            try:
                cherrypy.log.error(
                    "slycat-ldap-directory.py user",
                    "User ID, %s" % uid,
                )
                # Import ldap lazily so the module can be loaded in environments
                # where LDAP support may not be installed until this function is used.
                import ldap

                trace_level = 0  # 0=quiet, 1=verbose, 2=veryVerbose

                # Disable TLS certificate validation for LDAP connections.
                # Note: This may be appropriate for some internal deployments but
                # should be reviewed from a security perspective.
                ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)

                # Set the LDAP network timeout using the configured timedelta.
                ldap.set_option(
                    ldap.OPT_NETWORK_TIMEOUT, configuration["timeout"].total_seconds()
                )

                # Initialize and bind the LDAP connection.
                connection = ldap.initialize(configuration["server"], trace_level)
                connection.simple_bind_s(
                    configuration["who"], configuration["cred"]
                )  # Empty strings may be accepted for anonymous bind.

                # Search one level below the configured base DN for the requested uid.
                result = connection.search_s(
                    configuration["base"],
                    ldap.SCOPE_ONELEVEL,
                    "uid=%s" % uid,
                    configuration["attrlist"],
                )

                if result == []:
                    cherrypy.log.error(
                        "slycat-ldap-directory.py user",
                        "User ID, %s, was not found." % uid,
                    )
                    raise cherrypy.HTTPError(404)

                # Cache the information needed for faster future lookups.
                result = result[0][1]
                configuration["user-cache"][uid] = {
                    "name": result["displayName"][0],
                    "email": result[configuration["ldapEmail"]][0],
                }

            except ldap.NO_SUCH_OBJECT:
                cherrypy.log.error("404 ldap.NO_SUCH_OBJECT")
                cherrypy.log.error(
                    "slycat-ldap-directory.py user",
                    "cherrypy.HTTPError 404 ldap.NO_SUCH_OBJECT",
                )
                raise cherrypy.HTTPError(404)

            except AssertionError as e:
                cherrypy.log.error(e.message)
                cherrypy.log.error(
                    "slycat-ldap-directory.py user",
                    "cherrypy.HTTPError 404 %s" % e.message,
                )
                raise cherrypy.HTTPError(404)

            except:
                # Log the complete traceback for diagnosis and convert the error
                # into an HTTP 500 response for CherryPy/Slycat.
                cherrypy.log.error(traceback.format_exc())
                cherrypy.log.error(
                    "slycat-ldap-directory.py user",
                    "cherrypy.HTTPError 500 %s" % traceback.format_exc(),
                )
                raise cherrypy.HTTPError(500)

        return configuration["user-cache"][uid]

    # Return a blank user record when no uid is supplied.
    return {
        "name": "",
        "email": "",
    }


def first_rdn_value(dn, attr_name="cn"):
    """
    Return the value of a named attribute from the first RDN of a DN.

    For example, given the DN::

        cn=my-group,ou=groups,dc=example,dc=org

    ``first_rdn_value(dn, "cn")`` returns ``"my-group"``.

    Parameters
    ----------
    dn : str
        Distinguished Name to parse.
    attr_name : str, optional
        Attribute name to extract from the first relative distinguished name.
        Defaults to ``"cn"``.

    Returns
    -------
    str or None
        Matching attribute value from the first RDN, or ``None`` if not found.
    """

    import ldap.dn

    parsed = ldap.dn.str2dn(dn)

    # Example parsed shape:
    # [[('cn', 'some-group-name', flags)], [('ou', 'groups', flags)], ...]
    if not parsed:
        return None

    first_rdn = parsed[0]

    for attr, value, flags in first_rdn:
        if attr.lower() == attr_name.lower():
            return value

    return None


def get_user_groups(connection, uid):
    """
    Retrieve LDAP group membership information for a user.

    This function searches for a single LDAP user entry matching the supplied
    uid under ``configuration["people_base_dn"]``. It then reads the user's
    ``memberOf`` attributes, extracts group common names from those group DNs,
    and returns both the raw group DNs and simplified group names.

    Parameters
    ----------
    connection : ldap.ldapobject.LDAPObject
        Active, bound LDAP connection.
    uid : str
        User identifier to search for.

    Returns
    -------
    dict
        Dictionary containing:

        ``user_dn``
            Distinguished Name of the matching user entry.

        ``group_dns``
            Sorted list of group DNs from the user's ``memberOf`` attribute.

        ``group_names``
            Sorted list of group names extracted from the first ``cn`` RDN of
            each group DN. If a group name cannot be extracted, the full DN is
            used instead.

    Raises
    ------
    ValueError
        If no matching user is found or more than one matching user is found.
    """

    import ldap
    from ldap.filter import escape_filter_chars

    people_base_dn = configuration["people_base_dn"]

    # Escape uid before inserting it into an LDAP filter.
    safe_uid = escape_filter_chars(uid)

    user_search_filter = "(&" "(objectClass=inetOrgPerson)" f"(uid={safe_uid})" ")"

    results = connection.search_s(
        people_base_dn,
        ldap.SCOPE_SUBTREE,
        user_search_filter,
        [
            "uid",
            "cn",
            "displayName",
            "memberOf",
        ],
    )

    # Remove LDAP referrals or continuation entries, which may have dn=None.
    results = [(dn, attrs) for dn, attrs in results if dn is not None]

    if not results:
        raise ValueError(f"No LDAP user found for userid={uid}")

    if len(results) > 1:
        raise ValueError(f"Multiple LDAP users found for userid={uid}")

    user_dn, attrs = results[0]

    # Convert byte-valued LDAP attributes to strings.
    group_dns = [
        value.decode("utf-8", errors="replace") for value in attrs.get("memberOf", [])
    ]

    group_names = []

    for group_dn in group_dns:
        group_name = first_rdn_value(group_dn, "cn")
        group_names.append(group_name if group_name else group_dn)

    return {
        "user_dn": user_dn,
        "group_dns": sorted(group_dns),
        "group_names": sorted(group_names),
    }


def user_groups(uid):
    """
    Look up and log LDAP group membership for a user.

    This function establishes an LDAP connection, binds using the configured
    credentials, calls ``get_user_groups()``, and logs the returned group data.

    Parameters
    ----------
    uid : str
        User identifier whose LDAP group membership should be queried.

    Returns
    -------
    None
        The current implementation logs the group data but does not return it.

    Raises
    ------
    cherrypy.HTTPError
        404 for LDAP no-such-object and selected assertion errors.
        500 for unexpected LDAP or runtime errors.
    """
    group_session_timeout = datetime.timedelta(minutes=1000)
    if uid:
        if uid in configuration["user-groups-cache"]:
            cutoff = (
                datetime.datetime.now(datetime.timezone.utc) - group_session_timeout
            ).isoformat()
            if configuration["user-groups-cache"][uid]["timeout"] < cutoff:
                del configuration["user-groups-cache"][uid]
        if uid not in configuration["user-groups-cache"]:
            try:
                # Lookup the given uid in LDAP.
                import ldap

                trace_level = 0  # 0=quiet, 1=verbose, 2=veryVerbose

                ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
                ldap.set_option(
                    ldap.OPT_NETWORK_TIMEOUT, configuration["timeout"].total_seconds()
                )

                connection = ldap.initialize(configuration["server"], trace_level)
                connection.simple_bind_s(
                    configuration["who"], configuration["cred"]
                )  # Empty strings may be accepted for anonymous bind.

                # Perform the group lookup and log the result.
                configuration["user-groups-cache"][uid] = {
                    "result": get_user_groups(connection, uid),
                    "timeout": datetime.datetime.now(datetime.timezone.utc),
                }

            except ldap.NO_SUCH_OBJECT:
                cherrypy.log.error("404 ldap.NO_SUCH_OBJECT")
                cherrypy.log.error(
                    "slycat-ldap-directory.py user",
                    "cherrypy.HTTPError 404 ldap.NO_SUCH_OBJECT",
                )
                raise cherrypy.HTTPError(404)

            except AssertionError as e:
                cherrypy.log.error(e.message)
                cherrypy.log.error(
                    "slycat-ldap-directory.py user",
                    "cherrypy.HTTPError 404 %s" % e.message,
                )
                raise cherrypy.HTTPError(404)

            except:
                cherrypy.log.error(traceback.format_exc())
                cherrypy.log.error(
                    "slycat-ldap-directory.py user",
                    "cherrypy.HTTPError 500 %s" % traceback.format_exc(),
                )
                raise cherrypy.HTTPError(500)
        return configuration["user-groups-cache"][uid]["result"]


def groups(search_string):
    """
    Search LDAP groups by common name.

    The search is performed under ``configuration["group_base_dn"]`` and matches
    LDAP group entries whose ``cn`` contains the supplied search string.

    Matching entries are normalized into dictionaries containing group name,
    DN, owner, member count, and member UID information.

    Parameters
    ----------
    search_string : str
        Text to search for in group ``cn`` values. If empty, an empty list is
        returned.

    Returns
    -------
    list[dict] or None
        Returns an empty list when ``search_string`` is false.

        The current implementation builds a ``matches`` list but does not return
        it. If corrected to return ``matches``, each match would contain:

        ``name``
            Group common name.

        ``dn``
            Full group Distinguished Name.

        ``displayName``
            Display name for the group. Currently the same as ``name``.

        ``owner``
            UID extracted from the owner DN.

        ``owner_dn``
            Full owner DN.

        ``member_count``
            Number of ``memberUid`` values.

        ``memberUid``
            List of member UIDs.

    Raises
    ------
    cherrypy.HTTPError
        404 if LDAP reports ``NO_SUCH_OBJECT``.
        500 for unexpected LDAP or runtime errors.
    """

    if not search_string:
        return []

    try:
        import ldap
        import re
        from difflib import SequenceMatcher
        from ldap.filter import escape_filter_chars

        def decode_ldap_value(value):
            """
            Decode an LDAP attribute value if it is bytes.

            Parameters
            ----------
            value : bytes or object
                LDAP attribute value.

            Returns
            -------
            str or object
                UTF-8 decoded string for bytes input, otherwise the original value.
            """
            if isinstance(value, bytes):
                return value.decode("utf-8", errors="replace")
            return value

        def decode_attr_list(attrs, attr_name):
            """
            Return a decoded list of values for an LDAP attribute.

            Parameters
            ----------
            attrs : dict
                LDAP attributes dictionary.
            attr_name : str
                Attribute name to retrieve.

            Returns
            -------
            list
                Decoded attribute values. Returns an empty list if the attribute
                is not present.
            """
            return [decode_ldap_value(value) for value in attrs.get(attr_name, [])]

        def first_attr(attrs, attr_name, default=""):
            """
            Return the first decoded value for an LDAP attribute.

            Parameters
            ----------
            attrs : dict
                LDAP attributes dictionary.
            attr_name : str
                Attribute name to retrieve.
            default : object, optional
                Value returned when the attribute is missing or empty.

            Returns
            -------
            object
                First decoded attribute value or ``default``.
            """
            values = decode_attr_list(attrs, attr_name)
            if not values:
                return default
            return values[0]

        def uid_from_dn(dn):
            """
            Extract a uid from a user DN.

            Example
            -------
            Given::

                uid=<-uid->,ou=accounts,ou=SNL,dc=NNSA,dc=DOE,dc=gov

            this function returns::

                <-uid->

            If the DN does not begin with ``uid=...``, the original DN is returned.

            Parameters
            ----------
            dn : str
                Distinguished Name to parse.

            Returns
            -------
            str
                Extracted uid, the original DN, or an empty string.
            """
            if not dn:
                return ""

            match = re.match(r"uid=([^,]+),", dn, re.IGNORECASE)
            if match:
                return match.group(1)

            return dn

        trace_level = 0

        ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
        ldap.set_option(
            ldap.OPT_NETWORK_TIMEOUT, configuration["timeout"].total_seconds()
        )

        connection = ldap.initialize(configuration["server"], trace_level)
        connection.simple_bind_s(configuration["who"], configuration["cred"])

        search_string = search_string.strip()

        # Escape user input before placing it into the LDAP search filter.
        safe = escape_filter_chars(search_string)

        # Search for groupOfUniqueNames entries with cn containing the search text.
        group_search_filter = (
            "(&"
            "(|"
            "(objectClass=groupofuniquenames)"
            "(objectClass=groupOfUniqueNames)"
            ")"
            "(|"
            f"(cn=*{safe}*)"
            ")"
            ")"
        )

        attrlist = [
            "cn",
            "objectClass",
            "owner",
            "memberUid",
        ]

        cherrypy.log.error("groups() filter: %s" % group_search_filter)

        results = connection.search_s(
            configuration["group_base_dn"],
            ldap.SCOPE_SUBTREE,
            group_search_filter,
            attrlist,
        )

        # Remove LDAP referrals or continuation entries.
        results = [(dn, attrs) for dn, attrs in results if dn is not None]

        matches = []

        for dn, attrs in results:
            cn = first_attr(attrs, "cn")
            owner_dn = first_attr(attrs, "owner")
            member_uids = decode_attr_list(attrs, "memberUid")

            group_name = cn or dn

            matches.append(
                {
                    "name": group_name,
                    "dn": dn,
                    "displayName": group_name,
                    "owner": uid_from_dn(owner_dn),
                    "owner_dn": owner_dn,
                    "member_count": len(member_uids),
                    "memberUid": member_uids,
                }
            )

        return matches

    except ldap.NO_SUCH_OBJECT:
        cherrypy.log.error("groups() ldap.NO_SUCH_OBJECT")
        raise cherrypy.HTTPError(404)

    except:
        cherrypy.log.error(traceback.format_exc())
        raise cherrypy.HTTPError(500)


def register_slycat_plugin(context):
    """
    Register this module as a Slycat LDAP directory plugin.

    Parameters
    ----------
    context : object
        Slycat plugin registration context. The context is expected to provide
        a ``register_directory`` method.

    Returns
    -------
    None
    """

    context.register_directory("ldap", init, user, user_groups, groups)
