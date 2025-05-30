import { newCommand } from '../handle.js';
import { getPlayerByName } from '../../assets/util.js';
import { logDebug } from '../../assets/logger.js'; // Moved logDebug to logger.js
import { ACModule } from '../../classes/module.js';

newCommand({
    name: "warnings",
    description: "<player> List the player's warnings",
    /**
     * Executes the warnings command.
     * Lists all warnings for a specified player, categorized by manual warnings and module-specific warnings.
     * This command cannot be used to view the warnings of an admin player.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @param {string[]} data.args - The command arguments. Expects `args[1...]` to form the name of the player whose warnings are to be listed.
     * @returns {void} Sends messages to the command executor detailing the warnings or an error message.
     */
    run: (data) => {
        const { player, args } = data;
        try {
            const setName = args.slice(1).join(" ").replace(/["@]/g, "").trim();

            const targetPlayer = getPlayerByName(setName);

            if (!targetPlayer) {
                player.sendMessage(`§6[§eAnti Cheats§6]§f Player §e${setName}§f was not found`);
                return;
            }

            if (targetPlayer.hasAdmin()) {
                player.sendMessage(`§6[§eAnti Cheats§6]§f Can't view the warnings of §e${targetPlayer.name}§f, they're an admin.`);
                return;
            }
            player.sendMessage(`§6[§eAnti Cheats§6]§f ${targetPlayer.name} warnings count:`);
            
            const warnings = targetPlayer.getWarnings(); 
            const moduleKeys = ACModule.getValidModules(true);

            player.sendMessage(`§6[§eAnti Cheats§6]§f Manual §eWarnings by Admins§f: §e${warnings["manual"] ?? 0}`)
            for(let i = 0; i < moduleKeys.length; i++){
                player.sendMessage(`§6[§eAnti Cheats§6]§f Module §e${ACModule.Modules[ACModule.getModuleID(moduleKeys[i])]}§f: §e${warnings[ACModule.getModuleID(moduleKeys[i])] ?? 0}`);
            }
        } catch (error) {
            logDebug("[Anti Cheats Command Error][warnings]", error, error.stack);
            if (player) {
                player.sendMessage("§cAn unexpected error occurred while trying to list warnings.");
            }
        }
    }
})