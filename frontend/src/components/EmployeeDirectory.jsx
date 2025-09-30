/* components/EmployeeDirectory.jsx */
import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "../api";
import { toast } from "react-toastify";
import { FaSearch } from "react-icons/fa";
import "./styles/EmployeeDirectory.css";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import EmployeeDtrModal from "./EmployeeDtrModal";

// ---------------- AddEmployee component ----------------
const AddEmployee = React.memo(({ onAdded }) => {
  const [employee, setEmployee] = useState({ employee_code: "", employee_name: "" });

  const handleAdd = async () => {
    if (!employee.employee_code || !employee.employee_name) {
      return toast.error("Employee code and name are required!");
    }
    try {
      const res = await api.post("/add-employee/", employee);
      toast.success(res.data.detail);
      setEmployee({ employee_code: "", employee_name: "" });
      onAdded(); 
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add employee");
    }
  };

  return (
    <div className="employee-add-floating">
      <h2 className="employee-add-title">Add Employee</h2>
      <input
        type="text"
        placeholder="Employee Code"
        value={employee.employee_code}
        onChange={(e) => setEmployee({ ...employee, employee_code: e.target.value })}
      />
      <input
        type="text"
        placeholder="Employee Name"
        value={employee.employee_name}
        onChange={(e) => setEmployee({ ...employee, employee_name: e.target.value })}
      />
      <button onClick={handleAdd}>Save</button>
    </div>
  );
});

