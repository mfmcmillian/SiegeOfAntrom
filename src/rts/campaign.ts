import type { Difficulty, GameMode, RaceId } from './types'
import type { OpponentSetup } from './state'

// Three single-player campaigns, one per faction (Knights / Elves / Undead). Same
// eight-mission curve (boot camp → open war → finale) so the fights stay familiar;
// names, briefings, and locked enemy factions are unique. Progress is tracked per
// campaign so clearing the Knights does not unlock the Elves. Mission ids keep the
// original faction slugs (vanguard / aethyr / myriad) because saves key on them.

export type CampaignWin = 'eliminate' | 'survive'

export type CampaignMission = {
  id: string
  race: RaceId
  act: 1 | 2 | 3
  actName: string
  name: string
  /** Short briefing shown before deploy. */
  briefing: string
  /** One-line hook on the campaign picker. */
  hook: string
  /** One-line objective under the title. */
  objective: string
  mapId: string
  opponents: { race: RaceId; difficulty: Difficulty }[]
  win: CampaignWin
  /** Survive missions: hold out this many seconds (razing the enemy still wins early). */
  surviveSeconds?: number
  /** Extra crystal/mana granted on top of the normal opening bank. */
  extraMinerals?: number
  extraGas?: number
  /** Pre-built structures so the mission can skip a teaching step. */
  playerBarracks?: boolean
  playerTurrets?: number
  enemyTurrets?: number
  /** Each hostile starts with a completed Barracks / Warden Lodge / Boneyard. */
  enemyBarracks?: boolean
  /** Defaults to FFA. Team mode allies every computer against the player. */
  gameMode?: GameMode
}

export type CampaignMeta = {
  race: RaceId
  title: string
  tagline: string
}

export const CAMPAIGN_META: Record<RaceId, CampaignMeta> = {
  human: {
    race: 'human',
    title: 'The Broken Crown',
    tagline: "Antrom's king is dead. Kael carries the crown home."
  },
  alien: {
    race: 'alien',
    title: 'The Long Winter',
    tagline: 'The Greenwood remembers every axe. Auren answers them.'
  },
  bio: {
    race: 'bio',
    title: 'The Grave Tide',
    tagline: 'Szel has emptied the graves. Antrom will fill them again.'
  }
}

