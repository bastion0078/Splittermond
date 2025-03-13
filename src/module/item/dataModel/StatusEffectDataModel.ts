import {DataModelSchemaType, SplittermondDataModel} from "../../data/SplittermondDataModel";
import { fields } from "../../data/SplittermondDataModel";
import {getDescriptorFields} from "./commonFields";
import SplittermondItem from "../item";
import {migrateFrom0_12_10} from "./migrations";

function StatusEffectDataModelSchema() {
    return {
        ...getDescriptorFields(),
        modifier: new fields.StringField({ required: true, nullable:true }),
        level: new fields.NumberField({ required: true, nullable:true, initial: 1 }),
        startTick: new fields.NumberField({ required: true, nullable:true, initial: 0 }),
        interval: new fields.NumberField({ required: true, nullable:true, initial: 0 }),
        times: new fields.NumberField({ required: true, nullable:true, initial: 0 }),
    };
}

export type StatusEffectDataModelType = DataModelSchemaType<typeof StatusEffectDataModelSchema>

export class StatusEffectDataModel extends SplittermondDataModel<StatusEffectDataModelType, SplittermondItem> {
    static defineSchema = StatusEffectDataModelSchema;

    static migrateData(source:unknown){
        source = migrateFrom0_12_10(source);
        return super.migrateData(source);
    }
}
