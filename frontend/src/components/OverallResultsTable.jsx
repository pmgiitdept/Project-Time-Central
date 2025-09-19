/* components/OverallResultsTable.jsx*/
import { useEffect, useState, useRef } from "react";
import api from "../api";
import "./styles/FileContent.css";
import "./styles/OverallResults.css";
import { toast } from "react-toastify";
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { motion } from "framer-motion";
import { FiRefreshCw, FiFilter } from "react-icons/fi";

let cachedFiles = null;
let cachedRows = null;
let cachedStartDate = null;
let cachedEndDate = null;

export default function OverallResultsTable({ role }) {
  const isEditable = role === "admin";
  const [allFiles, setAllFiles] = useState([]);
  const [mergedRows, setMergedRows] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState("all");
  const [selectedProject, setSelectedProject] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedRow, setSelectedRow] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const summaryRef = useRef();

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  const [refreshing, setRefreshing] = useState(false);

  const getPaginatedRows = () => {
    const rows = getFilteredRows();
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  };

  const mainHeaders = [
    "Project",
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

  const fetchAllFiles = async () => {
    try {
      setLoading(true);

      if (cachedFiles && cachedRows) {
        setAllFiles(cachedFiles);
        setMergedRows(cachedRows);
        setStartDate(cachedStartDate);
        setEndDate(cachedEndDate);
        return;
      }

      const token = localStorage.getItem("access_token");
      const res = await api.get("files/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const filesArray = Array.isArray(res.data.results) ? res.data.results : [];
      cachedFiles = filesArray;
      setAllFiles(filesArray);

      const allRows = [];
      let earliestDate = null;
      let latestDate = null;

      for (const file of filesArray) {
        const fileName = file.file ? file.file.split("/").pop() : "Unknown";
        const contentRes = await api.get(`files/${file.id}/content/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const pages = contentRes.data.pages || [];

        let projectName = "-";
        if (pages[0]?.text) {
          const lines = pages[0].text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          projectName = lines[1] || "-";
        }

        let start = null;
        let end = null;
        const periodRegex = /for the period of (\d{2}\/\d{2}\/\d{4}) - (\d{2}\/\d{2}\/\d{4})/i;
        const match = pages[0]?.text?.match(periodRegex);
        if (match) {
          start = match[1];
          end = match[2];

          const startDateObj = new Date(start.split("/").reverse().join("-"));
          const endDateObj = new Date(end.split("/").reverse().join("-"));
          if (!earliestDate || startDateObj < earliestDate) earliestDate = startDateObj;
          if (!latestDate || endDateObj > latestDate) latestDate = endDateObj;
        }

        pages.forEach((page, pageIdx) => {
          const table = page.tables?.[0];
          if (table?.rows?.length) {
            table.rows.forEach((row, rowIdx) => {
              allRows.push({
                row,
                fileName,
                pageIdx,
                rowIdx,
                projectName,
                startDate: start,
                endDate: end,
              });
            });
          }
        });
      }

      if (earliestDate && latestDate) {
        cachedStartDate = earliestDate.toISOString().slice(0, 10);
        cachedEndDate = latestDate.toISOString().slice(0, 10);
        setStartDate(cachedStartDate);
        setEndDate(cachedEndDate);
      }

      cachedRows = allRows;
      setMergedRows(allRows);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch files or content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFiles();
  }, []);

  const getUniqueProjects = () => {
    const projects = mergedRows.map((r) => r.projectName);
    return ["all", ...Array.from(new Set(projects))];
  };

  const getFilteredRows = () => {
    return mergedRows.filter(({ row, fileName, projectName, startDate: rowStart, endDate: rowEnd }) => {
      const matchesFile = selectedFile === "all" || fileName === selectedFile;
      const matchesProject = selectedProject === "all" || projectName === selectedProject;

      let matchesDate = true;
      if (startDate && endDate && rowStart && rowEnd) {
        const rowStartDate = new Date(rowStart.split("/").reverse().join("-"));
        const rowEndDate = new Date(rowEnd.split("/").reverse().join("-"));
        const filterStart = new Date(startDate);
        const filterEnd = new Date(endDate);

        matchesDate = rowEndDate >= filterStart && rowStartDate <= filterEnd;
      }

      const matchesSearch =
        search === "" ||
        row.some((cell) =>
          String(cell || "").toLowerCase().includes(search.toLowerCase())
        );

      return matchesFile && matchesProject && matchesDate && matchesSearch;
    });
  };

  const getColumnTotals = () => {
    const totals = [];
    const rows = getFilteredRows();
    if (!rows.length) return totals;

    const colCount = subHeaders.reduce(
      (acc, subs) => acc + (subs.length > 0 ? subs.length : 1),
      0
    );

    for (let c = 0; c < colCount; c++) {
      if (c <= 1) {
        totals[c] = "";
        continue;
      }

      let sum = 0;
      let hasNumber = false;

      rows.forEach(({ row }) => {
        const val = parseFloat(row[c - 1]);
        if (!isNaN(val)) {
          sum += val;
          hasNumber = true;
        }
      });

      totals[c] = hasNumber ? sum.toFixed(2) : "";
    }

    return totals;
  };

  const clearFilters = () => {
    setSelectedFile("all");
    setSelectedProject("all");
    setSearch("");
    fetchAllFiles();
  };

  const handleRowClick = (rowData) => {
    setSelectedRow(rowData);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedRow(null);
  };

  const safeParse = (val) => (val !== null && val !== undefined && !isNaN(parseFloat(val)) ? parseFloat(val) : 0);

  const convertHoursToDays = (hours) => (safeParse(hours) / 8).toFixed(2);

  const extractSummary = (rowData) => {
    if (!rowData) return null;
    const r = rowData.row;

    const safeParse = (val) =>
      val !== null && val !== undefined && !isNaN(parseFloat(val))
        ? parseFloat(val)
        : 0;

    // ---- DUTY (By Days) ----
    const dayWork = safeParse(r[2]); // WRK
    const absences = safeParse(r[3]); // ABS
    const leave = safeParse(r[4]); // LV
    const dayOff = safeParse(r[6]); // RES
    const lates = safeParse(r[7]); // Late
    const ut = safeParse(r[8]); // UT

    // ---- HOLIDAYS ----
    const specialHoliday = safeParse(r[17]) / 8; // SH REG hrs → days
    const legalHoliday = safeParse(r[21]) / 8;   // LH REG hrs → days

    // ---- Table 2: LOW, OT, ND, OTND ----
    const table2 = {
      LOW: [
        safeParse(r[9]), // Work REG
        safeParse(r[13]), // Day-Off REG
        safeParse(r[17]), // SH REG
        safeParse(r[21]), // LH REG
        safeParse(r[25]), // Day-Off SH REG
        safeParse(r[29])  // Day-Off LH REG
      ],
      OT: [
        safeParse(r[10]), // Work OT
        safeParse(r[14]), // Day-Off OT
        safeParse(r[18]), // SH OT
        safeParse(r[22]), // LH OT
        safeParse(r[26]), // Day-Off SH OT
        safeParse(r[30])  // Day-Off LH OT
      ],
      ND: [
        safeParse(r[11]), // Work ND
        safeParse(r[15]), // Day-Off ND
        safeParse(r[19]), // SH ND
        safeParse(r[23]), // LH ND
        safeParse(r[27]), // Day-Off SH ND
        safeParse(r[31])  // Day-Off LH ND
      ],
      OTND: [
        safeParse(r[12]), // Work OTND
        safeParse(r[16]), // Day-Off OTND
        safeParse(r[20]), // SH OTND
        safeParse(r[24]), // LH OTND
        safeParse(r[28]), // Day-Off SH OTND
        safeParse(r[32])  // Day-Off LH OTND
      ]
    };

    return {
      projectName: rowData.projectName,
      empNo: r[0],
      name: r[1],
      period: `${rowData.startDate} - ${rowData.endDate}`,
      total: dayWork + absences + leave + dayOff,
      dayWork,
      specialHoliday,
      legalHoliday,
      leave,
      absences,
      dayOff,
      lates,
      ut,
      table2,
    };
  };

  const summary = selectedRow ? extractSummary(selectedRow) : null;

  const handlePrint = useReactToPrint({
    content: () => summaryRef.current,
    documentTitle: summary
      ? `DTR-${summary.empNo}-${summary.period}`
      : "DTR-Summary",
  });

  const handleExportPDF = async () => {
    if (!summaryRef.current) return;

    const element = summaryRef.current;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(summary ? `DTR-${summary.empNo}-${summary.period}.pdf` : "DTR-Summary.pdf");
  };

  const totalPages = Math.ceil(getFilteredRows().length / rowsPerPage);

  return (
    <motion.div
      className="file-content-container"
      initial={{ opacity: 0, y: 20 }}       
      animate={{ opacity: 1, y: 0 }}        
      exit={{ opacity: 0, y: -20 }}      
      transition={{ duration: 0.7, ease: "easeInOut" }}
    >
      <div className="table-card">
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <h2 className="summary-title">Overall Employees Summary</h2>
        </div>
        <div className="filters-container">
          <label>
            File:
            <select value={selectedFile} onChange={(e) => setSelectedFile(e.target.value)}>
              <option value="all">All Files</option>
              {allFiles.map((file) => (
                <option key={file.id} value={file.file.split("/").pop()}>
                  {file.file.split("/").pop()}
                </option>
              ))}
            </select>
          </label>

          <label>
            Project:
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              {getUniqueProjects().map((proj, idx) => (
                <option key={idx} value={proj}>
                  {proj === "all" ? "All Projects" : proj}
                </option>
              ))}
            </select>
          </label>
          <label>
            From:
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            To:
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={clearFilters} className="btn-clear">
            <FiFilter style={{ marginRight: "0.5rem" }} size={18} />
            Clear Filters
          </button>

          <button
            onClick={async () => {
              cachedFiles = null;
              cachedRows = null;
              cachedStartDate = null;
              cachedEndDate = null;
              setRefreshing(true);
              await fetchAllFiles();
              setRefreshing(false);
            }}
            className="btn-refresh"
            disabled={refreshing}
          >
            <FiRefreshCw
              className={refreshing ? "refresh-icon spinning" : "refresh-icon"}
              style={{ marginRight: "0.5rem" }}
              size={20}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading employees...</p>
          </div>
        ) : (
          <>
        <div style={{ overflowX: "auto", maxHeight: "70vh" }}>
          <table className="file-content-table">
            <thead>
              <tr>
                {mainHeaders.map((h, idx) => (
                  <th key={idx} colSpan={subHeaders[idx]?.length || 1}>{h}</th>
                ))}
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
              {getPaginatedRows().map((rowData, rowIdx) => {
                const expectedCols = subHeaders.reduce(
                  (acc, subs) => acc + (subs.length > 0 ? subs.length : 1),
                  0
                );
                const trimmedRow = rowData.row.slice(0, expectedCols - 1);
                return (
                  <tr key={rowIdx} onClick={() => handleRowClick(rowData)} style={{ cursor: "pointer" }}>
                    <td>{rowData.projectName}</td>
                    {trimmedRow.map((cell, cIdx) => (
                      <td key={cIdx}>{cell}</td>
                    ))}
                  </tr>
                );
              })}
              <tr style={{ fontWeight: "bold", background: "#f0f0f0" }}>
                <td></td>
                <td>Total</td>
                {getColumnTotals().slice(2).map((total, idx) => (
                  <td key={idx}>{total}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="pagination-control">
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            ◀ Prev
          </button>

          <span className="pagination-info">
            Page {currentPage} of {totalPages || 1}
          </span>

          <button
            className="pagination-btn"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          >
            Next ▶
          </button>

          <select
            className="pagination-select"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={25}>Show 25</option>
            <option value={50}>Show 50</option>
            <option value={100}>Show 100</option>
          </select>
        </div>
        </>
        )}
      </div>
      {/* Modal */}
      {modalOpen && selectedRow && (
        <div
          className="modal-overlay2"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="modal-wrapper2">
            {/* Left: Summary Card */}
            <div className="summary-card" ref={summaryRef}>
              {summary ? (
                <>
                  <h3 className="summary-title">
                    Daily Time Record for the period of ({summary.period})
                  </h3>
                  <p className="project-name">{summary.projectName || "-"}</p>
                  <p className="emp-info">
                    Emp. No: <span className="red">{summary.empNo || "-"}</span>
                    &nbsp;&nbsp; Employee Name:{" "}
                    <span className="blue">{summary.name || "-"}</span>
                  </p>

                  <table className="summary-table">
                    <tbody>
                      <tr className="summary-table-total">
                        <td colSpan={2}>Total</td>
                      </tr>
                      {[
                        ["Day Work", summary.dayWork],
                        ["Special Holiday", summary.specialHoliday],
                        ["Legal Holiday", summary.legalHoliday],
                        ["Leave", summary.leave],
                        ["Absences", summary.absences],
                        ["Day-Off", summary.dayOff],
                        ["Lates", summary.lates],
                        ["UT", summary.ut],
                      ].map(([label, value], idx) => (
                        <tr key={idx}>
                          <td>{label}</td>
                          <td style={{ textAlign: "right" }}>
                            {isNaN(value) ? "0.00" : parseFloat(value).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <table className="summary-table">
                    <thead>
                      <tr>
                        <th></th>
                        {["REG", "OFF", "SHP", "LHP", "SHP/OFF", "LHP/OFF"].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {["LOW", "OT", "ND", "OTND"].map((key) => (
                        <tr key={key}>
                          <td style={{ fontWeight: "bold" }}>{key}</td>
                          {summary.table2[key].map((val, idx) => (
                            <td key={idx}>{isNaN(val) ? "0.00" : parseFloat(val).toFixed(2)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p style={{ textAlign: "center", color: "#e74c3c" }}>
                  Summary data not available
                </p>
              )}
            </div>

            {/* Right: Export / Legend */}
            <div className="right-side">
              <div className="export-card">
                <h3>Export & Print</h3>
                <button className="export-btn print" onClick={handlePrint}>🖨️ Print</button>
                <button className="export-btn export" onClick={handleExportPDF}>📤 Export</button>
              </div>
              <div className="legend-card">
                <h3>Legend</h3>
                <ul>
                  <li><b>LOW</b> - Length of Work</li>
                  <li><b>OT</b> - Over Time</li>
                  <li><b>UT</b> - Under Time</li>
                  <li><b>LT</b> - Lates</li>
                  <li><b>ND</b> - Night Differential</li>
                  <li><b>WD</b> - Whole Day</li>
                  <li><b>HD</b> - Half Day</li>
                  <li><b>HDL</b> - Half Day Leave</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}