// components/FileUpload.jsx
import { useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/ClientDashboard.css"; 
import { motion } from "framer-motion";

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
          Authorization: `Bearer ${token}`,
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
    <motion.div
      className="upload-card"
      initial={{ opacity: 0, y: 20 }}       
      animate={{ opacity: 1, y: 0 }}        
      exit={{ opacity: 0, y: -20 }}         
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <h2 className="upload-title">Upload a File</h2>
      <form onSubmit={handleUpload} className="upload-form">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="file-input"
        />
        <button
          type="submit"
          disabled={uploading}
          className="upload-button"
        >
          {uploading ? "Uploading..." : "Upload / Overwrite"}
        </button>
      </form>
      {file && <p className="selected-file">📂 {file.name}</p>}
    </motion.div>
  );
}