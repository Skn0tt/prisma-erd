import { parseDatamodel } from "./parse-dml";

export interface DMLModel {
  name: string;
  isEmbedded: boolean;
  dbName: string | null;
  fields: {
    name: string;
    hasDefaultValue: boolean;
    isGenerated: boolean;
    isId: boolean;
    isList: boolean;
    isReadOnly: boolean;
    isRequired: boolean;
    isUnique: boolean;
    isUpdatedAt: boolean;
    kind: "scalar" | "object" | "enum";
    type: string;
    relationFromFields?: any[];
    relationName?: string;
    relationOnDelete?: string;
    relationToFields?: any[];
  }[];
  idFields: any[];
  uniqueFields: any[];
  uniqueIndexes: any[];
  isGenerated: boolean;
}
export interface DML {
  enums: any[];
  models: DMLModel[];
}

function renderDml(dml: DML) {
  let diagram = "erDiagram";

  const classes = dml.models
    .map(
      (model) =>
        `  ${model.name} {
${model.fields
  .filter(
    (field) =>
      field.kind !== "object" &&
      !model.fields.find(
        ({ relationFromFields }) =>
          relationFromFields && relationFromFields.includes(field.name)
      )
  )
  .map((field) => `    ${field.type} ${field.name}`)
  .join("\n")}  
  }
`
    )
    .join("\n\n");

  let relationShips = "";
  for (const model of dml.models) {
    for (const field of model.fields) {
      if (field.relationFromFields && field.relationFromFields.length > 0) {
        const relationshipName = field.name;
        const thisSide = model.name;
        const otherSide = field.type;

        let thisSideMultiplicity = "||";
        if (field.isList) {
          thisSideMultiplicity = "}o";
        } else if (!field.isRequired) {
          thisSideMultiplicity = "|o";
        }
        const otherModel = dml.models.find((model) => model.name == otherSide);
        const otherField = otherModel.fields.find(
          ({ relationName }) => relationName === field.relationName
        );

        let otherSideMultiplicity = "||";
        if (otherField.isList) {
          thisSideMultiplicity = "o{";
        } else if (!otherField.isRequired) {
          thisSideMultiplicity = "o|";
        }

        relationShips += `    ${thisSide} ${thisSideMultiplicity}--${otherSideMultiplicity} ${otherSide} : "${relationshipName}"\n`;
      }
    }
  }

  return diagram + "\n" + classes + "\n" + relationShips;
}

export const mapPrismaToDb = (dmlModels: DMLModel[], dataModel: string) => {
  const splitDataModel = dataModel
    ?.split("\n")
    .filter((line) => line.includes("@map"))
    .map((line) => line.trim());

  return dmlModels.map((model) => {
    return {
      ...model,
      fields: model.fields.map((field) => {
        // get line with field to \n
        const lineInDataModel = splitDataModel.find((line) =>
          line.includes(`${field.name}`)
        );
        if (lineInDataModel) {
          const startingMapIndex = lineInDataModel.indexOf("@map") + 6;
          const modelField = lineInDataModel.substring(
            startingMapIndex,
            lineInDataModel.substring(startingMapIndex).indexOf('")') +
              startingMapIndex
          );
          if (modelField) {
            field = { ...field, name: modelField };
          }
        }

        return field;
      }),
    };
  });
};

export default async (req, res) => {
  try {
    const datamodelString = await parseDatamodel(req.body);
    const dml: DML = JSON.parse(datamodelString);
    // updating dml to map to db table and column names (@map && @@map)
    dml.models = mapPrismaToDb(dml.models, datamodelString);
    const mermaid = renderDml(dml);
    res.status(200).send(mermaid);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
};
