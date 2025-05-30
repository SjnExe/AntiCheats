import * as Minecraft from '@minecraft/server';
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';
import { addPlayerToUnbanQueue, copyInv, invsee, millisecondTime, sendMessageToAllAdmins } from './assets/util.js'; // Removed getPlayerByName
import { logDebug } from './assets/logger.js';
import { ModuleStatusManager as ACModule } from './classes/module.js'; 
import CONFIG from "./config.js"; 

const world = Minecraft.world;


// This function is internal to this module, called by playerActionForm and playerSelectionForm.
function banForm(player,targetPlayer,type,banReason){
        if(targetPlayer.hasAdmin()) return player.sendMessage(`§6[§eAnti Cheats§6]§r Can't ban §e${targetPlayer.name}§f they're an admin.`);

        if(type == "quick"){
                let confirmF = new MessageFormData()
                        .title("Ban Player")
                        .body(`Are you sure you want to ban this player?:\n${targetPlayer.name}`)
                        .button2("Ban")
                        .button1("Cancel")
                confirmF.show(player).then((confirmData) => {
                        if(confirmData.selection === 1){
                                targetPlayer.ban("No reason provided.", Date.now(), true, player);

                                targetPlayer.runCommand(`kick "${targetPlayer.name}" §r§6[§eAnti Cheats§6]§r §4You are permanently banned.\n§4Reason: §cNo reason provided\n§4Banned by: §c${player.name}`)

                                player.sendMessage(`§6[§eAnti Cheats§6]§f Successfully banned §e${targetPlayer.name}`);
                                sendMessageToAllAdmins(`§6[§eAnti Cheats Notify§6]§f §e${player.name}§f banned §e${targetPlayer.name}§f!`,true);

                        }
                        else return player.sendMessage(`§6[§eAnti Cheats§6]§f Ban cancelled.`);
                })
        }
        else if(type=="slow"){
                let banFormModal = new ModalFormData()
                .title("Anti Cheats Ban Form")
                .slider("Ban Time:\n\nDays",0,360,1,0)
                .slider("Hours",0,23,1,0)
                .slider("Minutes",0,59,1,0)
                .toggle("Permanent", false)
                banFormModal.show(player).then((banFormData) => {
                        if(banFormData.canceled) return player.sendMessage(`§6[§eAnti Cheats§6]§f Ban cancelled.`);
                        const now = Date.now();
                        const values = banFormData.formValues;
                        let unbanMinute = values[2] * millisecondTime.minute;
                        let unbanHour = values[1] * millisecondTime.hour;
                        let unbanDay = values[0] * millisecondTime.day;
                        const unbanTime = now + (unbanMinute + unbanHour + unbanDay);
                        const isPermanent = values[3];
                        banReason = banReason ?? "No reason provided."

                        if(unbanTime == now && !isPermanent) return player.sendMessage(`§r§6[§eAnti Cheats§6]§r§l§c ERROR:§r§4 You did not enter an unban time and did not set the ban to permanent, please make the ban permanent or enter a custom time for unban. The ban was not performed on §c${targetPlayer.name}`) 

                        targetPlayer.ban(banReason, unbanTime, isPermanent, player);

                        player.sendMessage(`§6[§eAnti Cheats§6]§f Successfully banned §e${targetPlayer.name}`);
                        sendMessageToAllAdmins(`§6[§eAnti Cheats Notify§6]§f §e${player.name}§f banned §e${targetPlayer.name}§f!`, true);

                        if (!isPermanent) player.runCommand(`kick "${targetPlayer.name}" §r§6[§eAnti Cheats§6]§r §4You are banned.\n§4Time Remaining: §c${values[0]} Days ${values[1]} Hours ${values[2]} Mins\n§4Reason: §c${banReason == "" ? "No reason provided." : banReason}\n§4Banned by: §c${player.name}`)
                        if (isPermanent) player.runCommand(`kick "${targetPlayer.name}" §r§6[§eAnti Cheats§6]§r §4You are permanently banned.\n§4Reason: §c${banReason == "" ? "No reason provided." : banReason}\n§4Banned by: §c${player.name}`)

                })
        }
        else{
                return player.sendMessage(`§6[§eAnti Cheats§6]§r§c§lERROR:§4 Unexpected type of ban: §c${type}`)
        }
}

