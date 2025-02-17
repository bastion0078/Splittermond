import {describe, it} from "mocha";
import {DamageMessage} from "../../../../../../module/util/chat/damageChatMessage/DamageMessage";
import {createDamageEvent, createDamageImplement} from "../../damage/damageEventTestHelper";
import sinon from "sinon";
import {expect} from "chai";
import {foundryApi} from "../../../../../../module/api/foundryApi";
import ApplyDamageDialog from "../../../../../../module/apps/dialog/apply-damage-dialog";

describe("Damage Message", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, 'localize').returnsArg(0);
    });
    afterEach(() => sandbox.restore());

    it("should display at most 4 features", () => {
        const damageEvent = createDamageEvent(sandbox, {implements:[createDamageImplement(5, 0)]});
        const features = [
            createFeature("lange waffe",0),
            createFeature("kritisch",2),
            createFeature("exakt",3),
            createFeature("durchdringung",4),
            createFeature("scharf",1),
            createFeature("wuchtig",0)];
        const damageMessage = DamageMessage.initialize(damageEvent, [...features]);

        expect(damageMessage.getData().features).to.deep.equal([features[3], features[2], features[1], features[4]]);

    });

    it("should hand damage over to the damage handler", () => {
        const damageEvent = createDamageEvent(sandbox)
        const damageMessage = DamageMessage.initialize(damageEvent);

        const damageDialog = sandbox.stub(ApplyDamageDialog, 'create').returns(Promise.resolve());

        damageMessage.handleGenericAction({action: "applyDamageToTargets"});

        expect(damageDialog.calledOnce).to.be.true;
    });

    it("should return the principle damage component", () => {
        const principalDamageComponent = createDamageImplement(8, 0);
        principalDamageComponent.updateSource({implementName: "Brennende Klinge"});
        const damageEvent = createDamageEvent(sandbox, {implements:[
            createDamageImplement(5, 0), principalDamageComponent, createDamageImplement(3, 0)
        ]});
        const damageMessage = DamageMessage.initialize(damageEvent, []);

        expect(damageMessage.getData().source).to.equal(principalDamageComponent.implementName);
    })

});

function createFeature(name:string, value:number){
    return {
        name,
        value,
        active:true
    }
}