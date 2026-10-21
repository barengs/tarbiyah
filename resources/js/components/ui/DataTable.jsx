import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
} from '@tanstack/react-table';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Inbox,
    X,
} from 'lucide-react';

/**
 * KOMPONEN TABEL RAMPING BERBASIS TANSTACK REACT TABLE
 *
 * Fitur:
 * - Padding ramping & compact (py-2 px-3.5) agar data tersaji ringkas dan efisien.
 * - Pencarian real-time (Global Search Filter).
 * - Pagination interaktif (First, Prev, Page indicator, Next, Last).
 * - Pilihan jumlah baris data per halaman (10, 25, 50, 100).
 * - Sorting multi-kolom dengan indikator panah.
 * - Kompatibel penuh dengan legacy column format ({ key, label, render })
 *   maupun TanStack column definition ({ accessorKey, header, cell }).
 * - Border-radius minimal (rounded-md / 6px).
 */
export default function DataTable({
    columns = [],
    data = [],
    isLoading = false,
    onRowClick,
    emptyMessage = 'Data tidak ditemukan',
    initialPageSize = 10,
    searchPlaceholder = 'Cari dalam tabel...',
    showSearch = true,
    showPagination = true,
    className = '',
}) {
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState([]);
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: initialPageSize,
    });

    // Adaptasi columns jika menggunakan format legacy { key, label, render }
    const tableColumns = useMemo(() => {
        return columns.map((col) => {
            const accessor = col.accessorKey || col.key;
            return {
                id: col.id || accessor,
                accessorKey: accessor,
                header: col.header || col.label,
                enableSorting: col.enableSorting !== false && col.sortable !== false,
                cell: (info) => {
                    const rowData = info.row.original;
                    if (col.cell) {
                        return typeof col.cell === 'function' ? col.cell(info) : col.cell;
                    }
                    if (col.render) {
                        return col.render(rowData);
                    }
                    const val = info.getValue();
                    return val !== undefined && val !== null ? String(val) : '-';
                },
            };
        });
    }, [columns]);

    const tableData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

    const table = useReactTable({
        data: tableData,
        columns: tableColumns,
        state: {
            globalFilter,
            sorting,
            pagination,
        },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    // Loading State
    if (isLoading) {
        return (
            <div className="bg-white border border-slate-200/90 rounded-md overflow-hidden shadow-2xs">
                <div className="py-12 px-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#093c30] border-t-transparent rounded-full animate-spin mb-2.5" />
                    <span className="font-medium text-slate-500">Memuat data tabel...</span>
                </div>
            </div>
        );
    }

    const totalFilteredRows = table.getFilteredRowModel().rows.length;
    const pageIndex = table.getState().pagination.pageIndex;
    const pageSize = table.getState().pagination.pageSize;
    const pageCount = table.getPageCount();
    const startRow = totalFilteredRows === 0 ? 0 : pageIndex * pageSize + 1;
    const endRow = Math.min((pageIndex + 1) * pageSize, totalFilteredRows);

    return (
        <div className={`bg-white border border-slate-200/90 rounded-md shadow-2xs overflow-hidden ${className}`}>
            {/* TOOLBAR ATAS: Pencarian & Page Size */}
            {(showSearch || showPagination) && (
                <div className="p-2.5 px-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Pencarian Global */}
                    {showSearch ? (
                        <div className="relative w-full sm:w-64 md:w-80">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={globalFilter ?? ''}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full bg-white border border-slate-300 rounded-md pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#093c30] focus:ring-1 focus:ring-[#093c30]/20 transition-all"
                            />
                            {globalFilter && (
                                <button
                                    type="button"
                                    onClick={() => setGlobalFilter('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ) : <div />}

                    {/* Page Size & Total Info */}
                    <div className="flex items-center gap-3 self-end sm:self-auto text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-slate-500">Tampilkan:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => table.setPageSize(Number(e.target.value))}
                                className="bg-white border border-slate-300 rounded-md px-2 py-0.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#093c30] focus:ring-1 focus:ring-[#093c30]/20"
                            >
                                {[10, 25, 50, 100].map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                            <span className="text-[11px] text-slate-400">baris</span>
                        </div>

                        <span className="w-px h-3.5 bg-slate-300 hidden sm:block" />

                        <span className="text-[11px] font-medium text-slate-600 hidden sm:inline">
                            Total: <strong className="text-slate-900">{totalFilteredRows.toLocaleString()}</strong> data
                        </span>
                    </div>
                </div>
            )}

            {/* TABEL RAMPING */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const canSort = header.column.getCanSort();
                                    const isSorted = header.column.getIsSorted();

                                    return (
                                        <th
                                            key={header.id}
                                            onClick={header.column.getToggleSortingHandler()}
                                            className={`px-3.5 py-2 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none ${
                                                canSort ? 'cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors' : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                                </span>
                                                {canSort && (
                                                    <span className="text-slate-400">
                                                        {isSorted === 'asc' ? (
                                                            <ArrowUp className="w-3 h-3 text-[#093c30]" />
                                                        ) : isSorted === 'desc' ? (
                                                            <ArrowDown className="w-3 h-3 text-[#093c30]" />
                                                        ) : (
                                                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={tableColumns.length} className="py-12 px-4 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <Inbox className="w-8 h-8 mb-2 text-slate-300" strokeWidth={1.5} />
                                        <p className="text-xs font-semibold text-slate-600">{emptyMessage}</p>
                                        {globalFilter && (
                                            <p className="text-[11px] text-slate-400 mt-1">
                                                Tidak ada hasil untuk kata kunci &ldquo;{globalFilter}&rdquo;.
                                            </p>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    onClick={() => onRowClick && onRowClick(row.original)}
                                    className={`transition-colors duration-100 ${
                                        onRowClick
                                            ? 'cursor-pointer hover:bg-emerald-50/40'
                                            : 'hover:bg-slate-50/80'
                                    }`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className="px-3.5 py-2 text-xs text-slate-700 leading-normal align-middle"
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* TOOLBAR BAWAH: PAGINATION */}
            {showPagination && totalFilteredRows > 0 && (
                <div className="p-2.5 px-3.5 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                    {/* Ringkasan Baris */}
                    <div className="text-[11px] text-slate-500">
                        Menampilkan <span className="font-semibold text-slate-800">{startRow}</span> -{' '}
                        <span className="font-semibold text-slate-800">{endRow}</span> dari{' '}
                        <span className="font-semibold text-slate-800">{totalFilteredRows.toLocaleString()}</span> data
                    </div>

                    {/* Kontrol Navigasi Halaman */}
                    <div className="flex items-center gap-1 self-center sm:self-auto">
                        <button
                            type="button"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            title="Halaman Pertama"
                            className="p-1 rounded-md border border-slate-300 text-slate-600 hover:bg-white hover:border-slate-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-slate-300 transition-colors"
                        >
                            <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            title="Halaman Sebelumnya"
                            className="p-1 rounded-md border border-slate-300 text-slate-600 hover:bg-white hover:border-slate-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-slate-300 transition-colors"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <span className="px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-md">
                            {pageIndex + 1} / {Math.max(1, pageCount)}
                        </span>

                        <button
                            type="button"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            title="Halaman Selanjutnya"
                            className="p-1 rounded-md border border-slate-300 text-slate-600 hover:bg-white hover:border-slate-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-slate-300 transition-colors"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => table.setPageIndex(pageCount - 1)}
                            disabled={!table.getCanNextPage()}
                            title="Halaman Terakhir"
                            className="p-1 rounded-md border border-slate-300 text-slate-600 hover:bg-white hover:border-slate-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-slate-300 transition-colors"
                        >
                            <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
