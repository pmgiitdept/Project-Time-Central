// components/FileUpload.jsx
import { useState } from "react";
import api from "../api";
import { toast } from "react-toastify";

export default function FileUpload({ refreshFiles }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Select a file first.");

    setUploading(true);
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("files/", formData, {
        headers: {
          Authorization: `Bearer ${token}`, // only include Authorization
        },
      });
      toast.success("File uploaded successfully!");
      setFile(null);
      refreshFiles();
    } catch (err) {
      console.error(err);
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} style={{ marginBottom: "1rem" }}>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button type="submit" disabled={uploading}>
        {uploading ? "Uploading..." : "Upload / Overwrite"}
      </button>
      {file && <p>Selected file: {file.name}</p>}
    </form>
  );
}
