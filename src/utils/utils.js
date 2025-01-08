// Chart configuration helper function
export function createChartConfig(label, color, minY, maxY, datasets, data, theme) {
    const isDark = theme === 'business';
    return {
        type: 'line',
        data: {
            labels: data.map(d => d.time),
            datasets: datasets.map((ds, i) => ({
                label: ds.label,
                data: data.map(d => d.values[i]),
                borderColor: ds.color,
                backgroundColor: ds.color,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: isDark ? 'rgb(229, 231, 235)' : 'rgb(31, 41, 55)'
                    }
                },
                y: {
                    min: minY,
                    max: maxY,
                    grid: {
                        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: isDark ? 'rgb(229, 231, 235)' : 'rgb(31, 41, 55)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 12,
                        padding: 20,
                        color: isDark ? 'rgb(229, 231, 235)' : 'rgb(31, 41, 55)'
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        modifierKey: 'ctrl'
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            modifierKey: 'ctrl'
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x',
                    },
                    limits: {
                        x: {min: 'original', max: 'original'},
                        y: {min: minY, max: maxY}
                    }
                }
            }
        }
    };
}

// Helper function to extract PrimaryValue from object if needed
export function extractValue(value) {
    if (value === null || value === undefined) {
        return '-';
    }
    if (typeof value === 'object' && 'PrimaryValue' in value) {
        return value.PrimaryValue || '-';
    }
    return value;
}
