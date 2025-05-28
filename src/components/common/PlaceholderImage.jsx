import React from 'react';
import { getPlaceholderImage } from '../../utils/fileUtils';

/**
 * A component that displays an image with a fallback placeholder
 * 
 * @param {Object} props - Component props
 * @param {string} props.src - Primary image source URL
 * @param {string} props.alt - Alt text for the image
 * @param {string} props.type - Type of placeholder ('house', 'car', 'job', 'item', 'user')
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @returns {JSX.Element} The image component with fallback
 */
const PlaceholderImage = ({ 
  src, 
  alt = 'Image',
  type = 'default',
  className = '',
  style = {},
  ...props
}) => {
  const [imgSrc, setImgSrc] = React.useState(src || getPlaceholderImage(type));
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setImgSrc(src || getPlaceholderImage(type));
    setHasError(false);
  }, [src, type]);

  const handleError = () => {
    if (!hasError) {
      setImgSrc(getPlaceholderImage(type));
      setHasError(true);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={className}
      style={style}
      {...props}
    />
  );
};

export default PlaceholderImage;
