const migrationScripts = {
    // Example migration from version 1 to 2
    // '2': (currentConfig) => {
    //     playerUtils.debugLog('Migrating config from v1 to v2...', 'System', dependencies);
    //     // Add new properties
    //     currentConfig.newFeature = {
    //         enabled: true,
    //         someValue: 'default'
    //     };
    //     // Remove old properties
    //     delete currentConfig.oldFeature;
    //     playerUtils.debugLog('Config migration to v2 complete.', 'System', dependencies);
    //     return currentConfig;
    // }
};

export function migrateConfig(currentConfig, currentVersion, targetVersion) {
    let migratedConfig = { ...currentConfig };
    let version = currentVersion;

    while (version < targetVersion) {
        version++;
        const migrationScript = migrationScripts[version.toString()];
        if (migrationScript) {
            migratedConfig = migrationScript(migratedConfig);
        }
    }

    migratedConfig.configVersion = targetVersion;
    return migratedConfig;
}
