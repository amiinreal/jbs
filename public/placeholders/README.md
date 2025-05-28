# Placeholder Images

These placeholder images are used when listing images are not available or fail to load.

## Files:
- house-placeholder.jpg: Used for house listings
- car-placeholder.jpg: Used for car listings
- job-placeholder.jpg: Used for job listings
- item-placeholder.jpg: Used for item listings
- user-placeholder.jpg: Used for user profiles
- default-placeholder.jpg: Used as a generic fallback

## Usage

These images are served through the `getPlaceholderImage` utility function in `/src/utils/fileUtils.js`:

```javascript
import { getPlaceholderImage } from '../utils/fileUtils';

// Get a house placeholder
const housePlaceholder = getPlaceholderImage('house');
```

For convenience, you can also use the `PlaceholderImage` component which handles errors automatically:

```jsx
import PlaceholderImage from '../components/common/PlaceholderImage';

// In your component:
<PlaceholderImage 
  src={imageUrl} 
  alt="House image" 
  type="house" 
  className="listing-image"
/>
```

## Adding New Placeholders

To add new placeholder types, update the `getPlaceholderImage` function in `fileUtils.js` and add the corresponding image file in this directory.
