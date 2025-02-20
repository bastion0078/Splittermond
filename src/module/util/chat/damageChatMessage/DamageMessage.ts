import {DataModelSchemaType, fields, SplittermondDataModel} from "../../../data/SplittermondDataModel";
import {SplittermondChatMessage} from "../../../data/SplittermondChatCardModel";
import {DamageMessageData} from "./interfaces";
import {addToRegistry} from "../chatMessageRegistry";
import {DamageEvent} from "../../damage/DamageEvent";
import {foundryApi} from "../../../api/foundryApi";
import ApplyDamageDialog from "../../../apps/dialog/apply-damage-dialog";
import {DamageFeature, DamageFeatureSchema} from "../../damage/DamageFeature";
import {applyDamageToSelf} from "./damageApplicationHandlers";

const constructorRegistryKey = "DamageMessage";

function DamageMessageSchema() {
    return {
        constructorKey: new fields.StringField({required: true, nullable: false, initial: constructorRegistryKey}),
        featuresToDisplay: new fields.ArrayField(
            new fields.SchemaField(DamageFeatureSchema(), {required: true, nullable: false}),
            {required: true, nullable: false}),
        damageEvent: new fields.EmbeddedDataField(DamageEvent, {required: true, nullable: false}),
    };
}

type DamageMessageType = DataModelSchemaType<typeof DamageMessageSchema>


export class DamageMessage extends SplittermondDataModel<DamageMessageType> implements SplittermondChatMessage {

    static defineSchema = DamageMessageSchema;

    static initialize(damageEvent: DamageEvent, featuresToDisplay: DamageFeature[] = []): DamageMessage {
        return new DamageMessage({
            damageEvent,
            featuresToDisplay,
            constructorKey: constructorRegistryKey,
        });
    }


    get template() {
        return "systems/splittermond/templates/chat/damage-roll.hbs";
    }

    getData(): DamageMessageData {
        return {
            features: this.renderFeaturesToDisplay(),
            formula: this.damageEvent.formula,
            total: this.damageEvent.totalDamage(),
            source: this.getPrincipalDamageComponent().implementName,
            tooltip: this.damageEvent.tooltip,
            actions: [
                this.renderApplyDamageToTargetAction(),
                this.renderApplyDamageToSelfAction()
            ],
        }
    }

    private getPrincipalDamageComponent() {
        return this.damageEvent.implements.sort((a, b) => b.damage - a.damage)[0];
    }

    private renderFeaturesToDisplay() {
        return this.featuresToDisplay
            .sort((a, b) => b.value - a.value)
            .slice(0, 4);
    }

    private renderApplyDamageToTargetAction() {
        return {
            classes: "splittermond-chat-action gm-only",
            data: {
                localAction: "applyDamageToTargets",
            },
            icon: "fa-heart-broken",
            name: foundryApi.localize("splittermond.chatCard.damageMessage.applyToTargets")
        }
    }

    private renderApplyDamageToSelfAction() {
        return {
            classes: "splittermond-chat-action ",
            data: {
                localAction: "applyDamageToSelf",
            },
            icon: "fa-heart-broken",
            name: foundryApi.localize("splittermond.chatCard.damageMessage.applyToSelf")
        }
    }

    handleGenericAction(data: { action: string }): Promise<void> {
        if (data.action === "applyDamageToTargets") {
            const damageType = this.damageEvent.costVector._channeled ? "K" :
                this.damageEvent.costVector._consumed ? "V" : "";
            return ApplyDamageDialog.create(this.damageEvent.totalDamage(), damageType, "")
        } else if (data.action === "applyDamageToSelf") {
            return applyDamageToSelf(this.damageEvent).catch((reportError));
        }
        return Promise.reject();
    }
}

function reportError(e:Error) {
   console.error(e);
   foundryApi.reportError("Unknown error occurred");
}

addToRegistry(constructorRegistryKey, DamageMessage);

