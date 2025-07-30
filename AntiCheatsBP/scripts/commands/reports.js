/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'reports',
    description: 'Opens the report management UI.',
    permissionLevel: 1, // admin
};

/**
 * Executes the !reports command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} _args Command arguments (not used).
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, _args, dependencies) {
    const { uiManager } = dependencies;
    await uiManager.showPanel(player, 'reportManagementPanel', dependencies, {});
}
