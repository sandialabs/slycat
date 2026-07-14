# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import cherrypy
import datetime
import traceback


configuration = {
  "cache"    : {},
  "server"   : None,
  "base"     : None,
  "who"      : None,
  "cred"     : None,
  "attrlist" : None,
  "ldapEmail": None,
  "timeout"  : None
}


def init(
    server,
    base,
    who="",
    cred="",
    people_base_dn="",
    attrlist=["uid", "displayName", "mail"],
    ldapEmail="mail",
    timeout=datetime.timedelta(seconds=5),
):
    global configuration
    configuration["server"] = server
    configuration["base"] = base
    configuration["who"] = who
    configuration["cred"] = cred
    configuration["attrlist"] = attrlist
    configuration["ldapEmail"] = ldapEmail
    configuration["timeout"] = timeout
    configuration["people_base_dn"] = people_base_dn


def user(uid):
    global configuration
    if uid:
        if uid not in configuration["cache"]:
            try:
                # Lookup the given uid in ldap
                import ldap

                trace_level = 0  # 0=quiet,  1=verbose,  2=veryVerbose
                ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
                ldap.set_option(
                    ldap.OPT_NETWORK_TIMEOUT, configuration["timeout"].total_seconds()
                )
                connection = ldap.initialize(configuration["server"], trace_level)
                connection.simple_bind_s(
                    configuration["who"], configuration["cred"]
                )  # empty string ok

                # perform the query
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

                # Cache the information we need for speedy lookup.
                result = result[0][1]
                configuration["cache"][uid] = {
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
                cherrypy.log.error(traceback.format_exc())
                cherrypy.log.error(
                    "slycat-ldap-directory.py user",
                    "cherrypy.HTTPError 500 %s" % traceback.format_exc(),
                )
                raise cherrypy.HTTPError(500)
        return configuration["cache"][uid]
    return {
        "name": "",
        "email": "",
    }


def first_rdn_value(dn, attr_name="cn"):
    import ldap.dn

    parsed = ldap.dn.str2dn(dn)

    # parsed example shape:
    # [[('cn', 'some-group-name', flags)], [('ou', 'groups', flags)], ...]
    if not parsed:
        return None

    first_rdn = parsed[0]

    for attr, value, flags in first_rdn:
        if attr.lower() == attr_name.lower():
            return value

    return None


def get_user_groups(connection, uid):
    import ldap
    from ldap.filter import escape_filter_chars

    people_base_dn = configuration["people_base_dn"]

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

    results = [(dn, attrs) for dn, attrs in results if dn is not None]

    if not results:
        raise ValueError(f"No LDAP user found for userid={uid}")

    if len(results) > 1:
        raise ValueError(f"Multiple LDAP users found for userid={uid}")

    user_dn, attrs = results[0]

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
    if uid:
        try:
            # Lookup the given uid in ldap
            import ldap

            trace_level = 0  # 0=quiet,  1=verbose,  2=veryVerbose
            ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
            ldap.set_option(
                ldap.OPT_NETWORK_TIMEOUT, configuration["timeout"].total_seconds()
            )
            connection = ldap.initialize(configuration["server"], trace_level)
            connection.simple_bind_s(
                configuration["who"], configuration["cred"]
            )  # empty string ok

            # perform the query
            cherrypy.log.error(
                "get_user_groups(connection, uid) %s" % get_user_groups(connection, uid)
            )

            if result == []:
                cherrypy.log.error(
                    "slycat-ldap-directory.py user", "User ID, %s, was not found." % uid
                )
                raise cherrypy.HTTPError(404)

            # Cache the information we need for speedy lookup.
            cherrypy.log.error("result %s" % str(result))
            result = result[0][1]
            configuration["cache"][uid] = {
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
                "slycat-ldap-directory.py user", "cherrypy.HTTPError 404 %s" % e.message
            )
            raise cherrypy.HTTPError(404)
        except:
            cherrypy.log.error(traceback.format_exc())
            cherrypy.log.error(
                "slycat-ldap-directory.py user",
                "cherrypy.HTTPError 500 %s" % traceback.format_exc(),
            )
            raise cherrypy.HTTPError(500)


def groups(search_string):
    pass


def register_slycat_plugin(context):
    context.register_directory("ldap", init, user, user_groups, groups)
