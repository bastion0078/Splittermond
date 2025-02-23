import {DialogV2ConstructorInput, DialogV2RenderOptions, FoundryDialog} from "../../../../api/Dialog";
import {UserReport} from "./UserReporterImpl";
import {Renderer} from "./Renderer";
import {foundryApi} from "../../../../api/foundryApi";
import {CostType, isCostType} from "../../../costs/costTypes";
import SplittermondActor from "../../../../actor/actor";

type UserAction = "cancel" | "apply" | "seeNext" | null;
export type UserAdjustments = ReturnType<DamageReportDialog["getUserAdjustments"]>;

export class DamageReportDialog extends FoundryDialog {
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