// components/FileTable.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";

export default function FileTable({ role, setSelectedFileId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState({});
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  // Fetch files from backend
  const fetchFiles = async (url = "files/") => {
    setLoading(true);
    try {
        const token = localStorage.getItem("access_token");
        if (role === "client") {
        const username = localStorage.getItem("username");
        url += `?owner=${username}`;
        }

        const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
        
        setFiles(res.data.results || res.data);
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

  // Download a file
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

  // Update file status (admin & viewer)
  const handleStatusChange = async (fileId, newStatus) => {
    try {
        const token = localStorage.getItem("access_token");
        await api.patch(
        `files/${fileId}/status/`, // <-- use the /status/ endpoint
        { status: newStatus },
        {
            headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            },
        }
        );
        toast.success("Status updated successfully");
        fetchFiles(); // refresh the table
    } catch (err) {
        console.error(err);
        toast.error("Failed to update status");
    }
    };

  if (loading) return <p>Loading files...</p>;

  return (
    <div style={{ marginTop: "1rem" }}>
      <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Owner</th>
            <th>File</th>
            <th>Uploaded At</th>
            <th>Status</th>
            {(role === "admin" || role === "client") && <th>Actions</th>}
            {role === "viewer" && <th>View</th>}
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
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
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                ) : (
                  <span
                    style={{
                      padding: "0.2rem 0.5rem",
                      borderRadius: "5px",
                      backgroundColor:
                        file.status === "pending"
                          ? "#f0ad4e"
                          : file.status === "verified"
                          ? "#5cb85c"
                          : "#d9534f",
                      color: "#fff",
                    }}
                  >
                    {file.status}
                  </span>
                )}
              </td>
              {(role === "admin" || role === "client") && (
                <td>
                  <button
                    onClick={() =>
                      handleDownload(file.id, file.file.split("/").pop())
                    }
                    disabled={downloadLoading[file.id]}
                  >
                    {downloadLoading[file.id] ? "Downloading..." : "Download"}
                  </button>
                </td>
              )}
              {role === "viewer" && (
                <td>
                  <button onClick={() => setSelectedFileId(file.id)}>
                    View Content
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "1rem" }}>
        {loading ? <p>Loading files...</p> : (
            <>
            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => fetchFiles(prevPage)} disabled={!prevPage}>Previous</button>
                <button onClick={() => fetchFiles(nextPage)} disabled={!nextPage}>Next</button>
            </div>
            </>
        )}
        </div>
    </div>
  );
}