export function unbanForm(player){
        let unbanModalForm = new ModalFormData()
        .title("Anti Cheats Player Unban")
        .textField("Player Name","Player name to unban (case sensitive)");

        unbanModalForm.show(player).then((formData) => {
                if (formData.canceled) {
                        player.sendMessage(`§6[§eAnti Cheats§6]§r You closed the form without saving!`);
                        return;
                }
                const playerName = formData.formValues[0];

                addPlayerToUnbanQueue(player,playerName);
        })
}

export function settingSelector(player, previousFormCallback){
        if (CONFIG.other.ownerOnlySettings && !player.isOwner()) return ownerLoginForm(player, () => settingSelector(player, previousFormCallback), previousFormCallback);

        const form = new ActionFormData()
                .title("Anti Cheats Settings")
                .body(`Please select an option from below:`)
                .button("Module Settings")
                .button("Config Editor")
                .button("Config Debug")
                .button("§cBack");
        player.playSound("random.pop");

        form.show(player).then((formData) => {
                if (formData.canceled) {
                    if (previousFormCallback) previousFormCallback(player);
                    return;
                }
                switch (formData.selection) {
                        case 0:
                                return moduleSettingsForm(player, () => settingSelector(player, previousFormCallback));
                        case 1:
                                return configEditorForm(player, () => settingSelector(player, previousFormCallback));
                        case 2:
                                return configDebugForm(player, () => settingSelector(player, previousFormCallback));
                        case 3: // Back button
                                if (previousFormCallback) previousFormCallback(player);
                                break;
                }
        })
}
export function banLogForm(player, previousFormCallback){
        const logs = world.getDynamicProperty("ac:banLogs");

        if (!logs || String(logs).length < 3) return player.sendMessage(`§6[§eAnti Cheats§6]§f No logs to display`); // Check length for "[]"
        
        let newLogs;
        try {
            newLogs = JSON.parse(String(logs));
        } catch (e) {
            player.sendMessage(`§6[§eAnti Cheats§6]§c Error parsing ban logs. They might be corrupted.`);
            logDebug(`Error parsing ban logs: ${e}`);
            if (previousFormCallback) previousFormCallback(player);
            return;
        }

        if (newLogs.length < 1) {
            player.sendMessage(`§6[§eAnti Cheats§6]§f No logs to display`);
            if (previousFormCallback) previousFormCallback(player);
            return;
        }
        
        const form = new ActionFormData()
                .title("Anti Cheats Ban Logs")
                .body(`Select a player to view ban log on:`);

        for(const log of newLogs){
                if(!log || !log.a) continue; 
                form.button(log.a);
        }
        form.button("§cBack");

        form.show(player).then((formData) => {
                if (formData.canceled) {
                    if (previousFormCallback) previousFormCallback(player);
                    return;
                }
                if (formData.selection === newLogs.length) { // Back button selected
                    if (previousFormCallback) previousFormCallback(player);
                    return;
                }

                const banLog = newLogs[formData.selection];
                if (!banLog) {
                    player.sendMessage("§cSelected log is invalid.");
                    if (previousFormCallback) previousFormCallback(player);
                    return;
                }

                const form2 = new MessageFormData()
                        .title(`${banLog.a}'s Ban Log`)
                        .body(`Info about ${banLog.a}'s ban:\n\n\nBanned by: ${banLog.b}\n\nBan time: ${new Date(banLog.c)}\n\nReason: ${banLog.d}`)
                        .button1(player.isOwner() ? "§4Delete Log" : "Back to Logs") 
                        .button2(player.isOwner() ? "Back to Logs" : "Close"); 

                form2.show(player).then((confirmData) => {
                        if(confirmData.canceled && confirmData.cancelationReason !== Minecraft.FormCancelationReason.UserBusy) {
                             banLogForm(player, previousFormCallback); 
                             return;
                        }

                        if (player.isOwner()) {
                            if (confirmData.selection === 0) { // Delete Log
                                const bannedPerson = banLog.a;
                                const currentLogsRaw = world.getDynamicProperty("ac:banLogs") ?? "[]";
                                let currentLogsArr;
                                try {
                                    currentLogsArr = JSON.parse(currentLogsRaw);
                                } catch (_e) { // e -> _e
                                    player.sendMessage("§cError processing existing ban logs for deletion.");
                                    banLogForm(player, previousFormCallback);
                                    return;
                                }
                                
                                const filteredLogs = currentLogsArr.filter(logEntry => logEntry.a !== bannedPerson);

                                if (filteredLogs.length === currentLogsArr.length) {
                                        logDebug(`No log found for banned person: ${bannedPerson}`);
                                        player.sendMessage(`§cLog for ${bannedPerson} not found for deletion.`);
                                        banLogForm(player, previousFormCallback);
                                        return; 
                                }
                                world.setDynamicProperty("ac:banLogs", JSON.stringify(filteredLogs));
                                player.sendMessage(`§6[§eAnti Cheats§6]§f Successfully deleted log for: ${bannedPerson}`);
                                banLogForm(player, previousFormCallback); // Re-show after deletion
                            } else if (confirmData.selection === 1) { // Back to Logs
                                banLogForm(player, previousFormCallback);
                            }
                        } else { // Not owner
                            if (confirmData.selection === 0) { // Back to Logs
                                banLogForm(player, previousFormCallback);
                            }
                            // Button 2 ("Close") or cancellation does nothing.
                        }
                })
        })
}

