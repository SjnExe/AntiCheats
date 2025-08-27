import { world } from '@minecraft/server';
import { getPlayer } from './playerDataManager.js';
import { getPlayerRank } from './rankManager.js';
import { getConfig } from './configManager.js';
import { rankDefinitions } from './ranksConfig.js';

const SCOREBOARD_OBJECTIVES = {
    balance: 'ae_balance',
    bounty: 'ae_bounty'
};

/**
 * Initializes the scoreboard objectives required for the custom UI.
 */
export function initializeCustomUi() {
    for (const objective of Object.values(SCOREBOARD_OBJECTIVES)) {
        if (!world.scoreboard.getObjective(objective)) {
            world.scoreboard.addObjective(objective, objective);
        }
    }
}

/**
 * Shows the custom "My Stats" panel to a player.
 * @param {import('@minecraft/server').Player} player
 */
export function showMyStatsPanel(player) {
    const pData = getPlayer(player.id);
    const rank = getPlayerRank(player, getConfig());

    if (!pData || !rank) {
        player.sendMessage("§cCould not retrieve your stats.");
        return;
    }

    // Set scoreboard values for the player
    const balanceObjective = world.scoreboard.getObjective(SCOREBOARD_OBJECTIVES.balance);
    const bountyObjective = world.scoreboard.getObjective(SCOREBOARD_OBJECTIVES.bounty);
    balanceObjective.setScore(player, pData.balance);
    bountyObjective.setScore(player, pData.bounty);

    // Set rank tag for the player
    // First, remove any existing rank tags
    for (const rankDef of rankDefinitions) {
        player.removeTag(`rank:${rankDef.name}`);
    }
    // Then, add the current rank tag
    player.addTag(`rank:${rank.name}`);

    // Use scriptevent to open the UI on the client
    player.runCommandAsync(`scriptevent addonexe:show_my_stats`);
}
