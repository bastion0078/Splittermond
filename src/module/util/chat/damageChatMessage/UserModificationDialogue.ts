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
type UserResult = ReturnType<DamageReportDialog["getUserAdjustments"]>;

export class UserModificationDialogue {
    private storedUserAdjustment: CostModifier = CostModifier.zero;
    private storedCostVector = toCost("V").toModifier(true);
    private storedCostBase: PrimaryCost = toCost("V").subtract(this.storedCostVector);
    private costBaseChanged: boolean = false;
    private showNext: boolean = displayDamageDialogue.get() !== "never";


    async getUserAdjustedDamage(userReport: UserReport): Promise<PrimaryCost|"Aborted"> {
        if (!this.showNext) {
            return Promise.resolve(this.calculateNewDamage(userReport.totalDamage, this.storedUserAdjustment));
        }

        const userResult = await this.showNextDialog(userReport)
        switch (userResult.selectedAction) {
            case null:
            case "cancel":
                return this.handleUserCancelAction();
            case  "apply":
                this.showNext = displayDamageDialogue.get() === "always";
                return this.handleUserApplicationAction(userResult, userReport);
            case "seeNext":
                this.showNext = true;
                return this.handleUserApplicationAction(userResult, userReport);
        }
    }

    private handleUserCancelAction() {
        this.showNext = false;
        this.storedUserAdjustment = CostModifier.zero;
        return "Aborted" as const
    }

    private handleUserApplicationAction(userResult: UserResult,userReport: UserReport) {
        this.storedCostBase = userReport.event.costBase;
        if (fromCost(this.storedCostBase)[0] !== userResult.costBase) {
            this.costBaseChanged = true;
        }
        this.storedCostVector = toCost(userResult.costBase).toModifier(true);
        this.storedCostBase = toCost(userResult.costBase).subtract(this.storedCostVector);
        const adjustmentToStore = userResult.damageAdjustment + userResult.splinterpointBonus
        const adjustmentToUse = this.storedCostBase.add(this.storedCostVector).toModifier(true).multiply(userResult.damageAdjustment);
        this.storedUserAdjustment = this.storedCostBase.add(this.storedCostVector).toModifier(true).multiply(adjustmentToStore);
        return this.calculateNewDamage(userReport.totalDamage, adjustmentToUse);
    }

    private async showNextDialog(userReport: UserReport): Promise<UserAdjustments> {
        return new Promise(async (resolve) => {
            const damageDialog = await DamageReportDialog.create(userReport);
            damageDialog.addEventListener("close", () => {
                resolve(damageDialog.getUserAdjustments())
            })
            await damageDialog.render({force: true});
        });
    }

    private calculateNewDamage(originalDamage: CostModifier, damageAdjustment: CostModifier): PrimaryCost {
        const newDamage = originalDamage.add(damageAdjustment);
        const newVector = this.costBaseChanged ? this.storedCostVector.multiply(newDamage.length) : newDamage
        return this.storedCostBase.add(newVector);
    }

}

type UserAdjustments = ReturnType<DamageReportDialog["getUserAdjustments"]>;

class DamageReportDialog extends FoundryDialog {
    private currentUserAdjustment: number = 0;
    private wasAdjusted: boolean = false;
    private baseChange: boolean = false;
    private selectedAction: UserAction = null;
    private splinterpointBonus = 0;
    private usedSplinterpointBonus = false;
    private previousValue: number;

    static async create(userReport: UserReport): Promise<DamageReportDialog> {
        const renderedContent = new Renderer(userReport);
        const dialog = new DamageReportDialog({
            classes: ["splittermond", "dialog", "dialog-apply-damage"],
            window: {
                title: foundryApi.format("splittermond.damageMessage.title", {
                    attacker: renderedContent.attackerName,
                    defender: renderedContent.defenderName
                })
            },
            form: {
                closeOnSubmit: true
            },
            content: await renderedContent.getHtml(),
            buttons: [{
                action: "cancel",
                label: foundryApi.localize("splittermond.cancel"),
                default: true,
                callback: () => {
                    dialog.selectedAction = "cancel";
                    return Promise.resolve();
                }
            }, {
                action: "apply",
                label: foundryApi.localize("splittermond.apply"),
                default: true,
                callback: () => {
                    dialog.selectedAction = "apply";
                    return Promise.resolve();
                }
            }],
        }, userReport.totalDamage.length, renderedContent.costType, userReport.target);
        return dialog;
    }


    constructor(options: DialogV2ConstructorInput, originalDamage: number, private currentCostType: CostType, private target: SplittermondActor) {
        super(options);
        this.previousValue = originalDamage;
    }

    getUserAdjustments() {
        return {
            damageAdjustment: this.currentUserAdjustment,
            wasAdjusted: this.wasAdjusted,
            costBase: this.currentCostType,
            costBaseChanged: this.baseChange,
            selectedAction: this.selectedAction,
            splinterpointBonus: this.splinterpointBonus,
            usedSplinterpointBonus: this.usedSplinterpointBonus
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
            this.operateOnInput((value) => Math.round(value * 0.5));
            halfClickEvent.stopPropagation();
        });
        $(result.element).find("input[name='damage']").on("change", () => {
            const newValue = this.getInputValue();
            if (newValue !== null) {
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
            if (event.target instanceof HTMLSelectElement) {
                const selectedValue = Array.from(event.target.selectedOptions).map(o => o.value)[0];
                this.handleSelectChange(selectedValue);
                event.stopPropagation();
            }
        });

        return result;
    }

    private handleSelectChange(newValue: string) {
        if (isCostType(newValue)) {
            this.currentCostType = newValue;
            this.baseChange = true;
        } else {
            console.warn(`Splittermond | Matched SELECT element had invalid selected option ${newValue}`);
        }
    }

    private operateOnInput(operate: (value: number) => number) {
        const currentValue = this.getInputValue();
        if (currentValue !== null) {
            this.setInputValue(operate(currentValue));
        }
    }

    private setInputValue(newValue: number) {
        this.getInput().val(newValue).trigger("change");

    }

    private getInputValue(): number | null {
        this.wasAdjusted = true;
        return parseInputValue(this.getInput().val());
    }

    private getInput() {
        return $(this.element).find("input[name='damage']")
    }

    private spendSplinterpoint() {
        const splinterpointAction = this.target.spendSplinterpoint();
        if (splinterpointAction.pointSpent) {
            const splinterpointBonus = splinterpointAction.getBonus("health")
            this.currentUserAdjustment -= splinterpointBonus;
            this.usedSplinterpointBonus = true;
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