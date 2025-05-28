import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HouseListings.css';
import { getImageUrl, getPlaceholderImage, handleImageError } from '../utils/fileUtils';
import useViewMode from '../hooks/useViewMode';

const HouseListings = ({ isAuthenticated }) => {
  const navigate = useNavigate();
  const [houses, setHouses] = useState([]);
  const [filteredHouses, setFilteredHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Use our custom hook for view mode
  const [viewMode, setViewMode] = useViewMode('houseListingsViewMode', 'grid');
  
  // Filter states
  const [filterOptions, setFilterOptions] = useState({
    propertyType: '',
    location: '',
    bedrooms: '',
    bathrooms: '',
    priceRange: [500, 100000], // This will be updated dynamically
    searchTerm: '',
    squareFootage: [0, 5000]
  });
  
  const [maxPrice, setMaxPrice] = useState(100000);
  
  const [filterMenuOpen, setFilterMenuOpen] = useState({
    propertyType: false,
    location: false,
    bedrooms: false,
    bathrooms: false
  });
  
  const [sortBy, setSortBy] = useState('latest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  
  // Add state for view type (grid or list)
  const [viewType, setViewType] = useState('grid');
  
  // Filter options
  const propertyTypeOptions = ['Apartment', 'House', 'Condo', 'Townhouse', 'Duplex', 'Studio'];
  const bedroomOptions = ['Studio', '1', '2', '3', '4', '5+'];
  const bathroomOptions = ['1', '1.5', '2', '2.5', '3+'];
  const locationOptions = ['City Center', 'Suburbs', 'Rural', 'Beachfront', 'Mountain'];
  
  // Reference for handling outside clicks on dropdowns
  const dropdownRef = useRef(null);

  // Fetch houses from the database
  useEffect(() => {
    setLoading(true);
    fetch('/api/houses')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch properties: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => { // Fixed: added parentheses around 'data' parameter
        // Handle potential data structure issues
        let housesData = [];
        if (!data || !Array.isArray(data.data)) {
          // Try to handle different response formats
          if (data && Array.isArray(data)) {
            housesData = data;
            setHouses(data);
            setFilteredHouses(data);
          } else {
            console.warn('House data is not in expected format:', data);
            setHouses([]);
            setFilteredHouses([]);
          }
        } else {
          housesData = data.data;
          setHouses(data.data);
          setFilteredHouses(data.data);
        }
        
        console.log('Houses data loaded:', housesData);
        
        // Find the maximum price in the dataset
        if (housesData.length > 0) {
          const highestPrice = housesData.reduce((max, house) => {
            if (!house || house.price === undefined || house.price === null) return max;
            
            let housePrice;
            try {
              housePrice = typeof house.price === 'string' 
                ? parseFloat(house.price.replace(/[^0-9.-]+/g, ''))
                : house.price;
            } catch (e) {
              return max;
            }
            
            return !isNaN(housePrice) && housePrice > max ? housePrice : max;
          }, 0);
          
          // Add 20% buffer to the highest price to allow for new listings
          const maxPriceWithBuffer = Math.ceil(highestPrice * 1.2);
          setMaxPrice(maxPriceWithBuffer);
          
          // Update the price range in filter options
          setFilterOptions(prev => ({
            ...prev,
            priceRange: [prev.priceRange[0], maxPriceWithBuffer]
          }));
        }
        
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching properties:', err);
        setError(`Failed to load properties: ${err.message}`);
        setLoading(false);
      });
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Close all filter menus
        setFilterMenuOpen({
          propertyType: false,
          location: false,
          bedrooms: false,
          bathrooms: false
        });
        
        // Close sort menu
        setSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Apply filters whenever filter options change
  useEffect(() => {
    if (!houses || houses.length === 0) return;
    
    try {
      let filtered = [...houses];
      
      // Apply property type filter
      if (filterOptions.propertyType) {
        filtered = filtered.filter(house => 
          house && house.type && 
          house.type.toLowerCase() === filterOptions.propertyType.toLowerCase()
        );
      }
      
      // Apply location filter
      if (filterOptions.location) {
        filtered = filtered.filter(house => 
          house && house.address && 
          house.address.toLowerCase().includes(filterOptions.location.toLowerCase())
        );
      }
      
      // Apply bedroom filter
      if (filterOptions.bedrooms) {
        const bedroomValue = filterOptions.bedrooms === '5+' 
          ? 5 
          : filterOptions.bedrooms === 'Studio'
            ? 0
            : parseInt(filterOptions.bedrooms);
            
        filtered = filtered.filter(house => {
          if (!house || house.number_of_bedrooms === undefined) return false;
          if (filterOptions.bedrooms === '5+') {
            return house.number_of_bedrooms >= 5;
          }
          return house.number_of_bedrooms === bedroomValue;
        });
      }
      
      // Apply bathroom filter
      if (filterOptions.bathrooms) {
        const bathroomValue = filterOptions.bathrooms === '3+' 
          ? 3 
          : parseFloat(filterOptions.bathrooms);
          
        filtered = filtered.filter(house => {
          if (!house || house.number_of_bathrooms === undefined) return false;
          if (filterOptions.bathrooms === '3+') {
            return house.number_of_bathrooms >= 3;
          }
          return house.number_of_bathrooms === bathroomValue;
        });
      }
      
      // Apply price range filter
      filtered = filtered.filter(house => {
        if (!house || house.price === undefined || house.price === null) return true;
        
        let price;
        try {
          price = typeof house.price === 'string' 
            ? parseFloat(house.price.replace(/[^0-9.-]+/g, ''))
            : house.price;
        } catch (e) {
          return true; // Include houses with unparseable prices
        }
        
        return !isNaN(price) && 
               price >= filterOptions.priceRange[0] && 
               price <= filterOptions.priceRange[1];
      });
      
      // Apply square footage filter
      filtered = filtered.filter(house => {
        if (!house || house.square_footage === undefined) return true;
        
        return house.square_footage >= filterOptions.squareFootage[0] && 
               house.square_footage <= filterOptions.squareFootage[1];
      });
      
      // Apply search term filter
      if (filterOptions.searchTerm) {
        const term = filterOptions.searchTerm.toLowerCase();
        filtered = filtered.filter(house => 
          (house && house.address && house.address.toLowerCase().includes(term)) ||
          (house && house.description && house.description.toLowerCase().includes(term))
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
              const getPrice = (house) => {
                if (!house || house.price === undefined) return 0;
                try {
                  return typeof house.price === 'string' ? 
                    parseFloat(house.price.replace(/[^0-9.-]+/g, '')) : house.price;
                } catch (e) {
                  return 0;
                }
              };
              
              return getPrice(b) - getPrice(a);
            });
            break;
          case 'price_low':
            filtered.sort((a, b) => {
              const getPrice = (house) => {
                if (!house || house.price === undefined) return 0;
                try {
                  return typeof house.price === 'string' ? 
                    parseFloat(house.price.replace(/[^0-9.-]+/g, '')) : house.price;
                } catch (e) {
                  return 0;
                }
              };
              
              return getPrice(a) - getPrice(b);
            });
            break;
          case 'size_high':
            filtered.sort((a, b) => {
              if (!a || !a.square_footage) return 1;
              if (!b || !b.square_footage) return -1;
              return b.square_footage - a.square_footage;
            });
            break;
          case 'size_low':
            filtered.sort((a, b) => {
              if (!a || !a.square_footage) return 1;
              if (!b || !b.square_footage) return -1;
              return a.square_footage - b.square_footage;
            });
            break;
          default:
            break;
        }
      } catch (sortError) {
        console.error('Error sorting houses:', sortError);
      }
      
      setFilteredHouses(filtered);
    } catch (filterError) {
      console.error('Error filtering houses:', filterError);
      setFilteredHouses(houses);
    }
  }, [houses, filterOptions, sortBy]);

  // Toggle filter menu - update to close other open menus
  const toggleFilterMenu = (filterName) => {
    setFilterMenuOpen(prevState => {
      // Close all other menus first
      const newState = Object.keys(prevState).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {});
      
      // Toggle the selected menu
      newState[filterName] = !prevState[filterName];
      
      // If we're opening a filter, make sure sort menu is closed
      if (newState[filterName]) {
        setSortMenuOpen(false);
      }
      
      return newState;
    });
  };

  // Toggle sort menu - update to close filter menus
  const toggleSortMenu = () => {
    setSortMenuOpen(prevState => {
      const newState = !prevState;
      
      // If opening sort menu, close all filter menus
      if (newState) {
        setFilterMenuOpen({
          propertyType: false,
          location: false,
          bedrooms: false,
          bathrooms: false
        });
      }
      
      return newState;
    });
  };

  // Toggle view type
  const toggleViewType = (type) => {
    setViewType(type);
    setViewMode(type); // This updates the persisted view mode
  };

  // Format price for display
  const formatPrice = (price) => {
    if (!price) return 'Price on request';
    
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
      
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (e) {
      return '';
    }
  };

  // Extract tags from house data
  const extractTags = (house) => {
    if (!house) return [];
    
    const tags = [];
    
    if (house.number_of_bedrooms !== undefined) {
      tags.push(`${house.number_of_bedrooms} ${house.number_of_bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}`);
    }
    
    if (house.number_of_bathrooms !== undefined) {
      tags.push(`${house.number_of_bathrooms} ${house.number_of_bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}`);
    }
    
    if (house.square_footage) {
      tags.push(`${house.square_footage} sq ft`);
    }
    
    return tags;
  };

  // Debug rendering - add this before the return statement
  useEffect(() => {
    console.log('Current houses state:', houses);
    console.log('Current filtered houses state:', filteredHouses);
  }, [houses, filteredHouses]);

  const handleContactClick = (e, houseId) => {
    e.preventDefault(); // Stop the navigation to detail page
    
    if (!isAuthenticated) {
      // Save location to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', `/houses/${houseId}`);
      navigate('/login', {
        state: { message: 'Please sign in to contact the seller' }
      });
      return;
    }
    
    // If authenticated, go to house detail page
    navigate(`/houses/${houseId}`);
  };
  
  const HouseCard = ({ house }) => {
    // Get the first image or use a placeholder
    const firstImage = house.image_urls && Array.isArray(house.image_urls) && house.image_urls.length > 0 
      ? house.image_urls[0] 
      : (house.image_url || '/placeholder-house.jpg');

    return (
      <div className="house-card">
        <Link to={`/houses/${house.id}`} className="house-image-container">
          <img 
            src={firstImage} 
            alt={house.address} 
            className="house-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/placeholder-house.jpg';
            }}
          />
        </Link>
        <div className="house-info">
          <Link to={`/houses/${house.id}`} className="house-title">{house.address}</Link>
          <p className="house-price">${house.price ? house.price.toLocaleString() : 'Contact for price'}</p>
          <div className="house-details">
            <span>{house.number_of_bedrooms} bed</span>
            <span>{house.number_of_bathrooms} bath</span>
            <span>{house.square_footage ? `${house.square_footage.toLocaleString()} sqft` : 'N/A'}</span>
          </div>
        </div>
      </div>
    );
  };

  // Add these missing handler functions
  const handleFilterSelect = (filterType, value) => {
    // Close the dropdown
    setFilterMenuOpen(prevState => ({
      ...prevState,
      [filterType]: false
    }));
    
    // Update the filter value
    setFilterOptions(prevState => ({
      ...prevState,
      [filterType]: value
    }));
  };

  const handleSortSelect = (sortOption) => {
    // Set the sort option
    setSortBy(sortOption);
    
    // Close the sort menu
    setSortMenuOpen(false);
  };

  return (
    <div className="house-listings-container" ref={dropdownRef}>
      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search for properties..."
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
          <p>Loading properties...</p>
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
      {!loading && !error && filteredHouses.length === 0 && (
        <div className="no-results">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 9L9 15" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9L15 15" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>No properties found</h3>
          <p>Try adjusting your filters or search criteria</p>
          <button 
            onClick={() => {
              setFilterOptions({
                propertyType: '',
                location: '',
                bedrooms: '',
                bathrooms: '',
                priceRange: [500, maxPrice || 100000],
                searchTerm: '',
                squareFootage: [0, 5000]
              });
            }} 
            className="clear-filters-button"
          >
            Clear All Filters
          </button>
        </div>
      )}
      
      {/* Remove the debug info for production */}
      {/*
      {!loading && !error && (
        <div style={{padding: '10px', background: '#f8f9fa', margin: '10px 0', borderRadius: '4px'}}>
          <p>Houses loaded: {houses.length}</p>
          <p>Filtered houses: {filteredHouses.length}</p>
        </div>
      )}
      */}

      {/* Search filters */}
      <div className="search-filters">
        <div className={`filter-group ${filterMenuOpen.propertyType ? 'active' : ''}`}>
          <div className="filter-select" onClick={() => toggleFilterMenu('propertyType')}>
            {filterOptions.propertyType || 'Property type'}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          {filterMenuOpen.propertyType && (
            <div className="filter-dropdown">
              {propertyTypeOptions.map((option, index) => (
                <div 
                  key={index} 
                  className="filter-option"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent bubbling to parent
                    handleFilterSelect('propertyType', option);
                  }}
                >
                  {option}
                </div>
              ))}
              <div 
                className="filter-option clear-option"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent bubbling to parent
                  handleFilterSelect('propertyType', '');
                }}
              >
                Clear Selection
              </div>
            </div>
          )}
        </div>
        
        <div className={`filter-group ${filterMenuOpen.bedrooms ? 'active' : ''}`}>
          <div className="filter-select" onClick={() => toggleFilterMenu('bedrooms')}>
            {filterOptions.bedrooms || 'Bedrooms'}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            
            {filterMenuOpen.bedrooms && (
              <div className="filter-dropdown">
                {bedroomOptions.map((option, index) => (
                  <div 
                    key={index} 
                    className="filter-option"
                    onClick={() => handleFilterSelect('bedrooms', option)}
                  >
                    {option}
                  </div>
                ))}
                <div 
                  className="filter-option clear-option"
                  onClick={() => handleFilterSelect('bedrooms', '')}
                >
                  Clear Selection
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={`filter-group ${filterMenuOpen.bathrooms ? 'active' : ''}`}>
          <div className="filter-select" onClick={() => toggleFilterMenu('bathrooms')}>
            {filterOptions.bathrooms || 'Bathrooms'}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            
            {filterMenuOpen.bathrooms && (
              <div className="filter-dropdown">
                {bathroomOptions.map((option, index) => (
                  <div 
                    key={index} 
                    className="filter-option"
                    onClick={() => handleFilterSelect('bathrooms', option)}
                  >
                    {option}
                  </div>
                ))}
                <div 
                  className="filter-option clear-option"
                  onClick={() => handleFilterSelect('bathrooms', '')}
                >
                  Clear Selection
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Price range slider */}
        <div className="price-range-filter">
          <div className="price-label">Price: ${filterOptions.priceRange[0].toLocaleString()} - ${filterOptions.priceRange[1].toLocaleString()}</div>
          <input 
            type="range" 
            min="500" 
            max={maxPrice} 
            value={filterOptions.priceRange[1]} 
            onChange={(e) => setFilterOptions({...filterOptions, priceRange: [filterOptions.priceRange[0], parseInt(e.target.value)]})} 
            className="price-slider"
          />
        </div>
      </div>
      
      {/* House listings with sorting */}
      {!loading && !error && filteredHouses.length > 0 && (
        <>
          <div className="listings-header">
            <h2>Available Properties <span className="count">{filteredHouses.length}</span></h2>
            
            <div className="header-controls">
              {/* Add view toggle buttons */}
              <div className="view-toggle">
                <button 
                  className={`view-toggle-button ${viewType === 'grid' ? 'active' : ''}`}
                  onClick={() => toggleViewType('grid')}
                  aria-label="Grid View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
                  </svg>
                </button>
                <button 
                  className={`view-toggle-button ${viewType === 'list' ? 'active' : ''}`}
                  onClick={() => toggleViewType('list')}
                  aria-label="List View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                  </svg>
                </button>
              </div>
              
              <div className="sort-dropdown">
                <div className="sort-button" onClick={toggleSortMenu}>
                  Sort by: {sortBy === 'latest' ? 'Latest' : 
                           sortBy === 'oldest' ? 'Oldest' :
                           sortBy === 'price_high' ? 'Highest Price' :
                           sortBy === 'price_low' ? 'Lowest Price' :
                           sortBy === 'size_high' ? 'Largest' :
                           sortBy === 'size_low' ? 'Smallest' : 'Latest'}
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                
                {sortMenuOpen && (
                  <div className="sort-menu">
                    <div className="sort-option" onClick={(e) => {
                      e.stopPropagation();
                      handleSortSelect('latest');
                    }}>Latest</div>
                    <div className="sort-option" onClick={(e) => {
                      e.stopPropagation();
                      handleSortSelect('oldest');
                    }}>Oldest</div>
                    <div className="sort-option" onClick={(e) => {
                      e.stopPropagation();
                      handleSortSelect('price_high');
                    }}>Highest Price</div>
                    <div className="sort-option" onClick={(e) => {
                      e.stopPropagation();
                      handleSortSelect('price_low');
                    }}>Lowest Price</div>
                    <div className="sort-option" onClick={(e) => {
                      e.stopPropagation();
                      handleSortSelect('size_high');
                    }}>Largest</div>
                    <div className="sort-option" onClick={(e) => {
                      e.stopPropagation();
                      handleSortSelect('size_low');
                    }}>Smallest</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className={viewType === 'grid' ? 'houses-grid' : 'houses-list'}>
            {filteredHouses.map((house, index) => {
              const imageUrl = getImageUrl(house) || getPlaceholderImage('house');
              
              return (
                <Link to={`/houses/${house.id}`} key={house.id} className="listing-card">
                  <div className="listing-image">
                    <img 
                      src={imageUrl} 
                      alt={house.title || house.address} 
                      onError={(e) => handleImageError(e, 'house')}
                    />
                  </div>
                  
                  <div className="house-info">
                    {/* Show full title if available, otherwise address */}
                    <div className="house-title">{house.title || 'Untitled Property'}</div>
                    
                    {/* Always show full address */}
                    <div className="house-address" title={house.address}>
                      {house.address}
                    </div>
                    
                    <p className="house-price">${house.price ? house.price.toLocaleString() : 'Contact for price'}</p>
                    <div className="house-details">
                      <span>{house.number_of_bedrooms} bed</span>
                      <span>{house.number_of_bathrooms} bath</span>
                      <span>{house.square_footage ? `${house.square_footage.toLocaleString()} sqft` : 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="house-actions">
                    <button 
                      className="contact-seller-btn"
                      onClick={(e) => handleContactClick(e, house.id)}
                    >
                      {isAuthenticated ? 'Contact Seller' : 'Sign in to Contact'}
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Add fallback content when API returns empty but valid response */}
      {!loading && !error && houses.length === 0 && (
        <div className="no-listings-message">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22V12H15V22" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>No Property Listings Available</h3>
          <p>There are currently no properties listed for sale or rent.</p>
          <button className="action-button" onClick={() => window.location.href = '/new-ad?type=house'}>Be the first to list a property</button>
        </div>
      )}
    </div>
  );
};

export default HouseListings;