import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
});

const schemaInput = document.getElementById(
  "schema-input"
) as HTMLTextAreaElement;

document.getElementById("transform").onclick = async () => {
  const response = await fetch("/api/parse-dml", {
    method: "POST",
    body: schemaInput.value,
    headers: {
      "Content-Type": "text/plain",
    },
  });

  const dml = await response.json();

  console.log(dml);

  drawDiagram(dml);
  updateDownloadButton();
};

interface DML {
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

function drawDiagram(dml: DML) {
  let diagram = "erDiagram";

  const classes = dml.models
    .map(
      (model) =>
        `  ${model.name} {
${model.fields
  .filter(
    (field) =>
      field.kind !== "object" &&
      !model.fields.find(({ relationFromFields }) =>
        relationFromFields?.includes(field.name)
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
      if (field.relationFromFields?.length > 0) {
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

  renderWithMermaid(diagram + "\n" + classes + "\n" + relationShips);
}

const graphDiv = document.getElementById("graphDiv");

const svgId = "mermaid-svg";

function renderWithMermaid(input: string) {
  mermaid.mermaidAPI.render(
    svgId,
    input,
    (svg: string) => (graphDiv.innerHTML = svg)
  );

  const svgEl = document.getElementById(svgId);

  svgEl.setAttribute("height", undefined);
  svgEl.setAttribute("width", undefined);
}

const downloadHref = document.getElementById("download") as HTMLAnchorElement;

// https://stackoverflow.com/questions/23218174/how-do-i-save-export-an-svg-file-after-creating-an-svg-with-d3-js-ie-safari-an
function updateDownloadButton() {
  const el = document.getElementById(svgId);
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(el);

  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(
      /^<svg/,
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'
    );
  }

  source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

  downloadHref.style.display = "unset";
  downloadHref.href = "data:image/svg+xml;base64," + btoa(source);
}
