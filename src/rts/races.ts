import { Color4 } from '@dcl/sdk/math'
import { gameState } from './state'
import type { BuildableKind, RaceId, RaceUnitStats, ResourceCost, SoldierVariant, Team } from './types'

// The three playable races. Units and buildings are fully distinct procedural
// models with their own stats. Every race fields these unit roles:
//   worker / melee / ranged / healer (support) / caster (AoE splash) /
//   antiAir (ground, only shoots air) / flyer (fast hoverer) / transport /
//   heavyAir (capital ship) / siege (long-range artillery) / titan (giant).
//
// Healer flavor: human = strong single-target beam, alien = beam that also
// mends structures, bio = weaker regeneration aura hitting every nearby ally.
// Siege flavor: human = balanced splash howitzer, alien = heaviest single
// bolt, bio = cheap acid lob that poisons victims. All siege outranges the
// 10m turret and none of them can hit air.
//
// Balance identity (cost-efficiency must order bio > human > alien at every
// tier, raw per-unit power the opposite way; production times likewise):
//   human - baseline all-rounder; crews repair structures 1.75x faster.
//   alien - expensive, durable, hard-hitting, slow to produce; structures
//           self-assemble at half worker speed once seeded.
//   bio   - cheap, fast, fragile, swarms out of quick production cycles;
//           every living unit regenerates 1 HP per second.

const MELEE_RANGE = 1.8

export type RaceDefinition = {
  id: RaceId
  name: string
  tagline: string
  color: Color4
  accent: Color4
  worker: RaceUnitStats
  melee: RaceUnitStats
  ranged: RaceUnitStats
  healer: RaceUnitStats
  caster: RaceUnitStats
  /** Ground trooper whose weapon ONLY reaches airborne targets. */
  antiAir: RaceUnitStats
  flyer: RaceUnitStats
  /** Unarmed flying carrier: ferries up to 8 ground units across the water on island maps. */
  transport: RaceUnitStats
  /** Capital ship: slow, expensive, hits ground and air with splash. */
  heavyAir: RaceUnitStats
  siege: RaceUnitStats
  titan: RaceUnitStats
  /** Signature hero: one per match, granted at the start, cannot be rebuilt. */
  hero: RaceUnitStats
  /** Short trait blurb shown when the hero is selected. */
  heroTrait: string
  buildingNames: Record<BuildableKind, string>
}

