import {DamageEvent} from "../../damage/DamageEvent";
import {foundryApi} from "../../../api/foundryApi";
import {UserModificationDialogue} from "./UserModificationDialogue";
import {calculateDamageOnTarget} from "../../damage/calculateDamageOnTarget";
import {referencesUtils} from "../../../data/references/referencesUtils";
import {UserReporterImpl} from "./UserReporterImpl";
import {PrimaryCost} from "../../costs/PrimaryCost";
import SplittermondActor from "../../../actor/actor";


export async function applyDamageToSelf(event: DamageEvent) {

    const target = findUserActor();
    if (target === null) {
        return Promise.resolve();
    }
    const userModifier = new UserModificationDialogue();
    const userReporter = new UserReporterImpl();

    calculateDamageOnTarget(event, target, userReporter);
    await userModifier.getUserAdjustedDamage(userReporter.getReport()).then((userAdjustedDamage) => {
        applyDamage(event.causer?.getAgent().name ?? '', target, userAdjustedDamage);
    });


}

function findUserActor() {
    try {
        return referencesUtils.findBestUserActor().getAgent();
    } catch (e) {
        foundryApi.warnUser("splittermond.chatCard.noActorFound");
        return null
    }
}

function applyDamage(sourceName: string, target: SplittermondActor, damage: PrimaryCost) {
    target.consumeCost("health", damage.render(), "")
    console.log(`Splittermond | ${sourceName} dealt ${damage.render()} damage to ${target.name}`);
}