const VANGUARD_MISSIONS: CampaignMission[] = [
  {
    id: 'vanguard-1',
    race: 'human',
    act: 1,
    actName: 'Homecoming',
    name: 'Ashes of the Rim',
    hook: 'Crystal first. Then a Barracks. Then the ghouls burn.',
    briefing:
      'The king fell at the Crown and the Legion dug up the dead before the pyres were cold. Ghouls squat in the rim farms and gnaw on what was our harvest. Take the crystal veins. Raise a Barracks. Put every graveyard back in the ground. Economy first; an army with empty pockets starves on the march.',
    objective: 'Destroy every Undead building.',
    mapId: 'shattered-crown',
    opponents: [{ race: 'bio', difficulty: 'easy' }],
    win: 'eliminate',
    extraMinerals: 100
  },
  {
    id: 'vanguard-2',
    race: 'human',
    act: 1,
    actName: 'Homecoming',
    name: 'Standing Orders',
    hook: 'The Barracks is already built. Fill it.',
    briefing:
      'Your Barracks stands because the Greenwood is already moving. Elf rangers cross the border stones as if the treaty died with the king. Click the Barracks. Queue Footmen and Longbowmen. Break their lodge before a second wave of Bladesingers is sung into being.',
    objective: 'Destroy every Elven building.',
    mapId: 'shattered-crown',
    opponents: [{ race: 'alien', difficulty: 'easy' }],
    win: 'eliminate',
    extraMinerals: 80,
    playerBarracks: true
  },
  {
    id: 'vanguard-3',
    race: 'human',
    act: 2,
    actName: 'Open War',
    name: 'The Reliquaries',
    hook: 'They will expand. Scout it. Then break it.',
    briefing:
      'This Warden is no border patrol. She will claim the second reliquary, raise a Moon Shrine and strike on a timer. Send a Peasant to look. Watch the far shrine. Hold Kael on the line until you have the numbers, then fell their Tree Hall on its own roots. Vision wins wars. Blind armies walk into arrows.',
    objective: 'Destroy every Elven building.',
    mapId: 'twin-reliquaries',
    opponents: [{ race: 'alien', difficulty: 'medium' }],
    win: 'eliminate'
  },
  {
    id: 'vanguard-4',
    race: 'human',
    act: 2,
    actName: 'Open War',
    name: 'Two Wolves',
    hook: 'Let them bleed each other. Finish whoever still stands.',
    briefing:
      'Elves and Undead share the ashen causeway and hate each other almost as much as they hate the crown. They will fight. Let them. Punish the weaker camp first, then finish the survivor before they remember they have a common enemy. Three armies on one road; do not be the one in the middle.',
    objective: 'Destroy every hostile building.',
    mapId: 'ashen-procession',
    opponents: [
      { race: 'bio', difficulty: 'medium' },
      { race: 'alien', difficulty: 'easy' }
    ],
    win: 'eliminate'
  },
  {
    id: 'vanguard-5',
    race: 'human',
    act: 2,
    actName: 'Open War',
    name: 'Longships',
    hook: 'No bridge. Take the water, or drown.',
    briefing:
      "The Elven isle has no ford and the strait does not forgive. Raise a Mage Tower. Build Longships. Ferry a wave onto their shore. Footmen who walk off the sand sink in plate. Load the boats. Cross the black water. Plant the crown's banner in Greenwood soil.",
    objective: 'Destroy every Elven building.',
    mapId: 'islands',
    opponents: [{ race: 'alien', difficulty: 'medium' }],
    win: 'eliminate',
    extraMinerals: 120,
    extraGas: 50
  },
  {
    id: 'vanguard-6',
    race: 'human',
    act: 3,
    actName: 'The Last March',
    name: 'Hold the Causeway',
    hook: 'Six minutes. The dead are already walking.',
    briefing:
      'A grave tide is six minutes out along the ashen road. Fortify the Keep. Keep Kael standing. Weather the waves. Razing their Crypt early is a win. Losing your last building is not. Watchtowers, Homesteads and a second Barracks; this is a siege, not a parade.',
    objective: 'Survive 6:00, or destroy the enemy.',
    mapId: 'ashen-procession',
    opponents: [{ race: 'bio', difficulty: 'medium' }],
    win: 'survive',
    surviveSeconds: 360,
    extraMinerals: 150,
    extraGas: 40,
    playerBarracks: true,
    playerTurrets: 2,
    enemyBarracks: true
  },
  {
    id: 'vanguard-7',
    race: 'human',
    act: 3,
    actName: 'The Last March',
    name: 'The Warden',
    hook: 'Auren herself holds the high ground. Bring everything.',
    briefing:
      'Warden Auren holds the Crown. Expect a second Tree Hall, Ballistas, Treants and a Runesmith working through the night. Bring a whole army: infantry, bows, catapults, a Champion. Half a host will be ground down on the steps of a castle we already lost once. No half-measures. No second exile.',
    objective: 'Destroy every Elven building.',
    mapId: 'shattered-crown',
    opponents: [{ race: 'alien', difficulty: 'hard' }],
    win: 'eliminate'
  },
  {
    id: 'vanguard-8',
    race: 'human',
    act: 3,
    actName: 'The Last March',
    name: 'The Broken Crown',
    hook: 'Elf and Undead signed a pact. Break both isles, or Antrom is a grave.',
    briefing:
      'The Warden and the Dark Lord have struck a pact. Two hard commanders share the storm and will not bleed each other. Their shores are already fortified. Claim the sea. Break both isles. If either banner still flies at dawn, the Kingdom of Antrom is a story told in the dark. Kael did not come home to lose it twice.',
    objective: 'Destroy both allied commanders.',
    mapId: 'colony-isles',
    opponents: [
      { race: 'bio', difficulty: 'hard' },
      { race: 'alien', difficulty: 'hard' }
    ],
    win: 'eliminate',
    extraGas: 40,
    enemyTurrets: 2,
    enemyBarracks: true,
    gameMode: 'team'
  }
]

