import {DamageType, damageTypes} from "../../../../../module/config/damageTypes";
import {createDamageEvent, createDamageImplement} from "./damageEventTestHelper";
import sinon, {SinonSandbox} from "sinon";
import SplittermondActor from "../../../../../module/actor/actor";
import {applyDamage} from "../../../../../module/util/damage/applyDamage";
import {Cost} from "../../../../../module/util/costs/Cost";
import {expect} from "chai";


describe("Damage Application", () => {
    let sandbox: SinonSandbox;
    const consumed = new Cost(0, 1, false, true).asPrimaryCost();
    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("should apply health damage to target", async () => {
        const damageImplement = createDamageImplement(5, 0);
        const damageEvent = createDamageEvent(sandbox, {implements: [damageImplement], _costBase: consumed});
        const target = setUpTarget(sandbox, 0, {});

        await applyDamage(damageEvent, target);

        expect(target.consumeCost.calledOnce).to.be.true;
        expect(target.consumeCost.lastCall.firstArg).to.equal("health");
        expect(target.consumeCost.lastCall.args[1]).to.equal("5V5");

    });

    it("should add multiple implements", async () => {
        const damageImplement1 = createDamageImplement(5, 0);
        const damageImplement2 = createDamageImplement(3, 0);
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement1, damageImplement2],
            _costBase: consumed
        });
        const target = setUpTarget(sandbox, 0, {});

        await applyDamage(damageEvent, target);

        expect(target.consumeCost.lastCall.args[1]).to.equal("8V8");
    });

    it("should halve damage for grazing hits", async () => {
        const damageImplement = createDamageImplement(21, 0);
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement],
            _costBase: consumed,
            isGrazingHit: true
        });
        const target = setUpTarget(sandbox, 0, {});

        await applyDamage(damageEvent, target);

        expect(target.consumeCost.lastCall.args[1]).to.equal("11V11");
    });

    it("should apply damage reduction", async () => {
        const damageImplement = createDamageImplement(21, 0);
        const damageEvent = createDamageEvent(sandbox, {implements: [damageImplement], _costBase: consumed});
        const target = setUpTarget(sandbox, 10, {});

        await applyDamage(damageEvent, target);

        expect(target.consumeCost.lastCall.args[1]).to.equal("11V11");
    });

    it("should account for reduction override from multiple sources", async () => {
        const damageImplement1 = createDamageImplement(5, 3);
        const damageImplement2 = createDamageImplement(3, 5);
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement1, damageImplement2],
            _costBase: consumed
        });
        const target = setUpTarget(sandbox, 8, {});

        await applyDamage(damageEvent, target);

        expect(target.consumeCost.lastCall.args[1]).to.equal("6V6");
    });

    it("should calculate reduction after grazing", async () => {
        const damageImplement = createDamageImplement(5, 2);
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement],
            _costBase: consumed,
            isGrazingHit: true
        });
        const target = setUpTarget(sandbox, 3, {});

        await applyDamage(damageEvent, target);

        expect(target.consumeCost.lastCall.args[1]).to.equal("2V2");
    });

    damageTypes.forEach(damageType => {
        it(`should adjust damage for ${damageType} susceptibility`, async () => {
            const damageImplement = createDamageImplement(5, 0, damageType);
            const damageEvent = createDamageEvent(sandbox, {implements: [damageImplement], _costBase: consumed});
            const target = setUpTarget(sandbox, 0, {[damageType]: 5});

            await applyDamage(damageEvent, target);

            expect(target.consumeCost.lastCall?.args[1]).to.equal("10V10");

        });
    });

    describe("Reporting", () => {
        type DamageRecord = Parameters<Exclude<Parameters<typeof applyDamage>[2], undefined>>[0];

        it("should report damage halving for grazing hits", async () => {
            const damageImplement = createDamageImplement(5, 0);
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement],
                _costBase: consumed,
                isGrazingHit: true
            });
            const target = setUpTarget(sandbox, 0, {});
            const recorder = sandbox.mock().resolves(0);

            await applyDamage(damageEvent, target, recorder);

            const record = recorder.lastCall.firstArg as DamageRecord;
            expect(record.isGrazingHit).to.be.true;
            expect(record.totalDamage).to.equal(3);
        });

        it("should report damage reduction", async () => {
            const damageImplement1 = createDamageImplement(5, 3);
            const damageImplement2 = createDamageImplement(3, 5);
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement1, damageImplement2],
                _costBase: consumed
            });
            const target = setUpTarget(sandbox, 8, {});
            const recorder = sandbox.mock().resolves(0);

            await applyDamage(damageEvent, target, recorder);

            const record = recorder.lastCall.firstArg as DamageRecord;
            expect(record.damageReduction).to.equal(8);
            expect(record.totalDamage).to.equal(6);
        });

        it("should report susceptibility", async () => {
            const damageImplement1 = createDamageImplement(5, 3,"physical");
            const damageImplement2 = createDamageImplement(1, 0,"light");
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement1, damageImplement2],
                _costBase: consumed
            });

            const target = setUpTarget(sandbox, 8, {light: 5, physical: 1});
            const recorder = sandbox.mock().resolves(0);

            await applyDamage(damageEvent, target, recorder);

            const record = recorder.lastCall.firstArg as DamageRecord;
            expect(record.items[0]).to.deep.equal({modifiedBy: 1, baseValue: 5, subTotal: 6, type: "physical", name: "Schwert"});
            expect(record.items[1]).to.deep.equal({modifiedBy: 5, baseValue: 1, subTotal: 6, type: "light", name: "Schwert"});
        });
    });
});

function setUpTarget(sandbox: SinonSandbox, damageReduction: number, susceptibilties: Partial<Record<DamageType, number>>) {
    const target = sandbox.createStubInstance(SplittermondActor);
    sandbox.stub(target, "susceptibilities").get(() => ({...defaultSusceptibilities(), ...susceptibilties}));
    sandbox.stub(target, "damageReduction").get(() => damageReduction);
    return target;
}

function defaultSusceptibilities() {
    return damageTypes.reduce((acc, type) => {
        acc[type] = 0;
        return acc;
    }, {} as Record<DamageType, number>);
}