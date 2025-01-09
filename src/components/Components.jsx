import React from 'react';

// Card components for the dashboard
export function createCard(label, value, color) {
    return React.createElement('div', { className: 'card bg-base-300 shadow-xl' },
      React.createElement('div', { className: 'card-body py-1 px-2' },
        React.createElement('h3', { className: 'card-title text-sm sm:text-base opacity-70' }, label),
        React.createElement('div', { className: `text-lg sm:text-xl font-bold text-${color}-500` }, value)
      )
    );
}

export function createDetailCard(label, value, iconFile = 'heart.png', color = 'base-content', detailedData = null) {
    // Special case for Flow State - move value to description and set value based on state
    if (label === 'Flow State') {
        let stateValue = '';
        let stateDesc = '';
        
        // Ensure value is treated as a string
        const valueStr = String(value);
        
        if (valueStr.includes('increasing')) {
            stateValue = 'Inc';
            stateDesc = 'Flow Increasing';
        } else if (valueStr.includes('decreasing')) {
            stateValue = 'Dec';
            stateDesc = 'Flow Decreasing';
        } else {
            stateValue = 'Cons';
            stateDesc = 'Flow Constant';
        }

        return React.createElement('div', { className: 'stat bg-base-300 shadow-xl rounded-xl p-4' },
            React.createElement('div', { className: 'flex justify-between items-start' },
                React.createElement('div', { className: 'flex-1 min-w-0 pr-4' },
                    React.createElement('div', { className: 'stat-title opacity-70' }, label),
                    React.createElement('div', { className: `stat-value text-${color}` }, stateValue),
                    React.createElement('div', { className: 'stat-desc opacity-70' }, stateDesc)
                ),
                React.createElement('div', { className: 'flex-shrink-0' },
                    React.createElement('img', {
                        src: iconFile,
                        className: 'h-8 w-8',
                        alt: ''
                    })
                )
            )
        );
    }

    // Extract display value and units
    let displayValue = '-';
    let units = '';

    // If value is an object with PrimaryValue, use that
    if (value && typeof value === 'object' && 'PrimaryValue' in value) {
        displayValue = value.PrimaryValue || '-';
    } 
    else if (value != null && typeof value === 'string') 
    {
        // If value is a string, try to extract units
        const match = value.match(/^([\d.]+)(\s*L\/min|\s*\w+)?$/);
        if (match) 
        {
            displayValue = match[1];
            units = match[2] ? 
                (match[2].includes('L/min') ? 'L/min' : match[2].trim()) : 
                '';
        } 
        else 
        {
            displayValue = value || '-';
        }
    } 
    else if (value != null) 
    {
        displayValue = String(value);
    }

    // Determine indicator state based on BackColor if value is an object
    let indicatorColor = 'bg-success text-success-content'; // default state
    let indicatorText = 'OK'; // default text
    let showIndicator = false;

    if (value && typeof value === 'object' && 'BackColor' in value && value.BackColor) {
        showIndicator = true;
        const color = value.BackColor.toLowerCase();
        
        if (color === 'yellow') {
            indicatorColor = 'bg-warning text-warning-content';
            indicatorText = 'OR';
        } else if (color === 'red') {
            indicatorColor = 'bg-error text-error-content';
            indicatorText = 'OR';
        }
    }

    // Determine background color based on BackColor if value is an object
    let cardBgColor = 'bg-base-300 border-4 border-base-300'; // default background and border with consistent width
    
    // Special case for right cardiac output - copy left heart's border color
    if (label === 'Cardiac Out' && value === detailedData?.RightHeart?.CardiacOutput) {
        const leftHeartCardiacOutput = detailedData?.LeftHeart?.CardiacOutput;
        if (leftHeartCardiacOutput?.BackColor) {
            const color = leftHeartCardiacOutput.BackColor.toLowerCase();
            if (color === 'yellow') {
                cardBgColor = 'bg-base-300 border-4 border-yellow-500';
            } else if (color === 'red') {
                cardBgColor = 'bg-base-300 border-4 border-red-500';
            }
        }
    } 
    // Normal color determination for other cards
    else if (value && typeof value === 'object' && 'BackColor' in value && value.BackColor) {
        const color = value.BackColor.toLowerCase();
        if (color === 'yellow') {
            cardBgColor = 'bg-base-300 border-4 border-yellow-500';
        } else if (color === 'red') {
            cardBgColor = 'bg-base-300 border-4 border-red-500';
        }
    }

    const mainContent = React.createElement('div', { 
        key: 'content',
        className: 'flex justify-between items-start' 
    }, [
        React.createElement('div', { 
            key: 'text-content',
            className: 'flex-1 min-w-0 pr-4' 
        }, [
            React.createElement('div', { 
                key: 'title',
                className: 'stat-title opacity-70' 
            }, label),
            React.createElement('div', { 
                key: 'value',
                className: `stat-value text-${color}` 
            }, displayValue),
            units && React.createElement('div', { 
                key: 'units',
                className: 'stat-desc opacity-70' 
            }, units)
        ].filter(Boolean)),
        React.createElement('div', { 
            key: 'icon',
            className: 'flex-shrink-0' 
        },
            React.createElement('img', {
                src: iconFile,
                className: 'h-8 w-8',
                alt: ''
            })
        )
    ]);

    const indicator = showIndicator && React.createElement('div', { 
        key: 'indicator',
        className: `indicator-item indicator-top indicator-end badge badge-sm ${indicatorColor}`,
        style: { top: '0.5rem', right: '0.5rem' }
    }, indicatorText);

    return React.createElement('div', { 
        className: `stat ${cardBgColor} shadow-xl rounded-xl p-4 relative`
    }, [mainContent, indicator]);
}

