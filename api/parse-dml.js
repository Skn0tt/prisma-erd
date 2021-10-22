import * as path from "path";
import * as child_process from "child_process";
import fs from "fs";

const engineBasePath = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "@prisma",
  "engines"
);

const allEngines = fs.readdirSync(engineBasePath);
const queryEngine = allEngines.find((engine) =>
  engine.startsWith("query-engine")
);
const engine = path.join(engineBasePath, queryEngine);

/**
 * @param {string} parsed
 */
function getDataModelFieldWithoutParsing(parsed) {
  const startOfField = parsed.indexOf('"datamodel"');
  const openingBracket = parsed.indexOf("{", startOfField);

  let numberOfOpeningBrackets = 0;
  let closingBracket = openingBracket;
  while (closingBracket < parsed.length) {
    const char = parsed[closingBracket++];

    if (char === "{") {
      numberOfOpeningBrackets++;
    } else if (char === "}") {
      numberOfOpeningBrackets--;

      if (numberOfOpeningBrackets === 0) {
        break;
      }
    }
  }

  return parsed.slice(openingBracket, closingBracket);
}

export async function parseDatamodel(model) {
  const modelB64 = Buffer.from(model).toString("base64");

  const parsed = await new Promise((resolve, reject) => {
    const process = child_process.exec(
      `${engine} --datamodel=${modelB64} cli dmmf`
    );
    let output = "";
    process.stderr.on("data", (l) => {
      if (l.includes("error:")) {
        reject(l.slice(l.indexOf("error:"), l.indexOf("\\n")));
      }
    });
    process.stdout.on("data", (d) => (output += d));
    process.on("exit", () => {
      resolve(output);
    });
  });

  return getDataModelFieldWithoutParsing(parsed);
}

export default async (req, res) => {
  console.log(process.env)
  const datamodel = await parseDatamodel(req.body);
  res.status(200).send(datamodel);
};
