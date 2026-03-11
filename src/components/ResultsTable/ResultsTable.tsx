"use client";

import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    SortingState,
    PaginationState,
    VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";
import { DisplayRow, isSantaClara } from "@/lib/triathlon";
import { columns } from "./columns";

interface ResultsTableProps {
    data: DisplayRow[];
    onRowClick: (row: DisplayRow) => void;
    selectedResult: DisplayRow | null;
}

export function ResultsTable({ data, onRowClick, selectedResult }: ResultsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 25,
    });
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        bib: false,
        division: false,
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table: any = useReactTable({
        data,
        columns,
        state: { sorting, pagination, columnVisibility },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            sorting: [{ id: "chip_ms", desc: false }],
        },
        getRowId: (row) => String(row.result_id),
    });

    const pageCount = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex + 1;

    const allColumns = table.getAllLeafColumns();

    return (
        <>
            {/* Column Visibility Toggle */}
            <div className="flex justify-end mb-2">
                <div className="relative">
                    <button
                        onClick={() => setShowColumnMenu(!showColumnMenu)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        Columns
                    </button>
                    {showColumnMenu && (
                        <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                            {allColumns.map((col: any) => (
                                <label
                                    key={col.id}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={col.getIsVisible()}
                                        onChange={(e) => col.toggleVisibility(e.target.checked)}
                                        className="rounded border-gray-300 text-cardinal-600 focus:ring-cardinal-500"
                                    />
                                    <span className="text-sm text-gray-600">
                                        {col.columnDef.header?.toString() || col.id}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <TableHeader table={table} />
                        <TableBody 
                            table={table} 
                            onRowClick={onRowClick} 
                            selectedResult={selectedResult}
                        />
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>Show</span>
                    <select
                        value={table.getState().pagination.pageSize}
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                        className="rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-600 focus:outline-none">
                        {[25, 50, 100].map((size) => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                    <span>
                        · {data.length > 0 ? table.getRowModel().rows[0]?.index + 1 : 0}–
                        {Math.min((currentPage) * table.getState().pagination.pageSize, data.length)} of {data.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-500 hover:border-cardinal-300 hover:text-cardinal-700 disabled:cursor-not-allowed disabled:opacity-40">
                        ←
                    </button>
                    <span className="rounded border border-cardinal-200 bg-cardinal-50 px-3 py-1 text-sm font-semibold text-cardinal-700">
                        {currentPage} / {pageCount || 1}
                    </span>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-500 hover:border-cardinal-300 hover:text-cardinal-700 disabled:cursor-not-allowed disabled:opacity-40">
                        →
                    </button>
                </div>
            </div>
        </>
    );
}

function TableHeader({ table }: { table: any }) {
    return (
        <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    #
                </th>
                {table.getHeaderGroups().map((headerGroup: any) =>
                    headerGroup.headers.map((header: any) => (
                        <th
                            key={header.id}
                            onClick={header.column.getToggleSortingHandler()}
                            className={`cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-cardinal-700 ${
                                header.column.getCanSort() ? "" : "cursor-default"
                            }`}>
                            <div className="flex items-center gap-1">
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {header.column.getIsSorted() && (
                                    <span className="text-xs text-cardinal-600">
                                        {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                                    </span>
                                )}
                            </div>
                        </th>
                    ))
                )}
            </tr>
        </thead>
    );
}

function TableBody({ 
    table, 
    onRowClick, 
    selectedResult 
}: { 
    table: any;
    onRowClick: (row: DisplayRow) => void;
    selectedResult: DisplayRow | null;
}) {
    const rows = table.getRowModel().rows;

    return (
        <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
                <tr>
                    <td colSpan={16} className="px-6 py-16 text-center text-gray-400">
                        No results match the current filters
                    </td>
                </tr>
            ) : (
                rows.map((row: any) => {
                    const r = row.original as DisplayRow;
                    const isSC = isSantaClara(r.team);
                    const isSelected = selectedResult?.result_id === r.result_id;

                    return (
                        <tr
                            key={row.id}
                            onClick={() => onRowClick(r)}
                            className={`cursor-pointer transition-colors ${
                                isSelected
                                    ? "border-l-2 border-l-cardinal-600 bg-cardinal-50"
                                    : isSC
                                    ? "border-l-2 border-l-cardinal-600 bg-cardinal-50/40 hover:bg-cardinal-50/70"
                                    : "border-l-2 border-l-transparent hover:bg-gray-50"
                            }`}>
                            <td className="px-3 py-2.5 text-xs text-gray-300">
                                {row.index + 1}
                            </td>
                            {row.getVisibleCells().map((cell: any) => (
                                <td key={cell.id} className="px-3 py-2.5">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    );
                })
            )}
        </tbody>
    );
}