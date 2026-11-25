import React, { useEffect, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import { generateAttendanceRecapPdf } from '../../utils/attendanceRecapPdfGenerator';
import { Printer, Download, ExternalLink, Loader2, FileText } from 'lucide-react';
import { toast } from 'react-toastify';

function formatIndoDate(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = String(dateStr).split('-');
        if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            return new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            }).format(d);
        }
    } catch {
        // fallback ke string mentah
    }
    return dateStr;
}

export default function PrintRecapModal({
    open,
    onClose,
    group = null,
    students = [],
    totalMeetings = 0,
    academicYear = '',
    quarterName = '',
    startDate = '',
    endDate = '',
}) {
    const iframeRef = useRef(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const dateRangeLabel =
        startDate && endDate
            ? `${formatIndoDate(startDate)} - ${formatIndoDate(endDate)}`
            : startDate
            ? `Mulai ${formatIndoDate(startDate)}`
            : endDate
            ? `Sampai ${formatIndoDate(endDate)}`
            : 'Semua Tanggal';

    useEffect(() => {
        if (!open) {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
            }
            setPdfDoc(null);
            return;
        }

        if (!students || students.length === 0) {
            return;
        }

        setIsGenerating(true);
        let objectUrl = null;
        const timer = setTimeout(() => {
            try {
                const doc = generateAttendanceRecapPdf({
                    group,
                    students,
                    totalMeetings,
                    meta: {
                        academicYear: academicYear || '-',
                        quarterName: quarterName || '-',
                        dateRangeLabel,
                    },
                });
                const blob = doc.output('blob');
                objectUrl = URL.createObjectURL(blob);
                setPdfDoc(doc);
                setPdfUrl(objectUrl);
            } catch (err) {
                console.error(err);
                toast.error('Gagal membuat pratinjau PDF: ' + (err?.message || 'Terjadi kesalahan'));
            } finally {
                setIsGenerating(false);
            }
        }, 80);

        return () => {
            clearTimeout(timer);
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [open, group, students, totalMeetings, academicYear, quarterName, startDate, endDate, dateRangeLabel]);

    const handleDownload = () => {
        if (!pdfDoc) return;
        const safeGroup = (group?.name || 'Rombel').replace(/[^a-zA-Z0-9]+/g, '_');
        const safeYear = (academicYear || '').replace(/[^a-zA-Z0-9]+/g, '_');
        const fileName = `Rekap_Kehadiran_${safeGroup}${safeYear ? `_${safeYear}` : ''}.pdf`;
        pdfDoc.save(fileName);
        toast.success('File PDF rekapitulasi kehadiran berhasil diunduh');
    };

    const handlePrint = () => {
        if (iframeRef.current?.contentWindow) {
            try {
                iframeRef.current.contentWindow.focus();
                iframeRef.current.contentWindow.print();
                return;
            } catch {
                // fallback to opening in new tab
            }
        }
        if (pdfUrl) {
            window.open(pdfUrl, '_blank');
        }
    };

    const handleOpenNewTab = () => {
        if (pdfUrl) {
            window.open(pdfUrl, '_blank');
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            maxWidth="max-w-5xl"
            title={
                <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-md bg-emerald-50 text-[#093c30] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                    </span>
                    <div>
                        <span className="font-bold text-slate-900 text-sm block">
                            Pratinjau &amp; Cetak PDF — Rekapitulasi Kehadiran
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal block">
                            Rombel {group?.name || '-'} &bull; {students.length} Santri &bull; {totalMeetings} Pertemuan KBM &bull; {dateRangeLabel}
                        </span>
                    </div>
                </div>
            }
            footer={
                <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                    <button
                        type="button"
                        onClick={handleOpenNewTab}
                        disabled={!pdfUrl || isGenerating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md disabled:opacity-50 cursor-pointer transition"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Buka di Tab Baru
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer transition"
                        >
                            Tutup
                        </button>
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={!pdfDoc || isGenerating}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md disabled:opacity-50 cursor-pointer transition shadow-2xs"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Unduh PDF
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={!pdfUrl || isGenerating}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-md disabled:opacity-50 cursor-pointer transition shadow-2xs"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Cetak Sekarang
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-2">
                {isGenerating ? (
                    <div className="h-[65vh] flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-md text-slate-500 gap-2">
                        <Loader2 className="w-7 h-7 animate-spin text-[#093c30]" />
                        <p className="text-xs font-medium">Menyiapkan pratinjau dokumen PDF...</p>
                    </div>
                ) : pdfUrl ? (
                    <iframe
                        ref={iframeRef}
                        src={pdfUrl}
                        title="Pratinjau PDF Rekapitulasi Kehadiran"
                        className="w-full h-[65vh] border border-slate-200 rounded-md bg-slate-100"
                    />
                ) : (
                    <div className="h-48 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-400">
                        Belum ada data kehadiran santri untuk ditampilkan dalam pratinjau PDF.
                    </div>
                )}
            </div>
        </Modal>
    );
}
