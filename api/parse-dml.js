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

const engine = path.join(engineBasePath, `query-engine-${process.platform}`);

async function parseDatamodel(model) {
  const modelB64 = Buffer.from(model).toString("base64");

  const parsed = await new Promise((resolve) => {
    const process = child_process.exec(
      `${engine} --datamodel=${modelB64} cli dmmf`
    );
    let output = "";
    process.stdout.on("data", (d) => (output += d));
    process.on("exit", () => {
      resolve(output);
    });
  });

  return parsed;
}

export default async (req, res) => {
  console.log(fs.readdirSync(engineBasePath));
  const datamodel = await parseDatamodel(req.body);
  res.status(200).send(datamodel);
};
