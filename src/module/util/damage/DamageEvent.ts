import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import {AgentReference} from "../../data/references/AgentReference";
import type {DamageType} from "../../config/damageTypes";
import {splittermond} from "../../config";
import {Cost, CostModifier} from "../costs/Cost";
import {PrimaryCost} from "../costs/PrimaryCost";
import {DataModelConstructorInput} from "../../api/DataModel";


function DamageEventSchema() {
    return {
        causer: new fields.EmbeddedDataField(AgentReference, {required: true, nullable: true}),
        formula: new fields.StringField({required: true, nullable: false}),
        tooltip: new fields.StringField({required: true, nullable: false}),
        _costBase: new fields.EmbeddedDataField(PrimaryCost, {required: true, nullable: false}),
        isGrazingHit: new fields.BooleanField({required: true, nullable: false, initial:false}),
        implements: new fields.ArrayField(
            new fields.EmbeddedDataField(DamageImplement, {required: true, nullable: false}),
            {required: true, nullable: false, initial: []}),
    };
}

export type DamageEventType = Omit<DataModelSchemaType<typeof DamageEventSchema>,"_costBase">;
type DamageEventInput = DataModelConstructorInput<DamageEventType> & {_costBase: PrimaryCost};


export class DamageEvent extends SplittermondDataModel<DamageEventType> {
    /**
     * A vector of length 1 representing the cost type (channled, exausted, consumed) of the damage event
     */
    declare private _costBase: PrimaryCost;

    constructor(data: DamageEventInput, options?:object) {
        super(data,options);
    }

    static defineSchema = DamageEventSchema;

    totalDamage() {
        const accumulated = this.implements.reduce((acc, implement) => acc + implement.damage, 0);
        return Math.floor(accumulated * (this.isGrazingHit ? 0.5 : 1));
    }
    get costVector(){
        return this._costBase.toModifier(true);
    }
    get costBase(){
        return this._costBase.subtract(this._costBase.toModifier(true))
    }
}


function DamageImplementSchema() {
    return {
        damage: new fields.NumberField({required: true, nullable: false, initial: 0}),
        formula: new fields.StringField({required: true, nullable: false}),
        damageType: new fields.StringField({
            required: true,
            nullable: false,
            validate: (x) => splittermond.damageTypes.includes(x as DamageType)
        }),
        implementName: new fields.StringField({required: true, nullable: false}),
        damageExplanation: new fields.StringField({required: true, nullable: false}),
        _baseReductionOverride: new fields.NumberField({required: true, nullable: false}),
    };
}

type DamageImplementType = Omit<DataModelSchemaType<typeof DamageImplementSchema>, "damageType"> & {
    damageType: DamageType
}


export class DamageImplement extends SplittermondDataModel<DamageImplementType, DamageEvent> {

    static defineSchema = DamageImplementSchema;

    get ignoredReduction(): number {
        return Math.min(this.damage, this._baseReductionOverride);
    }

    get bruttoHealthCost(): CostModifier {
        return this.parent?.costVector.multiply(this.damage) ?? new Cost(0,0,false).asModifier();
    }
    get ignoredReductionCost(): CostModifier {
        return this.parent?.costVector.multiply(this.ignoredReduction) ?? new Cost(0,0,false).asModifier();
    }
}