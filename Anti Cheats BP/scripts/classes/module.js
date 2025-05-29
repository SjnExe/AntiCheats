import {world} from "@minecraft/server";
// import { logDebug } from "../assets/util.js";


/**
 * Manages the status of various anti-cheat modules using world dynamic properties.
 * Handles retrieval and modification of module states.
 * @class ModuleStatusManagerInternal
 */
class ModuleStatusManagerInternal { // Renamed from ACModuleInternal
    /**
     * An object defining available anti-cheat modules. Keys are internal identifiers
     * (often camelCase), and values are human-readable names.
     * Supports nested objects for sub-modules (e.g., `OreAlerts`).
     * @type {object}
     */
    Modules = {
        antiGmc: "Anti GMC",
        antiGrief: "Anti Grief",
        autoMod: "Auto Mod",
        deathCoords: "Death Coords",
        deathEffect: "Death Effect",
        endLock: "End Lock",
        netherLock: "Nether Lock",
        welcomer: "Welcomer",
        cpsCheck: "High CPS Check",
        killauraCheck: "Anti Killaura",
        nukerCheck: "Anti Block Nuker",
        spammerProtection: "Anti Spammer",
        flyCheck: "Fly Check",
        scaffoldCheck: "Scaffold Check",
        velocityCheck: "Velocity Check",
        antiCombatlog: "Anti Combatlog",
        antiNamespoof: "Anti Namespoof",
        OreAlerts:{
            diamondOre: "Diamond Ore Alerts",
            netheriteOre: "Netherite Ore Alerts"
        }
    }
    /**
     * Converts a human-readable module name into its internal ID representation
     * (e.g., "Diamond Ore Alerts" becomes "OreAlerts:diamondOre").
     * @param {string} module - The human-readable module name (e.g., from `ModuleStatusManager.Modules.OreAlerts.diamondOre`).
     * @returns {string} - The internal module ID.
     * @throws {ReferenceError} - If the provided `module` name is not a valid or recognized module.
     */
    getModuleID(module){
        if(!this.getValidModules().includes(module)) throw ReferenceError(`"${module}" is not a valid SafeGuard module.`);
        const moduleEntries = Object.entries(this.Modules);
        
        for(const [key,value] of moduleEntries){
            if(typeof(value) == "object"){
                const subModuleEntries = Object.entries(value);
                for(const [subKey, subValue] of subModuleEntries){
                    if(subValue === module) return `${key}:${subKey}`;
                }
            }
            else{
                if(value === module) return key;
            }
        }
        throw ReferenceError(`"${module}" was not found in modules, nor sub modules.`);
        
    }
    /**
     * Retrieves the current status (enabled/disabled) of a given module.
     * @param {string} module - The human-readable module name.
     * @returns {boolean} - True if the module is enabled, false otherwise (defaults to false if property not set).
     * @throws {ReferenceError} - If the provided `module` name is not valid.
     */
    getModuleStatus(module){
        if(!this.getValidModules().includes(module)) throw ReferenceError(`"${module}" is not a valid SafeGuard module.`);
    
        return world.getDynamicProperty(`ac:${this.getModuleID(module)}`) ?? false;
    }
    /**
     * Toggles the status of a given module (enabled to disabled, or vice-versa).
     * Persists the change in a world dynamic property.
     * @param {string} module - The human-readable module name.
     * @returns {void}
     * @throws {ReferenceError} - If the provided `module` name is not valid.
     */
    toggleModule(module){
        if(!this.getValidModules().includes(module)) throw ReferenceError(`"${module}" is not a valid SafeGuard module.`);
    
        const moduleID = this.getModuleID(module);
        const currentModuleState = world.getDynamicProperty(`ac:${moduleID}`) ?? false;
    
        world.setDynamicProperty(`ac:${moduleID}`,!currentModuleState);
    
    }
    /**
     * Returns an array of all valid human-readable module names.
     * @param {boolean} [skipNestedJSON=false] - If true, only top-level module names are returned,
     *                                           excluding those within nested objects (like individual ore alert types).
     * @returns {string[]} - An array of module name strings.
     */
    getValidModules(skipNestedJSON = false){
        const moduleArray = [];
        for(const object of Object.values(this.Modules)){
            if(typeof(object) == "object"){
                if(skipNestedJSON) continue;
                else moduleArray.push(...Object.values(object));
                continue;
            }
            moduleArray.push(object);
        }
        return moduleArray;
    }

};  

/**
 * The singleton instance of `ModuleStatusManagerInternal`. This is the primary interface
 * for interacting with module statuses throughout the anti-cheat system.
 * @type {ModuleStatusManagerInternal}
 */
export const ModuleStatusManager = new ModuleStatusManagerInternal(); // Renamed from ACModule
export const ACModule = ModuleStatusManager;
