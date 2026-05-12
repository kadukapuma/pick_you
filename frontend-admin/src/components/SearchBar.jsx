import './SearchBar.css'

const SearchBar = ({ value, onChange, placeholder = "Search..." }) => {
    return (
        <div className="search-container">
            <span className="material-icons search-icon">search</span>
            <input
                type="text"
                className="search-input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {value && (
                <button 
                    className="clear-search" 
                    onClick={() => onChange('')}
                    title="Clear search"
                >
                    <span className="material-icons">close</span>
                </button>
            )}
        </div>
    )
}

export default SearchBar
