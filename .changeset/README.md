# Changesets

This repo uses [changesets](https://github.com/changesets/changesets) to manage
versions and releases for the published packages under `packages/*`.

## Adding a changeset

Whenever you make a change that should be released, add a changeset describing
it. From the repo root:

```sh
npm run changeset
```

This drops a markdown file into `.changeset/` describing the bump (major/minor/patch) and
a human-readable changelog entry. Commit it alongside your code change on the same branch/PR.

## How releases happen

Releases are fully automated via `.github/workflows/release.yml`:

1. Each PR that touches `packages/*` should include a changeset (CI reminds you).
2. On merge to `main`, `changesets/action` consumes the accumulated `.changeset/*.md`
   files and opens/updates a single **"Version Packages"** pull request that bumps
   `package.json` versions and writes `CHANGELOG.md` entries.
3. When you merge that Version PR, the same workflow runs `changeset publish`,
   publishing to the npm registry with build **provenance** (SLSA-signed) and
   pushing a git tag for each published version.

No manual `npm publish` or git-tag pushing required.