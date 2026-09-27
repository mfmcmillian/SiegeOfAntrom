# tools/

Asset pipeline copied from `DG-realms/scripts` (Dungeons of Antrom). Same scripts, same
manifests; only the output paths changed:

| DG-realms                          | Siege of Antrom                 |
| ---------------------------------- | ------------------------------- |
| `models/enemies/<realm>/`          | `models/units/<faction>/`       |
| `src/enemyBodies.json`             | `src/art/units.json`            |
| `models/kits/<realm>/`             | `models/kits/<faction>/`        |
| `src/dungeon/kits/<realm>.json`    | `src/art/kits/<faction>.json`   |
| `src/weaponCatalog.json`           | `src/art/weapons.json`          |

Factions map onto DG realms: `knights` = castle (Fantasy Kingdom + Knights packs). The
castle kit and the five `kn-*` bodies were copied over already exported.

Source packs are read straight from `~/Downloads` (zips and `.unitypackage`s), nothing
is unpacked by hand. Blender 5.1 at `C:/Program Files/Blender Foundation/Blender 5.1/blender.exe`.

```bash
# Buildings / props for one faction (manifest in tools/realms/)
blender -b --python tools/export-realm-kit.py -- tools/realms/knights.json [--only id1,id2]

# Skinned, animated unit bodies (tools/enemy-bodies.json, packs from tools/weapons-manifest.json)
blender -b --python tools/export-enemy-bodies.py -- [--only kn-knight] [--no-render] [--reclip]

# Weapons (only needed if a body references a weapon not already in the manifest)
blender -b --python tools/build-weapons.py
```

`stress-scene/` is the Slice 0 benchmark (150 Animator-driven knights); it has its own
`package.json` and is not part of the game build.
