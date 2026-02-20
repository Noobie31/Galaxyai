import React from 'react';

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'error' }) => {
    const styles = {
        default: 'bg-stone-100 text-stone-800',
        success: 'bg-green-100 text-green-800',
        error: 'bg-red-100 text-red-800',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[variant]}`}>
            {children}
        </span>
    );
};

export default Badge;
