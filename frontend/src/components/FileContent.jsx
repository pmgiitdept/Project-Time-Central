// components/FileContent.jsx
import { useEffect, useState, useRef } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/FileContent.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";

export default function FileContent({ fileId, role }) {
  const isEditable = role === "admin";
  const [pages, setPages] = useState([]);
  const [currentPdfPage, setCurrentPdfPage] = useState(0);
  const [originalPages, setOriginalPages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);
  const tableContainerRef = useRef(null);

  const [expanded, setExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const saveTimeout = useRef(null);
  const currentPageData = pages[currentPdfPage] || { text: "", tables: [] };
  const [fileInfo, setFileInfo] = useState(null);
  const fileOwner = fileInfo?.owner || "-";
  const fileUrl = fileInfo?.file || "";
  const fileName = fileUrl ? fileUrl.split("/").pop() : "-";
  const uploadedAt = fileInfo?.uploaded_at || "";
  const status = fileInfo?.status || "pending";

  const getColumnTotals = () => {
    const totals = [];
    if (!mergedRows.length) return totals;

    const colCount = subHeaders.reduce((acc, subs) => acc + (subs.length > 0 ? subs.length : 1), 0);

    for (let c = 0; c < colCount; c++) {
      if (c === 0) {
        totals[c] = ""; 
        continue;
      }

      let sum = 0;
      let hasNumber = false;

      mergedRows.forEach(({ row }) => {
        const val = parseFloat(row[c]);
        if (!isNaN(val)) {
          sum += val;
          hasNumber = true;
        }
      });

      totals[c] = hasNumber ? sum.toFixed(2) : "";
    }

    return totals;
  };

  const buildTotalRow = () => {
    const totals = getColumnTotals(); 
    const row = [];

    row.push({ content: "", styles: { fillColor: [240, 240, 240], fontStyle: "bold" } });

    row.push({ content: "Total", styles: { fillColor: [240, 240, 240], fontStyle: "bold", textColor: [0,0,0] } });

    totals.slice(2).forEach(total => {
      row.push({ content: total.toString(), styles: { fillColor: [240, 240, 240], fontStyle: "bold" } });
    });

    return row;
  };

  const getPageHeaderText = (fullText) => {
    const lines = fullText.split("\n").map(line => line.trim()).filter(Boolean);

    const cutoffIndex = lines.findIndex(line =>
      line.startsWith("Emp.") ||
      line.startsWith("Name")
    );

    return cutoffIndex !== -1 ? lines.slice(0, cutoffIndex) : lines;
  };

  const drawPageHeader = (doc, headerText) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    const lines = getPageHeaderText(headerText);

    const leftLines = lines.filter(line =>
      line !== "LEGEND :" && 
      !line.startsWith("WRK") &&
      !line.startsWith("ABS") &&
      !line.startsWith("LV") &&
      !line.startsWith("UT") &&
      !line.startsWith("REG") &&
      !line.startsWith("OT") &&
      !line.startsWith("ND") &&
      !line.startsWith("OTND") &&
      !line.startsWith("LH")
    );

    const rightLines = lines.filter(line =>
      line === "LEGEND :" ||
      line.startsWith("WRK") ||
      line.startsWith("ABS") ||
      line.startsWith("LV") ||
      line.startsWith("UT") ||
      line.startsWith("REG") ||
      line.startsWith("OT") ||
      line.startsWith("ND") ||
      line.startsWith("OTND") ||
      line.startsWith("LH")
    );

    let y = margin;

    doc.setFontSize(9);
    leftLines.forEach(line => {
      doc.setFont("helvetica", "normal");
      doc.text(line, margin, y);
      y += 12;
    });

    y = margin;
    const rightX = pageWidth / 2 + 40;
    rightLines.forEach(line => {
      if (line === "LEGEND :") {
        doc.setFont("helvetica", "bold");
        doc.text(line, rightX, y);
        y += 14; 
      } else {
        const [acronym, ...rest] = line.split(" ");
        doc.setFont("helvetica", "bold");
        doc.text(acronym, rightX, y);
        doc.setFont("helvetica", "normal");
        doc.text(rest.join(" "), rightX + 30, y);
        y += 12;
      }
    });

    return Math.max(leftLines.length, rightLines.length) * 12 + margin + 10;
  };

  const handleExport = (type) => {
    const tableData = mergedRows.map(({ row }) => row);
    tableData.push(buildTotalRow());

    if (type === "pdf") {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      const flatSubHeaders = subHeaders.flat();

      const mainHeaderRow = mainHeaders.map((header, idx) => ({
        content: header,
        colSpan: subHeaders[idx]?.length || 1,
        styles: { halign: "center", fillColor: [200, 200, 200], fontStyle: "bold" },
      }));

      const subHeaderRow = flatSubHeaders.map((sh) => ({
        content: sh || "",
        styles: { halign: "center", fillColor: [230, 230, 230], fontStyle: "bold" },
      }));

      const headerY = drawPageHeader(doc, currentPageData.text);

      autoTable(doc, {
        head: [mainHeaderRow, subHeaderRow],
        body: tableData,
        theme: "grid",
        margin: { top: headerY, left: 20, right: 20 },
        tableWidth: "auto",
        styles: {
          textColor: [0, 0, 0],
          fillColor: [255, 255, 240],
          fontSize: 6.5,
          cellPadding: 3,
          overflow: "linebreak",
          minCellHeight: 14,
          halign: "center",
          valign: "middle",
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [180, 180, 180],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 7,
          halign: "center",
          valign: "middle",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        didDrawPage: () => {
          drawPageHeader(doc, currentPageData.text);
        }
      });

      doc.save("DTRSummary.pdf");
    }
  };

  const handlePrint = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    const tableData = mergedRows.map(({ row }) => row);
    tableData.push(buildTotalRow());

    const flatSubHeaders = subHeaders.flat();

    const mainHeaderRow = mainHeaders.map((header, idx) => ({
      content: header,
      colSpan: subHeaders[idx]?.length || 1,
      styles: { halign: "center", fillColor: [200, 200, 200], fontStyle: "bold" },
    }));

    const subHeaderRow = flatSubHeaders.map((sh) => ({
      content: sh || "",
      styles: { halign: "center", fillColor: [230, 230, 230], fontStyle: "bold" },
    }));

    const headerY = drawPageHeader(doc, currentPageData.text);

    autoTable(doc, {
      head: [mainHeaderRow, subHeaderRow],
      body: tableData,
      theme: "grid",
      margin: { top: headerY, left: 20, right: 20 },
      tableWidth: "auto",
      styles: {
        textColor: [0, 0, 0],
        fillColor: [255, 255, 240],
        fontSize: 6.5,
        cellPadding: 3,
        overflow: "linebreak",
        minCellHeight: 14,
        halign: "center",
        valign: "middle",
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [180, 180, 180],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 7,
        halign: "center",
        valign: "middle",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      didDrawPage: (data) => {
        drawPageHeader(doc, currentPageData.text);
      }
    });

    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };

  const fetchContent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");

      const res = await api.get(`files/${fileId}/content/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.pages) {
        setPages(res.data.pages);
        setOriginalPages(JSON.parse(JSON.stringify(res.data.pages)));
        setCurrentPdfPage(0);

        const firstTable = res.data.pages[0]?.tables?.[0];
        if (firstTable) {
          setColumnFilters(firstTable[0]?.map(() => "") || []);
        }
      }

      const metaRes = await api.get(`files/${fileId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFileInfo(metaRes.data);

    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch file content or metadata");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fileId) fetchContent();
  }, [fileId]);

  const handleTextEdit = (value) => {
    const updated = [...pages];
    updated[currentPdfPage].text = value;
    setPages(updated);
  };

  const formatNumeric = (value, colIdx = null) => {
    if (value === "" || value === null || value === undefined) return "";
    const num = parseFloat(value);
    if (isNaN(num)) return value; 

    if (colIdx === 0 || colIdx === 1) {
      return String(value); 
    }

    return num.toFixed(2); 
  };

  const preparePagesForBackend = (pages) => {
    return pages.map((p, pageIdx) => {
      const tables =
        p.tables && p.tables.length > 0
          ? p.tables
          : [{ main_headers: mainHeaders, sub_headers: subHeaders, rows: [] }];

      return {
        page_number: p.page_number ?? pageIdx + 1,
        text: p.text || "",
        tables: tables.map((t) => {
          const expectedCols = (t.sub_headers || subHeaders).reduce(
            (acc, subs) => acc + (subs.length > 0 ? subs.length : 1),
            0
          );

          return {
            main_headers: t.main_headers || mainHeaders,
            sub_headers: t.sub_headers || subHeaders,
            rows: (t.rows || []).map((row) => {
              let normalized = [...row];

              while (normalized.length < expectedCols) {
                normalized.push("");
              }

              if (normalized.length > expectedCols) {
                normalized = normalized.slice(0, expectedCols);
              }

              return normalized.map((cell, colIdx) => {
                if (cell === "" || cell === null || cell === undefined) return "";
                return formatNumeric(cell, colIdx);
              });
            }),
          };
        }),
      };
    });
  };

  const handleAutoSave = async () => {
    try {
      const structuredPages = preparePagesForBackend(pages);
      console.log("🕒 Auto-saving payload:", JSON.stringify({ pages: structuredPages }, null, 2));

      await api.patch(
        `files/${fileId}/update-content/`,
        { pages: structuredPages }
      );

      console.log("✅ Auto-saved successfully");
    } catch (error) {
      if (error.response) {
        console.error("❌ Auto-save rejected:", error.response.data);
      } else {
        console.error("❌ Auto-save error:", error);
      }
    }
  };

  const handleCellChange = (pageIdx, rowIdx, colIdx, value, format = false) => {
    setPages((prevPages) => {
      const updated = [...prevPages];
      const table = { ...updated[pageIdx].tables[0] };
      const row = [...table.rows[rowIdx]];

      row[colIdx] = format ? formatNumeric(value, colIdx) : value;
      table.rows[rowIdx] = row;
      updated[pageIdx].tables[0] = table;
      return updated;
    });

    if (format) {  
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => handleAutoSave(), 1500);
    }
  };

  const handleUndoRow = (pageIdx, rowIdx) => {
    setPages((prevPages) => {
      const updated = [...prevPages];
      const table = { ...updated[pageIdx].tables[0] };
      table.rows[rowIdx] = [...originalPages[pageIdx].tables[0].rows[rowIdx]];
      updated[pageIdx].tables[0] = table;
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      const structuredPages = preparePagesForBackend(pages);
      console.log("🚀 Sending payload to backend:", JSON.stringify({ pages: structuredPages }, null, 2));

      await api.patch(
        `files/${fileId}/update-content/`,
        { pages: structuredPages }
      );

      console.log("✅ Changes saved successfully");
      toast.success("Changes saved!");
    } catch (error) {
      if (error.response) {
        console.error("❌ Backend rejected:", error.response.data);
        toast.error("Save failed: " + JSON.stringify(error.response.data));
      } else {
        console.error("❌ Save error:", error);
        toast.error("Save error: " + error.message);
      }
    }
  };

  const handleScroll = () => {
    const container = tableContainerRef.current;
    if (container) {
      const scrollWidth = container.scrollWidth - container.clientWidth;
      if (scrollWidth <= 0) {
        setScrollProgress(0);
        return;
      }
      const progress = (container.scrollLeft / scrollWidth) * 100;
      setScrollProgress(progress);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading file content...</p>
      </div>
    );
  }

  if (!pages.length) {
    return (
      <div className="no-data-container">
        <p>No data available</p>
      </div>
    );
  }

  const mainHeaders = [
    "Emp.No",
    "Name",
    "Duty (By Days)",
    "Late",
    "UT",
    "Work (By Hrs)",
    "Day-Off (By Hrs)",
    "SH (By Hrs)",
    "LH (By Hrs)",
    "Day-Off - SH (By Hrs)",
    "Day-Off - LH (By Hrs)",
  ];

  const subHeaders = [
    [""],
    [""],
    ["WRK", "ABS", "LV", "HOL", "RES"],
    [""],
    [""],
    ["REG", "OT", "ND", "OTND"],
    ["REG", "OT", "ND", "OTND"],
    ["REG", "OT", "ND", "OTND"],
    ["REG", "OT", "ND", "OTND"],
    ["REG", "OT", "ND", "OTND"],
    ["REG", "OT", "ND", "OTND"],
  ];

  const mergedRows = pages.flatMap((p, pageIdx) =>
    (p.tables?.[0]?.rows || []).map((row, rowIdx) => ({
      row,
      pageIdx,
      rowIdx,
    }))
  );

  return (
    <motion.div
      className="file-content-container"
      initial={{ opacity: 0, y: 20 }}       
      animate={{ opacity: 1, y: 0 }}       
      exit={{ opacity: 0, y: -20 }}         
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="file-content-flex">
        {/* Left side: text / table controls */}
        <div className="file-content-left">
          <div className="file-metadata">
            <div className="metadata-grid">
              <div>
                <strong>Owner:</strong> <span>{fileOwner}</span>
              </div>
              <div>
                <strong>File Name:</strong> <span>{fileName}</span>
              </div>
              <div>
                <strong>Uploaded At:</strong> <span>{new Date(uploadedAt).toLocaleString()}</span>
              </div>
              <div>
                <strong>Status:</strong>
                {isEditable ? (
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(fileId, e.target.value)}
                    className={`status-select ${status.toLowerCase()}`}
                  >
                    <option value="pending" className="pending">Pending</option>
                    <option value="verified" className="verified">Verified</option>
                    <option value="rejected" className="rejected">Rejected</option>
                  </select>
                ) : (
                  <span className={`status-span ${status.toLowerCase()}`}>
                    {status}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label><strong>Original Text Format:</strong></label>
              {currentPageData?.text && (
                <textarea
                  value={currentPageData.text}
                  onChange={(e) => handleTextEdit(e.target.value)}
                  readOnly={!isEditable}
                  style={{
                    width: "100%",
                    height: "200px",
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    marginTop: "0.5rem",
                  }}
                />
              )}
            </div>
          </div>

          <div className="mb-6">
            <div className="table-card">
              <div className="table-card-header">
                <h3>Employees Data Summary</h3>
                {/* <button onClick={() => setExpanded(!expanded)}>
                  {expanded ? "Collapse Table ▲" : "Expand Table ▼"}
                </button>*/}
                <button 
                  className="open-table-btn" 
                  onClick={() => setIsModalOpen(true)}
                >
                  <span role="img" aria-label="table">📊</span> Open Full Table
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Table Outside Left Panel */}
      {expanded && (
        <div
          className="expanded-table-wrapper"
          ref={tableContainerRef}
          onScroll={handleScroll}
        >
          <table className="file-content-table">
            <thead>
              <tr>
                {mainHeaders.map((h, idx) => (
                  <th key={idx} colSpan={subHeaders[idx]?.length || 1} style={{ textAlign: "center" }}>
                    {h}
                  </th>
                ))}
                <th rowSpan={2}>Actions</th>
              </tr>
              <tr>
                {subHeaders.map((subs, idx) => {
                  const subsArray = Array.isArray(subs) ? subs : [subs];
                  return subsArray.length > 0 && subsArray[0] !== "" ? (
                    subsArray.map((sh, sIdx) => <th key={`${idx}-${sIdx}`}>{sh}</th>)
                  ) : (
                    <th key={`${idx}-0`}></th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {mergedRows.map(({ row, pageIdx, rowIdx }) => {
                const expectedCols = subHeaders.reduce(
                  (acc, subs) => acc + (subs.length > 0 ? subs.length : 1),
                  0
                );
                const trimmedRow = row.slice(0, expectedCols);

                return (
                  <tr key={`${pageIdx}-${rowIdx}`}>
                    {trimmedRow.map((cell, cIdx) => {
                      const cellValue = String(cell || "");
                      const originalValue =
                        originalPages[pageIdx]?.tables?.[0]?.rows?.[rowIdx]?.[cIdx] ?? cellValue;
                      const changed = cellValue !== String(originalValue);

                      return (
                        <td
                          key={cIdx}
                          style={{ backgroundColor: changed ? "#ffe0b2" : "transparent" }}
                        >
                          <input
                            type="text"
                            value={cellValue}
                            onChange={(e) =>
                              handleCellChange(pageIdx, rowIdx, cIdx, e.target.value)
                            }
                            onBlur={(e) =>
                              handleCellChange(pageIdx, rowIdx, cIdx, e.target.value, true)
                            }
                            readOnly={!isEditable}
                            style={{
                              width: `${cellValue.length + 1}ch`,
                              minWidth: "100%",
                              border: isEditable ? "none" : "transparent",
                              backgroundColor: isEditable ? "transparent" : "#f5f5f5",
                              padding: "2px",
                              whiteSpace: "nowrap",
                            }}
                          />
                        </td>
                      );
                    })}
                    <td>
                      <button className="undo-btn" onClick={() => handleUndoRow(pageIdx, rowIdx)}>
                        Undo Row
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Table Modal */}
      {isModalOpen && (
        <div className="modal-overlay3">
          <div className="modal-content3">
            <div className="modal-header">
              <h2>Full Table View</h2>
              <button onClick={() => setIsModalOpen(false)}>✖ Close</button>
            </div>

            {/* Export / Print buttons */}
            <div className="modal-toolbar">
              <button onClick={() => handlePrint()}>🖨 Print</button>
              <div style={{ display: "inline-block", marginLeft: "1rem" }}>
                <span>Export: </span>
                <button onClick={() => handleExport("xlsx")}>Excel</button>
                <button onClick={() => handleExport("csv")}>CSV</button>
                <button onClick={() => handleExport("pdf")}>PDF</button>
              </div>
              {isEditable && (
                <button className="save-btn" onClick={handleSave} style={{ marginLeft: "auto" }}>
                  💾 Save Changes
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              style={{
                marginBottom: "0.5rem",
                padding: "0.3rem",
                width: "200px",
              }}
            />

            <div style={{ overflowX: "auto", maxHeight: "80vh" }}>
              <table className="file-content-table" id="modal-table">
                <thead>
                  <tr>
                    {mainHeaders.map((h, idx) => (
                      <th key={idx} colSpan={subHeaders[idx]?.length || 1}>
                        {h}
                      </th>
                    ))}
                    <th rowSpan={2}>Actions</th>
                  </tr>
                  <tr>
                    {subHeaders.map((subs, idx) => {
                      const subsArray = Array.isArray(subs) ? subs : [subs];
                      return subsArray.length > 0 && subsArray[0] !== "" ? (
                        subsArray.map((sh, sIdx) => <th key={`${idx}-${sIdx}`}>{sh}</th>)
                      ) : (
                        <th key={`${idx}-0`}></th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {mergedRows.map(({ row, pageIdx, rowIdx }) => {
                    const expectedCols = subHeaders.reduce(
                      (acc, subs) => acc + (subs.length > 0 ? subs.length : 1),
                      0
                    );
                    const trimmedRow = row.slice(0, expectedCols);
                    return (
                      <tr key={`${pageIdx}-${rowIdx}`}>
                        {trimmedRow.map((cell, cIdx) => {
                          const cellValue = String(cell || "");
                          const originalValue =
                            originalPages[pageIdx]?.tables?.[0]?.rows?.[rowIdx]?.[cIdx] ??
                            cellValue;
                          const changed = cellValue !== String(originalValue);
                          return (
                            <td
                              key={cIdx}
                              style={{ backgroundColor: changed ? "#ffe0b2" : "transparent" }}
                            >
                              <input
                                type="text"
                                value={cellValue}
                                onChange={(e) =>
                                  handleCellChange(pageIdx, rowIdx, cIdx, e.target.value)
                                }
                                readOnly={!isEditable}
                                style={{
                                  width: `${cellValue.length + 1}ch`,
                                  minWidth: "100%",
                                  border: isEditable ? "none" : "transparent",
                                  backgroundColor: isEditable ? "transparent" : "#f5f5f5",
                                  padding: "2px",
                                  whiteSpace: "nowrap",
                                }}
                              />
                            </td>
                          );
                        })}
                        <td>
                          <button
                            className="undo-btn"
                            onClick={() => handleUndoRow(pageIdx, rowIdx)}
                          >
                            Undo Row
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  <tr style={{ fontWeight: "bold", background: "#f0f0f0", border: "none" }}>
                    <td style={{ border: "none", background: "#f0f0f0" }}></td>
                    <td style={{ border: "none", background: "#f0f0f0", color: "black" }}>Total</td>
                    {getColumnTotals().slice(2).map((total, idx) => (
                      <td key={idx} style={{ border: "none" }}>{total}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}