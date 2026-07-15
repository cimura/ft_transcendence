// frontend/src/components/common/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input: React.FC<InputProps> = ({ label, ...props }) => {
  return (
    <div className="flex flex-col mb-4">
      <label className="mb-2 text-xs tracking-widest text-lime opacity-80">
        {label}
      </label>
      <input
        className="
          px-4 py-3 
          bg-transparent text-lime 
          border border-galactic-border
          focus:outline-none focus:border-lime focus:shadow-[0_0_8px_rgba(176,255,0,0.3)]
          transition-all duration-300
        "
        {...props}
      />
    </div>
  );
};

export default Input;