import SplittermondActor from "../../actor/actor";
import {DamageEvent} from "./DamageEvent";
import {DamageType} from "../../config/damageTypes";
import {CostModifier} from "../costs/Cost";


interface DamageRecord {
    items: RecordItem[];
    isGrazingHit: boolean;
    damageReduction: number;
    ignoredReduction: number;
    totalBeforeGrazing: number;
    readonly totalDamage: number;
}

interface RecordItem {
    name: string
    type: DamageType;
    baseValue: number;
    modifiedBy: number;
    subTotal: number;
}

type UserModifier = (x:DamageRecord)=>Promise<number>;
const noUserModification:UserModifier = async ()=>0;

export async function applyDamage(event: DamageEvent, target: SplittermondActor, userModification=noUserModification) {

    const damageRecord: DamageRecord = {
        isGrazingHit: event.isGrazingHit,
        items: [],
        damageReduction: target.damageReduction,
        ignoredReduction: 0,
        totalBeforeGrazing:0,
        get totalDamage() {
            return Math.round(this.totalBeforeGrazing * (this.isGrazingHit ? 0.5 : 1) - this.damageReduction + this.ignoredReduction);
        },
    }

    let damageBeforeGrazingAndReduction = event.costBase.toModifier();
    let realizedDamageReductionOverride = event.costBase.toModifier();


    for (const implement of event.implements) {
        const susceptibility = target.susceptibilities[implement.damageType];
        const recordItem: RecordItem = {
            name: implement.implementName,
            type: implement.damageType,
            baseValue: implement.damage,
            modifiedBy: susceptibility,
            subTotal: implement.damage + susceptibility
        }
        damageRecord.items.push(recordItem);
        damageRecord.ignoredReduction += implement.ignoredReduction;
        damageRecord.totalBeforeGrazing += recordItem.subTotal;

        realizedDamageReductionOverride = realizedDamageReductionOverride.add(implement.ignoredReductionCost);
        damageBeforeGrazingAndReduction = damageBeforeGrazingAndReduction.add(implement.bruttoHealthCost.add(event.costVector.multiply(susceptibility)));
    }

    const damageBeforeReduction = damageBeforeGrazingAndReduction.multiply(event.isGrazingHit ? 0.5 : 1);
    const remainingReduction = calculateActualDamageReduction(event, target, realizedDamageReductionOverride);
    const totalDamage = damageBeforeReduction.subtract(remainingReduction);

    const costModificationByUser= await userModification(damageRecord).then(x => event.costVector.multiply(x));

    target.consumeCost("health", event.costBase.add(totalDamage).add(costModificationByUser).render(), "")
}

function calculateActualDamageReduction(event: DamageEvent, target: SplittermondActor, realizedDamageReductionOverride: CostModifier) {
    const baseReduction = event.costBase.add(event.costVector.multiply(target.damageReduction));
    return baseReduction.subtract(realizedDamageReductionOverride).toModifier(true);
}

