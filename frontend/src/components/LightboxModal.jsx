import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const LightboxModal = ({ imageFile, onClose }) => {
  const [imageUrl, setImageUrl] = React.useState('');

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      
      // Cleanup
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [imageFile]);

  if (!imageFile) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors"
      >
        <X size={24} />
      </button>
      
      <img 
        src={imageUrl} 
        alt={imageFile.name} 
        className="max-w-3xl max-h-[80vh] rounded-lg shadow-2xl object-contain cursor-default animate-scale-in"
        onClick={(e) => e.stopPropagation()} 
      />
    </div>
  );
};

export default LightboxModal;
