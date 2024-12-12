// Card components for the dashboard
function createCard(label, value, color) {
    return React.createElement('div', { className: 'card bg-base-300 shadow-xl' },
      React.createElement('div', { className: 'card-body py-1 px-2' },
        React.createElement('h3', { className: 'card-title text-sm sm:text-base opacity-80' }, label),
        React.createElement('div', { className: `text-lg sm:text-xl font-bold text-${color}-500` }, value)
      )
    );
}

function createDetailCard(label, value, iconFile = 'heart.png', color = 'base-content') {
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
    let displayValue = '';
    let units = '';

    // If value is an object with PrimaryValue, use that
    if (value && typeof value === 'object' && 'PrimaryValue' in value) {
        displayValue = value.PrimaryValue;
    } else if (typeof value === 'string') {
        // If value is a string, try to extract units
        const match = value.match(/^([\d.]+)(\s*L\/min|\s*\w+)?$/);
        if (match) {
            displayValue = match[1];
            units = match[2] ? 
                (match[2].includes('L/min') ? 'L/min' : match[2].trim()) : 
                '';
        } else {
            displayValue = value;
        }
    } else {
        displayValue = String(value);
    }

    // Determine indicator state based on BackColor if value is an object
    let indicatorColor = 'bg-success text-success-content'; // default state
    let indicatorText = 'OK'; // default text
    let showIndicator = false;

    if (value && typeof value === 'object' && 'PrimaryValue' in value) {
        showIndicator = true;

        if (value.BackColor) {
            // Extract the color, handling both RGB and ARGB formats, prioritizing 8-char match
            const colorMatch = value.BackColor.match(/#?([A-F0-9]{8}|[A-F0-9]{6})/i);
            if (colorMatch) {
                const colorCode = colorMatch[1].toUpperCase();
                // For ARGB format (8 chars), remove the alpha channel (first 2 chars)
                const mainColor = colorCode.length === 8 ? colorCode.substring(2) : colorCode;
                if (mainColor === 'FFFF00') {
                    indicatorColor = 'bg-warning text-warning-content';
                    indicatorText = 'OR';
                } else if (mainColor === 'FF0000') {
                    indicatorColor = 'bg-error text-error-content';
                    indicatorText = 'OR';
                }
            }
        }
    }

    // Determine background color based on BackColor if value is an object
    let cardBgColor = 'bg-base-300'; // default background
    if (value && typeof value === 'object' && 'BackColor' in value) {
        const colorMatch = value.BackColor.match(/#?([A-F0-9]{8}|[A-F0-9]{6})/i);
        if (colorMatch) {
            const colorCode = colorMatch[1].toUpperCase();
            const mainColor = colorCode.length === 8 ? colorCode.substring(2) : colorCode;
            if (mainColor === 'FFFF00') {
                cardBgColor = 'bg-warning bg-opacity-30';
            } else if (mainColor === 'FF0000') {
                cardBgColor = 'bg-error bg-opacity-30';
            }
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
    }, [mainContent]);
}

function createPressureCard(label, avgPressure, maxPressure, minPressure, iconFile = 'heart.png') {
    // Extract display value if avgPressure is an object with PrimaryValue
    const displayValue = avgPressure && typeof avgPressure === 'object' && 'PrimaryValue' in avgPressure 
        ? avgPressure.PrimaryValue 
        : avgPressure;

    // Round max and min pressure values to 1 decimal place
    const formattedMax = Number(maxPressure).toFixed(1);
    const formattedMin = Number(minPressure).toFixed(1);

    return React.createElement('div', { className: 'stat bg-base-300 shadow-xl rounded-xl p-4' },
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

function createSensorStatusCard(label, isActive) {
    return React.createElement('div', { className: 'card bg-base-300 shadow-xl' },
      React.createElement('div', { className: 'card-body py-1 px-2' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('h3', { className: 'text-sm sm:text-base' }, label),
          React.createElement('div', { className: `badge ${isActive ? 'badge-success' : 'badge-ghost'} gap-2` },
            isActive ? 'Active' : 'Inactive'
          )
        )
      )
    );
}

function createChartCard(title, value, color, chartId) {
    // Function to process value text
    function processValueText(text) {
        return React.createElement('div', { className: `text-2xl font-bold text-${color}-500` },
            text.split(/(\s*(?:L:|R:|CVP:|PAP:|AoP:|Art:)\s*)/).map((part, index) => {
                // Add line break before R: values
                if (part.trim() === 'R:') {
                    return [
                        React.createElement('br', { key: `br-${index}` }),
                        part
                    ];
                }
                // Keep descriptors (L:, CVP:, etc.) at original size
                if (/(?:L:|CVP:|PAP:|AoP:|Art:)/.test(part)) {
                    return part;
                }
                // Process the remaining parts for units
                return part.split(/(\d+\.?\d*)|(mmHg|W|L\/min|ml|bpm)/).map((subPart, subIndex) => {
                    if (!subPart) return null;
                    // If it's a number or empty/whitespace, keep original size
                    if (/^\d+\.?\d*$/.test(subPart) || /^\s*$/.test(subPart)) {
                        return subPart;
                    }
                    // If it's a unit, make it smaller
                    return React.createElement('span', {
                        key: `${index}-${subIndex}`,
                        className: 'text-sm opacity-70'
                    }, subPart);
                });
            })
        );
    }

    return React.createElement('div', { className: 'card bg-base-300 shadow-xl' },
        React.createElement('div', { className: 'card-body p-2' },
            React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                React.createElement('h4', { className: 'card-title' }, title),
                processValueText(value)
            ),
            React.createElement('div', { style: { height: '300px' } },
                React.createElement('canvas', { 
                    id: chartId,
                    key: chartId
                })
            )
        )
    );
}

function createChatModal(isOpen, onClose, onSend, messages = []) {
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
                                new Date(msg.timestamp).toLocaleTimeString()
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

function createHeader(status, lastUpdate, isDetailedView, onToggleView, theme, onOpenChat) {
    return React.createElement('div', { className: 'flex flex-wrap justify-between items-center mb-4 gap-2' },
      React.createElement('div', null,
        React.createElement('h2', { className: 'text-lg font-bold flex items-center gap-2' },
          'Status: ' + status,
          React.createElement('div', {
            className: `badge ${status === 'Connected' ? 'badge-success' : 'badge-error'}`
          }, status)
        ),
        React.createElement('p', { className: 'opacity-70' }, 
          `Last update: ${lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}`
        )
      ),
      React.createElement('div', { className: 'flex gap-2' },
        React.createElement('button', {
            className: 'btn btn-primary sm:w-[200px] w-auto mx-auto shadow-lg',
            onClick: () => {
                if (typeof onToggleView === 'function') {
                    onToggleView();
                }
            }
        }, isDetailedView ? 'Show Details' : 'Show Charts'),
        React.createElement('button', {
            className: 'btn btn-secondary sm:w-[200px] w-auto mx-auto shadow-lg',
            onClick: onOpenChat
        }, 'Send Message')
      ),
      React.createElement('img', {
        src: theme === 'emerald' ? '/logo-light-mode.png' : '/logo.png',
        alt: 'Scandinavian Real Heart AB',
        className: 'h-8 ml-4 mr-4'
      })
    );
}

function createFooter() {
    return React.createElement('footer', {
        className: 'footer footer-center p-4 bg-base-300 text-base-content fixed bottom-0 left-0 right-0'
    },
        React.createElement('aside', null,
            React.createElement('a', {
                href: 'https://realheart.se',
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'link link-hover'
            }, 'Copyright © 2024 Scandinavian Real Heart AB')
        )
    );
}
