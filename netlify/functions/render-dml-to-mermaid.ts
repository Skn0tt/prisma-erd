import { getDMMF } from "@prisma/internals";

type PromiseResolvedType<T> = T extends Promise<infer R> ? R : never;
type ReturnedPromiseResolvedType<T extends (...args: any) => any> =
  PromiseResolvedType<ReturnType<T>>;

function renderDml(dmmf: ReturnedPromiseResolvedType<typeof getDMMF>) {
  let diagram = "erDiagram";

  const dml = dmmf.datamodel;
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

        let otherSideMultiplicity = "||";
        if (field.isList) {
          otherSideMultiplicity = "}o";
        } else if (!field.isRequired) {
          otherSideMultiplicity = "|o";
        }
        const otherModel = dml.models.find((model) => model.name == otherSide);
        const otherField = otherModel!.fields.find(
          ({ relationName }) => relationName === field.relationName
        );

        let thisSideMultiplicity = "||";
        if (otherField!.isList) {
          thisSideMultiplicity = "o{";
        } else if (!otherField!.isRequired) {
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
    const dmmf = await getDMMF({ datamodel: event.body });
    const mermaid = renderDml(dmmf);
    return {
      statusCode: 200,
      body: mermaid,
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 400,
      body: String(error),
    };
  }
};