const AETHYR_MISSIONS: CampaignMission[] = [
  {
    id: 'aethyr-1',
    race: 'alien',
    act: 1,
    actName: 'The Waking Wood',
    name: 'First Snow',
    hook: 'Harvest, build, and drive the woodcutters out.',
    briefing:
      "The king's death has emboldened his lords. Knights cut the old oaks for siege timber and call it lawful. Gather crystal and mana. Raise a Warden Lodge. Send Bladesingers to remind them what the Greenwood does to axes. Grow slowly and you die slowly; the wood rewards the bold.",
    objective: 'Destroy every Knights building.',
    mapId: 'twin-reliquaries',
    opponents: [{ race: 'human', difficulty: 'easy' }],
    win: 'eliminate',
    extraMinerals: 100
  },
  {
    id: 'aethyr-2',
    race: 'alien',
    act: 1,
    actName: 'The Waking Wood',
    name: 'Roots and Bone',
    hook: 'The Lodge stands. Fill it, and burn the Boneyard.',
    briefing:
      'A Boneyard has been dug at the far reliquary and the trees there have stopped singing. Your Warden Lodge already stands. Click it. Queue Bladesingers and Rangers. Cut the skeletons down and burn the Crypt before the Necromancer raises what he has buried.',
    objective: 'Destroy every Undead building.',
    mapId: 'twin-reliquaries',
    opponents: [{ race: 'bio', difficulty: 'easy' }],
    win: 'eliminate',
    extraMinerals: 80,
    playerBarracks: true
  },
  {
    id: 'aethyr-3',
    race: 'alien',
    act: 2,
    actName: 'Judgment',
    name: 'Trespassers',
    hook: 'A real lord. Expand, scout, then fell the Keep.',
    briefing:
      'This Lord Commander expands, researches and marches on a timer. Send a Tender to look. Take the second grove before he takes the second farm. Hold Auren back until the Rangers and Druids outnumber his Longbowmen, then fell his Keep on its own foundations. Patience is a weapon. So is a Ballista.',
    objective: 'Destroy every Knights building.',
    mapId: 'shattered-crown',
    opponents: [{ race: 'human', difficulty: 'medium' }],
    win: 'eliminate'
  },
  {
    id: 'aethyr-4',
    race: 'alien',
    act: 2,
    actName: 'Judgment',
    name: 'Split Road',
    hook: 'Knights and Undead on one causeway. Choose your moment.',
    briefing:
      'Knights and the Legion both march the ashen causeway and will collide long before they reach you. Let them. Strike the camp that is losing, then the one that is tired. Three armies on one road; make sure the Greenwood is the one that arrives last and leaves first.',
    objective: 'Destroy every hostile building.',
    mapId: 'ashen-procession',
    opponents: [
      { race: 'human', difficulty: 'medium' },
      { race: 'bio', difficulty: 'easy' }
    ],
    win: 'eliminate'
  },
  {
    id: 'aethyr-5',
    race: 'alien',
    act: 2,
    actName: 'Judgment',
    name: 'Moon Skiffs',
    hook: 'No bridge. Sail, or stay.',
    briefing:
      'The Legion has claimed the isles and left nothing living on them. There is no ford. Raise a Moon Shrine. Build Moon Skiffs. Load Bladesingers and Rangers and cross under the moon. Elves who step off the sand drown like anyone else. Land, strike, and return for the next wave.',
    objective: 'Destroy every Undead building.',
    mapId: 'islands',
    opponents: [{ race: 'bio', difficulty: 'medium' }],
    win: 'eliminate',
    extraMinerals: 120,
    extraGas: 50
  },
  {
    id: 'aethyr-6',
    race: 'alien',
    act: 3,
    actName: 'Ascension',
    name: 'Hold the Tree Hall',
    hook: 'Six minutes. The knights ride at dawn.',
    briefing:
      'The knights ride at dawn and dawn is six minutes away. Fortify the Tree Hall. Keep Auren alive. Archer Platforms, Bowers and a second Lodge; the Greenwood has endured longer sieges than this. Razing his Keep early is a win. Losing your last building is not.',
    objective: 'Survive 6:00, or destroy the enemy.',
    mapId: 'twin-reliquaries',
    opponents: [{ race: 'human', difficulty: 'medium' }],
    win: 'survive',
    surviveSeconds: 360,
    extraMinerals: 150,
    extraGas: 40,
    playerBarracks: true,
    playerTurrets: 2,
    enemyBarracks: true
  },
  {
    id: 'aethyr-7',
    race: 'alien',
    act: 3,
    actName: 'Ascension',
    name: 'Lord Commander',
    hook: 'Kael holds the Crown. Bring the whole wood.',
    briefing:
      'Lord Commander Kael holds the Crown with everything Antrom has left: Catapults, Court Mages, Champions and a Blacksmith working through the night. Bring a whole army: blades, bows, Druids, Ballistas, a Treant. The Greenwood does not get a second spring if this one fails.',
    objective: 'Destroy every Knights building.',
    mapId: 'shattered-crown',
    opponents: [{ race: 'human', difficulty: 'hard' }],
    win: 'eliminate'
  },
  {
    id: 'aethyr-8',
    race: 'alien',
    act: 3,
    actName: 'Ascension',
    name: 'The Long Winter',
    hook: 'Crown and Crypt have made peace. End both, or the wood freezes.',
    briefing:
      'Kael and Szel have struck a pact. Two hard commanders share the storm and will not bleed each other. Their shores are fortified. Claim the sea. Break both isles. If either banner still flies at dawn, the long winter never ends and the Greenwood is firewood. Auren has waited three hundred years for this morning.',
    objective: 'Destroy both allied commanders.',
    mapId: 'rift-isles',
    opponents: [
      { race: 'human', difficulty: 'hard' },
      { race: 'bio', difficulty: 'hard' }
    ],
    win: 'eliminate',
    extraGas: 40,
    enemyTurrets: 2,
    enemyBarracks: true,
    gameMode: 'team'
  }
]

