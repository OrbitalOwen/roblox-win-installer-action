This is a GitHub action wrapper for [roblox-win-installer](https://github.com/OrbitalOwen/roblox-win-installer). The purpose of this action is to install Roblox Studio in a CI environment.

**Please check [roblox-win-installer](https://github.com/OrbitalOwen/roblox-win-installer) for important caveats before using**

# Usage

```yml
- uses: OrbitalOwen/roblox-win-installer-action@v1
  with:
      cookie: $$ {{ secrets.ROBLOSECURITY }}
      token: ${{ secrets.GITHUB_TOKEN }}
```

A `roblox-win-installer` version can optionally be specified (ie `version: 0.4`). By default the latest version will be used.

# Notes

-   `roblox-win-installer` relies on undocumented / unendorsed behavior and is retroactively patched to react to changes to the Studio installer. For that reason, it's advised you don't specify a version with this action.
