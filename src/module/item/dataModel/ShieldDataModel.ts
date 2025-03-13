import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import SplittermondShieldItem from "../shield";
import {getDefense, getDescriptorFields, getPhysicalProperties} from "./commonFields";
import {migrateFrom0_12_10} from "./migrations";

function ItemShieldDataModelSchema() {
    return {
        ...getDescriptorFields(),
        ...getPhysicalProperties(),
        ...getDefense(),
        modifier: new fields.StringField({ required: true, nullable: false }),
        skill: new fields.StringField({ required: true, nullable: false }),
        features: new fields.StringField({ required: true, nullable: false }),
        minAttributes: new fields.StringField({ required: true, nullable: false }),
        equipped: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    };
}
export type ShieldDataModelType = DataModelSchemaType<typeof ItemShieldDataModelSchema>

export class ShieldDataModel extends SplittermondDataModel<ShieldDataModelType, SplittermondShieldItem> {
    static defineSchema= ItemShieldDataModelSchema;

    static migrateData(source:unknown){
        source = migrateFrom0_12_10(source);
        return super.migrateData(source);
    }
}
