# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through
[GitHub Security Advisories](https://github.com/jbcom/jeep-sqlite-current-sqljs/security/advisories/new),
which lets us discuss and fix the issue before it is disclosed.

You can expect an acknowledgement within a few days. If a fix is warranted, we will prepare it
privately, publish a patched release, and credit you in the advisory unless you would rather
remain anonymous.

If the problem is in the upstream component and also affects
[jepiqueau/jeep-sqlite](https://github.com/jepiqueau/jeep-sqlite), say so in the report; we
will coordinate disclosure with its maintainer.

## Supported versions

The latest published release receives security fixes. Older releases are not patched unless a
coordinated disclosure requires an exceptional backport.

## In scope

Examples include unsafe handling of a database file or JSON import supplied to the element,
package supply-chain issues, unexpected code execution during install or build, and
vulnerabilities in the package's runtime dependencies (`sql.js`, `localforage`, `jszip`,
`browser-fs-access`). Application authorization and the data an application chooses to store
are outside this repository's security boundary.
