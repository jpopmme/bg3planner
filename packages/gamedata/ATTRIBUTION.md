# Data attribution

`src/data/spells.json` is generated from the [bg3.wiki](https://bg3.wiki) `spells` Cargo table by
`scripts/generate-spells.ts`, and `src/data/items.json` from the `equipment`, `weapons` and
`item_locations` tables by `scripts/generate-items.ts` (item effects are the wiki's text, cleaned of
markup). Everything else in `src/data/` (classes, races, backgrounds, feats,
features, option lists, weapon types) was written by hand from the bg3.wiki pages and tables named
at the top of each file.

bg3.wiki content is by its contributors and licensed under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
(see [bg3wiki:Copyrights](https://bg3.wiki/wiki/bg3wiki:Copyrights)). This dataset is therefore
also CC BY-NC-SA 4.0: keep this notice, and do not use it commercially.

Baldur's Gate 3 and its game content are © Larian Studios. This project is unofficial and not
affiliated with Larian Studios or Wizards of the Coast.
