import React from 'react';
import { DashboardHome } from './DashboardHome';

export const SendPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-2xl font-heading font-bold text-white">Direct Transfer</h2>
        <p className="text-xs text-[#8B95A7] mt-1">
          Select files or data to stream directly to another connected device.
        </p>
      </div>
      <DashboardHome />
    </div>
  );
};
