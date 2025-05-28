import React, { useEffect, useState, useRef } from 'react';
import './ItemListings.css';

const ItemListings = () => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  
  // Filter states
  const [filterOptions, setFilterOptions] = useState({
    category: '',
    condition: '',
    priceRange: [0, 2000],
    searchTerm: ''
  });
  
  const [filterMenuOpen, setFilterMenuOpen] = useState({
    category: false,
    condition: false,
    sortBy: false
  });
  
  const [sortBy, setSortBy] = useState('latest');
  
  // Filter options
  const conditionOptions = ['New', 'Like New', 'Good', 'Fair', 'Used'];
  
  // Reference for handling outside clicks on dropdowns
  const dropdownRef = useRef(null);

  // Fetch items from the database
  useEffect(() => {
    setLoading(true);
    
    // Fetch items
    fetch('/api/items', {
      credentials: 'include' // Include credentials for authenticated requests
    })
      .then(response => {
        if (response.status === 401) {
          // Handle unauthorized specifically
          setError('Please log in to view marketplace items');
          throw new Error('Authentication required');
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch items: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data || !Array.isArray(data.data)) {
          console.warn('Item data is not in expected format:', data);
          setItems([]);
          setFilteredItems([]);
        } else {
          setItems(data.data);
          setFilteredItems(data.data);
          
          // Extract unique categories from the items
          const uniqueCategories = [...new Set(
            data.data
              .map(item => item.category)
              .filter(Boolean)
          )];
          setCategories(uniqueCategories);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching items:', err);
        if (!err.message.includes('Authentication required')) {
          setError(`Failed to load items: ${err.message}`);
        }
        setLoading(false);
      });
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setFilterMenuOpen({
          category: false,
          condition: false,
          sortBy: false
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Apply filters whenever filter options change
  useEffect(() => {
    if (!items || items.length === 0) return;
    
    try {
      let filtered = [...items];
      
      // Apply category filter
      if (filterOptions.category) {
        filtered = filtered.filter(item => 
          item && item.category && 
          item.category.toLowerCase() === filterOptions.category.toLowerCase()
        );
      }
      
      // Apply condition filter
      if (filterOptions.condition) {
        filtered = filtered.filter(item => 
          item && item.condition && 
          item.condition.toLowerCase() === filterOptions.condition.toLowerCase()
        );
      }
      
      // Apply price range filter
      filtered = filtered.filter(item => {
        if (!item || item.price === undefined || item.price === null) return true;
        
        let price;
        try {
          price = typeof item.price === 'string' 
            ? parseFloat(item.price.replace(/[^0-9.-]+/g, ''))
            : item.price;
        } catch (e) {
          return true; // Include items with unparseable prices
        }
        
        return !isNaN(price) && 
               price >= filterOptions.priceRange[0] && 
               price <= filterOptions.priceRange[1];
      });
      
      // Apply search term filter
      if (filterOptions.searchTerm) {
        const term = filterOptions.searchTerm.toLowerCase();
        filtered = filtered.filter(item => 
          (item && item.name && item.name.toLowerCase().includes(term)) ||
          (item && item.description && item.description.toLowerCase().includes(term)) ||
          (item && item.category && item.category.toLowerCase().includes(term))
        );
      }
      
      // Apply sorting
      try {
        switch(sortBy) {
          case 'latest':
            filtered.sort((a, b) => {
              if (!a || !a.created_at) return 1;
              if (!b || !b.created_at) return -1;
              return new Date(b.created_at) - new Date(a.created_at);
            });
            break;
          case 'oldest':
            filtered.sort((a, b) => {
              if (!a || !a.created_at) return 1;
              if (!b || !b.created_at) return -1;
              return new Date(a.created_at) - new Date(b.created_at);
            });
            break;
          case 'price_high':
            filtered.sort((a, b) => {
              const getPrice = (item) => {
                if (!item || item.price === undefined) return 0;
                try {
                  return typeof item.price === 'string' ? 
                    parseFloat(item.price.replace(/[^0-9.-]+/g, '')) : item.price;
                } catch (e) {
                  return 0;
                }
              };
              
              return getPrice(b) - getPrice(a);
            });
            break;
          case 'price_low':
            filtered.sort((a, b) => {
              const getPrice = (item) => {
                if (!item || item.price === undefined) return 0;
                try {
                  return typeof item.price === 'string' ? 
                    parseFloat(item.price.replace(/[^0-9.-]+/g, '')) : item.price;
                } catch (e) {
                  return 0;
                }
              };
              
              return getPrice(a) - getPrice(b);
            });
            break;
          case 'alphabetical':
            filtered.sort((a, b) => {
              if (!a || !a.name) return 1;
              if (!b || !b.name) return -1;
              return a.name.localeCompare(b.name);
            });
            break;
          default:
            break;
        }
      } catch (sortError) {
        console.error('Error sorting items:', sortError);
      }
      
      setFilteredItems(filtered);
    } catch (filterError) {
      console.error('Error filtering items:', filterError);
      setFilteredItems(items);
    }
  }, [items, filterOptions, sortBy]);

  // Toggle filter menu
  const toggleFilterMenu = (filterName) => {
    setFilterMenuOpen({
      ...filterMenuOpen,
      [filterName]: !filterMenuOpen[filterName]
    });
  };

  // Handle filter selection
  const handleFilterSelect = (filterName, value) => {
    setFilterOptions({
      ...filterOptions,
      [filterName]: value
    });
    toggleFilterMenu(filterName);
  };

  // Handle sort selection
  const handleSortSelect = (value) => {
    setSortBy(value);
    toggleFilterMenu('sortBy');
  };

  // Format price for display
  const formatPrice = (price) => {
    if (price === undefined || price === null) return 'Price on request';
    
    if (typeof price === 'string') {
      if (price.includes('$')) return price;
      const num = parseFloat(price);
      return isNaN(num) ? 'Price on request' : `$${num.toLocaleString()}`;
    }
    
    return `$${price.toLocaleString()}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays < 1) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
      }
    } catch (e) {
      return '';
    }
  };

  // Get first letter of item name for placeholder
  const getItemFirstLetter = (item) => {
    if (!item || !item.name) return '?';
    return item.name.charAt(0).toUpperCase();
  };

  return (
    <div className="items-listing-container" ref={dropdownRef}>
      {/* Page header */}
      <div className="items-header">
        <h1>Marketplace</h1>
        <p>Browse items for sale from our community</p>
      </div>
      
      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search for items..."
          value={filterOptions.searchTerm}
          onChange={(e) => setFilterOptions({ ...filterOptions, searchTerm: e.target.value })}
        />
        <button className="search-button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Loading and error states */}
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading items...</p>
        </div>
      )}
      
      {error && !loading && (
        <div className="error-container">
          <div className="error-icon">!</div>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {/* No results message */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="no-results">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 9L9 15" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9L15 15" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>No items found</h3>
          <p>Try adjusting your filters or search criteria</p>
          <button 
            onClick={() => {
              setFilterOptions({
                category: '',
                condition: '',
                priceRange: [0, 2000],
                searchTerm: ''
              });
            }} 
            className="clear-filters-button"
          >
            Clear All Filters
          </button>
        </div>
      )}
      
      {/* Filters and sort */}
      {!loading && !error && (
        <div className="filters-and-sort">
          <div className="filters-row">
            {/* Category filter */}
            <div className="filter-group">
              <div className="filter-select" onClick={() => toggleFilterMenu('category')}>
                {filterOptions.category || 'All Categories'}
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                
                {filterMenuOpen.category && (
                  <div className="filter-dropdown">
                    <div 
                      className="filter-option"
                      onClick={() => handleFilterSelect('category', '')}
                    >
                      All Categories
                    </div>
                    {categories.map((category, index) => (
                      <div 
                        key={index} 
                        className="filter-option"
                        onClick={() => handleFilterSelect('category', category)}
                      >
                        {category}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Condition filter */}
            <div className="filter-group">
              <div className="filter-select" onClick={() => toggleFilterMenu('condition')}>
                {filterOptions.condition || 'Condition'}
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                
                {filterMenuOpen.condition && (
                  <div className="filter-dropdown">
                    {conditionOptions.map((option, index) => (
                      <div 
                        key={index} 
                        className="filter-option"
                        onClick={() => handleFilterSelect('condition', option)}
                      >
                        {option}
                      </div>
                    ))}
                    <div 
                      className="filter-option clear-option"
                      onClick={() => handleFilterSelect('condition', '')}
                    >
                      Clear Selection
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Price range slider */}
            <div className="price-range-filter">
              <div className="price-label">Price: ${filterOptions.priceRange[0]} - ${filterOptions.priceRange[1]}</div>
              <input 
                type="range" 
                min="0" 
                max="2000" 
                value={filterOptions.priceRange[1]} 
                onChange={(e) => setFilterOptions({...filterOptions, priceRange: [filterOptions.priceRange[0], parseInt(e.target.value)]})} 
                className="price-slider"
              />
            </div>
            
            {/* Sort filter */}
            <div className="sort-dropdown">
              <div className="sort-button" onClick={() => toggleFilterMenu('sortBy')}>
                Sort: {sortBy === 'latest' ? 'Latest' : 
                      sortBy === 'oldest' ? 'Oldest' :
                      sortBy === 'price_high' ? 'Highest Price' :
                      sortBy === 'price_low' ? 'Lowest Price' :
                      sortBy === 'alphabetical' ? 'A-Z' : 'Latest'}
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                
                {filterMenuOpen.sortBy && (
                  <div className="sort-menu">
                    <div className="sort-option" onClick={() => handleSortSelect('latest')}>Latest</div>
                    <div className="sort-option" onClick={() => handleSortSelect('oldest')}>Oldest</div>
                    <div className="sort-option" onClick={() => handleSortSelect('price_high')}>Highest Price</div>
                    <div className="sort-option" onClick={() => handleSortSelect('price_low')}>Lowest Price</div>
                    <div className="sort-option" onClick={() => handleSortSelect('alphabetical')}>A-Z</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Active filters */}
          {(filterOptions.category || filterOptions.condition || filterOptions.priceRange[1] < 2000) && (
            <div className="active-filters">
              <span className="active-filters-label">Active filters:</span>
              {filterOptions.category && (
                <span className="filter-tag">
                  Category: {filterOptions.category}
                  <button onClick={() => setFilterOptions({...filterOptions, category: ''})}>×</button>
                </span>
              )}
              {filterOptions.condition && (
                <span className="filter-tag">
                  Condition: {filterOptions.condition}
                  <button onClick={() => setFilterOptions({...filterOptions, condition: ''})}>×</button>
                </span>
              )}
              {filterOptions.priceRange[1] < 2000 && (
                <span className="filter-tag">
                  Max price: ${filterOptions.priceRange[1]}
                  <button onClick={() => setFilterOptions({...filterOptions, priceRange: [0, 2000]})}>×</button>
                </span>
              )}
              <button 
                className="clear-all-button"
                onClick={() => setFilterOptions({
                  category: '',
                  condition: '',
                  priceRange: [0, 2000],
                  searchTerm: ''
                })}
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Items grid */}
      {!loading && !error && filteredItems.length > 0 && (
        <div className="items-grid">
          {filteredItems.map((item, index) => (
            <div className="item-card" key={item.id || index}>
              <div className="item-image">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} />
                ) : (
                  <div className="placeholder-image">
                    <span>{getItemFirstLetter(item)}</span>
                  </div>
                )}
                <div className="item-date">{formatDate(item.created_at)}</div>
              </div>
              
              <div className="item-content">
                <h3 className="item-name">{item.name}</h3>
                <div className="item-price">{formatPrice(item.price)}</div>
                
                {item.condition && (
                  <div className="item-condition">
                    <span className={`condition-badge ${item.condition?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {item.condition}
                    </span>
                  </div>
                )}
                
                <p className="item-description">
                  {item.description && item.description.length > 100
                    ? `${item.description.substring(0, 100)}...`
                    : item.description || 'No description provided'}
                </p>
                
                {item.category && (
                  <div className="item-category">
                    <span className="category-tag">{item.category}</span>
                  </div>
                )}
                
                <div className="item-actions">
                  <button className="message-button">Message Seller</button>
                  <button className="details-button">View Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemListings;