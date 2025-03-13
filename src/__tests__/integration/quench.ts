import {compendiumBrowserTest} from "./compendium-browser.test";
import {itemTest} from "./item.test";
import {chatActionFeatureTest} from "./chatActionFeature.test";
import {dataModelTest} from "./api/dataModel.test";
import {DamageProcessingTest} from "./DamageProcessingTest";
import {foundryTypeDeclarationsTest} from "./api/foundryTypes.test";
import {mergeObjectTest} from "./mergeObject.test";
import {actorTest} from "./actor.test";
import type {Quench} from "@ethaks/fvtt-quench";
import {settingsTest} from "./settings.test";
import {foundryRollTest} from "./api/Roll.test";

declare const Hooks: any;

function registerQuenchTests(quench: Quench) {
    quench.registerBatch("splittermond.roll", foundryRollTest);
    quench.registerBatch("splittermond.compendium-browser", compendiumBrowserTest);
    quench.registerBatch("splittermond.item", itemTest);
    quench.registerBatch("splittermond.actor", actorTest)
    quench.registerBatch("splittermond.chatSystem", chatActionFeatureTest);
    quench.registerBatch("splittermond.dataModel", dataModelTest);
    quench.registerBatch("splittermond.damageProcessing", DamageProcessingTest);
    quench.registerBatch("splittermond.foundryTypes", foundryTypeDeclarationsTest);
    quench.registerBatch("splittermond.mergeObjects", mergeObjectTest);
    quench.registerBatch("splittermond.SettingsModule", settingsTest);
}

export function init() {
    // Use Quench's ready hook to add our tests. This hook will never be triggered if Quench isn't loaded.
    Hooks.on("quenchReady", registerQuenchTests);
}