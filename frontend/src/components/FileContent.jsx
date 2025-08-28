// components/FileContent.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";

export default function FileContent({ fileId }) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`files/${fileId}/content/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContent(res.data.content || []);
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

  if (loading) return <p>Loading file content...</p>;
  if (!content.length) return <p>No data available</p>;

  return (
    <div style={{ maxHeight: "400px", overflow: "auto", marginTop: "1rem" }}>
      <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ position: "sticky", top: 0, backgroundColor: "#f0f0f0" }}>
          <tr>
            {content[0].map((header, idx) => (
              <th key={idx} style={{ padding: "0.3rem" }}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.slice(1).map((row, idx) => (
            <tr key={idx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} style={{ padding: "0.3rem" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
