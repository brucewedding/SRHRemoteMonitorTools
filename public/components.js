// Card components for the dashboard
function createCard(label, value, color) {
    return React.createElement('div', { className: 'card bg-base-300 shadow-xl' },
      React.createElement('div', { className: 'card-body p-0.5' },
        React.createElement('h3', { className: 'card-title text-sm sm:text-base opacity-80' }, label),
        React.createElement('div', { className: `text-lg sm:text-xl font-bold text-${color}-500` }, value)
      )
    );
}

function createDetailCard(label, value, iconFile = 'heart.png', color = 'base-content') {
    // Special case for Flow State - move value to description and set value based on state
    if (label === 'Flow State') {
        let stateValue = '';
        if (value.includes('increasing')) {
            stateValue = 'Inc';
        } else if (value.includes('decreasing')) {
            stateValue = 'Dec';
        } else {
            stateValue = 'Cons';
        }

        return React.createElement('div', { className: 'stat bg-base-300 shadow-xl rounded-xl p-4' },
            React.createElement('div', { className: 'flex justify-between items-start' },
                React.createElement('div', { className: 'flex-1 min-w-0 pr-4' },
                    React.createElement('div', { className: 'stat-title opacity-70' }, label),
                    React.createElement('div', { className: `stat-value text-${color}` }, stateValue),
                    React.createElement('div', { className: 'stat-desc opacity-70' }, value)
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

    // Extract numeric value and units if present
    const match = String(value).match(/^([\d.]+)(\s*L\/min|\s*\w+)?$/);
    const numericValue = match ? match[1] : value;
    // If the unit is L/min, always show it in description, otherwise use the matched unit
    const units = match && match[2] ? 
        (match[2].includes('L/min') ? 'L/min' : match[2].trim()) : 
        '';

    return React.createElement('div', { className: 'stat bg-base-300 shadow-xl rounded-xl p-4 relative' },
        React.createElement('div', { className: 'flex justify-between items-start' },
            React.createElement('div', { className: 'flex-1 min-w-0 pr-4' },
                React.createElement('div', { className: 'stat-title opacity-70' }, label),
                React.createElement('div', { className: `stat-value text-${color}` }, numericValue),
                units && React.createElement('div', { className: 'stat-desc opacity-70' }, units)
            ),
            React.createElement('div', { className: 'flex-shrink-0' },
                React.createElement('img', {
                    src: iconFile,
                    className: 'h-8 w-8',
                    alt: ''
                })
            )
        ),
        React.createElement('div', { 
            className: 'absolute bottom-2 right-2'
        }, 
            React.createElement('div', { 
                className: 'badge badge-info badge-success'
            }, 'OK')
        )
    );
}

function createPressureCard(label, avgPressure, maxPressure, minPressure, iconFile = 'heart.png') {
    return React.createElement('div', { className: 'stat bg-base-300 shadow-xl rounded-xl p-4' },
        React.createElement('div', { className: 'flex justify-between items-start' },
            React.createElement('div', { className: 'flex-1 min-w-0 pr-4' },
                React.createElement('div', { className: 'stat-title opacity-70' }, label),
                React.createElement('div', { className: 'stat-value text-base-content' }, 
                    avgPressure.toFixed(1)
                ),
                React.createElement('div', { className: 'stat-desc opacity-70' }, 
                    `${maxPressure.toFixed(1)}/${minPressure.toFixed(1)} mmHg`
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
      React.createElement('div', { className: 'card-body p-0.5' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('h3', { className: 'text-sm sm:text-base' }, label),
          React.createElement('div', { className: `badge ${isActive ? 'badge-success' : 'badge-neutral'} gap-2` },
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

function createHeader(status, lastUpdate, isDetailedView, onToggleView, theme) {
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
      React.createElement('button', {
        className: 'btn btn-primary sm:w-[200px] w-auto mx-auto',
        onClick: () => {
            console.log('Button clicked');
            if (typeof onToggleView === 'function') {
                onToggleView();
            }
        }
      }, isDetailedView ? 'Show Details' : 'Show Charts'),
      React.createElement('img', {
        src: theme === 'light' ? '/logo-light-mode.png' : '/logo.png',
        alt: 'Scandinavian Real Heart AB',
        className: 'h-8 ml-4 mr-4'
      })
    );
}
