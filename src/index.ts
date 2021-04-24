import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
});

const schemaInput = document.getElementById(
  "schema-input"
) as HTMLTextAreaElement;

document.getElementById("transform").onclick = async () => {
  const response = await fetch("/api/render-dml-to-mermaid", {
    method: "POST",
    body: schemaInput.value,
    headers: {
      "Content-Type": "text/plain",
    },
  });

  if (response.status !== 200) {
    window.alert(await response.text());
    return;
  }

  const mermaid = await response.text();

  console.log(mermaid);

  renderWithMermaid(mermaid);
  updateDownloadButton();
};

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
