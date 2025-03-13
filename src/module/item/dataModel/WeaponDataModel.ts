import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondWeaponItem from "../weapon";
import {damage, getDescriptorFields, getPhysicalProperties} from "./commonFields";
import {migrateFrom0_12_10} from "./migrations";

function ItemWeaponDataModelSchema() {
    return {
        ...getDescriptorFields(),
        ...getPhysicalProperties(),
        modifier: new fields.StringField({required: true, nullable: true}),
        ...damage(),
        range: new fields.NumberField({required: true, nullable: true, initial: 0}),
        weaponSpeed: new fields.NumberField({required: true, nullable: true, initial: 0}),
        skill: new fields.StringField({required: true, nullable: false}),
        skillMod: new fields.NumberField({required: true, nullable: false, initial: 0}),
        features: new fields.StringField({required: true, nullable: false}),
        attribute1: new fields.StringField({required: true, nullable: false}),
        attribute2: new fields.StringField({required: true, nullable: false}),
        minAttributes: new fields.StringField({required: true, nullable: false}),
        prepared: new fields.BooleanField({required: true, nullable: false, initial: false}),
        equipped: new fields.BooleanField({required: true, nullable: false, initial: false}),
        secondaryAttack: new fields.SchemaField({
            skill: new fields.StringField({required: true, nullable: true, initial: "none"}),
            skillMod: new fields.NumberField({required: true, nullable: true, initial: 0}),
            attribute1: new fields.StringField({required: true, nullable: true}),
            attribute2: new fields.StringField({required: true, nullable: true}),
            ...damage(),
            range: new fields.NumberField({required: true, nullable: true, initial: 0}),
            weaponSpeed: new fields.NumberField({required: true, nullable: true, initial: 0}),
            minAttributes: new fields.StringField({required: true, nullable: true}),
            features: new fields.StringField({required: true, nullable: true}),
        }, {required: false, nullable: false}),
    };
}

export type WeaponDataModelType = DataModelSchemaType<typeof ItemWeaponDataModelSchema>

export class WeaponDataModel extends SplittermondDataModel<WeaponDataModelType, SplittermondWeaponItem> {
    static defineSchema = ItemWeaponDataModelSchema;

    static migrateData(source:unknown){
        source = migrateFrom0_12_10(source);
        return super.migrateData(source);
    }
}