export const RACES: Record<RaceId, RaceDefinition> = {
  human: {
    id: 'human',
    name: 'KNIGHTS OF ANTROM',
    tagline: 'The old crown. Balanced units; masons repair walls fast.',
    color: Color4.create(0.35, 0.55, 0.85, 1),
    accent: Color4.create(0.45, 0.7, 1, 1),
    worker: { name: 'Peasant', hp: 35, cost: { minerals: 50 }, productionTime: 2, supply: 1 },
    melee: { name: 'Footman', hp: 100, damage: 11, moveSpeed: 3, attackRange: MELEE_RANGE, cost: { minerals: 100 }, productionTime: 2, supply: 1 },
    ranged: { name: 'Longbowman', hp: 70, damage: 9, moveSpeed: 2.9, attackRange: 6, cost: { minerals: 80, gas: 25 }, productionTime: 2.2, supply: 1 },
    healer: { name: 'Cleric', hp: 60, damage: 0, moveSpeed: 3.1, attackRange: 2.5, healRate: 9, cost: { minerals: 75, gas: 50 }, productionTime: 2.5, supply: 1 },
    caster: { name: 'Court Mage', hp: 60, damage: 14, moveSpeed: 2.7, attackRange: 7, attackRate: 1.7, splashRadius: 2.8, cost: { minerals: 100, gas: 100 }, productionTime: 3.5, supply: 2 },
    antiAir: { name: 'Crossbowman', hp: 70, damage: 16, moveSpeed: 3.1, attackRange: 8, attackRate: 1.1, cost: { minerals: 75, gas: 25 }, productionTime: 2.4, supply: 1 },
    flyer: { name: 'Gryphon Rider', hp: 90, damage: 12, moveSpeed: 4.2, attackRange: 6.5, attackRate: 0.9, cost: { minerals: 120, gas: 80 }, productionTime: 3.5, supply: 2 },
    transport: { name: 'Sky Barge', hp: 160, damage: 0, moveSpeed: 3.6, attackRange: 0, cost: { minerals: 150, gas: 75 }, productionTime: 4, supply: 2 },
    heavyAir: { name: 'War Dragon', hp: 340, damage: 26, moveSpeed: 2.5, attackRange: 7, attackRate: 1.6, splashRadius: 1.8, cost: { minerals: 300, gas: 200 }, productionTime: 8, supply: 4 },
    siege: { name: 'Catapult', hp: 170, damage: 52, moveSpeed: 2.15, attackRange: 12.5, attackRate: 3, splashRadius: 3, cost: { minerals: 200, gas: 125 }, productionTime: 5.5, supply: 3 },
    titan: { name: 'Champion', hp: 380, damage: 40, moveSpeed: 2.2, attackRange: 2.8, attackRate: 1.7, splashRadius: 2.2, cost: { minerals: 300, gas: 200 }, productionTime: 8, supply: 4 },
    hero: { name: 'Lord Commander Kael', hp: 550, damage: 26, moveSpeed: 3, attackRange: 6.5, attackRate: 1.1, cost: {}, productionTime: 0, supply: 0 },
    heroTrait: 'Royal Standard: allied fighters near Kael deal +25% damage.',
    buildingNames: {
      temple: 'Keep',
      supplyHouse: 'Homestead',
      barracks: 'Barracks',
      techLab: 'Mage Tower',
      forge: 'Blacksmith',
      airForge: 'Siege Yard',
      fireplace: 'Beacon',
      turret: 'Watchtower'
    }
  },
  alien: {
    id: 'alien',
    name: 'ELVES OF THE GREENWOOD',
    tagline: 'Ancient wardens. Devastating units; groves grow themselves.',
    color: Color4.create(0.75, 0.6, 0.25, 1),
    accent: Color4.create(0.85, 0.65, 1, 1),
    worker: { name: 'Tender', hp: 35, cost: { minerals: 50 }, productionTime: 2.5, supply: 1 },
    melee: { name: 'Bladesinger', hp: 125, damage: 16, moveSpeed: 2.8, attackRange: MELEE_RANGE, cost: { minerals: 125, gas: 50 }, productionTime: 3, supply: 1 },
    ranged: { name: 'Ranger', hp: 85, damage: 13, moveSpeed: 2.7, attackRange: 7, cost: { minerals: 100, gas: 75 }, productionTime: 3.2, supply: 1 },
    healer: { name: 'Druid', hp: 85, damage: 0, moveSpeed: 2.7, attackRange: 3, healRate: 7, cost: { minerals: 100, gas: 75 }, productionTime: 3.2, supply: 1 },
    caster: { name: 'Starweaver', hp: 70, damage: 18, moveSpeed: 2.6, attackRange: 8, attackRate: 1.9, splashRadius: 3.2, cost: { minerals: 125, gas: 125 }, productionTime: 4, supply: 2 },
    antiAir: { name: 'Moon Archer', hp: 90, damage: 20, moveSpeed: 2.9, attackRange: 8.5, attackRate: 1.3, cost: { minerals: 100, gas: 50 }, productionTime: 3, supply: 1 },
    flyer: { name: 'Hawk Rider', hp: 110, damage: 15, moveSpeed: 3.9, attackRange: 7, attackRate: 1.1, cost: { minerals: 150, gas: 100 }, productionTime: 4, supply: 2 },
    transport: { name: 'Wind Skiff', hp: 200, damage: 0, moveSpeed: 3.3, attackRange: 0, cost: { minerals: 175, gas: 100 }, productionTime: 4.5, supply: 2 },
    heavyAir: { name: 'Elder Roc', hp: 400, damage: 32, moveSpeed: 2.3, attackRange: 7.5, attackRate: 1.8, splashRadius: 2, cost: { minerals: 350, gas: 250 }, productionTime: 9, supply: 4 },
    siege: { name: 'Ballista', hp: 200, damage: 68, moveSpeed: 1.95, attackRange: 13.5, attackRate: 3.3, splashRadius: 2.6, cost: { minerals: 250, gas: 175 }, productionTime: 6.5, supply: 3 },
    titan: { name: 'Treant', hp: 450, damage: 50, moveSpeed: 2, attackRange: 3, attackRate: 1.9, splashRadius: 2.4, cost: { minerals: 350, gas: 250 }, productionTime: 9, supply: 4 },
    hero: { name: 'Warden Auren', hp: 650, damage: 34, moveSpeed: 2.6, attackRange: 7.5, attackRate: 1.6, splashRadius: 3.5, cost: {}, productionTime: 0, supply: 0 },
    heroTrait: 'Greenwood Ward: Auren constantly regenerates 4 HP per second.',
    buildingNames: {
      temple: 'Tree Hall',
      supplyHouse: 'Bower',
      barracks: 'Warden Lodge',
      techLab: 'Moon Shrine',
      forge: 'Runesmith',
      airForge: 'Ballista Works',
      fireplace: 'Waystone',
      turret: 'Archer Platform'
    }
  },
  bio: {
    id: 'bio',
    name: 'UNDEAD LEGION',
    tagline: 'The risen dead. Cheap and fast; the fallen knit themselves back together.',
    color: Color4.create(0.65, 0.25, 0.3, 1),
    accent: Color4.create(1, 0.45, 0.3, 1),
    worker: { name: 'Ghoul', hp: 30, cost: { minerals: 50 }, productionTime: 1.5, supply: 1 },
    melee: { name: 'Skeleton', hp: 55, damage: 7, moveSpeed: 3.6, attackRange: MELEE_RANGE, cost: { minerals: 50 }, productionTime: 1.2, supply: 1 },
    ranged: { name: 'Bone Archer', hp: 45, damage: 6, moveSpeed: 3.2, attackRange: 5.5, cost: { minerals: 50, gas: 25 }, productionTime: 1.4, supply: 1 },
    healer: { name: 'Necromancer', hp: 50, damage: 0, moveSpeed: 3.4, attackRange: 3.5, healRate: 3, cost: { minerals: 60, gas: 25 }, productionTime: 1.6, supply: 1 },
    caster: { name: 'Sorcerer', hp: 50, damage: 10, moveSpeed: 3, attackRange: 6, attackRate: 1.5, splashRadius: 2.6, cost: { minerals: 80, gas: 60 }, productionTime: 2.5, supply: 2 },
    antiAir: { name: 'Bone Thrower', hp: 55, damage: 12, moveSpeed: 3.5, attackRange: 7.5, attackRate: 0.9, cost: { minerals: 60, gas: 25 }, productionTime: 1.6, supply: 1 },
    flyer: { name: 'Wraith', hp: 70, damage: 9, moveSpeed: 4.5, attackRange: 5.5, attackRate: 0.8, cost: { minerals: 90, gas: 50 }, productionTime: 2.2, supply: 2 },
    transport: { name: 'Bone Wyrm', hp: 130, damage: 0, moveSpeed: 3.9, attackRange: 0, cost: { minerals: 125, gas: 50 }, productionTime: 3, supply: 2 },
    heavyAir: { name: 'Dread Dragon', hp: 280, damage: 20, moveSpeed: 2.7, attackRange: 6.5, attackRate: 1.3, splashRadius: 1.8, cost: { minerals: 250, gas: 150 }, productionTime: 6, supply: 4 },
    siege: { name: 'Plague Catapult', hp: 140, damage: 38, moveSpeed: 2.55, attackRange: 12, attackRate: 2.6, splashRadius: 3.4, cost: { minerals: 150, gas: 100 }, productionTime: 4, supply: 3 },
    titan: { name: 'Bone Giant', hp: 320, damage: 30, moveSpeed: 2.6, attackRange: 2.6, attackRate: 1.5, splashRadius: 2, cost: { minerals: 250, gas: 150 }, productionTime: 6, supply: 4 },
    hero: { name: 'Lich Queen Szel', hp: 750, damage: 24, moveSpeed: 3.2, attackRange: 2.2, attackRate: 1.4, splashRadius: 1.6, cost: {}, productionTime: 0, supply: 0 },
    heroTrait: 'Endless Dead: Szel raises a free Skeleton every 35 seconds.',
    buildingNames: {
      temple: 'Crypt',
      supplyHouse: 'Mausoleum',
      barracks: 'Boneyard',
      techLab: 'Dark Sanctum',
      forge: 'Ossuary',
      airForge: 'Plague Works',
      fireplace: 'Soul Pyre',
      turret: 'Gargoyle Spire'
    }
  }
}

