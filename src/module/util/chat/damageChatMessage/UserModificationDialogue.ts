import {DialogV2ConstructorInput, DialogV2RenderOptions, FoundryDialog} from "../../../api/Dialog";
import {foundryApi} from "../../../api/foundryApi";
import {UserReport} from "./UserReporterImpl";
import {Renderer} from "./userDialogue/Renderer";
import {CostType, fromCost, isCostType, toCost} from "../../costs/costTypes";
import {CostModifier} from "../../costs/Cost";
import {PrimaryCost} from "../../costs/PrimaryCost";
import {settings} from "../../../settings";
import SplittermondActor from "../../../actor/actor";

let displayDamageDialogue: Awaited<ReturnType<typeof settings.registerString>> = {
    get: () => "once", set: () => {
    }
};
settings.registerString("displayDamageDialog", {
    choices: {
        "once": "splittermond.settings.displayDamageDialog.options.once",
        "always": "splittermond.settings.displayDamageDialog.options.always",
        "never": "splittermond.settings.displayDamageDialog.options.never"
    },
    config: true,
    position: 0,
    scope: "client",
    default: "once"
}).then((value) => displayDamageDialogue = value);

type UserAction = "cancel" | "apply" | "seeNext" | null;
export class UserModificationDialogue {
    private storedUserAdjustment: CostModifier = CostModifier.zero;
    private storedCostVector = toCost("V").toModifier(true);
    private storedCostBase: PrimaryCost = toCost("V").subtract(this.storedCostVector);
    private costBaseChanged: boolean = false;
    private showNext:boolean = displayDamageDialogue.get() !== "never";




    async getUserAdjustedDamage(userReport: UserReport): Promise<PrimaryCost> {
        if(!this.showNext) {
            return Promise.resolve(this.calculateNewDamage(userReport.totalDamage , this.storedUserAdjustment));
        }

        this.storedCostBase = userReport.event.costBase;
        const userResult = await this.showNextDialog(userReport);
        if(userResult.selectedAction == "cancel"){
            this.showNext = false;
            this.storedUserAdjustment = CostModifier.zero;
        }
        let adjustmentToUse = this.storedUserAdjustment;
        if(userResult.selectedAction == "apply"){
            if(fromCost(this.storedCostBase)[0] !== userResult.costBase){
                this.costBaseChanged = true;
            }
            this.storedCostVector = toCost(userResult.costBase).toModifier(true);
            this.storedCostBase = toCost(userResult.costBase).subtract(this.storedCostVector);
            const adjustmentToStore = userResult.damageAdjustment + userResult.splinterpointBonus
            this.storedUserAdjustment = this.storedCostBase.add(this.storedCostVector).toModifier(true).multiply(adjustmentToStore);
            adjustmentToUse = this.storedCostBase.add(this.storedCostVector).toModifier(true).multiply(userResult.damageAdjustment);
        }
        return this.calculateNewDamage(userReport.totalDamage, adjustmentToUse);

    }

    private calculateNewDamage(originalDamage: CostModifier, damageAdjustment: CostModifier): PrimaryCost{
        const newDamage = originalDamage.add(damageAdjustment);
        const newVector = this.costBaseChanged ? this.storedCostVector.multiply(newDamage.length) : newDamage
        return this.storedCostBase.add(newVector);


    }

    private async showNextDialog(userReport: UserReport):Promise<UserAdjustments>{
        return new Promise(async (resolve) => {
            const damageDialog = await DamageReportDialog.create(userReport, resolve);
            await damageDialog.render({force: true});
        });
    }
}

type UserAdjustments = ReturnType<DamageReportDialog["getUserAdjustments"]>;
class DamageReportDialog extends FoundryDialog {
    private currentUserAdjustment: number = 0;
    private baseChange: boolean = false;
    private selectedAction:UserAction =null;
    private splinterpointBonus= 0;
    private previousValue: number;

    static async create(userReport: UserReport, resolve:(x:UserAdjustments)=>void): Promise<DamageReportDialog> {
        const renderedContent = new Renderer(userReport);
        const dialog = new DamageReportDialog({
            //@ts-expect-error
            classes: ["splittermond", "dialog", "dialog-apply-damage"],
            window: {
                title: foundryApi.format("splittermond.damageMessage.title", {
                    attacker: renderedContent.attackerName,
                    defender: renderedContent.defenderName
                })
            },
            content: await renderedContent.getHtml(),
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
            submit:(e,b,d)=>{dialog.close(); resolve(dialog.getUserAdjustments());}
        }, userReport.totalDamage.length, renderedContent.costType, userReport.target);
        return dialog;
    }


    constructor(options: DialogV2ConstructorInput, originalDamage: number,  private currentCostType: CostType, private target: SplittermondActor) {
        super(options);
        this.previousValue = originalDamage;
    }

    getUserAdjustments(){
        return {
            damageAdjustment: this.currentUserAdjustment,
            costBase: this.currentCostType,
            costBaseChanged: this.baseChange,
            selectedAction: this.selectedAction,
            splinterpointBonus: this.splinterpointBonus,
        }

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
        $(result.element).find("button.dialog-buttons[data-action='useSplinterpoint']").on("click", () => {
                this.spendSplinterpoint();
                $(result.element).find("button.dialog-buttons[data-action='useSplinterpoint']").prop("disabled", true);
                this.operateOnInput((value) => value - this.splinterpointBonus);
        });
        $(result.element).find("select[name='costTypeSelect']").on("change", (event) => {
            if(event.target instanceof HTMLSelectElement) {
                const selectedValue = Array.from(event.target.selectedOptions).map(o => o.value)[0];
                if(isCostType(selectedValue)){
                    this.currentCostType = selectedValue
                    this.baseChange = true;
                    event.stopPropagation();
                }else {
                    console.warn(`Splittermond | Matched SELECT element had invalid selected option ${selectedValue}`);
                }
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

    private spendSplinterpoint(){
        const splinterpointAction = this.target.spendSplinterpoint();
        if (splinterpointAction.pointSpent){
            const splinterpointBonus  = splinterpointAction.getBonus("health")
            this.currentUserAdjustment -= splinterpointBonus;
            this.splinterpointBonus = splinterpointBonus;
        }
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