const MYRIAD_MISSIONS: CampaignMission[] = [
  {
    id: 'myriad-1',
    race: 'bio',
    act: 1,
    actName: 'The Waking Dead',
    name: 'First Grave',
    hook: 'Harvest. Dig a Boneyard. Eat the farm.',
    briefing:
      'Szel has opened the barrows of the wastes and the dead remember how to walk. A Knights outpost farms the edge of the bloom and thinks the ghouls are a rumor. Gather crystal and mana. Dig a Boneyard. Show them what a rumor does to a Homestead. The Legion grows by what it kills.',
    objective: 'Destroy every Knights building.',
    mapId: 'bloom-wastes',
    opponents: [{ race: 'human', difficulty: 'easy' }],
    win: 'eliminate',
    extraMinerals: 100
  },
  {
    id: 'myriad-2',
    race: 'bio',
    act: 1,
    actName: 'The Waking Dead',
    name: 'Rising Bone',
    hook: 'The Boneyard is dug. Fill it, and fell the Tree Hall.',
    briefing:
      'Elves have come to burn the wastes clean and their Tree Hall has already taken root. Your Boneyard is dug. Click it. Queue Skeletons and Bone Archers. Fell their hall before the Rangers learn where the barrows sleep.',
    objective: 'Destroy every Elven building.',
    mapId: 'bloom-wastes',
    opponents: [{ race: 'alien', difficulty: 'easy' }],
    win: 'eliminate',
    extraMinerals: 80,
    playerBarracks: true
  },
  {
    id: 'myriad-3',
    race: 'bio',
    act: 2,
    actName: 'The Spreading Dark',
    name: 'The Hunt',
    hook: 'A real lord. Scout, expand, then bury the Keep.',
    briefing:
      'This Lord Commander hunts, expands and strikes on a timer. Send a Ghoul to look. Claim the second barrow. Hold Szel back until the Skeletons outnumber the Footmen two to one, then bury his Keep. Bones are cheap. Time is not.',
    objective: 'Destroy every Knights building.',
    mapId: 'shattered-crown',
    opponents: [{ race: 'human', difficulty: 'medium' }],
    win: 'eliminate'
  },
  {
    id: 'myriad-4',
    race: 'bio',
    act: 2,
    actName: 'The Spreading Dark',
    name: 'Two Feasts',
    hook: 'Knights and Elves on one causeway. Eat the loser first.',
    briefing:
      'Knights and Elves march the ashen causeway together and hate each other only slightly less than they fear you. Let them fight. Every corpse is a recruit. Finish the weaker camp, then the tired one, and raise both onto your side of the ledger.',
    objective: 'Destroy every hostile building.',
    mapId: 'ashen-procession',
    opponents: [
      { race: 'human', difficulty: 'medium' },
      { race: 'alien', difficulty: 'easy' }
    ],
    win: 'eliminate'
  },
  {
    id: 'myriad-5',
    race: 'bio',
    act: 2,
    actName: 'The Spreading Dark',
    name: 'Funeral Barges',
    hook: 'No bridge. The dead do not swim, so they sail.',
    briefing:
      'The Elves hold the isles and the strait between is deep. Raise a Dark Sanctum. Build Funeral Barges. Load Skeletons and Necromancers and drift across under the fog. Ghouls who wade in sink. Land at the shore, break the lodge, and let the barge return for the next wave.',
    objective: 'Destroy every Elven building.',
    mapId: 'islands',
    opponents: [{ race: 'alien', difficulty: 'medium' }],
    win: 'eliminate',
    extraMinerals: 120,
    extraGas: 50
  },
  {
    id: 'myriad-6',
    race: 'bio',
    act: 3,
    actName: 'The Grave Tide',
    name: 'Hold the Crypt',
    hook: 'Six minutes. The knights come to burn the barrows.',
    briefing:
      'The Knights are six minutes from the barrows with torches and Clerics. Fortify the Crypt. Keep Szel standing. Gargoyle Spires, Mausoleums and a second Boneyard; make them pay for every step. Razing his Keep early is a win. Losing your last building is not.',
    objective: 'Survive 6:00, or destroy the enemy.',
    mapId: 'bloom-wastes',
    opponents: [{ race: 'human', difficulty: 'medium' }],
    win: 'survive',
    surviveSeconds: 360,
    extraMinerals: 150,
    extraGas: 40,
    playerBarracks: true,
    playerTurrets: 2,
    enemyBarracks: true
  },
  {
    id: 'myriad-7',
    race: 'bio',
    act: 3,
    actName: 'The Grave Tide',
    name: 'The Warden Falls',
    hook: 'Auren holds the Reliquaries. Bring every bone.',
    briefing:
      'Warden Auren holds both reliquaries with Treants, Ballistas and Starweavers. Bring the whole Legion: Skeletons, Bone Archers, Sorcerers, Plague Catapults, a Demon. The Greenwood is the last living thing between Szel and the Crown. Make it stop living.',
    objective: 'Destroy every Elven building.',
    mapId: 'twin-reliquaries',
    opponents: [{ race: 'alien', difficulty: 'hard' }],
    win: 'eliminate'
  },
  {
    id: 'myriad-8',
    race: 'bio',
    act: 3,
    actName: 'The Grave Tide',
    name: 'The Grave Tide',
    hook: 'Crown and Wood have made peace. Bury both, or be buried.',
    briefing:
      'Kael and Auren have struck a pact. Two hard commanders share the storm and will not bleed each other. Their shores are fortified. Claim the sea. Break both isles. If either banner still flies at dawn, the Legion goes back into the ground for good. Szel did not climb out of the grave to return to it.',
    objective: 'Destroy both allied commanders.',
    mapId: 'blackstone-isles',
    opponents: [
      { race: 'human', difficulty: 'hard' },
      { race: 'alien', difficulty: 'hard' }
    ],
    win: 'eliminate',
    extraGas: 40,
    enemyTurrets: 2,
    enemyBarracks: true,
    gameMode: 'team'
  }
]