export const RACE_IDS: RaceId[] = ['human', 'alien', 'bio']

export function getRace(team: Team): RaceDefinition {
  return RACES[team === 'player' ? gameState.playerRace : gameState.enemyRaces[team]]
}

export function getWorkerDefinition(team: Team): RaceUnitStats {
  return getRace(team).worker
}

export function getSoldierDefinition(team: Team, variant: SoldierVariant): RaceUnitStats {
  const race = getRace(team)
  if (variant === 'ranged') return race.ranged
  if (variant === 'healer') return race.healer
  if (variant === 'caster') return race.caster
  if (variant === 'antiAir') return race.antiAir
  if (variant === 'flyer') return race.flyer
  if (variant === 'transport') return race.transport
  if (variant === 'heavyAir') return race.heavyAir
  if (variant === 'siege') return race.siege
  if (variant === 'titan') return race.titan
  if (variant === 'hero') return race.hero
  return race.melee
}

/**
 * Feature switches. `air` compiles the flying roster (flyer / transport / heavyAir and the
 * anti-air trooper) in or out. Siege of Antrom ships without it until dragon or griffin
 * packs exist; the code paths stay so air can come back by flipping this.
 */
export const FLAGS = {
  air: false
}

/** Variants that only exist when FLAGS.air is on. */
export const AIR_ROSTER: SoldierVariant[] = ['antiAir', 'flyer', 'transport', 'heavyAir']

