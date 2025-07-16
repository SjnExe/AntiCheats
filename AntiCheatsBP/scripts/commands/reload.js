import { dependencyManager } from '../core/dependencyManager.js';

/**
 * @file Defines the !reload command, which reloads the server's configuration.
 */

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'reload',
    description: 'Reloads the addon configuration from source files.',
    permissionLevel: 0, // owner
    enabled: true,
};

/**
 * Executes the !reload command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../types.js').Dependencies} dependencies
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config } = dependencies;
    const { debugLog, getString } = playerUtils;

    player.sendMessage(getString('command.reload.start'));
    debugLog(`[reload] ${player.name} initiated a configuration reload.`, null, dependencies);

    try {
        // Re-import configuration files with a cache-busting mechanism
        const timestamp = Date.now();
        const configModule = await import(`../config.js?v=${timestamp}`);
        const automodConfigModule = await import(`../core/automodConfig.js?v=${timestamp}`);
        const actionProfilesModule = await import(`../core/actionProfiles.js?v=${timestamp}`);
        const ranksConfigModule = await import(`../core/ranksConfig.js?v=${timestamp}`);

        // Update the dependency manager with the newly loaded modules
        dependencyManager.get('editableConfig').config = configModule.editableConfigValues;
        dependencyManager.get('automodConfig').automodConfig = automodConfigModule.automodConfig;
        dependencyManager.get('checkActionProfiles').checkActionProfiles = actionProfilesModule.checkActionProfiles;
        dependencyManager.get('rankDefinitions').rankDefinitions = ranksConfigModule.rankDefinitions; // Assuming this is how it's exported

        // Now, refresh all dependencies that might rely on the reloaded config
        dependencyManager.refreshDependencies();

        // Re-initialize commands to apply any potential changes in command definitions or permissions
        const newDeps = dependencyManager.getAll();
        newDeps.commandManager.reloadCommands(newDeps);

        // Validate the new configurations
        const { validateMainConfig, validateActionProfiles, validateAutoModConfig, validateRanksConfig } = newDeps.configValidator;
        const allValidationErrors = [
            ...validateMainConfig(configModule.defaultConfigSettings, actionProfilesModule.checkActionProfiles, newDeps.commandManager.getAllRegisteredCommandNames(), config.commandAliases),
            ...validateActionProfiles(actionProfilesModule.checkActionProfiles),
            ...validateAutoModConfig(automodConfigModule.automodConfig, actionProfilesModule.checkActionProfiles),
            ...validateRanksConfig(ranksConfigModule, newDeps.config.ownerPlayerName, newDeps.config.adminTag),
        ];

        if (allValidationErrors.length > 0) {
            player.sendMessage(getString('command.reload.validationErrors', { count: allValidationErrors.length }));
            newDeps.playerUtils.notifyAdmins(`§cReload completed with ${allValidationErrors.length} validation errors. Check console.`, newDeps);
            console.warn(`[reload] Validation errors found:\n- ${allValidationErrors.join('\n- ')}`);
        } else {
            player.sendMessage(getString('command.reload.success'));
            debugLog('[reload] Reload and validation successful.', null, newDeps);
        }

    } catch (error) {
        console.error(`[reload CRITICAL] Failed to reload configurations: ${error.stack}`);
        player.sendMessage(getString('command.reload.error'));
        playerUtils.notifyAdmins('§cCRITICAL: The addon configuration failed to reload. Please check the console for errors.', dependencies);
    }
}
