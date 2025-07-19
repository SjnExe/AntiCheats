import { world, system } from "@minecraft/server";

system.run(() => {
  world.afterEvents.worldInitialize.subscribe(() => {
    console.log("AntiCheats Addon Initialized!");
  });
});
