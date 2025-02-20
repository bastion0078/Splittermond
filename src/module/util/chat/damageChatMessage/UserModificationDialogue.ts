import {DialogV2ConstructorInput, DialogV2RenderOptions, FoundryDialog} from "../../../api/Dialog";
import {foundryApi} from "../../../api/foundryApi";
import {DamageRecord} from "../../damage/applyDamage";

type UserAction = "cancel"|"apply"|"seeNext"|null;
export class UserModificationDialogue {
    private previousUserAdjustment: number = 0;
    //@ts-expect-error
    private previousUserAction: UserAction= null;
    private showNext:boolean = true;




    async produceUserModification(damageRecord: DamageRecord): Promise<number> {
        if(!this.showNext){
            return this.previousUserAdjustment;
        }
        return new Promise(async (resolve) => {
            const damageDialog = await DamageReportDialog.create(damageRecord);
            await damageDialog.render({force: true});
            if(damageDialog.selectedAction === "apply"){
                this.previousUserAdjustment = damageDialog.userAdjustment;
            }else if(damageDialog.selectedAction === "seeNext"){
                this.previousUserAdjustment = damageDialog.userAdjustment;
                this.showNext = true;
                this.previousUserAction = "apply"
            }
            this.previousUserAction = "cancel"
            resolve(this.previousUserAdjustment);
        });
    }
}

class DamageReportDialog extends FoundryDialog {
    currentUserAdjustment: number = 0;
    previousValue: number;
    selectedAction:UserAction =null;
    readonly originalValue:number;

    static async create(damageRecord: DamageRecord): Promise<DamageReportDialog> {
        const html = await foundryApi.renderer("systems/splittermond/templates/apps/dialog/new-damage-report.hbs", damageRecord);
        const dialog = new DamageReportDialog({
            //@ts-expect-error
            classes: ["splittermond", "dialog", "dialog-apply-damage"],
            window: {
                title: foundryApi.format("splittermond.damageMessage.title", {
                    attacker: damageRecord.attackerName,
                    defender: damageRecord.defenderName
                })
            },
            content: html,
            buttons: [{
                action: "cancel",
                label: foundryApi.localize("splittermond.cancel"),
                default: true,
                callback: () => {
                    dialog.selectedAction = "cancel";
                }
            },{
                action: "apply",
                label: foundryApi.localize("splittermond.apply"),
                default: true,
                callback: () => {
                    dialog.selectedAction = "apply";
                }
            }],
            //@ts-expect-error
            submit:()=>{dialog.close()}
        }, damageRecord.totalDamage);
        return dialog;
    }

    constructor(options: DialogV2ConstructorInput, originalDamage: number) {
        super(options);
        this.previousValue = originalDamage;
        this.originalValue = originalDamage;
    }

    async render(options: DialogV2RenderOptions) {
        const result = await super.render(options);
        $(result.element).find("button.button-inline[data-action='inc-value']").on("click", (plusClickEvent) => {
            this.operateOnInput((value) => value + 1);
            plusClickEvent.stopPropagation();
        });
        $(result.element).find("button.button-inline[data-action='dec-value']").on("click", (minusClickEvent) => {
            this.operateOnInput((value) => value - 1);
            minusClickEvent.stopPropagation();
        });
        $(result.element).find("button.button-inline[data-action='half-value']").on("click", (halfClickEvent) => {
            this.operateOnInput((value) => Math.round(value*0.5));
            halfClickEvent.stopPropagation();
        });
        $(result.element).find("input[name='damage']").on("change", () => {
            const newValue = this.getInputValue();
            if(newValue !== null){
                this.currentUserAdjustment = newValue - this.previousValue;
                this.previousValue = newValue;
            }
        });


        return result;
    }
    private operateOnInput(operate:(value:number)=>number){
        const currentValue = this.getInputValue();
        if(currentValue !== null){
            this.setInputValue(operate(currentValue));
        }
    }

    private setInputValue(newValue:number){
        this.getInput().val(newValue).trigger("change");

    }
    private getInputValue():number|null{
        return parseInputValue(this.getInput().val());
    }
    private getInput(){
        return $(this.element).find("input[name='damage']")
    }

    get userAdjustment(): number {
        return this.currentUserAdjustment;
    }
}

function parseInputValue(input: string | number | string[] | undefined): number | null {
    if (typeof input === "string") {
        return parseInt(input);
    } else if (typeof input === "number") {
        return input;
    } else if (Array.isArray(input)) {
        return parseInputValue(input[0]);
    } else {
        return null;
    }

}


/*
    /**
     * @deprecated this should work most closely as activate listeners, but it is an internal method.
     * we probably want to use addEventListener instead
    _attachFrameListeners(html:JQuery<HTMLElement>){ {
        html.find('[data-action="inc-value"]').on("click",(event) => {
            const query = $(event.currentTarget).closestData('input-query');
            let value = parseInt($(html).find(query).val()) || 0;
            $(html).find(query).val(value + 1).change();
        });

        html.find('[data-action="dec-value"]').on("click",(event) => {
            const query = $(event.currentTarget).closestData('input-query');
            let value = parseInt($(html).find(query).val()) || 0;
            $(html).find(query).val(value - 1).change();
        });

        html.find('[data-action="half-value"]').on("click", (event) => {
            const query = $(event.currentTarget).closestData('input-query');
            let value = parseInt($(html).find(query).val()) || 0;
            $(html).find(query).val(Math.round(value / 2)).change();
        });

       //@ts-expect-error
       super._attachFrameListeners(html)
}
*/