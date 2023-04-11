import { getDMMF } from "@prisma/internals";

export const handler = async (event) => {
  const datamodel = await getDMMF({
    datamodel: event.body,
  });
  return {
    statusCode: 200,
    body: JSON.stringify(datamodel),
    headers: {
      "Content-Type": "application/json",
    },
  };
};
