import './DataTable.css'

const DataTable = ({
    headers,
    children,
    gridTemplate,
    pagination,
}) => {
    const page = pagination?.page ?? 1
    const totalPages = pagination?.totalPages ?? 1
    const total = pagination?.total ?? 0
    const perPage = pagination?.perPage ?? 0
    const onPageChange = pagination?.onPageChange

    const isPaginated = Boolean(onPageChange && totalPages > 1)
    const rangeStart = total ? (page - 1) * perPage + 1 : 0
    const rangeEnd = total ? Math.min(page * perPage, total) : 0

    const goToPage = (nextPage) => {
        if (!onPageChange) return
        if (nextPage < 1 || nextPage > totalPages) return
        if (nextPage === page) return
        onPageChange(nextPage)
    }

    const getVisiblePages = () => {
        const pages = []
        const start = Math.max(1, page - 2)
        const end = Math.min(totalPages, page + 2)
        for (let current = start; current <= end; current += 1) {
            pages.push(current)
        }
        return pages
    }

    return (
        <div className="data-table-container">
            <div className="table-header" style={{ gridTemplateColumns: gridTemplate }}>
                {headers.map((header, index) => (
                    <span key={index}>{header}</span>
                ))}
            </div>
            <div className="table-body">
                {children}
            </div>
            {isPaginated && (
                <div className="table-pagination">
                    <div className="pagination-info">
                        Showing {rangeStart}-{rangeEnd} of {total}
                    </div>
                    <div className="pagination-controls">
                        <button
                            type="button"
                            className="pagination-btn"
                            onClick={() => goToPage(page - 1)}
                            disabled={page <= 1}
                        >
                            Prev
                        </button>
                        {getVisiblePages().map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={`pagination-btn page ${item === page ? 'active' : ''}`}
                                onClick={() => goToPage(item)}
                            >
                                {item}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="pagination-btn"
                            onClick={() => goToPage(page + 1)}
                            disabled={page >= totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DataTable
