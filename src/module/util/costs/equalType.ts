import {PrimaryCost} from "./PrimaryCost";
import {CostModifier} from "./Cost";

export function isSameCostType(cost1:PrimaryCost|CostModifier, cost2:PrimaryCost|CostModifier):boolean{
    const one = cost1 instanceof PrimaryCost ? cost1.toModifier(true): cost1;
    const other = cost2 instanceof PrimaryCost ? cost2.toModifier(true) : cost2;
    const angle = similarityCostModifier(one, other);
    return 0.9999998 < angle && angle < 1.000001;
}

function similarityCostModifier(cost1: CostModifier, cost2: CostModifier): number{
    const normalization= cost1.length * cost2.length;
    if(normalization == 0){ return 0;} //happens if we build a product with the null vector
    return (cost1._exhausted * cost2._exhausted +
        cost1._channeled * cost2._channeled +
        cost1._channeledConsumed * cost2._channeledConsumed +
        cost1._consumed * cost2._consumed)/normalization;
}


