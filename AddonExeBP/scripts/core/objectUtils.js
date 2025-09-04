/**
 * Deeply compares two objects for equality.
 * @param {any} object1 The first object.
 * @param {any} object2 The second object.
 * @returns {boolean} True if the objects are equal.
 */
export function deepEqual(object1, object2) {
    if (object1 === object2) {
        return true;
    }

    if (object1 === null || typeof object1 !== 'object' || object2 === null || typeof object2 !== 'object') {
        return false;
    }

    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (!keys2.includes(key) || !deepEqual(object1[key], object2[key])) {
            return false;
        }
    }

    return true;
}

/**
 * Deeply merges the properties of a source object into a target object.
 * @param {object} target The target object.
 * @param {object} source The source object.
 * @returns {object} The merged object.
 */
export function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) {
                Object.assign(target, { [key]: {} });
            }
            deepMerge(target[key], source[key]);
        } else {
            Object.assign(target, { [key]: source[key] });
        }
    }
    return target;
}

/**
 * Gets a nested value from an object using a dot-notation string path.
 * @param {object} obj The object to retrieve the value from.
 * @param {string} path The dot-separated path to the property.
 * @returns {*} The value of the property, or undefined if not found.
 */
export function getValueFromPath(obj, path) {
    return path.split('.').reduce((current, key) => (current && current[key] !== undefined) ? current[key] : undefined, obj);
}

/**
 * Sets a nested value in an object using a dot-notation string path.
 * This function modifies the object in place.
 * @param {object} obj The object to modify.
 * @param {string} path The dot-separated path to the property.
 * @param {*} value The value to set.
 */
export function setValueByPath(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const lastObj = keys.reduce((current, key) => (current[key] = current[key] || {}), obj);
    lastObj[lastKey] = value;
}
