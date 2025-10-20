import React from 'react';

interface SkeletonIconProps {
  isProcessing: boolean;
}

export const SkeletonIcon: React.FC<SkeletonIconProps> = ({ isProcessing }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-48 h-48 text-gray-200"
    >
        {/* Skull shape */}
        <path d="M12,2A10,10,0,0,0,2,12A10,10,0,0,0,12,22A10,10,0,0,0,22,12A10,10,0,0,0,12,2M12,4A8,8,0,0,1,20,12C20,13.19,19.63,14.3,19,15.28V16A3,3,0,0,0,16,19H8A3,3,0,0,0,5,16V15.28C4.37,14.3,4,13.19,4,12A8,8,0,0,1,12,4M8.5,8A1.5,1.5,0,0,0,7,9.5A1.5,1.5,0,0,0,8.5,11A1.5,1.5,0,0,0,10,9.5A1.5,1.5,0,0,0,8.5,8M15.5,8A1.5,1.5,0,0,0,14,9.5A1.5,1.5,0,0,0,15.5,11A1.5,1.5,0,0,0,17,9.5A1.5,1.5,0,0,0,15.5,8M8,13V15H9V13H8M10.5,13V15H11.5V13H10.5M13,13V15H14V13H13M15.5,13V15H16.5V13H15.5Z" />
        
        {/* Eye sockets filled with black */}
        <circle cx="8.5" cy="9.5" r="1.5" fill="black" />
        <circle cx="15.5" cy="9.5" r="1.5" fill="black" />

        {/* Animated glowing pupils */}
        <circle 
            cx="8.5" 
            cy="9.5" 
            r="1" 
            className={`transition-colors duration-300 ${isProcessing ? 'fill-red-500 animate-pulse' : 'fill-black'}`} 
        />
        <circle 
            cx="15.5" 
            cy="9.5" 
            r="1" 
            className={`transition-colors duration-300 ${isProcessing ? 'fill-red-500 animate-pulse' : 'fill-black'}`} 
        />
    </svg>
);