// Internal function, not exported directly but used by exported functions
function ownerLoginForm(player, nextFormOnSuccess, previousFormForNext){
        if(!CONFIG.OWNER_PASSWORD){ 
                player.sendMessage(`§6[§eAnti Cheats§6]§4 Error!§c You have not set an owner password inside of the configuration file, access denied.`);
                if (previousFormForNext) previousFormForNext(player);
                return;
        }
        const form = new ModalFormData().title("Anti Cheats Owner Login");
        form.textField("Owner Password","Enter password here...");

        form.show(player).then((formData) => {
                if(formData.canceled) {
                    if (previousFormForNext) previousFormForNext(player);
                    return;
                }
                if (formData.formValues[0] === CONFIG.OWNER_PASSWORD) {
                        player.sendMessage("§6[§eAnti Cheats§6]§a Access granted, you now have owner status.");
                        player.setDynamicProperty("ac:ownerStatus",true);
                        // player.setDynamicProperty("ac:rankId" ,"owner"); // This should be handled by rank system if integrated
                        if (nextFormOnSuccess) nextFormOnSuccess(player, previousFormForNext); 
                }
                else {
                    player.sendMessage("§6[§eAnti Cheats§6]§4 Invalid password!");
                    if (previousFormForNext) previousFormForNext(player);
                }
        })
}

export function configDebugForm(player, previousFormCallback){
        const form = new ActionFormData()
                .title("Anti Cheats Config Debugger")
                .body(`Please select an option from below:`)
                .button("Export Config to Console")
                .button("Reset Config")
                .button("§cBack");

        form.show(player).then((formData) => {
                if (formData.canceled) {
                    if (previousFormCallback) previousFormCallback(player);
                    return;
                }
                switch (formData.selection) {
                        case 0:
                                console.warn(JSON.stringify(CONFIG)); 
                                player.sendMessage(`§6[§eAnti Cheats§6]§f The config was exported to the console`);
                                configDebugForm(player, previousFormCallback); // Re-show form
                                break;
                        case 1:
                                world.setDynamicProperty("ac:config",undefined);
                                player.sendMessage(`§6[§eAnti Cheats§6]§f The config was reset. Run §e/reload§f`);
                                configDebugForm(player, previousFormCallback); // Re-show form
                                break;
                        case 2: // Back button
                                if (previousFormCallback) previousFormCallback(player);
                                break;
                }
        })
}

