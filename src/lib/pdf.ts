// Client-only: rasterize a rendered report element into a multi-page A4 PDF and
// return it as base64 (no data: prefix) for emailing as an attachment.
// html2canvas + jsPDF are imported dynamically so they stay out of the initial bundle.

export async function reportElementToPdfBase64(el: HTMLElement): Promise<string> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  let remaining = imgH;
  let position = margin;
  // First page
  pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
  remaining -= pageH - margin * 2;
  // Additional pages by shifting the same tall image upward
  while (remaining > 0) {
    pdf.addPage();
    position = margin - (imgH - remaining);
    pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
    remaining -= pageH - margin * 2;
  }

  const dataUri = pdf.output("datauristring");
  return dataUri.split(",")[1] ?? "";
}
