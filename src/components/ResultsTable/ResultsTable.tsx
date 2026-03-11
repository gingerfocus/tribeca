"use client";

import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    SortingState,
    PaginationState,
    Table,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { DisplayRow, isSantaClara, formatTime, swimPaceStr, bikePaceStr, runPaceStr } from "@/lib/triathlon";
import { columns } from "./columns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableType = any;

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table: any = useReactTable({
        data,
        columns,
        state: { sorting, pagination },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
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

    return (
        <>
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
                        · {data.length > 0 ? table.getRowModel().rows[0].index + 1 : 0}–
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

function TableHeader({ table }: { table: ReturnType<typeof useReactTable> }) {
    return (
        <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    #
                </th>
                {table.getHeaderGroups().map((headerGroup) =>
                    headerGroup.headers.map((header) => (
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
    table: ReturnType<typeof useReactTable>;
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
                rows.map((row) => {
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
                            {row.getVisibleCells().map((cell) => (
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