export function configEditorForm(player, previousFormCallback) {
        if (!player.isOwner()) return ownerLoginForm(player, () => configEditorForm(player, previousFormCallback), previousFormCallback);

        const mainConfigForm = new ActionFormData().title("Anti Cheats Config Editor");
        const configOptions = Object.keys(CONFIG).filter(key => typeof CONFIG[key] === "object");

        for (let i = 0; i < configOptions.length; i++) {
                mainConfigForm.button(configOptions[i]);
        }
        mainConfigForm.button("§cBack");

        mainConfigForm.show(player).then((configSelection) => {
                if (configSelection.canceled) {
                    if (previousFormCallback) previousFormCallback(player);
                    return;
                }
                if (configSelection.selection === configOptions.length) { // Back button selected
                    if (previousFormCallback) previousFormCallback(player);
                    return;
                }

                const selectedModule = configOptions[configSelection.selection];
                const configModuleForm = new ModalFormData();
                configModuleForm.title(`Settings: ${selectedModule}`);

                const configModuleOptions = Object.entries(CONFIG[selectedModule]);
                const formFields = []; 

                for (const [key, value] of configModuleOptions) {
                        if (typeof value === "object" && value !== null) { 
                                for (const [subKey, subValue] of Object.entries(value)) {
                                        const fieldPath = `${key}.${subKey}`;
                                        formFields.push({path: fieldPath, type: typeof subValue});

                                        switch (typeof subValue) {
                                                case "boolean":
                                                        configModuleForm.toggle(`${key} -> ${subKey}\n`, subValue); 
                                                        break;
                                                case "number":
                                                case "string":
                                                        configModuleForm.textField(`${key} -> ${subKey}\n`, String(subValue), String(subValue)); 
                                                        break;
                                        }
                                }
                        } else {
                                formFields.push({path: key, type: typeof value});
                                switch (typeof value) {
                                        case "boolean":
                                                configModuleForm.toggle(`${key}\n`, value); 
                                                break;
                                        case "number":
                                        case "string":
                                                configModuleForm.textField(`${key}\n`, String(value), String(value));
                                                break;
                                }
                        }
                }

                configModuleForm.show(player).then((formData) => {
                        if (formData.canceled) {
                                configEditorForm(player, previousFormCallback); // Re-show main editor on cancel
                                return;
                        }
                        
                        let currentConfig = world.getDynamicProperty("ac:config");
                        let parsedConfig = {};
                        if (currentConfig && typeof currentConfig === 'string') {
                            try { parsedConfig = JSON.parse(currentConfig); } catch (_e) { console.warn("Error parsing dynamic config, starting fresh."); } // e -> _e
                        } else { 
                            parsedConfig = JSON.parse(JSON.stringify(CONFIG)); 
                        }

                        formFields.forEach((fieldInfo, index) => {
                                const keys = fieldInfo.path.split('.');
                                let targetObject = parsedConfig[selectedModule];

                                for (let i = 0; i < keys.length - 1; i++) {
                                    if (!targetObject[keys[i]] || typeof targetObject[keys[i]] !== 'object') {
                                        targetObject[keys[i]] = {}; 
                                    }
                                    targetObject = targetObject[keys[i]];
                                }
                                
                                const finalKey = keys[keys.length - 1];
                                const newValue = formData.formValues[index];

                                switch (fieldInfo.type) {
                                        case "boolean":
                                                targetObject[finalKey] = Boolean(newValue);
                                                break;
                                        case "number": {
                                                // Ensure CONFIG[selectedModule][finalKey] or similar path exists for default value
                                                let defaultValueNum = 0;
                                                let tempTarget = CONFIG[selectedModule];
                                                for(const k of keys) { if(tempTarget && typeof tempTarget === 'object' && k in tempTarget) tempTarget = tempTarget[k]; else { tempTarget = undefined; break;} }
                                                if(typeof tempTarget === 'number') defaultValueNum = tempTarget;

                                                targetObject[finalKey] = isNaN(parseFloat(String(newValue))) ? defaultValueNum : parseFloat(String(newValue));
                                                break;
                                        }
                                        case "string":
                                                targetObject[finalKey] = String(newValue);
                                                break;
                                }
                        });
                        world.setDynamicProperty("ac:config",JSON.stringify(parsedConfig));

                        player.sendMessage(`§6[§eAnti Cheats§6]§r Configuration updated successfully! Reload for some changes to take effect.`);
                        configEditorForm(player, previousFormCallback); // Re-show after saving
                });
        });
}