/** Whether a soldier variant can be trained or referenced in menus under the current flags. */
export function isVariantEnabled(variant: SoldierVariant): boolean {
  return FLAGS.air || !AIR_ROSTER.includes(variant)
}

/** Airborne variants: fly over the void on island maps and only anti-air weapons reach them. */
export function isAirVariant(variant: SoldierVariant): boolean {
  return variant === 'flyer' || variant === 'transport' || variant === 'heavyAir'
}

/**
 * Structure that trains a soldier variant. Infantry at the barracks, everything advanced at the
 * tech lab; without air the Skyharbor slot (`airForge`) becomes the siege workshop and takes
 * the siege engine and titan off the tech lab's hands.
 */
export function getTrainerKind(variant: SoldierVariant): BuildableKind {
  if (!FLAGS.air && (variant === 'siege' || variant === 'titan')) return 'airForge'
  return ADVANCED_VARIANTS.includes(variant) ? 'techLab' : 'barracks'
}

/** Structures that queue soldiers. */
export function isSoldierTrainer(kind: BuildableKind | string): boolean {
  return kind === 'barracks' || kind === 'techLab' || (!FLAGS.air && kind === 'airForge')
}

/** Structures that queue research. */
export function isResearchLab(kind: BuildableKind | string): boolean {
  return kind === 'forge' || (FLAGS.air && kind === 'airForge')
}

/** How many ground units fit inside a transport. */
export const TRANSPORT_CAPACITY = 8

/** Variants trained at the advanced structure instead of the barracks. */
export const ADVANCED_VARIANTS: SoldierVariant[] = ['flyer', 'transport', 'heavyAir', 'siege', 'titan']

/** Tech tiers: these variants also need this building to exist before they can be trained. */
export const UNIT_REQUIREMENTS: Partial<Record<SoldierVariant, BuildableKind>> = {
  siege: 'forge',
  titan: 'forge',
  heavyAir: 'airForge'
}

/** Roles a faction fields under the current flags (unit rosters, icons, showcases iterate this). */
export const ACTIVE_VARIANTS: SoldierVariant[] = (
  ['melee', 'ranged', 'healer', 'caster', 'antiAir', 'flyer', 'transport', 'heavyAir', 'siege', 'titan', 'hero'] as SoldierVariant[]
).filter(isVariantEnabled)

export function getBuildingDisplayName(kind: BuildableKind, team: Team): string {
  return getRace(team).buildingNames[kind]
}

/** Roll a random race for a computer set to 'random'; any race is fair game. */
export function pickRandomRace(): RaceId {
  return RACE_IDS[Math.floor(Math.random() * RACE_IDS.length)]
}

export function formatRaceCost(cost: ResourceCost): string {
  const parts: string[] = []
  if (cost.minerals) parts.push(`${cost.minerals} crystal`)
  if (cost.gas) parts.push(`${cost.gas} plasma`)
  return parts.join(' / ')
}
