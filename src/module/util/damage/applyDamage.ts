import SplittermondActor from "../../actor/actor";
import {DamageEvent, DamageImplement} from "./DamageEvent";
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

class DamageRecordImpl implements DamageRecord {
    public items: RecordItem[] = [];
    public isGrazingHit: boolean = false;
    public damageReduction: number = 0;
    public ignoredReduction: number = 0;
    public totalBeforeGrazing: number = 0;

    public get totalDamage(): number {
        return Math.round(this.totalBeforeGrazing * (this.isGrazingHit ? 0.5 : 1) - this.damageReduction + this.ignoredReduction);
    }

    public setIgnoredReduction(value: CostModifier) {
        this.ignoredReduction = Math.round(value.length);
    }

    public setTotalBeforeGrazing(value: CostModifier) {
        this.totalBeforeGrazing = Math.round(value.length);
    }

    public addRecord(item: DamageImplement, susceptibility: number) {
        const recordItem: RecordItem = {
            name: item.implementName,
            type: item.damageType,
            baseValue: item.damage,
            modifiedBy: susceptibility,
            subTotal: item.damage + susceptibility
        }
        this.items.push(recordItem);
    }
}

interface RecordItem {
    name: string
    type: DamageType;
    baseValue: number;
    modifiedBy: number;
    subTotal: number;
}

type UserModifier = (x: DamageRecord) => Promise<number>;
const noUserModification: UserModifier = async () => 0;

export async function applyDamage(event: DamageEvent, target: SplittermondActor, userModification = noUserModification) {

    function toCost(value: number) {
        return event.costVector.multiply(value)
    }

    const damageRecord = new DamageRecordImpl();
    damageRecord.isGrazingHit = event.isGrazingHit;
    damageRecord.damageReduction = target.damageReduction;

    let damageBeforeGrazingAndReduction = event.costBase.toModifier(true);
    let realizedDamageReductionOverride = event.costBase.toModifier(true);


    for (const implement of event.implements) {
        const susceptibility = target.susceptibilities[implement.damageType];
        damageRecord.addRecord(implement, susceptibility);
        realizedDamageReductionOverride = realizedDamageReductionOverride.add(implement.ignoredReductionCost);
        damageBeforeGrazingAndReduction = damageBeforeGrazingAndReduction.add(implement.bruttoHealthCost.add(toCost(susceptibility)));
    }
    damageRecord.setTotalBeforeGrazing(damageBeforeGrazingAndReduction);
    damageRecord.setIgnoredReduction(realizedDamageReductionOverride);

    const damageBeforeReduction = damageBeforeGrazingAndReduction.multiply(event.isGrazingHit ? 0.5 : 1);
    const remainingReduction = calculateActualDamageReduction(event, target, realizedDamageReductionOverride);
    const totalDamage = damageBeforeReduction.subtract(remainingReduction);

    const damageAdjustment = await userModification(damageRecord).then(toCost);
    const userAdjustedDamage = event.costBase.add(totalDamage).add(damageAdjustment);
    target.consumeCost("health", userAdjustedDamage.render(), "")
    console.log(`${event.causer?.getAgent().name} dealt ${userAdjustedDamage.render()} damage to ${target.name}`);
    console.debug(`Detailed Damage report: ${damageRecord.items.map(item => `${item.name}(${item.type}): ${item.baseValue} + ${item.modifiedBy} = ${item.subTotal}`).join(", ")}`);
}

function calculateActualDamageReduction(event: DamageEvent, target: SplittermondActor, realizedDamageReductionOverride: CostModifier) {
    //Base reduction must be be a primary cost, because it must not go below 0. However, we need to convert it to a modifier to apply the damage reduction
    //Therefore, we need to apply the cost type both via cost base and cost vector;
    const baseReduction = event.costBase.add(event.costVector.multiply(target.damageReduction));
    return baseReduction.subtract(realizedDamageReductionOverride).toModifier(true);
}