export function createPressureCard(label, avgPressure, maxPressure, minPressure, iconFile = 'heart.png') {
    // Extract display value and determine border color if avgPressure is an object
    let displayValue = '-';
    let cardBgColor = 'bg-base-300 border-4 border-base-300'; // default with consistent border width

    if (avgPressure && typeof avgPressure === 'object') {
        displayValue = avgPressure.PrimaryValue || '-';
        
        // Apply color border based on BackColor property
        if (avgPressure.BackColor) {
            const color = avgPressure.BackColor.toLowerCase();
            if (color === 'yellow') {
                cardBgColor = 'bg-base-300 border-4 border-yellow-500';
            } else if (color === 'red') {
                cardBgColor = 'bg-base-300 border-4 border-red-500';
            }
        }
    } else {
        displayValue = avgPressure || '-';
    }

    // Round max and min pressure values to 1 decimal place
    const formattedMax = Number(maxPressure).toFixed(1);
    const formattedMin = Number(minPressure).toFixed(1);

    return React.createElement('div', { className: `stat ${cardBgColor} shadow-xl rounded-xl p-4` },
        React.createElement('div', { className: 'flex justify-between items-start' },
            React.createElement('div', { className: 'flex-1 min-w-0 pr-4' },
                React.createElement('div', { className: 'stat-title opacity-70' }, label),
                React.createElement('div', { className: 'stat-value text-base-content' }, 
                    displayValue
                ),
                React.createElement('div', { className: 'stat-desc opacity-70' }, 
                    `${formattedMax}/${formattedMin} mmHg`
                )
            ),
            React.createElement('div', { className: 'flex-shrink-0' },
                React.createElement('img', {
                    src: iconFile,
                    className: 'h-8 w-8',
                    alt: ''
                })
            )
        )
    );
}