const MISSIONS_BY_RACE: Record<RaceId, CampaignMission[]> = {
  human: VANGUARD_MISSIONS,
  alien: AETHYR_MISSIONS,
  bio: MYRIAD_MISSIONS
}

const ALL_MISSIONS: CampaignMission[] = [...VANGUARD_MISSIONS, ...AETHYR_MISSIONS, ...MYRIAD_MISSIONS]

/** All three campaigns combined (8 missions each). Used by the campaign board. */
export const CAMPAIGN_MISSION_COUNT = ALL_MISSIONS.length

export function campaignIdsForRace(race: RaceId): string[] {
  return MISSIONS_BY_RACE[race].map((mission) => mission.id)
}

export function allCampaignMissionIds(): string[] {
  return ALL_MISSIONS.map((mission) => mission.id)
}

/** Best-effort reconstruction when we only know how many missions were finished. */
export function fillSequentialCampaignIds(count: number): string[] {
  const cap = Math.max(0, Math.min(ALL_MISSIONS.length, Math.floor(Number(count) || 0)))
  return allCampaignMissionIds().slice(0, cap)
}

/** Missions implied by a saved portrait unlock (not by the live campaign list). */
export function campaignIdsForPortrait(portrait: string): string[] {
  if (portrait === 'antrom') return allCampaignMissionIds()
  if (portrait === 'kael') return campaignIdsForRace('human')
  if (portrait === 'auren') return campaignIdsForRace('alien')
  if (portrait === 'szel') return campaignIdsForRace('bio')
  return []
}