export function moduleSettingsForm(player, previousFormCallback){
        let settingsform = new ModalFormData()
        .title("Anti Cheats Module Settings");

        const validModules = ACModule.getValidModules(); 
        for (let i = 0; i < validModules.length; i++) {
                const setting = validModules[i];
                const isSettingEnabled = ACModule.getModuleStatus(setting); 

                settingsform.toggle(setting, isSettingEnabled); 
        }

        settingsform.show(player).then((formData) => {
                if (formData.canceled) {
                        if(previousFormCallback) previousFormCallback(player);
                        else player.sendMessage(`§6[§eAnti Cheats§6]§r You closed the form without saving!`);
                        return;
                }

                for (let i = 0; i < validModules.length; i++) {
                        const setting = validModules[i];
                        const isSettingEnabled = ACModule.getModuleStatus(setting);
                        const shouldEnableSetting = formData.formValues[i];

                        if (isSettingEnabled !== shouldEnableSetting) {
                                ACModule.toggleModule(setting); 
                                sendMessageToAllAdmins(`§6[§eAnti Cheats Notify§6]§f ${player.name}§f turned ${shouldEnableSetting ? "on" : "off"} §e${setting}§f!`,true);
                        }
                }
                if(previousFormCallback) previousFormCallback(player); // Go back after applying
        });
}

export function playerSelectionForm(player,action, previousFormCallback){
        let players = [...world.getPlayers()];
        let form = new ActionFormData()
        .title("Anti Cheats Player Selector")
        .body(`Please select a player from ${players.length} online players:`);
        players.forEach((targetPlayer) => {
                let playerName = targetPlayer.name;
                if(targetPlayer.name == player.name) playerName += " (YOU)";
                if(targetPlayer.isOwner()) playerName += " (OWNER)";
                else if(targetPlayer.hasAdmin()) playerName += " (ADMIN)";

                form.button(playerName,"textures/ui/icon_steve.png");
        })
        form.button("§cBack");

        form.show(player).then((formData) => {
                if(formData.canceled) {
                    if(previousFormCallback) previousFormCallback(player);
                    else player.sendMessage(`§6[§eAnti Cheats§6]§r You closed the form without saving!`);
                    return;
                }
                if (formData.selection === players.length) { // Back button selected
                    if(previousFormCallback) previousFormCallback(player);
                    return;
                }

                const selectedPlayer = players[formData.selection];

                if(action == "action") return playerActionForm(player,selectedPlayer, () => playerSelectionForm(player, action, previousFormCallback)); // Pass a breadcrumb
                if(action == "ban") return banForm(player,selectedPlayer,"quick")
        })
}

