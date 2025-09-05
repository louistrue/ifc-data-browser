import React from "react";

interface CoffeeSupportProps {
  className?: string;
}

const CoffeeSupport: React.FC<CoffeeSupportProps> = ({ className = "" }) => {
  return (
    <div className={`text-xs text-[var(--color-text-muted)] mt-1 lg:mt-0 text-center ${className}`}>
      <a
        href="https://buymeacoffee.com/louistrue"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Buy me a coffee"
        className="hover:text-[var(--color-primary)] transition-colors duration-300 inline-flex items-center"
      >
        <span>Made by Louis Trümpler</span>
        <img
          src="/icons8-buy-me-a-coffee-100.png"
          alt="Buy me a coffee"
          className="w-6 h-6 mx-1"
        />
        <span>If you enjoy using this free and open software, consider a contribution towards my coffee bill</span>
        <img
          src="/icons8-buy-me-a-coffee-100.png"
          alt="Buy me a coffee"
          className="w-6 h-6 ml-1"
        />
      </a>
    </div>
  );
};

export default CoffeeSupport;
