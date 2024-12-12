// Chart configuration helper function
function createChartConfig(label, color, minY, maxY, datasets, data, theme) {
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
                    },
                    // Add this to prevent legend interaction from blocking zoom/pan
                    onClick: function(e, legendItem, legend) {
                        if (e.native && e.native.type === 'click') {
                            const index = legendItem.datasetIndex;
                            const ci = legend.chart;
                            const meta = ci.getDatasetMeta(index);
                            meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                            ci.update();
                        }
                    }
                },
                zoom: {
                    limits: {
                        // Add limits to prevent excessive zooming
                        y: {min: 'original', max: 'original'},
                        x: {min: 'original', max: 'original'}
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                        modifierKey: 'ctrl',
                        threshold: 10,  // Added threshold for better touch handling
                        overScaleMode: 'y'  // Allows panning over the scale
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.1  // Reduced speed for smoother zooming
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                        drag: {
                            enabled: true,
                            backgroundColor: 'rgba(127,127,127,0.2)',
                            threshold: 10  // Added threshold for better touch handling
                        }
                    }
                }
            }
        }
    };
}

// Helper function to extract PrimaryValue from object if needed
function extractValue(value) {
    if (value && typeof value === 'object' && 'PrimaryValue' in value) {
        return value.PrimaryValue;
    }
    return value;
}

export { createChartConfig, extractValue };
