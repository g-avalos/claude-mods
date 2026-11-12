# claude-mods

Personal [Claude Code](https://claude.com/claude-code) mods, packaged as a plugin marketplace.

Each mod is a fork of an upstream project, kept with its original license and credit. The first commit
imports upstream as-is; later commits hold the local changes, so `git log -- mods/<name>` shows exactly
what differs from upstream.

| Mod | Upstream | Changes |
| --- | --- | --- |
| `token-weather` | [hamzafer/claude-code-mods](https://github.com/hamzafer/claude-code-mods) 0.2.2 (MIT) | Cold cache shows local time and age; cache hit/miss and tokens-saved stats |
| `filetree` | [data-goblin/claude-code-filetree](https://github.com/data-goblin/claude-code-filetree) 0.8.2 (MIT) | `start: off` is respected after `/clear` |

## Install

```sh
claude plugin marketplace add g-avalos/claude-mods
claude plugin install token-weather@claude-mods
claude plugin install filetree@claude-mods
```

Disable the upstream copies (`token-weather@claude-code-mods`, `filetree@claude-code-filetree`) so only one of each runs.

## License

Each mod keeps its upstream license (`mods/<name>/LICENSE`). Local changes are released under the same terms.