export function createSensorStatusCard(label, status) {
    console.log('[createSensorStatusCard] Label:', label, 'Status:', status);
    
    let backgroundColor = 'bg-base-300';
    let statusText = 'Inactive';
    let statusClass = 'badge-ghost';

    // Handle boolean status (for Medical/Internal Sensors)
    if (typeof status === 'boolean') {
        if (status === true) {
            backgroundColor = 'bg-success bg-opacity-20';
            statusText = 'Active';
            statusClass = 'badge-success';
        }
    }
    // Handle object status with Color property (for other status indicators)
    else if (status && typeof status === 'object' && status.Color) {
        console.log('[createSensorStatusCard] Original Color:', status.Color);
        statusText = status.Text || 'Active';
        statusClass = 'badge-success';
        
        // Extract hex color without alpha channel and add # prefix
        const colorValue = status.Color.replace(/^#?([A-F0-9]{2})?([A-F0-9]{6})$/i, '#$2').toLowerCase();
        console.log('[createSensorStatusCard] Processed Color:', colorValue);
        backgroundColor = `bg-[${colorValue}] bg-opacity-20`;
        console.log('[createSensorStatusCard] Final backgroundColor:', backgroundColor);
    }

    const className = `card ${backgroundColor} shadow-xl`;
    console.log('[createSensorStatusCard] Final className:', className);

    return React.createElement('div', { className },
      React.createElement('div', { className: 'card-body py-1 px-2' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('h3', { className: 'text-sm sm:text-base text-base-content' }, label),
          React.createElement('div', { className: `badge ${statusClass} gap-2` },
            statusText
          )
        )
      )
    );
}

export function ChartCard({ title, value, color, chartId }) {
    return React.createElement('div', { className: 'card bg-base-300 shadow-xl' },
        React.createElement('div', { className: 'card-body p-4' },
            React.createElement('div', { className: 'flex flex-col' },
                React.createElement('div', { className: 'flex justify-between items-center mb-2' },
                    React.createElement('h2', { className: 'card-title text-lg' }, title),
                    React.createElement('span', { className: 'text-lg font-semibold' }, value)
                ),
                React.createElement('div', { className: 'w-full h-48' },
                    React.createElement('canvas', { id: chartId })
                )
            )
        )
    );
}

export function createChatModal(isOpen, onClose, onSend, messages = []) {
    if (!isOpen) return null;

    return React.createElement('div', { className: 'modal modal-open' },
        React.createElement('div', { className: 'modal-box relative max-w-2xl' },
            React.createElement('h3', { className: 'font-bold text-lg mb-4' }, 'Send Message to Device'),
            React.createElement('button', {
                className: 'btn btn-sm btn-circle absolute right-2 top-2',
                onClick: onClose
            }, '✕'),
            // Messages display area
            React.createElement('div', {
                className: 'mb-4 h-48 overflow-y-auto bg-base-200 rounded-lg p-3',
                id: 'messagesContainer'
            },
                messages.map((msg, index) => 
                    React.createElement('div', {
                        key: index,
                        className: 'chat chat-start mb-2'
                    },
                        React.createElement('div', { className: 'chat-header opacity-70 text-sm' },
                            msg.username,
                            React.createElement('time', { className: 'ml-2' },
                                new Date(msg.timestamp).toLocaleString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: false
                                })
                            )
                        ),
                        React.createElement('div', { className: 'chat-bubble' }, msg.message)
                    )
                )
            ),
            React.createElement('div', { className: 'form-control' },
                React.createElement('textarea', {
                    className: 'textarea textarea-bordered h-24',
                    placeholder: 'Type your message here...',
                    id: 'messageInput'
                })
            ),
            React.createElement('div', { className: 'modal-action' },
                React.createElement('button', {
                    className: 'btn btn-primary',
                    onClick: () => {
                        const message = document.getElementById('messageInput').value;
                        if (message.trim()) {
                            onSend(message);
                            document.getElementById('messageInput').value = '';
                        }
                    }
                }, 'Send Message')
            )
        )
    );
}

export function createHeader(status, lastUpdate, isDetailedView, onToggleView, theme, onOpenChat, systemId) {
    const formatTime = (timestamp) => {
        if (!timestamp) return 'Never';
        if (timestamp instanceof Date) {
            return timestamp.toLocaleTimeString();
        }
        return timestamp;
    };

    return React.createElement('div', { className: 'flex flex-wrap justify-between items-center mb-4 gap-2' },
      React.createElement('div', null,
        React.createElement('h2', { className: 'text-lg font-bold flex items-center gap-2' },
          'Status: ' + status,
          React.createElement('div', {
            className: `badge ${status === 'Connected' ? 'badge-success' : 'badge-error'}`
          }, status)
        ),
        React.createElement('p', { className: 'opacity-70' }, 
          `Last update: ${formatTime(lastUpdate)}`
        ),
        systemId && React.createElement('p', { className: 'opacity-70 mt-1' },
          `Remote: ${systemId}`
        )
      ),
      React.createElement('div', { className: 'flex gap-2' },
        React.createElement('button', {
            className: 'btn btn-primary w-[120px] sm:w-[200px] px-2 sm:px-4 text-sm sm:text-base shadow-lg',
            onClick: () => {
                if (typeof onToggleView === 'function') {
                    onToggleView();
                }
            }
        }, isDetailedView ? 'Show Details' : 'Show Charts'),
        React.createElement('button', {
            className: 'btn btn-secondary w-[120px] sm:w-[200px] px-2 sm:px-4 text-sm sm:text-base shadow-lg',
            onClick: onOpenChat
        }, 'Send Message')
      ),
      React.createElement('img', {
        src: theme === 'light' ? '/logo-light-mode.png' : '/logo.png',
        alt: 'Scandinavian Real Heart AB',
        className: 'h-8 ml-4 mr-4'
      })
    );
}

export function createFooter() {
    return React.createElement('footer', {
        className: 'footer footer-center p-4 bg-base-300 text-base-content fixed bottom-0 left-0 right-0'
    },
        React.createElement('aside', null,
            React.createElement('a', {
                href: 'https://realheart.se',
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'link link-hover'
            }, 'Copyright  2024 Scandinavian Real Heart AB, Västerås, Sweden')
        )
    );
}
