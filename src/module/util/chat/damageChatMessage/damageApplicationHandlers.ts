import {DamageEvent} from "../../damage/DamageEvent";
import {foundryApi} from "../../../api/foundryApi";
import {UserModificationDialogue} from "./UserModificationDialogue";
import {applyDamage} from "../../damage/applyDamage";
import {referencesUtils} from "../../../data/references/referencesUtils";


export function applyDamageToSelf(event:DamageEvent){

    const target = findUserActor();
    if(target === null) {
        return Promise.resolve();
    };
    const userModifier = new UserModificationDialogue();

    return applyDamage(event, target, (record) => userModifier.produceUserModification(record));

}

function findUserActor(){
    try {
        return referencesUtils.findBestUserActor().getAgent();
    }catch(e){
        foundryApi.warnUser("splittermond.chatCard.noActorFound");
        return null
    }
}