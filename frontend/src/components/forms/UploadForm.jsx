import { useState } from "react";
import {
    Upload, FileText, CheckCircle, X,
    Calendar, User, Building2, Hash, FileCheck,
    Users, BookOpen, Clock, ShieldCheck
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { DEPARTMENTS } from "../../config/constants";

// Extracted Components
const TextField = ({ label, name, icon: Icon, placeholder, required = false, type = "text", value, onChange, error }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            {Icon && <Icon size={14} className="text-slate-400" />}
            {label}
            {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full px-4 py-2.5 rounded-lg border bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none ${error ? "border-red-300 bg-red-50/10" : "border-slate-200 hover:border-slate-300"
                }`}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
);

const NumberCounterField = ({ label, name, icon: Icon, required = false, value, onChange, error }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            {Icon && <Icon size={14} className="text-slate-400" />}
            {label}
            {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-center">
            <button
                type="button"
                onClick={() => onChange({ target: { name, value: Math.max(1900, parseInt(value || 2025) - 1).toString() } })}
                className="px-4 py-2.5 border border-r-0 border-slate-200 rounded-l-lg bg-slate-50 hover:bg-slate-100 text-slate-600"
            >
                -
            </button>
            <input
                type="number"
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full text-center px-4 py-2.5 border bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none ${error ? "border-red-300 bg-red-50/10" : "border-slate-200 hover:border-slate-300"
                    }`}
            />
            <button
                type="button"
                onClick={() => onChange({ target: { name, value: (parseInt(value || 2025) + 1).toString() } })}
                className="px-4 py-2.5 border border-l-0 border-slate-200 rounded-r-lg bg-slate-50 hover:bg-slate-100 text-slate-600"
            >
                +
            </button>
        </div>
        {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
);

const SelectField = ({ label, name, options, icon: Icon, required = false, value, onChange, error }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            {Icon && <Icon size={14} className="text-slate-400" />}
            {label}
            {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <select
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full px-4 py-2.5 rounded-lg border bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none ${error ? "border-red-300 bg-red-50/10" : "border-slate-200 hover:border-slate-300"
                    }`}
            >
                <option value="">Select {label}</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
        {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
);

const FileField = ({ label, name, fileState, accept = ".pdf", onChange, onRemove }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <FileText size={14} className="text-slate-400" />
            {label}
        </label>
        <div className="relative group">
            <input
                type="file"
                id={name}
                className="hidden"
                accept={accept}
                onChange={(e) => onChange(e, name)}
            />
            <label
                htmlFor={name}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-dashed cursor-pointer transition-all ${fileState
                    ? "border-emerald-200 bg-emerald-50/30 text-emerald-700"
                    : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50 text-slate-500"
                    }`}
            >
                <div className="flex items-center gap-2">
                    {fileState ? <CheckCircle size={16} /> : <Upload size={16} />}
                    <span className="text-sm truncate max-w-[200px]">
                        {fileState ? fileState.name : "Choose PDF file"}
                    </span>
                </div>
                {fileState && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            onRemove(name);
                        }}
                        className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600"
                    >
                        <X size={14} />
                    </button>
                )}
            </label>
        </div>
    </div>
);

