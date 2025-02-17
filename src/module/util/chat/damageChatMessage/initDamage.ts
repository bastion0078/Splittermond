import {SplittermondChatCard} from "../SplittermondChatCard";
import {foundryApi} from "../../../api/foundryApi";
import {DamageEvent, DamageImplement} from "../../damage/DamageEvent";
import {AgentReference} from "../../../data/references/AgentReference";
import {Cost} from "../../costs/Cost";
import {DamageRoll} from "../../damage/DamageRoll";
import {DamageType} from "../../../config/damageTypes";
import {parseFeatureString} from "../../damage/featureParser";
import {DamageMessage} from "./DamageMessage";
import {Roll, sumRolls} from "../../../api/Roll";
import {DamageFeature} from "../../damage/DamageFeature";
import SplittermondActor from "../../../actor/actor";

interface ProtoDamageImplement {
    damageFormula: string;
    featureString: string;
    damageSource: string;
    damageType: DamageType|null;
}
export const DamageInitializer ={
    rollDamage,
}

async function rollDamage(damages: ProtoDamageImplement[], costType: 'K' | 'V' | "", speaker: SplittermondActor| null) {

    const damageResults = await rollDamages(damages);
    const _costBase = toCost(costType);
    const actorReference = speaker ? AgentReference.initialize(speaker) : null;
    const damageEvent = new DamageEvent({
        causer: actorReference,
        _costBase,
        formula: damageResults.totalRoll.formula,
        tooltip: await damageResults.totalRoll.getTooltip(),
        implements: damageResults.damageImplements,
        isGrazingHit: false,
    });

    return SplittermondChatCard.create(
        speaker,
        DamageMessage.initialize(damageEvent,damageResults.features),
        {
            type: foundryApi.chatMessageTypes.OTHER,
            whisper: [],
            blind: false,
            rolls: [damageResults.totalRoll]
        }
    );
}

async function rollDamages(damages: ProtoDamageImplement[]) {
    const allRolls: Roll[] = [];
    const allFeature:DamageFeature[] = [];
    const damageImplements = await Promise.all(damages.map(async damage => {
        const damageRoll = DamageRoll.parse(damage.damageFormula, damage.featureString);
        const rollResult = await damageRoll.evaluate();
        allFeature.push(...Object.values(damageRoll.getActiveFeatures()));
        allRolls.push(rollResult);
        return new DamageImplement({
            damage: rollResult.total,
            formula: damage.damageFormula,
            implementName: damage.damageSource,
            damageExplanation: await rollResult.getTooltip(),
            _baseReductionOverride: parseFeatureString(damage.featureString)["durchdringung"]?.value ?? 0,
            damageType: damage.damageType ?? "physical"
        });
    }));
    return {totalRoll: sumRolls(allRolls),features: allFeature, damageImplements};
}

function toCost(damageType: 'K' | 'V' | "") {
    switch (damageType) {
        case 'K':
            return new Cost(1, 0, true, true).asPrimaryCost()
        case 'V':
            return new Cost(0, 1, false, true).asPrimaryCost()
        case "":
            return new Cost(1, 0, false, true).asPrimaryCost();
    }
}