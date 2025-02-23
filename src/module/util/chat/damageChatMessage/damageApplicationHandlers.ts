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
        applyDamage(target, userAdjustedDamage,
            {
                sourceName: event.causer?.getAgent().name ?? '',
                principalImplement: [...event.implements]
                    .sort((a,b)=> a.damage-b.damage)[0]
                    .implementName
            });
    });


}

function findUserActor() {
    try {
        return referencesUtils.findBestUserActor().getAgent();
    } catch (e) {
        foundryApi.warnUser("splittermond.chatCard.damageMessage.noActorFound");
        return null
    }
}

function applyDamage(target: SplittermondActor, damage: PrimaryCost, reporting: {
    sourceName: string,
    principalImplement: string
}) {

    target.consumeCost(
        "health",
        damage.render(),
        foundryApi.format("splittermond.chatCard.damageMessage.consumptionMessage", reporting)
    );
    console.log(`Splittermond | ${reporting.sourceName} dealt ${damage.render()} damage to ${target.name}`);
}
