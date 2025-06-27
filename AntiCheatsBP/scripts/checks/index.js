/**
 * @file Barrel file for exporting all individual cheat detection modules.
 * This allows other parts of the system to import all checks from a single source.
 */

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

// World Interaction Checks
export * from './world/nukerCheck.js';
export * from './world/illegalItemCheck.js';
export {
    checkTower,
    checkFlatRotationBuilding,
    checkDownwardScaffold,
    checkAirPlace,
    checkFastPlace,
    checkBlockSpam,
    checkBlockSpamDensity,
} from './world/buildingChecks.js';
export { checkFastUse } from './world/fastUseCheck.js';
export { checkAutoTool } from './world/autoToolCheck.js';
export { checkBreakUnbreakable, checkBreakSpeed } from './world/instaBreakCheck.js';
export { checkEntitySpam } from './world/entityChecks.js';
export { checkPistonLag } from './world/pistonChecks.js';
export * from './world/netherRoofCheck.js';

// Player Behavior Checks
export { checkSwitchAndUseInSameTick, checkInventoryMoveWhileActionLocked } from './player/inventoryModCheck.js';
export { checkSelfHurt } from './player/selfHurtCheck.js';
export { checkInvalidRenderDistance } from './player/clientInfoChecks.js';
export { checkAntiGmc } from './player/antiGmcCheck.js';
export { checkNameSpoof } from './player/nameSpoofCheck.js';

// Chat Message Checks
export { checkMessageRate } from './chat/messageRateCheck.js';
// Removed export for checkMessageWordCount as the file is deleted.
export * from './chat/swearCheck.js';
export * from './chat/antiAdvertisingCheck.js';
export * from './chat/capsAbuseCheck.js';
export * from './chat/charRepeatCheck.js';
export * from './chat/symbolSpamCheck.js';
export * from './chat/checkChatContentRepeat.js';
export * from './chat/checkUnicodeAbuse.js';
export * from './chat/checkGibberish.js';
export * from './chat/checkExcessiveMentions.js';
export * from './chat/checkSimpleImpersonation.js';
