/* components/DTRTable.jsx */
import { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/DTRTable.css";

export default function DTRTable() {
  const [dtrFiles, setDtrFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileContents, setFileContents] = useState([]);
  const [dateColumns, setDateColumns] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    const saved = localStorage.getItem("hiddenColumns");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const fetchDTRFiles = async () => {
      try {
        const res = await api.get("/dtr/files/");
        setDtrFiles(res.data.results || res.data);
      } catch (err) {
        console.error("Failed to fetch DTR files:", err);
      }
    };
    fetchDTRFiles();
  }, []);

  useEffect(() => {
    localStorage.setItem("hiddenColumns", JSON.stringify(hiddenColumns));
  }, [hiddenColumns]);

  const handleViewFile = async () => {
    if (!selectedFile) {
      toast.warn("Please select a file first!");
      return;
    }
    try {
      const res = await api.get(`/dtr/files/${selectedFile}/content/`);
      setFileContents(res.data.rows || []);

      if (res.data.rows?.length > 0) {
        const sample = res.data.rows[0].daily_data || {};
        setDateColumns(Object.keys(sample));
      }
    } catch (err) {
      toast.error("Failed to load file content.");
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
    });
  };

  const toggleColumn = (col) => {
    setHiddenColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const staticColumns = [
    { key: "full_name", label: "Full Name" },
    { key: "employee_no", label: "Employee #" },
    { key: "area", label: "Area" },
  ];

  const extraColumns = [
    { key: "total_days", label: "Total Days" },
    { key: "total_hours", label: "Total Hours" },
    { key: "regular_ot", label: "OT" },
    { key: "legal_holiday", label: "Legal Holiday" },
    { key: "unworked_reg_holiday", label: "Unworked Reg Holiday" },
    { key: "special_holiday", label: "Special Holiday" },
    { key: "night_diff", label: "Night Diff" },
    { key: "undertime_minutes", label: "Undertime" },
  ];

  return (
    <div className="dtr-dashboard">
      <h2 className="dtr-title">Summary Forms</h2>

      {/* File Selector UI */}
      <div className="file-selector">
        <label htmlFor="fileDropdown" className="file-label">
          Choose a DTR File:
        </label>
        <div className="file-actions">
          <select
            id="fileDropdown"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="file-dropdown"
          >
            <option value="">-- Select a file --</option>
            {dtrFiles.map((file) => (
              <option key={file.id} value={file.id}>
                {file.filename}
              </option>
            ))}
          </select>
          <button className="view-btn" onClick={handleViewFile}>
            📂 View
          </button>
        </div>
      </div>

      {/* Hide Columns Button */}
      {selectedFile && fileContents.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <button
            className="view-btn"
            style={{ background: "#ff8800" }}
            onClick={() => setIsModalOpen(true)}
          >
            Hide Columns
          </button>
        </div>
      )}

      {/* File Content Table */}
      {fileContents.length > 0 && (
        <div className="dtr-file-content">
          <h3 className="content-title">Summary Forms</h3>
          <div className="table-container">
            <table className="dtr-table">
              <thead>
                <tr>
                  {staticColumns.map(
                    (col, idx) =>
                      !hiddenColumns.includes(col.key) && (
                        <th
                          key={col.key}
                          className={`sticky-col sticky-${idx + 1}`}
                        >
                          {col.label}
                        </th>
                      )
                  )}
                  {dateColumns.map(
                    (date) =>
                      !hiddenColumns.includes(date) && (
                        <th key={date}>{formatDate(date)}</th>
                      )
                  )}
                  {extraColumns.map(
                    (col) =>
                      !hiddenColumns.includes(col.key) && (
                        <th key={col.key}>{col.label}</th>
                      )
                  )}
                </tr>
              </thead>
              <tbody>
                {fileContents.map((row) => (
                  <tr key={row.id}>
                    {!hiddenColumns.includes("full_name") && (
                      <td className="sticky-col sticky-1">{row.full_name}</td>
                    )}
                    {!hiddenColumns.includes("employee_no") && (
                      <td className="sticky-col sticky-2">{row.employee_no}</td>
                    )}
                    {!hiddenColumns.includes("area") && (
                      <td className="sticky-col sticky-3">{row.area}</td>
                    )}

                    {dateColumns.map(
                      (date) =>
                        !hiddenColumns.includes(date) && (
                          <td key={date}>{row.daily_data?.[date] ?? ""}</td>
                        )
                    )}

                    {extraColumns.map(
                      (col) =>
                        !hiddenColumns.includes(col.key) && (
                          <td key={col.key}>{row[col.key]}</td>
                        )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay1">
          <div className="modal-content1">
            <h3>Select Columns to Hide</h3>
            <div className="modal-columns">
              {[
                ...staticColumns,
                ...dateColumns.map((d) => ({ key: d, label: formatDate(d) })),
                ...extraColumns,
              ].map((col) => (
                <label
                  key={col.key}
                  style={{ display: "block", margin: "4px 0" }}
                >
                  <input
                    type="checkbox"
                    checked={hiddenColumns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setHiddenColumns([])}
                className="reset-btn"
              >
                Reset Columns
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="view-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
