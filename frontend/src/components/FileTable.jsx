import { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/FileTable.css";

export default function FileTable({ role, setSelectedFile }) {
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState({});
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  const [search, setSearch] = useState(""); // text search
  const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD, YYYY-MM, or YYYY

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
      setFiles(fileList);
      setFilteredFiles(fileList);
      setNextPage(res.data.next);
      setPrevPage(res.data.previous);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Apply filters locally
  useEffect(() => {
    let tempFiles = [...files];

    // Text search
    if (search) {
      tempFiles = tempFiles.filter((file) => {
        const name = file.file.split("/").pop().toLowerCase();
        const owner = (file.owner || "").toLowerCase();
        const status = (file.status || "").toLowerCase();
        const query = search.toLowerCase();
        return name.includes(query) || owner.includes(query) || status.includes(query);
      });
    }

    // Date filter using date picker
    if (dateFilter) {
      if (startDate) {
        tempFiles = tempFiles.filter((file) => new Date(file.uploaded_at) >= new Date(startDate));
      }
      if (endDate) {
        tempFiles = tempFiles.filter((file) => new Date(file.uploaded_at) <= new Date(endDate));
      }
    }

    setFilteredFiles(tempFiles);
  }, [search, dateFilter, files]);

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
      toast.success("Status updated successfully");
      fetchFiles();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  if (loading) return <p>Loading files...</p>;

  return (
    <div className="file-table-container">
      {/* Filters */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {/* Text Search */}
        <input
          type="text"
          placeholder="Search by file, owner, status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "0.4rem", width: "250px" }}
        />

        {/* Date Range */}
        <label>
          From: 
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: "0.4rem" }}
          />
        </label>
        <label>
          To: 
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: "0.4rem" }}
          />
        </label>
      </div>

      {/* Table */}
      <table className="file-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Owner</th>
            <th>File</th>
            <th>Uploaded At</th>
            <th>Status</th>
            {(role === "admin" || role === "client") && <th>Actions</th>}
            {(role === "admin" || role === "viewer") && <th>View</th>}
          </tr>
        </thead>
        <tbody>
          {filteredFiles.map((file) => (
            <tr key={file.id}>
              <td>{file.id}</td>
              <td>{file.owner}</td>
              <td>{file.file.split("/").pop()}</td>
              <td>{new Date(file.uploaded_at).toLocaleString()}</td>
              <td>
                {(role === "admin" || role === "viewer") ? (
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
              {(role === "admin" || role === "client") && (
                <td>
                  <button
                    className="action-btn download"
                    onClick={() => handleDownload(file.id, file.file.split("/").pop())}
                    disabled={downloadLoading[file.id]}
                  >
                    {downloadLoading[file.id] ? "Downloading..." : "Download"}
                  </button>
                </td>
              )}
              {(role === "admin" || role === "viewer") && (
                <td>
                  <button
                    className="action-btn view"
                    onClick={() =>
                      setSelectedFile({
                        id: file.id,
                        name: file.file.split("/").pop(),
                      })
                    }
                  >
                    View Content
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button onClick={() => fetchFiles(prevPage)} disabled={!prevPage}>
          Previous
        </button>
        <button onClick={() => fetchFiles(nextPage)} disabled={!nextPage}>
          Next
        </button>
      </div>
    </div>
  );
}
