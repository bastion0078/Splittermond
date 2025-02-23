import {Cost, CostModifier} from "./Cost";
import {PrimaryCost} from "./PrimaryCost";
import {fields, SplittermondDataModel} from "../../data/SplittermondDataModel";

export const costTypes = ['K', 'V', ''] as const;
export function isCostType(value: string): value is CostType {
    return costTypes.includes(value as CostType);
}
export type CostType = typeof costTypes[number];

export function toCost(costType: CostType): PrimaryCost {
    switch (costType) {
        case 'K':
            return new Cost(1, 0, true, true).asPrimaryCost()
        case 'V':
            return new Cost(0, 1, false, true).asPrimaryCost()
        case "":
            return new Cost(1, 0, false, true).asPrimaryCost();
    }
}

export function fromCost(cost: PrimaryCost): ('K' | 'V' | "")[] {
    const components: CostType[] = [];
    if (cost.consumed > 0) {
        components.push('V');
    }
    if (cost.channeled > 0) {
        components.push('K');
    }
    if (cost.exhausted > 0) {
        components.push('')
    }
    return components;
}

//@ts-expect-error
class CostBase extends SplittermondDataModel<{ costType: CostType }> {
    declare private _costType: CostType;
    static defineSchema() {
        return {
            _costType: new fields.StringField({
                required: true,
                nullable: false,
                blank: false,
                validate: (x) => costTypes.includes(x as CostType)
            })
        };
    }

    get costType() {
        return this._costType;
    }

    add(cost:CostModifier):PrimaryCost {
        return toCost(this.costType).add(cost);
    }
    multiply(factor:number):CostModifier{
        return toCost(this.costType).toModifier(true).multiply(factor);
    }

}