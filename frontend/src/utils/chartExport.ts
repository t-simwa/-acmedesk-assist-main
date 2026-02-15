import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

/**
 * Export a chart element as PNG
 */
export async function exportChartAsPNG(elementId: string, filename: string = "chart.png"): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error("Error exporting chart as PNG:", error);
    throw error;
  }
}

/**
 * Export a chart element as SVG
 */
export async function exportChartAsSVG(elementId: string, filename: string = "chart.svg"): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    // Find the SVG element within the chart container
    const svgElement = element.querySelector("svg");
    if (!svgElement) {
      throw new Error("No SVG element found in chart");
    }

    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    
    // Set viewBox and dimensions
    const rect = svgElement.getBoundingClientRect();
    clonedSvg.setAttribute("width", rect.width.toString());
    clonedSvg.setAttribute("height", rect.height.toString());
    clonedSvg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);

    // Serialize SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    
    // Add XML declaration
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting chart as SVG:", error);
    throw error;
  }
}

/**
 * Export a chart element as PDF
 */
export async function exportChartAsPDF(elementId: string, filename: string = "chart.pdf"): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error exporting chart as PDF:", error);
    throw error;
  }
}

/**
 * Export data as CSV
 */
export function exportDataAsCSV(data: any[], filename: string = "data.csv"): void {
  try {
    if (!data || data.length === 0) {
      throw new Error("No data to export");
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvRows = [
      headers.join(","), // Header row
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape commas and quotes in values
            if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? "";
          })
          .join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting data as CSV:", error);
    throw error;
  }
}

/**
 * Export data as Excel (XLSX)
 */
export function exportDataAsExcel(data: any[], filename: string = "data.xlsx", sheetName: string = "Sheet1"): void {
  try {
    if (!data || data.length === 0) {
      throw new Error("No data to export");
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error("Error exporting data as Excel:", error);
    throw error;
  }
}

/**
 * Generate comprehensive PDF report with multiple charts and data
 */
export async function generatePDFReport(
  charts: Array<{ id: string; title: string }>,
  data: any[],
  filename: string = "analytics-report.pdf"
): Promise<void> {
  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let yPosition = 20;
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;

    // Add title
    pdf.setFontSize(20);
    pdf.text("Analytics Report", margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 15;

    // Export each chart
    for (const chart of charts) {
      const element = document.getElementById(chart.id);
      if (!element) {
        console.warn(`Chart element ${chart.id} not found, skipping`);
        continue;
      }

      // Check if we need a new page
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = 20;
      }

      // Add chart title
      pdf.setFontSize(14);
      pdf.text(chart.title, margin, yPosition);
      yPosition += 8;

      // Convert chart to image
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 1.5,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if image fits on current page
      if (yPosition + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    }

    // Add data table if provided
    if (data && data.length > 0) {
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text("Data Summary", margin, yPosition);
      yPosition += 10;

      // Simple table representation
      const headers = Object.keys(data[0]);
      pdf.setFontSize(10);
      
      // Table headers
      let xPosition = margin;
      const colWidth = (pageWidth - 2 * margin) / headers.length;
      headers.forEach((header, index) => {
        pdf.text(header.substring(0, 15), xPosition + index * colWidth, yPosition);
      });
      yPosition += 5;

      // Table rows (limit to fit on page)
      const maxRows = Math.floor((pageHeight - yPosition - margin) / 5);
      data.slice(0, maxRows).forEach((row) => {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = 20;
        }
        headers.forEach((header, index) => {
          const value = String(row[header] ?? "").substring(0, 15);
          pdf.text(value, xPosition + index * colWidth, yPosition);
        });
        yPosition += 5;
      });
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF report:", error);
    throw error;
  }
}
