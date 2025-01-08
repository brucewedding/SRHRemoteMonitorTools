import React from 'react';
import { createHeader } from '../../../components/Components';
import { ThemeToggle } from '../../../components/ThemeToggle';

export function DashboardHeader({ 
    status, 
    lastUpdate, 
    isDetailedView, 
    onToggleView, 
    theme, 
    onThemeChange,
    onOpenChat,
    systemId 
}) {
    return (
        <div className="flex flex-col gap-4 mb-6">
            {createHeader(
                status, 
                lastUpdate, 
                isDetailedView, 
                onToggleView, 
                theme, 
                onOpenChat,
                systemId
            )}
            <div className="flex justify-end">
                <ThemeToggle theme={theme} onChange={onThemeChange} />
            </div>
        </div>
    );
}