// ---------------- DeleteEmployee component ----------------
const DeleteEmployee = React.memo(({ employees, onDeleted }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmingCode, setConfirmingCode] = useState(null);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return []; // 🔑 show nothing until search
    const lower = searchTerm.toLowerCase().trim();
    return employees.filter(
      (emp) =>
        emp.employee_code.toLowerCase().includes(lower) ||
        emp.employee_name.toLowerCase().includes(lower)
    );
  }, [employees, searchTerm]);

  const handleDelete = async (employee_code) => {
    try {
      await api.delete(`/delete-employee/${employee_code}/`);
      onDeleted(employee_code);
      alert("✅ Employee deleted successfully!");
    } catch (err) {
      alert(err.response?.data?.detail || "❌ Failed to delete employee");
    } finally {
      setConfirmingCode(null);
    }
  };

  return (
    <div className="employee-add-floating">
      <h2 className="employee-add-title">Delete Employee</h2>
      <input
        type="text"
        placeholder="Search by code or name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: "100%",
          marginBottom: "0.5rem",
          padding: "0.4rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      />
      <div
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "0.5rem",
        }}
      >
        {filteredEmployees.length === 0 ? (
          <p>{searchTerm ? "No employees found" : "Search to find an employee"}</p>
        ) : (
          filteredEmployees.map((emp) => (
            <div
              key={emp.employee_code || `${emp.employee_name}-${Math.random()}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.25rem 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <span>
                {emp.employee_code} - {emp.employee_name}
              </span>
              <button
                style={{
                  backgroundColor: "#e74c3c",
                  color: "white",
                  border: "none",
                  padding: "0.25rem 0.5rem",
                  cursor: "pointer",
                  borderRadius: "4px",
                }}
                onClick={() => handleDelete(emp.employee_code)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

// ---------------- EmployeeRow component (row-level editable) ----------------
const EmployeeRow = React.memo(({ emp, columns, hiddenColumns, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [rowData, setRowData] = useState(emp);

  const handleChange = (key, value) => {
    setRowData({ ...rowData, [key]: value });
  };

  const handleSave = async () => {
    try {
      await onSave(rowData); 
      setEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const numericCols = [
    "total_hours", "nd_reg_hrs", "absences", "tardiness", "undertime",
    "ot_regular", "nd_ot_reg", "ot_restday", "nd_restday", "ot_rest_excess",
    "nd_rest_excess", "ot_special_hday", "nd_special_hday", "ot_shday_excess",
    "nd_shday_excess", "ot_legal_holiday", "special_holiday", "ot_leghol_excess",
    "nd_leghol_excess", "ot_sh_on_rest", "nd_sh_on_rest", "ot_sh_on_rest_excess",
    "nd_sh_on_rest_excess", "leg_h_on_rest_day", "nd_leg_h_on_restday",
    "ot_leg_h_on_rest_excess", "nd_leg_h_on_rest_excess", "vacleave_applied",
    "sickleave_applied", "back_pay_vl", "back_pay_sl", "ot_regular_excess",
    "nd_ot_reg_excess", "legal_holiday", "nd_legal_holiday", "overnight_rate",
  ];

  return (
    <tr className={editing ? "editing-row" : ""}>
      {columns.map((col) => {
        if (hiddenColumns.includes(col.key)) return null;

        let displayValue;

        if (editing) {
          displayValue = (
            <input
              value={rowData[col.key] ?? ""}
              onChange={(e) => handleChange(col.key, e.target.value)}
              style={{ width: "100%", border: "1px solid #ccc" }}
            />
          );
        } else if (col.key === "employee_code" || col.key === "employee_name" || col.key === "project") {
          displayValue = rowData[col.key] ?? "";
        } else if (numericCols.includes(col.key)) {
          displayValue =
            rowData[col.key] === null || rowData[col.key] === ""
              ? ""
              : Number(rowData[col.key]).toFixed(2);
        } else {
          displayValue = rowData[col.key] ?? "";
        }

        let className = "";
        if (col.key === "employee_code") className = "sticky-col first-col";
        else if (col.key === "employee_name") className = "sticky-col second-col";
        else if (col.key === "project") className = "sticky-col second-last-col";

        return (
          <td key={col.key} className={className}>
            {displayValue}
          </td>
        );
      })}

      <td key="edit" className="sticky-col last-col">
        {editing ? (
          <button onClick={handleSave}>Save</button>
        ) : (
          <button onClick={() => setEditing(true)}>Edit</button>
        )}
      </td>
    </tr>
  );
});

// ---------------- Main EmployeeDirectory ----------------
export default function EmployeeDirectory() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [toggleOpen, setToggleOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50); 

  const [selectedProject, setSelectedProject] = useState("");
  const [projectFilterOpen, setProjectFilterOpen] = useState(false);
  const projectFilterRef = useRef(null);

  const [loading, setLoading] = useState(false);

  const toggleRef = useRef(null);
  const directoryBtnRef = useRef(null);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [dtrFiles, setDtrFiles] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [dtrModalOpen, setDtrModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const handleExportExcel = () => {
    if (!filteredEmployees.length) return toast.error("No data to export");

    const optionalColumns = [
      "nd_ot_reg", "ot_restday", "nd_restday", "ot_rest_excess", "nd_rest_excess",
      "nd_special_hday", "ot_shday_excess", "nd_shday_excess",
      "ot_leghol_excess", "nd_leghol_excess", "ot_sh_on_rest", "nd_sh_on_rest",
      "ot_sh_on_rest_excess", "nd_sh_on_rest_excess", "leg_h_on_rest_day",
      "nd_leg_h_on_restday", "ot_leg_h_on_rest_excess", "nd_leg_h_on_rest_excess",
      "vacleave_applied", "sickleave_applied", "back_pay_vl", "back_pay_sl",
      "ot_regular_excess", "nd_ot_reg_excess"
    ];

    let visibleColumns = columns.filter(col => !hiddenColumns.includes(col.key));

    const exportData = filteredEmployees.map(emp => {
      const row = {};
      visibleColumns.forEach(col => {
        row[col.label] = emp[col.key] ?? "";
      });
      return row;
    });

    const totalsRow = {};
    visibleColumns.forEach((col, idx) => {
      if (idx < 2) {
        totalsRow[col.label] = idx === 1 ? "Total" : "";
      } else {
        const sum = filteredEmployees.reduce((acc, emp) => {
          const val = parseFloat(emp[col.key]);
          return acc + (isNaN(val) ? 0 : val);
        }, 0);
        totalsRow[col.label] = isNaN(sum) ? "" : sum.toFixed(2);
      }
    });
    exportData.push(totalsRow);

    const worksheet = XLSX.utils.json_to_sheet(exportData, { origin: "A1" });

    const colWidths = visibleColumns.map(col => {
      const maxLen = exportData.reduce((len, row) => {
        return Math.max(len, String(row[col.label] ?? "").length);
      }, col.label.length);
      return { wch: maxLen + 2 };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "EmployeeDirectory.xlsx");
  };


  const handlePrint = () => {
  if (!filteredEmployees.length) return toast.error("No data to print");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageMargin = 20;

  const availableWidth = pageWidth - pageMargin * 2;

  const fontSize = 10; 
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");

  const optionalColumns = [
    "nd_ot_reg", "ot_restday", "nd_restday", "ot_rest_excess", "nd_rest_excess",
    "nd_special_hday", "ot_shday_excess", "nd_shday_excess", "date_covered",
    "ot_leghol_excess", "nd_leghol_excess", "ot_sh_on_rest", "nd_sh_on_rest",
    "ot_sh_on_rest_excess", "nd_sh_on_rest_excess", "leg_h_on_rest_day",
    "nd_leg_h_on_restday", "ot_leg_h_on_rest_excess", "nd_leg_h_on_rest_excess",
    "vacleave_applied", "sickleave_applied", "back_pay_vl", "back_pay_sl",
    "ot_regular_excess", "nd_ot_reg_excess"
  ];

  let visibleColumns = columns.filter(col => !hiddenColumns.includes(col.key));

  const getColumnWidth = (col) => {
    const headerWidth = doc.getTextWidth(col.label) + 10; 
    const cellWidths = filteredEmployees.map(emp => doc.getTextWidth(String(emp[col.key] ?? "")) + 10);
    return Math.max(headerWidth, ...cellWidths);
  };

  let columnWidths = visibleColumns.map(getColumnWidth);

  while (columnWidths.reduce((a, b) => a + b, 0) > availableWidth) {
    const indexToDrop = visibleColumns.findIndex(col => optionalColumns.includes(col.key));
    if (indexToDrop === -1) break;
    visibleColumns.splice(indexToDrop, 1);
    columnWidths.splice(indexToDrop, 1);
  }

  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  const scale = availableWidth / totalWidth;
  columnWidths = columnWidths.map(w => w * scale);

  const tableHeaders = visibleColumns.map(col => ({
    content: col.label,
    styles: { halign: "center", fontStyle: "bold" },
  }));

  const bodyRows = filteredEmployees.map(emp =>
    visibleColumns.map(col => emp[col.key] ?? "")
  );

  const numericColsStart = 2;
  const totals = visibleColumns
    .slice(numericColsStart)
    .map(col => {
      const sum = filteredEmployees.reduce((acc, emp) => {
        const val = parseFloat(emp[col.key]);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      return isNaN(sum) ? "" : sum.toFixed(2);
    });
  bodyRows.push(["", "Total", ...totals]);

  autoTable(doc, {
    head: [tableHeaders],
    body: bodyRows,
    theme: "grid",
    margin: { top: 50, left: pageMargin, right: pageMargin },
    tableWidth: 'auto',
    styles: {
      fontSize,
      cellPadding: 3,
      overflow: "linebreak",
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    headStyles: {
      fontSize,
      fillColor: [200, 200, 200],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: visibleColumns.reduce((acc, col, idx) => {
      acc[idx] = { cellWidth: columnWidths[idx] };
      return acc;
    }, {}),
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didDrawPage: () => {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Employee Directory (${startDate || "All"} - ${endDate || "All"})`,
        pageWidth / 2,
        30,
        { align: "center" }
      );
    },
  });

  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};

   const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await api.get("/employees/", { params });
      const data = res.data.map(emp => ({
        ...emp,
        employee_code: emp.employee_code ? String(emp.employee_code).padStart(5, "0") : ""
      }));
      setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDtrFiles = async () => {
    try {
      const res = await api.get("/dtr/files/");
      console.log("DTR response:", res.data);
      setDtrFiles(res.data.results || []);
    } catch (err) {
      console.error("Failed to fetch DTR files", err);
    }
  };

  const handleSyncAll = async () => {
    try {
      const payload = {};
      if (startDate) payload.start_date = startDate;
      if (endDate) payload.end_date = endDate;

      const res = await api.post("/dtr/files/sync-all/", payload);
      toast.success(res.data.detail || "All DTR files synced!");
      fetchEmployees(); 
    } catch (err) {
      toast.error(err.response?.data?.detail || "Sync all failed");
    }
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a file!");
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const res = await api.post("/upload-employee-excel/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.detail);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDtrFiles();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toggleRef.current && !toggleRef.current.contains(e.target)) {
        setToggleOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const savedHidden = localStorage.getItem("hiddenColumns");
    const savedProject = localStorage.getItem("selectedProject");

    if (savedHidden) {
      try {
        setHiddenColumns(JSON.parse(savedHidden));
      } catch {
        console.error("Invalid hiddenColumns in localStorage");
      }
    }
    if (savedProject) {
      setSelectedProject(savedProject);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("hiddenColumns", JSON.stringify(hiddenColumns));
  }, [hiddenColumns]);

  useEffect(() => {
    localStorage.setItem("selectedProject", selectedProject);
  }, [selectedProject]);

  const columns = [
    { label: "Employee Code", key: "employee_code" },
    { label: "Employee Name", key: "employee_name" },
    { label: "Date Covered", key: "date_covered" },
    { label: "Total Hours", key: "total_hours" },
    { label: "ND Reg Hrs", key: "nd_reg_hrs" },
    { label: "Absences", key: "absences" },
    { label: "Tardiness", key: "tardiness" },
    { label: "Undertime", key: "undertime" },
    { label: "OT Regular", key: "ot_regular" },
    { label: "ND OT Reg", key: "nd_ot_reg" },
    { label: "OT Restday", key: "ot_restday" },
    { label: "ND Restday", key: "nd_restday" },
    { label: "OT RestExcess", key: "ot_rest_excess" },
    { label: "ND Restday Excess", key: "nd_rest_excess" },
    { label: "OT SpecialHday", key: "ot_special_hday" },
    { label: "ND SpecialHday", key: "nd_special_hday" },
    { label: "OT SHdayExcess", key: "ot_shday_excess" },
    { label: "ND SHday Excess", key: "nd_shday_excess" },
    { label: "OT LegalHoliday", key: "ot_legal_holiday" },
    { label: "Special Holiday", key: "special_holiday" },
    { label: "OT LegHol Excess", key: "ot_leghol_excess" },
    { label: "ND LegHol Excess", key: "nd_leghol_excess" },
    { label: "OT SHday on Rest", key: "ot_sh_on_rest" },
    { label: "ND SHday on Rest", key: "nd_sh_on_rest" },
    { label: "OT SH on Rest Excess", key: "ot_sh_on_rest_excess" },
    { label: "ND SH on Rest Excess", key: "nd_sh_on_rest_excess" },
    { label: "LegH on Rest Day", key: "leg_h_on_rest_day" },
    { label: "ND LegH on Restday", key: "nd_leg_h_on_restday" },
    { label: "OT LegH on Rest Excess", key: "ot_leg_h_on_rest_excess" },
    { label: "ND LegH on Rest Excess", key: "nd_leg_h_on_rest_excess" },
    { label: "VacLeave_Applied", key: "vacleave_applied" },
    { label: "SickLeave_Applied", key: "sickleave_applied" },
    { label: "Back Pay VL", key: "back_pay_vl" },
    { label: "Back Pay SL", key: "back_pay_sl" },
    { label: "OT Regular Excess", key: "ot_regular_excess" },
    { label: "ND OT Reg Excess", key: "nd_ot_reg_excess" },
    { label: "Legal Holiday", key: "legal_holiday" },
    { label: "ND Legal Holiday", key: "nd_legal_holiday" },
    { label: "Overnight Rate", key: "overnight_rate" },
    { label: "PROJECT", key: "project" },
  ];

  const toggleColumn = (key) => {
    setHiddenColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((emp) =>
        Object.values(emp).some((val) =>
          String(val).toLowerCase().includes(lowerSearch)
        )
      );
    }

    if (selectedProject) {
      filtered = filtered.filter(emp => emp.project === selectedProject);
    }

    return filtered;
  }, [employees, searchTerm, selectedProject]);

  const uniqueProjects = useMemo(() => {
    const projects = employees.map(emp => emp.project).filter(Boolean);
    return [...new Set(projects)].sort();
  }, [employees]);

  const paginatedEmployees = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = startIdx + rowsPerPage;
    return filteredEmployees.slice(startIdx, endIdx);
  }, [filteredEmployees, currentPage, rowsPerPage]);

  const SkeletonRow = ({ columns, hiddenColumns }) => {
    return (
      <tr>
        {columns.map((col) => {
          if (hiddenColumns.includes(col.key)) return null;
          return (
            <td key={col.key}>
              <div className="skeleton-cell"></div>
            </td>
          );
        })}
        <td>
          <div className="skeleton-cell"></div>
        </td>
      </tr>
    );
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (projectFilterRef.current && !projectFilterRef.current.contains(e.target)) {
        setProjectFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <motion.div
        className="employee-top-bar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {/* First row */}
        <div className="employee-row">
          <div className="employee-button-wrapper" ref={directoryBtnRef}>
            <button className="employee-button" onClick={() => setOpen(!open)}>
              Employees
            </button>
            {open && (
              <div className="employee-directory-floating">
                <h2 className="employee-directory-title">Employee Directory</h2>
                <div className="employee-upload">
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
                  <button
                    className="employee-directory-upload-btn"
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="employee-button-wrapper">
            <button className="employee-button" onClick={() => setAddOpen(!addOpen)}>
              Add Employee
            </button>
            {addOpen && <AddEmployee onAdded={() => { fetchEmployees(); setAddOpen(false); }} />}
          </div>

          <div className="employee-button-wrapper">
            <button className="employee-button" onClick={() => setDeleteOpen(!deleteOpen)}>
              Delete Employee
            </button>
            {deleteOpen && (
              <DeleteEmployee
                employees={employees}
                onDeleted={(deletedCode) => {
                  setEmployees((prev) => prev.filter((emp) => emp.employee_code !== deletedCode));
                  setDeleteOpen(false);
                }}
              />
            )}
          </div>

          {/* Project filter */}
          <div className="employee-project-filter" ref={projectFilterRef} style={{ position: "relative" }}>
            <button
              className="employee-hide-btn"
              onClick={() => setProjectFilterOpen(prev => !prev)}
            >
              {selectedProject || "Filter by Project"}
            </button>
            {projectFilterOpen && (
              <div className="employee-hide-panel" style={{ maxHeight: "200px", overflowY: "auto" }}>
                <label key="all">
                  <input
                    type="radio"
                    name="project"
                    checked={selectedProject === ""}
                    onChange={() => setSelectedProject("")}
                  />
                  All
                </label>
                {uniqueProjects.map((proj) => (
                  <label key={proj}>
                    <input
                      type="radio"
                      name="project"
                      checked={selectedProject === proj}
                      onChange={() => setSelectedProject(proj)}
                    />
                    {proj}
                  </label>
                ))}
              </div>
            )}
          </div>

           {/* Hide columns */}
          <div className="employee-hide-column" ref={toggleRef}>
            <button
              className="employee-hide-btn"
              onClick={() => setToggleOpen((prev) => !prev)}
            >
              Hide Columns
            </button>
            {toggleOpen && (
              <div className="employee-hide-panel">
                {columns.map((col) => (
                  <label key={col.key}>
                    <input
                      type="checkbox"
                      checked={!hiddenColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="employee-button-wrapper">
            <button className="employee-button" onClick={handleExportExcel}>
              📁 Export Excel
            </button>
          </div>

          <div className="employee-button-wrapper">
            <button className="employee-button" onClick={handlePrint}>
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Second row */}
        <div className="employee-row">
          {/* Search */}
          <div className="employee-search-wrapper">
            <FaSearch className="employee-search-icon" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="employee-search"
            />
          </div>

          {/* Date filter */}
          <div className="employee-button-wrapper">
            <label style={{ fontWeight: 600, marginRight: "0.5rem" }}>Filter by Date:</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ marginRight: "0.5rem", padding: "0.3rem" }} />
            <span style={{ marginRight: "0.5rem" }}>to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ marginRight: "0.5rem", padding: "0.3rem" }} />
            <button
              onClick={async () => {
                try {
                  if (startDate || endDate) {
                    const payload = {};
                    if (startDate) payload.start_date = startDate;
                    if (endDate) payload.end_date = endDate;

                    await api.post("/dtr/files/sync-all/", payload);
                  }
                  fetchEmployees();
                } catch (err) {
                  toast.error("Failed to apply date filter");
                }
              }}
              className="employee-button"
            >
              📅 Apply
            </button>
          </div>

           <div className="employee-button-wrapper">
            <button
              className="employee-button"
              onClick={handleSyncAll}
            >
              🔄 Sync DTR
            </button>
          </div>

        </div>
      </motion.div>

      <motion.div
        className="employee-table-container"
        initial={{ opacity: 0, y: 20 }}       
        animate={{ opacity: 1, y: 0 }}       
        exit={{ opacity: 0, y: -20 }}         
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <table className="employee-table">
          <thead>
            <tr>
              {columns.map((col) =>
                hiddenColumns.includes(col.key) ? null : (
                  <th
                    key={col.key}
                    className={
                      col.key === "employee_code"
                        ? "sticky-col first-col"
                        : col.key === "employee_name"
                        ? "sticky-col second-col"
                        : col.key === "project"
                        ? "sticky-col second-last-col"
                        : ""
                    }
                  >
                    {col.label}
                  </th>
                )
              )}
              <th className="sticky-col last-col">Edit</th>
            </tr>
          </thead>
          <tbody>
            {loading
            ? Array.from({ length: rowsPerPage }).map((_, idx) => (
                <SkeletonRow key={idx} columns={columns} hiddenColumns={hiddenColumns} />
              ))
            : paginatedEmployees.map((emp) => (
              <EmployeeRow
                key={emp.id ?? emp.employee_code ?? Math.random()} 
                emp={emp}
                columns={columns}
                hiddenColumns={hiddenColumns}
                onRowClick={() => {
                  setSelectedEmployee(emp);
                  setDtrModalOpen(true);
                }}
                onSave={async (updatedRow) => {
                try {
                  const numericCols = [
                    "total_hours", "nd_reg_hrs", "absences", "tardiness", "undertime",
                    "ot_regular", "nd_ot_reg", "ot_restday", "nd_restday", "ot_rest_excess",
                    "nd_rest_excess", "ot_special_hday", "nd_special_hday", "ot_shday_excess",
                    "nd_shday_excess", "ot_legal_holiday", "special_holiday", "ot_leghol_excess",
                    "nd_leghol_excess", "ot_sh_on_rest", "nd_sh_on_rest", "ot_sh_on_rest_excess",
                    "nd_sh_on_rest_excess", "leg_h_on_rest_day", "nd_leg_h_on_restday",
                    "ot_leg_h_on_rest_excess", "nd_leg_h_on_rest_excess", "vacleave_applied",
                    "sickleave_applied", "back_pay_vl", "back_pay_sl", "ot_regular_excess",
                    "nd_ot_reg_excess", "legal_holiday", "nd_legal_holiday", "overnight_rate",
                  ];

                  const payload = { ...updatedRow };
                  numericCols.forEach((col) => {
                    if (payload[col] === "") payload[col] = null;
                  });

                  const paddedCode = String(updatedRow.employee_code).padStart(5, "0");

                  await api.put(`/update-employee/${paddedCode}/`, payload);

                  setEmployees((prev) =>
                    prev.map((e) => (e.id === updatedRow.id ? { ...e, ...payload } : e))
                  );
                  toast.success("Employee updated!");
                } catch (err) {
                  toast.error("Failed to save changes");
                }
              }}
              />
            ))}
          </tbody>
        </table>

        <EmployeeDtrModal
          employee={selectedEmployee}
          startDate={startDate}
          endDate={endDate}
          isOpen={dtrModalOpen}
          onClose={() => setDtrModalOpen(false)}
          columns={columns}
          hiddenColumns={hiddenColumns}
        />
      </motion.div>
      <motion.div
        className="pagination"
        initial={{ opacity: 0, y: 20 }}       
        animate={{ opacity: 1, y: 0 }}       
        exit={{ opacity: 0, y: -20 }}         
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <button
          className="pagination-btn gradient-btn"
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          &laquo; Previous
        </button>

        <span className="pagination-info">
          Page <strong>{currentPage}</strong> of <strong>{Math.ceil(filteredEmployees.length / rowsPerPage)}</strong>
        </span>

        <button
          className="pagination-btn gradient-btn"
          onClick={() =>
            setCurrentPage((p) =>
              Math.min(p + 1, Math.ceil(filteredEmployees.length / rowsPerPage))
            )
          }
          disabled={currentPage === Math.ceil(filteredEmployees.length / rowsPerPage)}
        >
          Next &raquo;
        </button>

        <select
          className="pagination-select gradient-select"
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
      </motion.div>
    </>
  );
}