import { world } from "@minecraft/server";

world.afterEvents.worldInitialize.subscribe(() => {
  console.log("AntiCheats Addon Initialized!");
});
