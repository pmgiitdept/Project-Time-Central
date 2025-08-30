// components/FileContent.jsx
import { useEffect, useState, useRef } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/FileContent.css";

export default function FileContent({ fileId, role }) {
  const isEditable = role === "admin"; // only admin can edit/save
  const [content, setContent] = useState([]);
  const [originalContent, setOriginalContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);

  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 20;

  const tableContainerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const [visibleColumnStart, setVisibleColumnStart] = useState(0);
  const maxVisibleColumns = 6; 

  const fetchContent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`files/${fileId}/content/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fetchedContent = Array.isArray(res.data.content)
        ? res.data.content
        : [];

      setContent(fetchedContent);
      setOriginalContent(fetchedContent);
      setCurrentPage(0);

      if (fetchedContent.length > 0) {
        setColumnFilters(fetchedContent[0].map(() => ""));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch file content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fileId) fetchContent();
  }, [fileId]);

  const handleCellChange = (rowIdx, colIdx, value) => {
    const updated = [...content];
    updated[rowIdx][colIdx] = value;
    setContent(updated);
  };

  const handleUndoRow = (rowIdx) => {
    if (!originalContent[rowIdx]) return;
    const updated = [...content];
    updated[rowIdx] = [...originalContent[rowIdx]];
    setContent(updated);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await api.patch(
        `files/${fileId}/update-content/`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Changes saved successfully!");
      setOriginalContent([...content]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    }
  };

  const handleColumnFilterChange = (colIdx, value) => {
    const newFilters = [...columnFilters];
    newFilters[colIdx] = value;
    setColumnFilters(newFilters);
    setCurrentPage(0);
  };

  if (loading) return <p>Loading file content...</p>;
  if (!content.length) return <p>No data available</p>;

  const filteredRows = content
    .slice(1)
    .filter((row) =>
      row.every((cell, idx) =>
        String(cell || "")
          .toLowerCase()
          .includes((columnFilters[idx] || "").toLowerCase())
      ) &&
      row.some((cell) =>
        String(cell || "").toLowerCase().includes(search.toLowerCase())
      )
    );

  const pageCount = Math.ceil(filteredRows.length / rowsPerPage);
  const paginatedRows = filteredRows.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );

  const visibleColumns = content[0].slice(
    visibleColumnStart,
    visibleColumnStart + maxVisibleColumns
  );

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

  const handleProgressChange = (e) => {
    const value = parseFloat(e.target.value);
    const container = tableContainerRef.current;
    if (container) {
      const scrollWidth = container.scrollWidth - container.clientWidth;
      container.scrollLeft = (value / 100) * scrollWidth;
      setScrollProgress(value);
    }
  };

  return (
    <div className="file-content-container">
  {/* Global Search */}
  <input
    type="text"
    placeholder="Search..."
    value={search}
    onChange={(e) => {
      setSearch(e.target.value);
      setCurrentPage(0);
    }}
    style={{ marginBottom: "0.5rem", padding: "0.3rem", width: "200px" }}
  />

  {/* Column navigation */}
  {content[0].length > maxVisibleColumns && (
    <div style={{ marginBottom: "0.5rem" }}>
      <button
        onClick={() =>
          setVisibleColumnStart((s) => Math.max(s - maxVisibleColumns, 0))
        }
        disabled={visibleColumnStart === 0}
      >
        ◀ Prev Columns
      </button>
      <button
        onClick={() =>
          setVisibleColumnStart((s) =>
            Math.min(
              s + maxVisibleColumns,
              content[0].length - maxVisibleColumns
            )
          )
        }
        disabled={visibleColumnStart + maxVisibleColumns >= content[0].length}
        style={{ marginLeft: "0.5rem" }}
      >
        Next Columns ▶
      </button>
    </div>
  )}

  {/* Table */}
  <div
    ref={tableContainerRef}
    style={{
      maxHeight: "400px",
      overflowX: "auto",
      overflowY: "auto",
      whiteSpace: "nowrap",
    }}
  >
    <table className="file-content-table">
      <thead>
        <tr>
          {visibleColumns.map((header, idx) => (
            <th key={idx}>{header}</th>
          ))}
          <th>Actions</th>
        </tr>
        <tr>
          {visibleColumns.map((_, idx) => (
            <th key={idx}>
              <input
                type="text"
                value={columnFilters[visibleColumnStart + idx] || ""}
                onChange={(e) =>
                  handleColumnFilterChange(visibleColumnStart + idx, e.target.value)
                }
                placeholder="Filter..."
                readOnly={!isEditable}
              />
            </th>
          ))}
          <th></th>
        </tr>
      </thead>
      <tbody>
        {paginatedRows.map((row, rowIdx) => {
          const actualRowIdx = content.indexOf(row);
          return (
            <tr key={actualRowIdx}>
              {row
                .slice(visibleColumnStart, visibleColumnStart + maxVisibleColumns)
                .map((cell, cIdx) => {
                  const cellValue = String(cell || "");
                  const original =
                    originalContent[actualRowIdx]?.[visibleColumnStart + cIdx] ?? "";
                  const highlight =
                    search &&
                    cellValue.toLowerCase().includes(search.toLowerCase());
                  const changed = cellValue !== String(original);

                  return (
                    <td
                      key={cIdx}
                      style={{
                        backgroundColor: highlight
                          ? "#fff59d"
                          : changed
                          ? "#ffe0b2"
                          : "transparent",
                      }}
                    >
                      <input
                        type="text"
                        value={cellValue}
                        onChange={(e) =>
                          handleCellChange(actualRowIdx, visibleColumnStart + cIdx, e.target.value)
                        }
                        readOnly={!isEditable}
                        style={{
                          width: "100%",
                          border: isEditable ? "none" : "transparent",
                          backgroundColor: isEditable ? "transparent" : "#f5f5f5",
                          padding: "2px",
                        }}
                      />
                    </td>
                  );
                })}
              <td>
                <button
                  className="undo-btn"
                  onClick={() => handleUndoRow(actualRowIdx)}
                >
                  Undo Row
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>

  {/* Pagination */}
  {pageCount > 1 && (
    <div className="file-content-pagination">
      <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))} disabled={currentPage === 0}>
        Previous
      </button>
      <span>
        Page {currentPage + 1} of {pageCount}
      </span>
      <button onClick={() => setCurrentPage((p) => Math.min(p + 1, pageCount - 1))} disabled={currentPage === pageCount - 1}>
        Next
      </button>
    </div>
  )}

  {/* Save */}
  {isEditable && (
    <div className="text-right">
      <button className="save-btn" onClick={handleSave}>
        💾 Save Changes
      </button>
    </div>
  )}
</div>
  );
}