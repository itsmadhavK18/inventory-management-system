import { useState } from 'react';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const REQUIRED_COLUMNS = ['name', 'type', 'quantity', 'unit', 'cost_per_unit', 'threshold'];

export default function BulkUpload({ onClose }) {
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    setFile(f);
    setErrors([]);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cols = result.meta.fields || [];
        const missing = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
        if (missing.length > 0) {
          setErrors([`Missing columns: ${missing.join(', ')}`]);
          setParsed(null);
          return;
        }

        const validRows = [];
        const rowErrors = [];

        result.data.forEach((row, idx) => {
          const rowNum = idx + 2;
          if (!row.name?.trim()) { rowErrors.push(`Row ${rowNum}: name is empty`); return; }
          if (!['raw', 'finished'].includes(row.type?.toLowerCase())) { rowErrors.push(`Row ${rowNum}: type must be raw or finished`); return; }
          if (isNaN(Number(row.quantity)) || Number(row.quantity) < 0) { rowErrors.push(`Row ${rowNum}: invalid quantity`); return; }
          if (isNaN(Number(row.cost_per_unit)) || Number(row.cost_per_unit) < 0) { rowErrors.push(`Row ${rowNum}: invalid cost_per_unit`); return; }
          if (isNaN(Number(row.threshold)) || Number(row.threshold) < 0) { rowErrors.push(`Row ${rowNum}: invalid threshold`); return; }

          validRows.push({
            name: row.name.trim(),
            type: row.type.toLowerCase(),
            quantity: Number(row.quantity),
            unit: row.unit?.trim() || 'pcs',
            cost_per_unit: Number(row.cost_per_unit),
            threshold: Number(row.threshold),
          });
        });

        setErrors(rowErrors);
        setParsed(validRows);
      },
      error: (err) => {
        setErrors([err.message]);
        setParsed(null);
      },
    });
  };

  const handleUpload = async () => {
    if (!parsed || parsed.length === 0) return;
    setLoading(true);

    try {
      const batch = writeBatch(db);
      parsed.forEach((item) => {
        const ref = doc(collection(db, COLLECTIONS.ITEMS));
        batch.set(ref, { ...item, created_at: serverTimestamp() });
      });
      await batch.commit();
      toast.success(`${parsed.length} items uploaded`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* File input */}
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-accent/50 transition-all">
        <Upload size={24} className="text-text-dim mb-2" />
        <span className="text-sm text-text-muted">
          {file ? file.name : 'Click to select CSV file'}
        </span>
        <span className="text-[10px] text-text-dim mt-1">
          Columns: {REQUIRED_COLUMNS.join(', ')}
        </span>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 space-y-1">
          {errors.slice(0, 5).map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-danger-light">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
              {err}
            </div>
          ))}
          {errors.length > 5 && (
            <p className="text-xs text-text-dim">...and {errors.length - 5} more errors</p>
          )}
        </div>
      )}

      {/* Preview */}
      {parsed && parsed.length > 0 && (
        <div className="p-3 rounded-xl bg-success/10 border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-success" />
            <span className="text-sm font-medium text-success-light">
              {parsed.length} items ready to upload
            </span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {parsed.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-text-muted">
                <FileText size={10} />
                {item.name} — {item.quantity} {item.unit}
              </div>
            ))}
            {parsed.length > 5 && (
              <p className="text-xs text-text-dim">...and {parsed.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button
          onClick={handleUpload}
          className="btn-primary flex-1"
          disabled={!parsed || parsed.length === 0 || loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Upload Items'}
        </button>
      </div>
    </div>
  );
}
