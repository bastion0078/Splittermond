export const damageTypes = [
    "physical",
    "mental",
    "electric",
    "acid",
    "rock",
    "fire",
    "heat",
    "cold",
    "poison",
    "light",
    "shadow",
    "bleeding",
    "disease"
] as const;
export type DamageType = typeof damageTypes[number];