export type CampaignProgress = {
  completed: string[]
}

const LOCAL_SAVE_KEY = 'siege-of-antrom-campaign-v1'
const LOCAL_MIGRATED_KEY = 'siege-of-antrom-campaign-v1-migrated'

const progress: CampaignProgress = { completed: [] }
/** Wallet (or guest id) whose local save we are writing. Empty until session binds it. */
let boundWallet = ''

type CampaignPersistHook = (completed: string[]) => void
let persistHook: CampaignPersistHook | undefined
let progressListener: (() => void) | undefined

/** Server/session registers this so a win is written to player storage. */
export function setCampaignPersistHook(hook: CampaignPersistHook): void {
  persistHook = hook
}

/** UI registers this so the campaign picker jumps to the next mission after a load. */
export function setCampaignProgressListener(listener: () => void): void {
  progressListener = listener
}

export function getCampaignProgress(): CampaignProgress {
  return progress
}

/**
 * Switch the local cache to this wallet. Clears in-memory progress first so a
 * second wallet on the same browser cannot inherit the previous commander's
 * missions, then loads that wallet's keyed save (migrating the old unkeyed
 * blob once).
 */
export function bindCampaignWallet(address: string): void {
  const key = address.toLowerCase()
  if (boundWallet === key) return
  boundWallet = key
  progress.completed.length = 0
  const keyed = loadFromStorageKey(storageKeyFor(key))
  if (keyed.length > 0) {
    mergeCompleted(keyed)
  } else {
    const storage = getWebStorage()
    const alreadyMigrated = storage?.getItem(LOCAL_MIGRATED_KEY)
    if (!alreadyMigrated) {
      mergeCompleted(loadFromStorageKey(LOCAL_SAVE_KEY))
      try {
        storage?.setItem(LOCAL_MIGRATED_KEY, key)
      } catch {
        // Ignore quota / private-mode failures; server storage is the source of truth.
      }
    }
  }
  writeLocalCampaignProgress()
}

export function getMissionsForRace(race: RaceId): CampaignMission[] {
  return MISSIONS_BY_RACE[race]
}

export function isCampaignMissionCompleted(id: string): boolean {
  return progress.completed.includes(id)
}

export function isCampaignMissionUnlocked(id: string): boolean {
  const list = missionsForId(id)
  if (!list) return false
  const index = list.findIndex((mission) => mission.id === id)
  if (index <= 0) return true
  return isCampaignMissionCompleted(list[index - 1].id)
}

export function getCampaignMission(id: string | undefined): CampaignMission | undefined {
  if (!id) return undefined
  return ALL_MISSIONS.find((mission) => mission.id === id)
}

