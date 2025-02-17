import {describe} from "mocha";
import sinon, {SinonSandbox} from "sinon";
import {expect} from "chai";
import {createDamageEvent, createDamageImplement} from "./damageEventTestHelper";
import {DamageEvent} from "../../../../../module/util/damage/DamageEvent";
import {Cost} from "../../../../../module/util/costs/Cost";


describe("DamageEvent", ()=> {
    let sandbox: SinonSandbox;
    beforeEach(() => sandbox= sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("should calculate the total damage", () => {
        const damages= [5,3,2,1];
        const damageImplements = damages.map(damage => createDamageImplement(damage, 0));
        const damageEvent = createDamageEvent(sandbox, {implements:damageImplements});

        expect(damageEvent.totalDamage()).to.equal(damages.reduce((acc, damage) => acc+damage, 0));
    });

    it("should return half damage on grazing hit", () => {
        const damages= [5,3,2,10];
        const damageImplements = damages.map(damage => createDamageImplement(damage, 0));
        const damageEvent = createDamageEvent(sandbox, {implements:damageImplements});
        damageEvent.updateSource({isGrazingHit: true});

        expect(damageEvent.totalDamage()).to.equal(damages.reduce((acc, damage) => (acc+damage), 0)/2);
    });


    it("should cap damage reduction override to damage", () => {
        expect(createDamageImplement(4, 5).ignoredReduction).to.equal(4);
    });

});

