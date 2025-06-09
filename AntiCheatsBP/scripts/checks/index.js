/**
 * @file AntiCheatsBP/scripts/checks/index.js
 * Barrel file for exporting all individual cheat detection modules.
 * This allows other parts of the system to import all checks from a single source.
 * @version 1.0.0
 */

// Movement Checks
export * from './movement/flyCheck.js';
export * from './movement/speedCheck.js';
export * from './movement/noFallCheck.js';
export { checkNoSlow } from './movement/noSlowCheck.js';
export { checkInvalidSprint } from './movement/invalidSprintCheck.js';
export * from './movement/netherRoofCheck.js';

// Combat Checks
export * from './combat/reachCheck.js';
export * from './combat/cpsCheck.js';
export * from './combat/viewSnapCheck.js';
export * from './combat/multiTargetCheck.js';
export * from './combat/stateConflictCheck.js';

// World Checks
export * from './world/nukerCheck.js';
export * from './world/illegalItemCheck.js';
export { checkTower, checkFlatRotationBuilding, checkDownwardScaffold, checkAirPlace, checkFastPlace, checkBlockSpam, checkBlockSpamDensity } from './world/buildingChecks.js';
export { checkFastUse } from './world/fastUseCheck.js';
export { checkAutoTool } from './world/autoToolCheck.js';
export { checkBreakUnbreakable, checkBreakSpeed } from './world/instaBreakCheck.js';
export { checkNameSpoof } from './world/nameSpoofCheck.js';
export { checkAntiGMC } from './world/antiGMCCheck.js';
export * from './world/entityChecks.js'; // Exporting checkEntitySpam
export { checkPistonLag } from './world/pistonChecks.js';

// Player Behavior Checks
export { checkSwitchAndUseInSameTick, checkInventoryMoveWhileActionLocked } from './player/inventoryModCheck.js';
export { checkSelfHurt } from './player/selfHurtCheck.js';
export { checkInvalidRenderDistance } from './player/clientInfoChecks.js';

// Chat Checks
export { checkMessageRate } from './chat/messageRateCheck.js';
export { checkMessageWordCount } from './chat/messageWordCountCheck.js';
