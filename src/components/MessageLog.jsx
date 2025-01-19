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

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${mm}/${dd}/${yy} ${hh}:${min}:${ss}`;
  };

  const formatMessage = (msg) => {
    // All messages now use source field consistently
    return msg.source ? `${msg.source}: ${msg.message}` : msg.message;
  };

  // Create a copy and reverse to show newest first
  const sortedMessages = [...messages].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Debug log to check message contents
  console.log('Messages:', sortedMessages.map(msg => ({
    source: msg?.source,
    message: msg?.message,
    messageType: msg?.messageType,
    timestamp: msg?.timestamp
  })));

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
                <td className="font-mono text-sm">{formatTime(msg?.timestamp)}</td>
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