const UploadForm = ({ onSuccess, onFormChange, initialData, onClose }) => {
    const [formData, setFormData] = useState(initialData || {
        facultyName: "",
        email: "",
        department: "",
        designation: "",
        coAuthors: "",
        isbn: "",
        title: "",
        publicationType: "Book",
        publisher: "",
        yearOfPublication: "2025"
    });

    const [files, setFiles] = useState({
        document: null
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newData = { ...formData, [name]: value };
        setFormData(newData);

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }

        if (onFormChange) {
            onFormChange(newData);
        }
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== "application/pdf") {
                toast.error("Only PDF files are allowed");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error("File size must be less than 10MB");
                return;
            }
            setFiles(prev => ({ ...prev, [type]: file }));
        }
    };

    const handleFileRemove = (name) => {
        setFiles(prev => ({ ...prev, [name]: null }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.facultyName) newErrors.facultyName = "Faculty name is required";
        if (!formData.email) newErrors.email = "Email is required";
        if (!formData.department) newErrors.department = "Department is required";
        if (!formData.designation) newErrors.designation = "Designation is required";
        if (!formData.title) newErrors.title = "Book title is required";
        if (!formData.isbn) newErrors.isbn = "ISBN/ISSN is required";
        if (!formData.yearOfPublication) newErrors.yearOfPublication = "Year of Publication is required";
        
        if (formData.yearOfPublication && !/^\d{4}$/.test(formData.yearOfPublication)) {
            newErrors.yearOfPublication = "Year must be a 4-digit number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (!formData.id && !files.document) {
            toast.error("Please upload the book document PDF (Front and Back Pages)");
            return;
        }

        setLoading(true);

        try {
            const formPayload = new FormData();

            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined) {
                    formPayload.append(key, formData[key]);
                }
            });

            if (files.document) {
                formPayload.append("documentFile", files.document);
            }

            if (formData.id) {
                await api.put("/form/formEntryUpdate", formPayload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                toast.success("Book entry updated successfully!");
            } else {
                await api.post("/form/formEntry", formPayload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                toast.success("Book entry submitted successfully!");
            }
            
            if (onSuccess) onSuccess();
            if (onClose) onClose();

            setFormData({
                facultyName: "",
                email: "",
                department: "",
                designation: "",
                coAuthors: "",
                isbn: "",
                title: "",
                publicationType: "Book",
                publisher: "",
                yearOfPublication: "2025"
            });
            setFiles({ document: null });

        } catch (err) {
            console.error("Submission error:", err);
            toast.error(err.response?.data?.message || "Failed to submit entry");
        } finally {
            setLoading(false);
        }
    };

    // Constants
    const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Research Scholar'];
    const PUBLICATION_TYPES = ['Book', 'Book Chapter'];

    return (
        <form onSubmit={handleSubmit} className="space-y-8">

            {/* 1. Faculty Information */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <User className="text-indigo-600" size={20} />
                        Faculty Information
                    </h2>
                    <p className="text-sm text-slate-400">Personal and departmental details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TextField
                        label="Faculty Name"
                        name="facultyName"
                        placeholder="Dr. John Doe"
                        required
                        icon={User}
                        value={formData.facultyName}
                        onChange={handleChange}
                        error={errors.facultyName}
                    />
                    <TextField
                        label="Email Address"
                        name="email"
                        type="email"
                        placeholder="faculty@nri.edu.in"
                        required
                        icon={User}
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                    />
                    <SelectField
                        label="Department"
                        name="department"
                        options={DEPARTMENTS}
                        required
                        icon={Building2}
                        value={formData.department}
                        onChange={handleChange}
                        error={errors.department}
                    />
                    <SelectField
                        label="Designation"
                        name="designation"
                        options={DESIGNATIONS}
                        required
                        icon={User}
                        value={formData.designation}
                        onChange={handleChange}
                        error={errors.designation}
                    />
                </div>
            </section>

            {/* 2. Publication Documentation */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <BookOpen className="text-indigo-600" size={20} />
                        Publication Details
                    </h2>
                    <p className="text-sm text-slate-400">Core details about the book or chapter</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <TextField
                            label="Book / Chapter Title"
                            name="title"
                            placeholder="Enter the full title of the publication"
                            required
                            icon={BookOpen}
                            value={formData.title}
                            onChange={handleChange}
                            error={errors.title}
                        />
                    </div>
                    <TextField
                        label="ISBN / ISSN Number"
                        name="isbn"
                        placeholder="e.g. 978-3-16-148410-0"
                        required
                        icon={Hash}
                        value={formData.isbn}
                        onChange={handleChange}
                        error={errors.isbn}
                    />
                    <TextField
                        label="Names of All Co-Authors"
                        name="coAuthors"
                        placeholder="Enter all co-author names"
                        icon={Users}
                        value={formData.coAuthors}
                        onChange={handleChange}
                        error={errors.coAuthors}
                    />
                    <SelectField
                        label="Type of Publication"
                        name="publicationType"
                        options={PUBLICATION_TYPES}
                        required
                        icon={FileCheck}
                        value={formData.publicationType}
                        onChange={handleChange}
                        error={errors.publicationType}
                    />
                    <TextField
                        label="Publisher (Publisher Details)"
                        name="publisher"
                        placeholder="e.g. Springer, IEEE, etc."
                        icon={Building2}
                        value={formData.publisher}
                        onChange={handleChange}
                        error={errors.publisher}
                    />
                </div>
            </section>

            {/* 3. Timeline & Dates */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Clock className="text-indigo-600" size={20} />
                        Timeline
                    </h2>
                    <p className="text-sm text-slate-400">Publication Year</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <NumberCounterField
                        label="Year of Publication"
                        name="yearOfPublication"
                        icon={Calendar}
                        required
                        value={formData.yearOfPublication}
                        onChange={handleChange}
                        error={errors.yearOfPublication}
                    />
                </div>
            </section>

            {/* 4. Supporting Documents */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <FileText className="text-indigo-600" size={20} />
                        Supporting Documents
                    </h2>
                    <p className="text-sm text-slate-400">Upload Front Pages and Back Pages combined in a single PDF (max 10MB)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FileField
                        label="Upload Front Pages and Back Pages"
                        name="document"
                        fileState={files.document}
                        onChange={handleFileChange}
                        onRemove={handleFileRemove}
                    />
                </div>
            </section>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-4">
                <button
                    type="button"
                    onClick={() => {
                        setFormData({
                            facultyName: "",
                            email: "",
                            department: "",
                            designation: "",
                            coAuthors: "",
                            isbn: "",
                            title: "",
                            publicationType: "Book",
                            publisher: "",
                            yearOfPublication: "2025"
                        });
                        setFiles({ document: null });
                        setErrors({});
                        if (onFormChange) onFormChange({});
                    }}
                    className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all"
                >
                    Reset Form
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className={`flex items-center gap-2 px-8 py-2.5 rounded-lg bg-[#1B2845] text-[#C8A96E] font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all ${loading ? "opacity-75 cursor-wait" : ""
                        }`}
                >
                    {loading ? "Submitting..." : "Confirm & Publish"}
                    {!loading && <CheckCircle size={18} />}
                </button>
            </div>
        </form>
    );
};

export default UploadForm;
