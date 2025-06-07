// Movement Checks
export * from './movement/flyCheck.js';
export * from './movement/speedCheck.js';
export * from './movement/noFallCheck.js';
export { checkNoSlow } from './movement/noSlowCheck.js';
export { checkInvalidSprint } from './movement/invalidSprintCheck.js';

// Combat Checks
export * from './combat/reachCheck.js';
export * from './combat/cpsCheck.js';
export * from './combat/viewSnapCheck.js';
export * from './combat/multiTargetCheck.js';
export * from './combat/stateConflictCheck.js';

// World Checks
export * from './world/nukerCheck.js';
export * from './world/illegalItemCheck.js';
export { checkTower, checkFlatRotationBuilding, checkDownwardScaffold, checkAirPlace, checkFastPlace } from './world/buildingChecks.js';
export { checkFastUse } from './world/fastUseCheck.js';
export { checkAutoTool } from './world/autoToolCheck.js';
export { checkBreakUnbreakable, checkBreakSpeed } from './world/instaBreakCheck.js';
export { checkNameSpoof } from './world/nameSpoofCheck.js'; // Note: NameSpoof and AntiGMC were placed in /world previously
export { checkAntiGMC } from './world/antiGMCCheck.js';   // To be consistent with that decision for now.

// Player Behavior Checks (New Category)
export { checkSwitchAndUseInSameTick, checkInventoryMoveWhileActionLocked } from './player/inventoryModCheck.js';
