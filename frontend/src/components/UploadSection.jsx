// components/UploadSection.jsx
import FileUpload from "./FileUpload";
import DTRUpload from "./DTRUpload";
import "./styles/UploadSection.css";

export default function UploadSection({ refreshFiles, refreshDTR }) {
  return (
    <div className="upload-section">
      <FileUpload refreshFiles={refreshFiles} />
      <DTRUpload refreshDTR={refreshDTR} />
    </div>
  );
}
