import type { ReactNode } from 'react';

export type DataTableColumn<T> = {
    key: string;
    header: string;
    render: (item: T) => ReactNode;
};

export function DataTable<T>({
    columns,
    rows,
    emptyText = 'No records yet.',
}: {
    columns: DataTableColumn<T>[];
    rows: T[];
    emptyText?: string;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
            <table className="w-full text-left text-sm">
                <thead className="bg-muted/40">
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key} className="px-4 py-3 font-medium">
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={index} className="border-t">
                            {columns.map((column) => (
                                <td key={column.key} className="px-4 py-3">
                                    {column.render(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {rows.length === 0 ? (
                        <tr>
                            <td className="px-4 py-6 text-muted-foreground" colSpan={columns.length}>
                                {emptyText}
                            </td>
                        </tr>
                    ) : null}
                </tbody>
            </table>
        </div>
    );
}
