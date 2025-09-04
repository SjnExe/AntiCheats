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
