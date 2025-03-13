import {Susceptibilities} from "../../../../../module/actor/modifiers/Susceptibilities";
import ModifierManager from "../../../../../module/actor/modifier-manager";
import {damageTypes} from "../../../../../module/config/damageTypes";
import {expect} from "chai";


describe("Susceptibilities", () => {
    damageTypes.forEach(sus => {
        it(`should deliver susceptibility for ${sus} if modifier is present`, () => {
            const modifierManager = new ModifierManager();
            const underTest = new Susceptibilities("susceptibility",modifierManager);

            modifierManager.add(`susceptibility.${sus}`, "","5");

            expect(underTest.calculateSusceptibilities()[sus]).to.equal(5);
        });


        it(`should deliver susceptibility of 0 for ${sus} if modifier is absent`, () => {
            const modifierManager = new ModifierManager();
            const underTest = new Susceptibilities("susceptibility", modifierManager);

            modifierManager.add(`susceptibility.${sus}`,"", "5");

            expect(underTest.calculateSusceptibilities()[sus]).to.equal(5);
        });
    });

    [0, 5, 10, -1, -300].forEach(value => {
        it(`should deliver susceptibility of ${value}`, () => {
            const modifierManager = new ModifierManager();
            const underTest = new Susceptibilities("susceptibility", modifierManager);

            modifierManager.add(`susceptibility.light`,"", `${value}`);

            expect(underTest.calculateSusceptibilities().light).to.equal(value);
        });
    });
});