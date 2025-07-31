/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'reports',
    description: 'Opens the report management UI.',
    permissionLevel: 1, // admin
};

/**
 * Executes the reports command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} _args
 * @param {import('../../types.js').Dependencies} dependencies
 */
export async function execute(player, _args, dependencies) {
    const { uiManager } = dependencies;
    await uiManager.showPanel(player, 'reportManagementPanel', dependencies, {});
}
