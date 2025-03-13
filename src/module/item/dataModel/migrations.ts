export function migrateFrom0_12_10(source:unknown){
    if(!!source && typeof source === "object" && ("modifier" in source) && typeof(source.modifier) === "string"){
        const keep = source.modifier.split(",").filter(mod => !mod.startsWith("susceptibility"))
        const change = source.modifier.split(",")
            .filter(mod => mod.startsWith("susceptibility"))
            .map(mod => {
                const newValue = -1 * parseInt(mod.split(" ")?.[1] || "1")
                return `resistance ${newValue}`
            });
        source.modifier = [...keep, ...change].join(", ");
    }
    return source;
}