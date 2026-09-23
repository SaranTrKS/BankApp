"""Google Sign-In configuration for this demo app.

Fill in both values below before Google login will work — see
docs/auth-and-manager.md for how to get a Client ID. Nothing else in the
codebase needs to change to add or remove a manager: just edit MANAGER_EMAILS
and have that person log out and back in (their role is re-checked against
this list on every Google login).
"""

# From Google Cloud Console -> APIs & Services -> Credentials -> OAuth client ID
# (type "Web application"). Looks like "123456789-abc.apps.googleusercontent.com".
GOOGLE_CLIENT_ID = "1084901070396-s84rngjgsfak3r4j109p2dj9sfpu94fu.apps.googleusercontent.com"

# Every Gmail address here becomes a bank manager the next time they sign in.
# Everyone else who signs in with Google becomes a regular customer.
MANAGER_EMAILS = {
    "saranravali@gmail.com",
    "nivineeru228@gmail.com"
}
