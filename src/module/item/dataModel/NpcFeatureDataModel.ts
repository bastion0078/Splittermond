import {DataModelSchemaType, fields, SplittermondDataModel} from "../../data/SplittermondDataModel";
import SplittermondItem from "../item";
import {getDescriptorFields} from "./commonFields";
import {migrateFrom0_12_10} from "./migrations";

function ItemNpcFeatureDataModelSchema() {
    return {
        ...getDescriptorFields(),
        modifier: new fields.StringField({ required: true, nullable: true }),
    };
}

export type NpcFeatureDataModelType = DataModelSchemaType<typeof ItemNpcFeatureDataModelSchema>;

export class NpcFeatureDataModel extends SplittermondDataModel<NpcFeatureDataModelType, SplittermondItem> {
    static defineSchema = ItemNpcFeatureDataModelSchema;

    static migrateData(source:unknown){
        source = migrateFrom0_12_10(source);
        return super.migrateData(source);
    }
}
