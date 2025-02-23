import {UserReport} from "./UserReporterImpl";
import {fromCost, toCost} from "../../../costs/costTypes";
import {CostModifier} from "../../../costs/Cost";
import {PrimaryCost} from "../../../costs/PrimaryCost";
import {settings} from "../../../../settings";
import {DamageReportDialog, UserAdjustments} from "./DamageReportDialog";

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

    private handleUserApplicationAction(userResult: UserAdjustments,userReport: UserReport) {
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


