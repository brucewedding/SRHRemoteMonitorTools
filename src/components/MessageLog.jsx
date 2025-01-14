import React from 'react';

const MessageLog = ({ messages = [] }) => {
  const getStatusColor = (messageType) => {
    if (!messageType) return 'text-base-content opacity-60';
    
    switch (messageType.toLowerCase()) {
      case 'error':
        return 'text-error';
      case 'warning':
        return 'text-warning';
      default:
        return 'text-base-content opacity-60';
    }
  };

  const getStatusDot = (messageType) => {
    const baseClasses = 'w-2 h-2 rounded-full';
    if (!messageType) return `${baseClasses} bg-base-content opacity-60`;
    
    switch (messageType.toLowerCase()) {
      case 'error':
        return `${baseClasses} bg-error`;
      case 'warning':
        return `${baseClasses} bg-warning`;
      default:
        return `${baseClasses} bg-base-content opacity-60`;
    }
  };

  // Create a copy and reverse to show newest first
  const sortedMessages = [...messages].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="overflow-hidden">
      <div className="h-[400px] overflow-y-auto">
        <table className="table table-compact w-full">
          <thead className="sticky top-0 bg-base-200 z-10">
            <tr>
              <th className="w-6"></th>
              <th className="w-40">Time</th>
              <th className="w-32">Source</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {sortedMessages.map((msg, index) => (
              <tr key={index} className="hover">
                <td>
                  <div className={getStatusDot(msg?.messageType)} />
                </td>
                <td className="font-mono text-sm">{msg?.timestamp || '-'}</td>
                <td>{msg?.source || '-'}</td>
                <td className={getStatusColor(msg?.messageType)}>{msg?.message || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MessageLog;
