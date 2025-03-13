import {NpcFeatureDataModelType} from "../../item";
import {PartialItemData} from "./types";
import {LanguageMapper} from "../../item/LanguageMapper";
import {DamageType, damageTypes} from "../../config/damageTypes";
import {foundryApi} from "../../api/foundryApi";


function initLanguageMapper(localizer: (key: string) => string) {
    let languageMapper: LanguageMapper<DamageType>;

    function getLanguageMapper() {
        if (!languageMapper) {
            const codeToTranslation = new Map<DamageType, string>(damageTypes.map(t => [t, localizer(`splittermond.damageTypes.long.${t}`)]));
            const additionalTranslations = new Map<string, DamageType>(damageTypes.map(t => [localizer(`splittermond.damageTypes.short.${t}`), t]));
            additionalTranslations.set("Physischen Schaden", "physical");
            additionalTranslations.set("Mentalen Schaden", "mental");
            additionalTranslations.set("Mentalschaden", "mental");
            languageMapper = new LanguageMapper<DamageType>(codeToTranslation, additionalTranslations);
        }
        return languageMapper;
    }

    return getLanguageMapper;
}

const languageMapper = initLanguageMapper((s) => foundryApi.localize(s));


export function mapNameToSystemFeature(data: PartialItemData<NpcFeatureDataModelType>) {
    const modifiers = [...data.system.modifier?.split(",") ?? [],
        ...weaknessFromName(data),
        ...resistanceFromName(data)
    ];
    return {
        type: data.type,
        name: data.name,
        system: {
            ...data.system,
            ...(modifiers.length > 0 ? {modifier: modifiers.join(", ")} : {})
        }
    }
}

function weaknessFromName(data: PartialItemData<NpcFeatureDataModelType>) {
    const {code, translatedDamageValue} = mapSusceptibility("verwundbarkeit", data);
    if (!code) {
        return [];
    }
    return [`weakness.${code} ${translatedDamageValue}`];
}

function resistanceFromName(data: PartialItemData<NpcFeatureDataModelType>) {
    const {code, translatedDamageValue} = mapSusceptibility("resistenz", data);
    if (!code) {
        return [];
    }

    return [`resistance.${code} ${translatedDamageValue}`];
}

function mapSusceptibility(keyword: string, data: PartialItemData<NpcFeatureDataModelType>) {

    const stringMatcher = /(?<type>\w+)\s+gegen\s+(?<damageType>[A-zäöüß]+(?:\s+[A-zäöüß]+)?)(?:\s+(?<modifier>\d*))?/
    const matchResult = stringMatcher.exec(data.name.toLowerCase());
    const concernsSusceptibility = matchResult !== null && matchResult.groups?.type === keyword;
    if (!concernsSusceptibility) {
        return {};
    }
    const translatedDamageType = matchResult.groups?.damageType;
    const translatedDamageValue = matchResult.groups?.modifier ?? "1";

    const code = translatedDamageType ? languageMapper().toCode(translatedDamageType) : undefined;
    return {code, translatedDamageValue};
}