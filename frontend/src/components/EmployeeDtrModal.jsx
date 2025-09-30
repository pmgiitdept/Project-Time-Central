import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api";
import { toast } from "react-toastify";

export default function EmployeeDtrModal({ 
  employee, 
  startDate, 
  endDate, 
  isOpen, 
  onClose, 
  columns, 
  hiddenColumns 
}) {
  const [dtrRecords, setDtrRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee || !isOpen) return;

    const fetchDtr = async () => {
      setLoading(true);
      try {
        const params = { employee_code: employee.employee_code };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const res = await api.get("/dtr/employee/", { params });
        setDtrRecords(res.data.results || []);
      } catch (err) {
        toast.error("Failed to fetch DTR records");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDtr();
  }, [employee, isOpen, startDate, endDate]);

  if (!isOpen || !employee) return null;

  // Compute totals
  const numericCols = columns.map(col => col.key).slice(2); // Skip first 2 for totals label
  const totals = numericCols.map(col => {
    const sum = dtrRecords.reduce((acc, rec) => {
      const val = parseFloat(rec[col]);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    return isNaN(sum) ? "" : sum.toFixed(2);
  });

  return (
    <motion.div
      className="dtr-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="dtr-modal-content">
        <h2>DTR for {employee.employee_name}</h2>
        <button className="close-btn" onClick={onClose}>X</button>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="dtr-table">
            <thead>
              <tr>
                {columns.map(col => 
                  hiddenColumns.includes(col.key) ? null : <th key={col.key}>{col.label}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {dtrRecords.map((rec, idx) => (
                <tr key={idx}>
                  {columns.map(col => 
                    hiddenColumns.includes(col.key) ? null : <td key={col.key}>{rec[col.key]}</td>
                  )}
                </tr>
              ))}
              {dtrRecords.length > 0 && (
                <tr style={{ fontWeight: "bold", background: "#eee" }}>
                  {columns.map((col, idx) => {
                    if (idx < 2) return <td key={col.key}>{idx === 1 ? "Total" : ""}</td>;
                    if (hiddenColumns.includes(col.key)) return null;
                    return <td key={col.key}>{totals[idx - 2]}</td>;
                  })}
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}
