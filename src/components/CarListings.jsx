import React, { useEffect, useState, useRef } from 'react';
import './CarListings.css';
import { getPlaceholderImage } from '../utils/fileUtils';

const CarListings = () => {
  const [cars, setCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filterOptions, setFilterOptions] = useState({
    make: '',
    model: '',
    year: '',
    fuelType: '',
    priceRange: [1000, 100000],
    mileageRange: [0, 200000],
    searchTerm: ''
  });
  
  const [filterMenuOpen, setFilterMenuOpen] = useState({
    make: false,
    model: false,
    year: false,
    fuelType: false
  });
  
  const [sortBy, setSortBy] = useState('latest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  
  // Filter options
  const makeOptions = ['Toyota', 'Honda', 'Ford', 'BMW', 'Tesla', 'Chevrolet', 'Audi', 'Mercedes-Benz', 'Lexus'];
  const yearOptions = ['2023', '2022', '2021', '2020', '2019', '2018', 'Older'];
  const fuelTypeOptions = ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid'];
  
  // Reference for handling outside clicks on dropdowns
  const dropdownRef = useRef(null);

  // Fetch cars from the database
  useEffect(() => {
    setLoading(true);
    fetch('/api/cars')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch vehicles: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Handle potential data structure issues
        if (!data || !Array.isArray(data.data)) {
          console.warn('Car data is not in expected format:', data);
          setCars([]);
          setFilteredCars([]);
        } else {
          setCars(data.data);
          setFilteredCars(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching vehicles:', err);
        setError(`Failed to load vehicles: ${err.message}`);
        setLoading(false);
      });
  }, []);

  // Dynamic model options based on selected make
  const getModelOptions = () => {
    if (!filterOptions.make) return ['Select make first'];
    
    // Get unique models from cars data where make matches
    const models = cars
      .filter(car => car && car.make && car.make.toLowerCase() === filterOptions.make.toLowerCase())
      .map(car => car.model)
      .filter((value, index, self) => value && self.indexOf(value) === index);
    
    return models.length > 0 ? models : ['No models found'];
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setFilterMenuOpen({
          make: false,
          model: false,
          year: false,
          fuelType: false
        });
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
    if (!cars || cars.length === 0) return;
    
    try {
      let filtered = [...cars];
      
      // Apply make filter
      if (filterOptions.make) {
        filtered = filtered.filter(car => 
          car && car.make && 
          car.make.toLowerCase() === filterOptions.make.toLowerCase()
        );
      }
      
      // Apply model filter
      if (filterOptions.model && filterOptions.model !== 'Select make first' && filterOptions.model !== 'No models found') {
        filtered = filtered.filter(car => 
          car && car.model && 
          car.model.toLowerCase() === filterOptions.model.toLowerCase()
        );
      }
      
      // Apply year filter
      if (filterOptions.year) {
        if (filterOptions.year === 'Older') {
          filtered = filtered.filter(car => 
            car && car.year && car.year < 2018
          );
        } else {
          const yearValue = parseInt(filterOptions.year);
          filtered = filtered.filter(car => 
            car && car.year && car.year === yearValue
          );
        }
      }
      
      // Apply fuel type filter
      if (filterOptions.fuelType) {
        filtered = filtered.filter(car => 
          car && car.fuel_type && 
          car.fuel_type.toLowerCase() === filterOptions.fuelType.toLowerCase()
        );
      }
      
      // Apply price range filter
      filtered = filtered.filter(car => {
        if (!car || car.price === undefined || car.price === null) return true;
        
        let price;
        try {
          price = typeof car.price === 'string' 
            ? parseFloat(car.price.replace(/[^0-9.-]+/g, ''))
            : car.price;
        } catch (e) {
          return true; // Include cars with unparseable prices
        }
        
        return !isNaN(price) && 
               price >= filterOptions.priceRange[0] && 
               price <= filterOptions.priceRange[1];
      });
      
      // Apply mileage range filter
      filtered = filtered.filter(car => {
        if (!car || car.mileage === undefined) return true;
        
        let mileage;
        try {
          mileage = typeof car.mileage === 'string' 
            ? parseFloat(car.mileage.replace(/[^0-9.-]+/g, ''))
            : car.mileage;
        } catch (e) {
          return true; // Include cars with unparseable mileage
        }
        
        return !isNaN(mileage) && 
               mileage >= filterOptions.mileageRange[0] && 
               mileage <= filterOptions.mileageRange[1];
      });
      
      // Apply search term filter
      if (filterOptions.searchTerm) {
        const term = filterOptions.searchTerm.toLowerCase();
        filtered = filtered.filter(car => 
          (car && car.make && car.make.toLowerCase().includes(term)) ||
          (car && car.model && car.model.toLowerCase().includes(term)) ||
          (car && car.color && car.color.toLowerCase().includes(term)) ||
          (car && car.fuel_type && car.fuel_type.toLowerCase().includes(term))
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
              const getPrice = (car) => {
                if (!car || car.price === undefined) return 0;
                try {
                  return typeof car.price === 'string' ? 
                    parseFloat(car.price.replace(/[^0-9.-]+/g, '')) : car.price;
                } catch (e) {
                  return 0;
                }
              };
              
              return getPrice(b) - getPrice(a);
            });
            break;
          case 'price_low':
            filtered.sort((a, b) => {
              const getPrice = (car) => {
                if (!car || car.price === undefined) return 0;
                try {
                  return typeof car.price === 'string' ? 
                    parseFloat(car.price.replace(/[^0-9.-]+/g, '')) : car.price;
                } catch (e) {
                  return 0;
                }
              };
              
              return getPrice(a) - getPrice(b);
            });
            break;
          case 'year_new':
            filtered.sort((a, b) => {
              if (!a || !a.year) return 1;
              if (!b || !b.year) return -1;
              return b.year - a.year;
            });
            break;
          case 'year_old':
            filtered.sort((a, b) => {
              if (!a || !a.year) return 1;
              if (!b || !b.year) return -1;
              return a.year - b.year;
            });
            break;
          case 'mileage_low':
            filtered.sort((a, b) => {
              const getMileage = (car) => {
                if (!car || car.mileage === undefined) return 0;
                try {
                  return typeof car.mileage === 'string' ? 
                    parseFloat(car.mileage.replace(/[^0-9.-]+/g, '')) : car.mileage;
                } catch (e) {
                  return 0;
                }
              };
              
              return getMileage(a) - getMileage(b);
            });
            break;
          default:
            break;
        }
      } catch (sortError) {
        console.error('Error sorting cars:', sortError);
      }
      
      setFilteredCars(filtered);
    } catch (filterError) {
      console.error('Error filtering cars:', filterError);
      setFilteredCars(cars);
    }
  }, [cars, filterOptions, sortBy]);

  // Toggle filter menu
  const toggleFilterMenu = (filterName) => {
    setFilterMenuOpen({
      ...filterMenuOpen,
      [filterName]: !filterMenuOpen[filterName]
    });
  };

  // Handle filter selection
  const handleFilterSelect = (filterName, value) => {
    // If selecting a new make, reset the model
    if (filterName === 'make') {
      setFilterOptions({
        ...filterOptions,
        make: value,
        model: ''
      });
    } else {
      setFilterOptions({
        ...filterOptions,
        [filterName]: value
      });
    }
    toggleFilterMenu(filterName);
  };

  // Toggle sort menu
  const toggleSortMenu = () => {
    setSortMenuOpen(!sortMenuOpen);
  };

  // Handle sort selection
  const handleSortSelect = (value) => {
    setSortBy(value);
    toggleSortMenu();
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

  // Format mileage for display
  const formatMileage = (mileage) => {
    if (!mileage) return 'N/A';
    
    if (typeof mileage === 'string') {
      if (mileage.toLowerCase().includes('mile')) return mileage;
      const num = parseFloat(mileage);
      return isNaN(num) ? 'N/A' : `${num.toLocaleString()} miles`;
    }
    
    return `${mileage.toLocaleString()} miles`;
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

  // Extract tags from car data
  const extractTags = (car) => {
    if (!car) return [];
    
    const tags = [];
    
    if (car.year) tags.push(car.year.toString());
    if (car.fuel_type) tags.push(car.fuel_type);
    if (car.mileage) tags.push(formatMileage(car.mileage).replace(' miles', ''));
    if (car.color) tags.push(car.color);
    
    return tags;
  };

  // Get vehicle title
  const getVehicleTitle = (car) => {
    if (!car) return 'Unknown Vehicle';
    
    let title = '';
    
    if (car.year) title += car.year + ' ';
    if (car.make) title += car.make + ' ';
    if (car.model) title += car.model;
    
    return title.trim() || 'Unknown Vehicle';
  };

  return (
    <div className="car-listings-container" ref={dropdownRef}>
      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search for vehicles..."
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
          <p>Loading vehicles...</p>
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
      {!loading && !error && filteredCars.length === 0 && (
        <div className="no-results">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 9L9 15" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9L15 15" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>No vehicles found</h3>
          <p>Try adjusting your filters or search criteria</p>
          <button 
            onClick={() => {
              setFilterOptions({
                make: '',
                model: '',
                year: '',
                fuelType: '',
                priceRange: [1000, 100000],
                mileageRange: [0, 200000],
                searchTerm: ''
              });
            }} 
            className="clear-filters-button"
          >
            Clear All Filters
          </button>
        </div>
      )}
      
      {/* Search filters */}
      <div className="search-filters">
        <div className="filter-group">
          <div className="filter-select" onClick={() => toggleFilterMenu('make')}>
            {filterOptions.make || 'Make'}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            
            {filterMenuOpen.make && (
              <div className="filter-dropdown">
                {makeOptions.map((option, index) => (
                  <div 
                    key={index} 
                    className="filter-option"
                    onClick={() => handleFilterSelect('make', option)}
                  >
                    {option}
                  </div>
                ))}
                <div 
                  className="filter-option clear-option"
                  onClick={() => handleFilterSelect('make', '')}
                >
                  Clear Selection
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="filter-group">
          <div className={`filter-select ${!filterOptions.make ? 'disabled' : ''}`} onClick={() => filterOptions.make && toggleFilterMenu('model')}>
            {filterOptions.model || 'Model'}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            
            {filterMenuOpen.model && filterOptions.make && (
              <div className="filter-dropdown">
                {getModelOptions().map((option, index) => (
                  <div 
                    key={index} 
                    className={`filter-option ${option === 'Select make first' || option === 'No models found' ? 'disabled' : ''}`}
                    onClick={() => option !== 'Select make first' && option !== 'No models found' && handleFilterSelect('model', option)}
                  >
                    {option}
                  </div>
                ))}
                {filterOptions.model && (
                  <div 
                    className="filter-option clear-option"
                    onClick={() => handleFilterSelect('model', '')}
                  >
                    Clear Selection
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="filter-group">
          <div className="filter-select" onClick={() => toggleFilterMenu('year')}>
            {filterOptions.year || 'Year'}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            
            {filterMenuOpen.year && (
              <div className="filter-dropdown">
                {yearOptions.map((option, index) => (
                  <div 
                    key={index} 
                    className="filter-option"
                    onClick={() => handleFilterSelect('year', option)}
                  >
                    {option}
                  </div>
                ))}
                <div 
                  className="filter-option clear-option"
                  onClick={() => handleFilterSelect('year', '')}
                >
                  Clear Selection
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="filter-group">
          <div className="filter-select" onClick={() => toggleFilterMenu('fuelType')}>
            {filterOptions.fuelType || 'Fuel Type'}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            
            {filterMenuOpen.fuelType && (
              <div className="filter-dropdown">
                {fuelTypeOptions.map((option, index) => (
                  <div 
                    key={index} 
                    className="filter-option"
                    onClick={() => handleFilterSelect('fuelType', option)}
                  >
                    {option}
                  </div>
                ))}
                <div 
                  className="filter-option clear-option"
                  onClick={() => handleFilterSelect('fuelType', '')}
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
            min="1000" 
            max="100000" 
            value={filterOptions.priceRange[1]} 
            onChange={(e) => setFilterOptions({...filterOptions, priceRange: [filterOptions.priceRange[0], parseInt(e.target.value)]})} 
            className="price-slider"
          />
        </div>
      </div>
      
      {/* Car listings with sorting */}
      {!loading && !error && filteredCars.length > 0 && (
        <>
          <div className="listings-header">
            <h2>Available Vehicles <span className="count">{filteredCars.length}</span></h2>
            
            <div className="sort-dropdown">
              <div className="sort-button" onClick={toggleSortMenu}>
                Sort by: {sortBy === 'latest' ? 'Latest' : 
                         sortBy === 'oldest' ? 'Oldest' :
                         sortBy === 'price_high' ? 'Highest Price' :
                         sortBy === 'price_low' ? 'Lowest Price' :
                         sortBy === 'year_new' ? 'Newest Model' :
                         sortBy === 'year_old' ? 'Oldest Model' :
                         sortBy === 'mileage_low' ? 'Lowest Mileage' : 'Latest'}
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              {sortMenuOpen && (
                <div className="sort-menu">
                  <div className="sort-option" onClick={() => handleSortSelect('latest')}>Latest</div>
                  <div className="sort-option" onClick={() => handleSortSelect('oldest')}>Oldest</div>
                  <div className="sort-option" onClick={() => handleSortSelect('price_high')}>Highest Price</div>
                  <div className="sort-option" onClick={() => handleSortSelect('price_low')}>Lowest Price</div>
                  <div className="sort-option" onClick={() => handleSortSelect('year_new')}>Newest Model</div>
                  <div className="sort-option" onClick={() => handleSortSelect('year_old')}>Oldest Model</div>
                  <div className="sort-option" onClick={() => handleSortSelect('mileage_low')}>Lowest Mileage</div>
                </div>
              )}
            </div>
          </div>
          
          <div className="cars-grid">
            {filteredCars.map((car, index) => (
              <div key={car.id || index} className="car-card">
                <div className="car-date">{formatDate(car.created_at)}</div>
                <div className="car-bookmark">
                  <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 19L8 14L1 19V3C1 2.46957 1.21071 1.96086 1.58579 1.58579C1.96086 1.21071 2.46957 1 3 1H13C13.5304 1 14.0391 1.21071 14.4142 1.58579C14.7893 1.96086 15 2.46957 15 3V19Z" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                
                <div className="car-image-placeholder">
                  {car.image_url ? (
                    <img 
                      src={car.image_url} 
                      alt={getVehicleTitle(car)}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getPlaceholderImage('car');
                      }}
                      className="car-image"
                    />
                  ) : (
                    <div className="placeholder-text">{car.make ? car.make.substring(0, 1) : 'C'}</div>
                  )}
                </div>
                
                <div className="car-title">{getVehicleTitle(car)}</div>
                
                <div className="car-tags">
                  {extractTags(car).map((tag, i) => (
                    <span key={i} className="car-tag">{tag}</span>
                  ))}
                </div>
                
                <div className="car-details">
                  <div className="mileage-info">{formatMileage(car.mileage)}</div>
                  {car.fuel_type && <div className="fuel-info">{car.fuel_type}</div>}
                </div>
                
                <div className="car-price">
                  <div className="price-value">{formatPrice(car.price)}</div>
                  <button className="details-button">Details</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CarListings;