import { parseDatamodel } from "./parse-dml";

export interface DML {
  enums: any[];
  models: {
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
  }[];
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

export const handler = async (event) => {
  try {
    const datamodelString = await parseDatamodel(event.body);
    const dml: DML = JSON.parse(datamodelString);
    const mermaid = renderDml(dml);
    return {
      statusCode: 200,
      body: mermaid,
    }
  } catch (error) {
    console.log(error);
    return {
      statusCode: 400,
      body: error,
    }
  }
};
