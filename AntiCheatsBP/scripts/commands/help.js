/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'help',
    syntax: '[commandName]',
    description: 'command.help.description',
    permissionLevel: 1024, // member
};

/**
 * Executes the !help command.
 * Displays a list of available commands filtered by the user's permission level,
 * or detailed information if a specific command name is provided.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [commandName].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {void}
 */
export function execute(player, args, dependencies) {
    const { commandDefinitionMap, config, permissionLevels: depPermLevels, rankManager, getString, playerUtils } = dependencies;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        console.warn('[HelpCommand] Invalid player object.');
        return;
    }

    const userPermissionLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);
    if (typeof userPermissionLevel !== 'number') {
        playerUtils?.debugLog(`[HelpCommand WARNING] Could not determine permission level for ${playerName}. Defaulting to most restrictive for help display.`, playerName, dependencies);
    }

    const prefix = config?.prefix ?? '!';

    if (args[0]) {
        const specificCommandNameInput = args[0].toLowerCase().replace(prefix, '');
        let foundCmdDef = commandDefinitionMap?.get(specificCommandNameInput);

        // If not found directly, try resolving as an alias using the central aliasToCommandMap
        if (!foundCmdDef && dependencies.aliasToCommandMap) {
            const mainCommandName = dependencies.aliasToCommandMap.get(specificCommandNameInput);
            if (mainCommandName) {
                // mainCommandName should already be lowercase as stored in aliasToCommandMap
                foundCmdDef = commandDefinitionMap?.get(mainCommandName);
            }
        }

        if (foundCmdDef) {
            let isEffectivelyEnabled = foundCmdDef.enabled !== false;
            if (config?.commandSettings?.[foundCmdDef.name] && typeof config.commandSettings[foundCmdDef.name].enabled === 'boolean') {
                isEffectivelyEnabled = config.commandSettings[foundCmdDef.name].enabled;
            }

            if (!isEffectivelyEnabled) {
                player.sendMessage(getString('command.help.unknownCommand', { prefix, commandName: specificCommandNameInput }));
                return;
            }

            if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                const syntaxArgs = foundCmdDef.syntax.startsWith(prefix + foundCmdDef.name)
                    ? foundCmdDef.syntax.substring((prefix + foundCmdDef.name).length).trim()
                    : (foundCmdDef.syntax.startsWith(foundCmdDef.name) ? foundCmdDef.syntax.substring(foundCmdDef.name.length).trim() : foundCmdDef.syntax);


                let permLevelName = getString('common.value.unknown');
                for (const key in depPermLevels) {
                    if (depPermLevels[key] === foundCmdDef.permissionLevel) {
                        permLevelName = key.charAt(0).toUpperCase() + key.slice(1);
                        break;
                    }
                }
                const descriptionText = getString(foundCmdDef.description) || foundCmdDef.description;

                player.sendMessage(
                    `${getString('command.help.specific.header', { prefix, commandName: foundCmdDef.name }) }\n${
                        getString('command.help.specific.syntax', { prefix, commandName: foundCmdDef.name, syntaxArgs: syntaxArgs || '' }) }\n${
                        getString('command.help.specific.description', { description: descriptionText }) }\n${
                        getString('command.help.specific.permission', { permLevelName, permissionLevel: foundCmdDef.permissionLevel.toString() })}`,
                );
            } else {
                player.sendMessage(getString('command.help.noPermission', { prefix, commandName: specificCommandNameInput }));
            }
        } else {
            player.sendMessage(getString('command.help.unknownCommand', { prefix, commandName: specificCommandNameInput }));
        }
    } else {
        let helpMessage = `${getString('command.help.header', { prefix }) }\n`;
        let commandsListed = 0;

        const categories = [
            { nameStringKey: 'command.help.category.general', minPerm: depPermLevels.member },
            { nameStringKey: 'command.help.category.teleport', minPerm: depPermLevels.member,
                /**
                 * Condition to check if TPA system is enabled.
                 * @returns {boolean} True if TPA is enabled, otherwise false.
                 */
                condition: () => config?.enableTpaSystem === true },
            { nameStringKey: 'command.help.category.moderation', minPerm: depPermLevels.moderator },
            { nameStringKey: 'command.help.category.admin', minPerm: depPermLevels.admin },
            { nameStringKey: 'command.help.category.owner', minPerm: depPermLevels.owner },
        ];

        const allCommandDefs = Array.from(commandDefinitionMap.values());

        categories.forEach(category => {
            if (category.condition && !category.condition()) {
                return;
            }
            if (userPermissionLevel > category.minPerm) {
                return;
            }

            const commandsInCategory = allCommandDefs.filter(cmdDef => {
                let isEffectivelyEnabled = cmdDef.enabled !== false;
                if (config?.commandSettings?.[cmdDef.name] && typeof config.commandSettings[cmdDef.name].enabled === 'boolean') {
                    isEffectivelyEnabled = config.commandSettings[cmdDef.name].enabled;
                }
                return isEffectivelyEnabled &&
                       userPermissionLevel <= cmdDef.permissionLevel &&
                       cmdDef.permissionLevel >= category.minPerm &&
                       (categories.findIndex(c => c.minPerm === cmdDef.permissionLevel) === categories.indexOf(category) ||
                        (cmdDef.permissionLevel < category.minPerm && category.minPerm === depPermLevels.member && cmdDef.permissionLevel >= depPermLevels.member));
            }).sort((a, b) => a.name.localeCompare(b.name));


            if (commandsInCategory.length > 0) {
                helpMessage += `\n${getString(category.nameStringKey)}\n`;
                commandsInCategory.forEach(cmdDef => {
                    const syntaxArgs = cmdDef.syntax.startsWith(prefix + cmdDef.name)
                        ? cmdDef.syntax.substring((prefix + cmdDef.name).length).trim()
                        : (cmdDef.syntax.startsWith(cmdDef.name) ? cmdDef.syntax.substring(cmdDef.name.length).trim() : cmdDef.syntax);
                    const descriptionText = getString(cmdDef.description) || cmdDef.description;
                    helpMessage += `${getString('command.help.entryFormat', { prefix, commandName: cmdDef.name, syntaxArgs: syntaxArgs || '', description: descriptionText }) }\n`;
                    commandsListed++;
                });
            }
        });


        if (commandsListed === 0) {
            helpMessage += getString('command.help.noCommandsAvailable');
        } else {
            if (helpMessage.endsWith('\n')) {
                helpMessage = helpMessage.slice(0, -1);
            }
        }
        player.sendMessage(helpMessage);
    }

}
