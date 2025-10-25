# Lightweight Github Maven Repository

Inspired from [trychen/maven-repo-r2](https://github.com/trychen/maven-repo-r2).

A very simple lightweight maven repository that uses Cloudflare Workers to handle HTTP requests and GitHub for content storage.

The size of files are limited, but it wasn't mentioned in the [Github API Document](https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#create-or-update-file-contents).

## TODO

- [ ] Allow file re-upload.

## ENVs

There are few secrets/vars used, and you need to init them when deploying.

- `GH_TOKEN`: Your github token that has the write permission to the repository defined below.
- `ADMIN_USERNAME`: The username used for authenticating.

Initialize them either in the dashboard or `wrangler secret put <what>`.

- `GH_REPO_INFO`: The repository info in the format of "{owner}/{repo}/{branch}".
- `ADMIN_PASSWORD`: The password used for authenticating.

Note that everyone is allowed to read. If you don't like this design, you can edit `auth.ts` for more find-grained control.
