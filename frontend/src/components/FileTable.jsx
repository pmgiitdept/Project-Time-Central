/* components/FileTable.jsx */
import { FaSyncAlt } from "react-icons/fa";
import { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import FileContent from "./FileContent";
import "./styles/FileTable.css";

export default function FileTable({ role, setSelectedFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState({});
  const [deleting, setDeleting] = useState({});
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [highlightedFiles, setHighlightedFiles] = useState([]);
  const [collapsed, setCollapsed] = useState({
    verified: false,
    pending: false,
    rejected: false,
  });

  const [selectedFileId, setSelectedFileId] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const [notifiedFiles, setNotifiedFiles] = useState([]);

  const fetchFiles = async (url = "files/") => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (role === "client") {
        const username = localStorage.getItem("username");
        url += `?owner=${username}`;
      }
      const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
      const fileList = res.data.results || res.data;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newTodayFiles = fileList.filter(file => {
        const fileDate = new Date(file.uploaded_at);
        fileDate.setHours(0, 0, 0, 0);
        return fileDate.getTime() === today.getTime();
      });

      const unnotifiedFiles = newTodayFiles.filter(f => !notifiedFiles.includes(f.id));
      const unnotifiedFileIds = unnotifiedFiles.map(f => f.id);

      const newTodayFileIds = newTodayFiles.map(f => f.id);
      setHighlightedFiles(newTodayFileIds);
      setFiles(fileList);
      setNextPage(res.data.next);
      setPrevPage(res.data.previous);

      if (unnotifiedFileIds.length) {
        const fileNames = unnotifiedFiles.map(f => f.file.split("/").pop()).join(", ");
        toast.success(`${unnotifiedFileIds.length} new file(s) uploaded today: ${fileNames}`);

        setNotifiedFiles(prev => [...prev, ...unnotifiedFileIds]);
        setTimeout(() => setHighlightedFiles([]), 3000);
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch files");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredFiles = (status) => {
    return files
      .filter((file) => file.status === status)
      .filter((file) => {
        const name = (file.file?.split("/").pop() || "").toLowerCase();
        const owner = (file.owner || "").toLowerCase();
        const query = search.toLowerCase();
        const matchesSearch = name.includes(query) || owner.includes(query);

        const fileDate = new Date(file.uploaded_at).setHours(0,0,0,0);
        const matchesStartDate = startDate ? fileDate >= new Date(startDate).setHours(0,0,0,0) : true;
        const matchesEndDate = endDate ? fileDate <= new Date(endDate).setHours(0,0,0,0) : true;

        return matchesSearch && matchesStartDate && matchesEndDate;
      });
  };

  const handleDownload = async (fileId, fileName) => {
    setDownloadLoading((prev) => ({ ...prev, [fileId]: true }));
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`files/${fileId}/download/`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      toast.success(`Downloaded ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error("Download failed or no permission");
    } finally {
      setDownloadLoading((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handleStatusChange = async (fileId, newStatus) => {
    try {
      const token = localStorage.getItem("access_token");
      await api.patch(
        `files/${fileId}/status/`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, status: newStatus } : file
        )
      );

      toast.success("Status updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    setDeleting((prev) => ({ ...prev, [fileId]: true }));
    try {
      const token = localStorage.getItem("access_token");
      await api.delete(`files/${fileId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
      setSelectedFiles((prev) => prev.filter((id) => id !== fileId));

      toast.success("File deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete file");
    } finally {
      setDeleting((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const toggleCollapse = (status) => {
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  if (loading) return <p>Loading files...</p>;

  const statuses = ["verified", "pending", "rejected"];

  return (
    <div className="file-table-wrapper">
      {/* Left Side: FileTable */}
      <div className="file-table-left">
        <div className="table-header">
          <h2 className="table-section-title">Files Dashboard</h2>
          <button
            className="refresh-btn"
            onClick={() => fetchFiles()}
            disabled={loading}
            title="Refresh"
          >
            <FaSyncAlt className={loading ? "spin" : ""} />
          </button>
        </div>
        {/* Filters */}
        <div className="filters">
          <div className="filter-item">
            <label>Search:</label>
            <input
              type="text"
              placeholder="File name or owner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-item date-range">
            <label>Date Range:</label>
            <div className="date-inputs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tables by Status */}
        {statuses.map((status) => {
          const filtered = getFilteredFiles(status);
          if (filtered.length === 0) return null;

          return (
            <div key={status} className="status-table-section">
              <h3 onClick={() => toggleCollapse(status)} className="status-header">
                {status.charAt(0).toUpperCase() + status.slice(1)} Files ({filtered.length})
                <span className="collapse-arrow">{collapsed[status] ? "▼" : "▲"}</span>
              </h3>
              <div
                className="table-collapse-wrapper"
                style={{
                  height: collapsed[status] ? 0 : "300px",
                  transition: "height 0.3s ease",
                  overflow: "hidden",
                  overflowX: "auto"
                }}
              >
              {selectedFiles.length > 0 && role === "admin" && (
                <div style={{ marginBottom: "1rem" }}>
                  <button
                    className="action-btn delete"
                    onClick={async () => {
                      if (!window.confirm(`Are you sure you want to delete ${selectedFiles.length} files?`)) return;
                      try {
                        const token = localStorage.getItem("access_token");
                        await Promise.all(
                          selectedFiles.map((fileId) =>
                            api.delete(`files/${fileId}/`, { headers: { Authorization: `Bearer ${token}` } })
                          )
                        );
                        toast.success(`${selectedFiles.length} file(s) deleted successfully`);
                        setSelectedFiles([]);
                        fetchFiles();
                      } catch (err) {
                        console.error(err);
                        toast.error("Failed to delete some files");
                      }
                    }}
                  >
                    Delete Selected
                  </button>
                </div>
              )}

                <div className="table-scroll-container">
                  <table className="file-table">
                    <thead>
                      <tr>
                        {role === "admin" && (
                        <th>
                          <input
                            type="checkbox"
                            checked={selectedFiles.length === filtered.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFiles(filtered.map((file) => file.id));
                              } else {
                                setSelectedFiles([]);
                              }
                            }}
                          />
                        </th>
                        )}
                        <th>ID</th>
                        <th>Owner</th>
                        <th>File</th>
                        <th>Uploaded At</th>
                        <th>Status</th>
                        {role === "admin" && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((file) => (
                        <tr
                          key={file.id}
                          className={`clickable-row ${selectedFileId === file.id ? "selected" : ""} ${highlightedFiles.includes(file.id) ? "highlighted" : ""}`}
                          onClick={(e) => {
                            if (
                              e.target.tagName === "INPUT" ||
                              e.target.tagName === "BUTTON" ||
                              e.target.closest(".action-btn")
                            ) return;

                            setSelectedFileId(file.id);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {role === "admin" && (
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedFiles.includes(file.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFiles([...selectedFiles, file.id]);
                                  } else {
                                    setSelectedFiles(selectedFiles.filter((id) => id !== file.id));
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                          )}
                          <td>{file.id}</td>
                          <td>{file.owner}</td>
                          <td
                            style={{ color: "#007bff", cursor: "pointer" }}
                            onClick={() => setSelectedFileId(file.id)}
                          >
                            {file.file.split("/").pop()}
                          </td>
                          <td>{new Date(file.uploaded_at).toLocaleString()}</td>
                          <td>
                            {role === "admin" ? (
                              <select
                                value={file.status}
                                onChange={(e) => handleStatusChange(file.id, e.target.value)}
                                className={`status-select ${file.status}`}
                              >
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            ) : (
                              <span className={`status-badge status-${file.status}`}>
                                {file.status}
                              </span>
                            )}
                          </td>
                          {role === "admin" && (
                            <td>
                              <button
                                className="action-btn download"
                                onClick={(e) => {
                                  e.stopPropagation(); 
                                  handleDownload(file.id, file.file.split("/").pop());
                                }}
                                disabled={downloadLoading[file.id]}
                              >
                                {downloadLoading[file.id] ? "Downloading..." : "Download"}
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(file.id);
                                }}
                                disabled={deleting[file.id]}
                                style={{ flex: 1 }}
                              >
                                {deleting[file.id] ? "Deleting..." : "Delete"}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
        {/* Pagination 
        <div className="pagination">
          <button onClick={() => fetchFiles(prevPage)} disabled={!prevPage}>
            Previous
          </button>
          <button onClick={() => fetchFiles(nextPage)} disabled={!nextPage}>
            Next
          </button>
        </div>*/}
      </div>
      {/* Right Side: FileContent */}
      <div className="file-content-right">
        <h2 className="table-section-title">DTR Contents Dashboard</h2>
        {selectedFileId ? (
          <FileContent
            fileId={selectedFileId}
            role={role}
            onStatusChange={(newStatus) => {
              setFiles(prevFiles =>
                prevFiles.map(f =>
                  f.id === selectedFileId ? { ...f, status: newStatus } : f
                )
              );
            }}
          />
        ) : (
          <p style={{ textAlign: "center", marginTop: "2rem" }}>
            Select a file to view its content here.
          </p>
        )}
      </div>
    </div>
  );
}