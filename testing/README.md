Slycat(tm) Security Test Procedure
==================================

To test the security of a Slycat instance, do the following:

Choose User Accounts
--------------------

Choose user accounts to assume the following "roles" for the test:

1. Server Administrator
2. Project Administrator
3. Project Writer
4. Project Reader
5. Non Project Member
6. Non Server Member

Note that (1), (2), (3), (4), and (5) must already have access to the Slycat
instance to be tested; (1) must already be a server administrator for the
Slycat instance to be tested; and (6) must not have access to the Slycat
instance to be tested.

Note that each account must be unique - a single user account cannot be used to
play multiple roles.

Run the Tests
-------------

From the Slycat source tree, run the security test script, passing each of the user names on the command line:

    $ python slycat-security-test.py --server-administrator <Server Administrator> --project-administrator <Project Administrator> --project-writer <Project Writer> --project-reader <Project Reader> --non-project-member <Non Project Member> --non-server-member <Non Server Member>

By default, the script assumes that the Slycat instance to be tested is
accessable at http://localhost:8092 (the default for an unconfigured Slycat
instance).  Use the --host option to specify a different location.  If your
Slycat instance is behind an SSL proxy whose certificate can't be validated (if
you generated your own certificate, for example), you may use the --no-verify
option to bypass SSL host certificate verification.  Finally, you may need to
use --http-proxy or --https-proxy to specify the correct proxy for your Slycat
instance.

When prompted by the script, enter the password for each account.  The script
will then test every request type in Slycat to ensure that access is allowed /
denied correctly for each role.  Unsuccessful tests will print an error message
to the screen and exit with a non-zero error code.