export function playerActionForm(player,targetPlayer, previousFormCallback){
        if(targetPlayer.hasAdmin()) {
            player.sendMessage(`§6[§eAnti Cheats§6]§r Can't perform actions on §e${targetPlayer.name}§f they're an admin.`);
            if (previousFormCallback) previousFormCallback(player);
            return;
        }

        const playerActions = ["Ban Player","Kick Player","Warn Player","Freeze Player","Mute Player","View Inventory","Copy Inventory","Unmute Player","Unfreeze Player","Remove All Warnings"];

        let form = new ModalFormData()
        .title(`Anti Cheats Actions: ${targetPlayer.name}`)
        .dropdown(`Select an Action for ${targetPlayer.name}:`,playerActions)
        .textField("Reason (optional)","")
        form.show(player).then((formData) => {
                if(formData.canceled) {
                    if (previousFormCallback) previousFormCallback(player);
                    else player.sendMessage(`§6[§eAnti Cheats§6]§r You closed the form without saving!`);
                    return;
                }

                const action = formData.formValues[0];
                const reason = formData.formValues[1] ?? "";
                sendMessageToAllAdmins(`§6[§eAnti Cheats Notify§6]§5§l ${player.name} §bperformed ${playerActions[action]} on§l§5 ${targetPlayer.name}! §r`,true);

                switch(action){
                        case 0: { // Ban Player
                                banForm(player,targetPlayer,"slow",reason);
                                if (previousFormCallback) previousFormCallback(player); 
                                break;
                        }
                        case 1: { // Kick Player
                                player.runCommand(`kick "${targetPlayer.name}" ${reason}`); 
                                if (previousFormCallback) previousFormCallback(player);
                                break;
                        }
                        case 2: { // Warn Player
                                targetPlayer.setWarning("manual"); 
                                targetPlayer.sendMessage(`§6[§eAnti Cheats§6]§r§4§l You were warned!${reason ? ` Reason: §c${reason}` : ""}`);
                                player.sendMessage(`§6[§eAnti Cheats§6]§r Successfully warned player §e${targetPlayer.name}`);
                                if (previousFormCallback) previousFormCallback(player);
                                break;
                        }
                        case 3: { // Freeze Player
                                if (targetPlayer.getDynamicProperty("ac:freezeStatus")) {
                                    player.sendMessage(`§6[§eAnti Cheats§6]§f §e${targetPlayer.name}§f is already frozen.`);
                                } else {
                                    targetPlayer.setFreezeTo(true); 
                                    player.sendMessage(`§6[§eAnti Cheats§6]§f Succesfully froze §e${targetPlayer.name}`);
                                    targetPlayer.sendMessage(`§6[§eAnti Cheats§6]§f You were §efrozen§f by the admin §e${player.name}`);
                                }
                                if (previousFormCallback) previousFormCallback(player);
                                break;
                        }
                        case 4: { // Mute Player
                                targetPlayer.mute(player,reason,-1); 
                                if (previousFormCallback) previousFormCallback(player);
                                break;
                        }
                        case 5: { // View Inventory
                                invsee(player,targetPlayer); 
                                if (previousFormCallback) previousFormCallback(player);
                                break;
                        }
                        case 6: { // Copy Inventory
                                copyInv(player,targetPlayer); 
                                if (previousFormCallback) previousFormCallback(player);
                                break;
                        }
                        case 7: { // Unmute Player
                                if (!targetPlayer.isMuted) { 
                                        player.sendMessage(`§6[§eAnti Cheats§6]§f Player §e${targetPlayer.name}§f is not muted.`);
                                } else {
                                    targetPlayer.unmute(); 
                                    player.sendMessage(`§6[§eAnti Cheats§6]§r Successfully unmuted §e${targetPlayer.name}`);
                                    targetPlayer.sendMessage(`§6[§eAnti Cheats§6]§r You were unmuted!`)
                                }
                                if (previousFormCallback) previousFormCallback(player);
                                break;
                        }
                        case 8: { // Unfreeze Player
                                if (!targetPlayer.getDynamicProperty("ac:freezeStatus")) {
                                    player.sendMessage(`§6[§eAnti Cheats§6]§f §e${targetPlayer.name}§f is not frozen.`);
                                } else {
                                    targetPlayer.setFreezeTo(false); 
                                    player.sendMessage(`§6[§eAnti Cheats§6]§f Succesfully unfroze §e${targetPlayer.name}`);
                                    targetPlayer.sendMessage(`§6[§eAnti Cheats§6]§f You were §eunfrozen§f by the admin §e${player.name}`);
                                }
                                if (previousFormCallback) previousFormCallback(player);
                                break;
                        }
                        case 9: { // Remove All Warnings
                                targetPlayer.clearWarnings(); 
                                player.sendMessage(`§6[§eAnti Cheats§6]§r Successfully reset all warnings of §e${targetPlayer.name}`);
                                if (previousFormCallback) previousFormCallback(player);
                                break;
                        }
                }
        })
}