/** Per-race act art so an Undead briefing never shows knights. */
export function getCampaignBriefingArt(mission: CampaignMission): string {
  const index = MISSIONS_BY_RACE[mission.race].findIndex((entry) => entry.id === mission.id)
  return `images/ui/briefings/${mission.race}-m${Math.max(1, index + 1)}.jpg`
}

/** First incomplete unlocked mission in this race's campaign, or the last once it is clear. */
export function getNextCampaignMission(race: RaceId): CampaignMission {
  const list = MISSIONS_BY_RACE[race]
  const next = list.find((mission) => isCampaignMissionUnlocked(mission.id) && !isCampaignMissionCompleted(mission.id))
  return next ?? list[list.length - 1]
}

export function getNextCampaignMissionAfter(id: string): CampaignMission | undefined {
  const list = missionsForId(id)
  if (!list) return undefined
  const index = list.findIndex((mission) => mission.id === id)
  if (index < 0 || index >= list.length - 1) return undefined
  return list[index + 1]
}

export function markCampaignMissionComplete(id: string): void {
  if (!mergeCompleted([id])) return
  writeLocalCampaignProgress()
  persistHook?.(progress.completed.slice())
  progressListener?.()
}

/** Merge a saved list into memory (local cache or server). Does not re-upload. */
export function applyCampaignProgress(completed: string[]): void {
  if (!mergeCompleted(completed)) return
  writeLocalCampaignProgress()
  progressListener?.()
}

export function isCampaignCleared(race: RaceId): boolean {
  return MISSIONS_BY_RACE[race].every((mission) => isCampaignMissionCompleted(mission.id))
}

/** Completed missions in one campaign (0–8). */
export function getCampaignCompletedCount(race: RaceId): number {
  return getMissionsForRace(race).filter((mission) => isCampaignMissionCompleted(mission.id)).length
}

export function campaignOpponentsFor(mission: CampaignMission): OpponentSetup[] {
  return mission.opponents.map((opponent) => ({
    race: opponent.race,
    difficulty: opponent.difficulty,
    team: 2
  }))
}

export function formatSurviveClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function missionsForId(id: string): CampaignMission[] | undefined {
  const mission = getCampaignMission(id)
  if (!mission) return undefined
  return MISSIONS_BY_RACE[mission.race]
}

function sanitizeCompleted(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  const unique: string[] = []
  for (const id of ids) {
    if (typeof id !== 'string' || !getCampaignMission(id) || unique.includes(id)) continue
    unique.push(id)
  }
  return unique
}

function mergeCompleted(ids: string[]): boolean {
  const incoming = sanitizeCompleted(ids)
  let changed = false
  for (const id of incoming) {
    if (progress.completed.includes(id)) continue
    progress.completed.push(id)
    changed = true
  }
  return changed
}

function getWebStorage(): { getItem(key: string): string | null; setItem(key: string, value: string): void } | undefined {
  try {
    return (globalThis as { localStorage?: { getItem(key: string): string | null; setItem(key: string, value: string): void } }).localStorage
  } catch {
    return undefined
  }
}

function storageKeyFor(address: string): string {
  return `${LOCAL_SAVE_KEY}:${address}`
}

function loadFromStorageKey(key: string): string[] {
  try {
    const raw = getWebStorage()?.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { completed?: unknown }
    return sanitizeCompleted(parsed.completed)
  } catch {
    return []
  }
}

function loadLocalCampaignProgress(): string[] {
  return loadFromStorageKey(boundWallet ? storageKeyFor(boundWallet) : LOCAL_SAVE_KEY)
}

function writeLocalCampaignProgress(): void {
  try {
    const key = boundWallet ? storageKeyFor(boundWallet) : LOCAL_SAVE_KEY
    getWebStorage()?.setItem(key, JSON.stringify({ version: 1, completed: progress.completed }))
  } catch {
    // Explorer/preview without web storage; the server persist hook still runs.
  }
}

applyCampaignProgress(loadLocalCampaignProgress())
