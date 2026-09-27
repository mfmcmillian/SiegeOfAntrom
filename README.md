# Siege of Antrom

**Build the base. Raise the army. Break the enemy.**
A low-poly fantasy real-time strategy game living inside Decentraland.

Siege of Antrom keeps the rules, authoritative server and UI flow of DecentraCraft and swaps its whole presentation layer for Synty POLYGON fantasy art, exported through the Dungeons of Antrom Blender pipeline. Three banners fight for the Kingdom of Antrom:

| Faction | Style | Art |
| --- | --- | --- |
| **Knights of Antrom** | Balanced; masons repair fast | Synty Knights + Fantasy Kingdom |
| **Elves of the Greenwood** | Expensive, durable; groves grow themselves | Synty Elven Realm |
| **Undead Legion** | Cheap swarm; the fallen regenerate | Synty Dark Fantasy |

Eight roles per faction: worker, melee, ranged, healer, caster, siege, titan and a signature hero. Air units are compiled out behind `FLAGS.air` in `src/rts/races.ts` until flying packs arrive.

## Play

| | |
| --- | --- |
| **Campaign** | Three 8-mission stories. Sequential unlock. |
| **Skirmish** | Solo war against the computer. Up to five AI commanders. |
| **Multiplayer** | Battle rooms on an authoritative server. Claim a seat, pick a faction, ready up. |
| **Ranked** | Strict free-for-all. Humans only. Elo from 1200. |

## Stack

Decentraland **SDK7** scene with an **authoritative server**. Clients render and issue commands; the server owns lobbies, match start, command relay, ranked Elo, commander profiles and campaign saves.

```text
src/index.ts             client / server entry
src/rtsGame.ts           match loop, combat, construction, AI
src/ui.tsx               HUD, menus, commander profile
src/rts/                 races, campaign, maps, session
src/rts/unitModels.ts    GLB_UNITS: skinned Synty bodies + Animator clips per game state
src/rts/buildingModels.ts GLB_BUILDINGS: exported building pieces per faction
src/art/                 generated catalogs (units.json, kits/*.json)
src/server/main.ts       lobbies, persistence, leaderboards
tools/                   Blender export pipeline (see tools/README.md)
models/units/<faction>/  exported bodies      models/kits/<faction>/ exported buildings
```

## Run it locally

```bash
npm install
npm start
```

```bash
npm run build
npm run deploy
```

`authoritativeMultiplayer` is on in `scene.json`. Preview starts the headless server next to the client.

Leaderboard, boards, campaign and join-notice pushes are off until the `LEADERBOARD_PUSH_URL`, `BOARDS_PUSH_URL`, `CAMPAIGN_PUSH_URL` and `JOIN_RELAY_URL` EnvVars are set on the World.

## Art pipeline

Source packs live in `~/Downloads` (Synty SourceFiles zips; `.unitypackage` files are repacked with `python tools/unitypackage-to-zip.py <file>`). Then:

```bash
blender -b --python tools/export-realm-kit.py -- tools/realms/knights.json      # buildings
blender -b --python tools/export-enemy-bodies.py -- --only kn-knight --no-render  # bodies
```

Manifests: `tools/realms/{knights,elves,undead}.json`, `tools/enemy-bodies.json`, `tools/weapons-manifest.json`.

## License

Private repository. All rights reserved unless a license is added later.
