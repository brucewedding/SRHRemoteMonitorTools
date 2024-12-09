const { useState, useEffect, useRef } = React;

// Chart configuration helper function
function createChartConfig(label, color, minY, maxY, datasets, data, theme) {
    const isDark = theme === 'dark';
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
                        boxWidth: 12,
                        padding: 8,
                        color: isDark ? 'rgb(229, 231, 235)' : 'rgb(31, 41, 55)'
                    }
                }
            }
        }
    };
}

// Theme toggle component
function ThemeToggle({ theme, onToggle }) {
    return React.createElement('label', { className: 'swap swap-rotate ml-4' },
        React.createElement('input', {
            type: 'checkbox',
            checked: theme === 'dark',
            onChange: onToggle
        }),
        // Sun icon
        React.createElement('svg', {
            className: 'swap-on fill-current w-6 h-6',
            xmlns: 'http://www.w3.org/2000/svg',
            viewBox: '0 0 24 24'
        },
            React.createElement('path', {
                d: 'M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z'
            })
        ),
        // Moon icon
        React.createElement('svg', {
            className: 'swap-off fill-current w-6 h-6',
            xmlns: 'http://www.w3.org/2000/svg',
            viewBox: '0 0 24 24'
        },
            React.createElement('path', {
                d: 'M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z'
            })
        )
    );
}

// Main combined component
function CombinedDashboard() {
    //console.log('CombinedDashboard rendering');
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'charts'
    const [theme, setTheme] = useState('dark'); // 'dark' or 'light'
    const [detailedData, setDetailedData] = useState({
        LeftHeart: { StrokeVolume: 0, PowerConsumption: 0, IntPressure: 0, IntPressureMin: 0, IntPressureMax: 0, AtrialPressure: 0, CardiacOutput: 0 },
        RightHeart: { StrokeVolume: 0, PowerConsumption: 0, IntPressure: 0, IntPressureMin: 0, IntPressureMax: 0, AtrialPressure: 0, CardiacOutput: 0 },
        HeartRate: 0,
        OperationState: '',
        HeartStatus: '',
        FlowLimitState: '',
        FlowLimit: 0,
        UseMedicalSensor: false,
        UseInternalSensor: true,
        bloodPressure: {systolic: 0, diastolic: 0},
        pressures: {cvp: 0, pap: 0, aop: 0, arterial: 0}
    });
    const [lastUpdate, setLastUpdate] = useState(null);
    const [status, setStatus] = useState('Connecting...');
    const chartsRef = useRef({ 
        heartRate: null, 
        bloodPressure: null, 
        powerConsumption: null,
        atrialPressure: null,
        cardiacOutput: null,
        strokeVolume: null,
        lowPressures: null,
        highPressures: null
    });
    const chartDataRef = useRef({
        heartRate: [],
        bloodPressure: [],
        powerConsumption: [],
        atrialPressure: [],
        cardiacOutput: [],
        strokeVolume: [],
        lowPressures: [],
        highPressures: []
    });
    const dataUpdateRef = useRef(0);
    const MAX_DATA_POINTS = 180;

    // Theme effect
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (viewMode === 'charts') {
            // Recreate charts when theme changes
            Object.values(chartsRef.current).forEach(chart => {
                if (chart) {
                    chart.destroy();
                }
            });
            setupCharts();
        }
    }, [theme]);

    // WebSocket setup effect
    useEffect(() => {
        console.log('WebSocket effect running');
        const ws = new WebSocket('ws://' + window.location.hostname);
        ws.onopen = () => setStatus('Connected');
        ws.onclose = () => setStatus('Disconnected');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setLastUpdate(new Date(data.Timestamp));
            setDetailedData({
                ...data,
                UseInternalSensor: !data.UseMedicalSensor
            });
            
            updateStoredChartData(data);
            // Trigger chart update by incrementing the ref
            dataUpdateRef.current += 1;
        };
        
        return () => ws.close();
    }, []); // Only run on mount

    // Chart setup effect
    useEffect(() => {
        console.log('Chart setup effect running, viewMode:', viewMode);
        if (viewMode === 'charts') {
            Object.values(chartsRef.current).forEach(chart => {
                if (chart) {
                    chart.destroy();
                }
            });
            setupCharts();
        }
    }, [viewMode]); // Run when view changes

    // New effect for updating charts when data changes
    useEffect(() => {
        if (viewMode === 'charts' && Object.values(chartsRef.current).some(chart => chart !== null)) {
            updateCharts();
        }
    }, [dataUpdateRef.current, viewMode]);

    // Data update functions
    function updateStoredChartData(data) {
        const timeStr = new Date(data.Timestamp).toLocaleTimeString();
        
        Object.entries({
            heartRate: [[data.HeartRate]],
            bloodPressure: [[data.bloodPressure.systolic, data.bloodPressure.diastolic]],
            powerConsumption: [[data.LeftHeart.PowerConsumption, data.RightHeart.PowerConsumption]],
            atrialPressure: [[data.LeftHeart.AtrialPressure, data.RightHeart.AtrialPressure]],
            cardiacOutput: [[data.LeftHeart.CardiacOutput, data.RightHeart.CardiacOutput]],
            strokeVolume: [[data.LeftHeart.StrokeVolume, data.RightHeart.StrokeVolume]],
            lowPressures: [[data.pressures.cvp, data.pressures.pap]],
            highPressures: [[data.pressures.aop, data.pressures.arterial]]
        }).forEach(([key, values]) => {
            chartDataRef.current[key].push({
                time: timeStr,
                values: values[0]
            });
            if (chartDataRef.current[key].length > MAX_DATA_POINTS) {
                chartDataRef.current[key].shift();
            }
        });
    }

    function setupCharts() {
        console.log('Setting up charts');
        const isDark = theme === 'dark';
        Chart.defaults.color = isDark ? 'rgb(229, 231, 235)' : 'rgb(31, 41, 55)';
        Chart.defaults.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        const chartConfigs = {
            heartRate: {
                ctx: 'heartRateChart',
                label: 'Heart Rate',
                color: 'rgb(239, 68, 68)',
                minY: 40,
                maxY: 120,
                datasets: [{
                    label: 'Heart Rate',
                    color: 'rgb(239, 68, 68)'
                }]
            },
            bloodPressure: {
                ctx: 'bloodPressureChart',
                label: 'Blood Press',
                minY: 40,
                maxY: 160,
                datasets: [
                    {
                        label: 'Systolic',
                        color: 'rgb(59, 130, 246)'
                    },
                    {
                        label: 'Diastolic',
                        color: 'rgb(34, 197, 94)'
                    }
                ]
            },
            powerConsumption: {
                ctx: 'powerConsumptionChart',
                label: 'Power Consumption',
                minY: 0,
                maxY: 25,
                datasets: [
                    {
                        label: 'Lft Heart',
                        color: 'rgb(234, 179, 8)'
                    },
                    {
                        label: 'Rt Heart',
                        color: 'rgb(168, 85, 247)'
                    }
                ]
            },
            atrialPressure: {
                ctx: 'atrialPressureChart',
                label: 'Atrial Press',
                minY: 0,
                maxY: 30,
                datasets: [
                    {
                        label: 'Lft Heart',
                        color: 'rgb(14, 165, 233)'
                    },
                    {
                        label: 'Rt Heart',
                        color: 'rgb(249, 115, 22)'
                    }
                ]
            },
            cardiacOutput: {
                ctx: 'cardiacOutputChart',
                label: 'Cardiac Out',
                minY: 0,
                maxY: 10,
                datasets: [
                    {
                        label: 'Lft Heart',
                        color: 'rgb(34, 197, 94)'
                    },
                    {
                        label: 'Rt Heart',
                        color: 'rgb(239, 68, 68)'
                    }
                ]
            },
            strokeVolume: {
                ctx: 'strokeVolumeChart',
                label: 'Stroke Vol',
                minY: 0,
                maxY: 60,
                datasets: [
                    {
                        label: 'Lft Heart',
                        color: 'rgb(147, 51, 234)'
                    },
                    {
                        label: 'Rt Heart',
                        color: 'rgb(236, 72, 153)'
                    }
                ]
            },
            lowPressures: {
                ctx: 'lowPressuresChart',
                label: 'Low Press',
                minY: 0,
                maxY: 30,
                datasets: [
                    {
                        label: 'CVP',
                        color: 'rgb(59, 130, 246)'
                    },
                    {
                        label: 'PAP',
                        color: 'rgb(34, 197, 94)'
                    }
                ]
            },
            highPressures: {
                ctx: 'highPressuresChart',
                label: 'High Press',
                minY: 60,
                maxY: 120,
                datasets: [
                    {
                        label: 'AoP',
                        color: 'rgb(239, 68, 68)'
                    },
                    {
                        label: 'Arterial',
                        color: 'rgb(168, 85, 247)'
                    }
                ]
            }
        };

        Object.entries(chartConfigs).forEach(([key, config]) => {
            const ctx = document.getElementById(config.ctx);
            if (ctx) {
                console.log('Creating chart:', key);
                chartsRef.current[key] = new Chart(ctx, createChartConfig(
                    config.label,
                    config.color,
                    config.minY,
                    config.maxY,
                    config.datasets,
                    [...chartDataRef.current[key]],
                    theme
                ));
            } else {
                console.warn('Canvas element not found for chart:', key);
            }
        });
    }

    function updateCharts() {
        Object.entries(chartsRef.current).forEach(([key, chart]) => {
            if (chart && chart.data) {
                const data = chartDataRef.current[key];
                chart.data.labels = data.map(d => d.time);
                chart.data.datasets.forEach((dataset, i) => {
                    dataset.data = data.map(d => d.values[i]);
                });
                chart.update('none');
            }
        });
    }

    // Dashboard view
    function renderDashboard() {
        //console.log('Rendering dashboard view');
        return React.createElement('div', null,
            // Status Cards
            React.createElement('div', { className: 'card bg-base-200 shadow-xl mt-2 mb-2' },
                React.createElement('div', { className: 'card-body' },
                    React.createElement('h2', { className: 'card-title opacity-80' }, 'System Status'),
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4' },
                        createCard('Heart Rate', `${detailedData.HeartRate} BPM`, 'red'),
                        createCard('Operation State', detailedData.OperationState, 'blue'),
                        createCard('Heart Status', detailedData.HeartStatus, 'green'),
                        React.createElement('div', { className: 'grid grid-rows-2 gap-2' },
                            createSensorStatusCard('Medical Sensors', detailedData.UseMedicalSensor),
                            createSensorStatusCard('Internal Sensors', detailedData.UseInternalSensor)
                        )
                    )
                )
            ),
            // Left Heart Data
            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body' },
                    React.createElement('h2', { className: 'card-title opacity-80' }, 'Left Heart'),
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4' },
                        createDetailCard('Stroke Vol', `${detailedData.LeftHeart.StrokeVolume.toFixed(1)} ml`, 'stroke.png'),
                        createPressureCard('Int Press', detailedData.LeftHeart.IntPressure, detailedData.LeftHeart.IntPressureMax, detailedData.LeftHeart.IntPressureMin, 'pressure.png'),
                        createDetailCard('Atrial Press', `${detailedData.LeftHeart.AtrialPressure.toFixed(1)} mmHg`, 'pressure.png'),
                        createDetailCard('Cardiac Out', `${detailedData.LeftHeart.CardiacOutput.toFixed(1)} L/min`, 'cardiacout.png'),
                        createDetailCard('Power', `${detailedData.LeftHeart.PowerConsumption.toFixed(2)} Watts`, 'power.png')
                    )
                )
            ),
            // Right Heart Data
            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body' },
                    React.createElement('h2', { className: 'card-title opacity-80' }, 'Right Heart'),
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4' },
                        createDetailCard('Stroke Vol', `${detailedData.RightHeart.StrokeVolume.toFixed(1)} ml`, 'stroke.png'),
                        createPressureCard('Int Press', detailedData.RightHeart.IntPressure, detailedData.RightHeart.IntPressureMax, detailedData.RightHeart.IntPressureMin, 'pressure.png'),
                        createDetailCard('Atrial Press', `${detailedData.RightHeart.AtrialPressure.toFixed(1)} mmHg`, 'pressure.png'),
                        createDetailCard('Cardiac Out', `${detailedData.RightHeart.CardiacOutput.toFixed(1)} L/min`, 'cardiacout.png'),
                        createDetailCard('Power', `${detailedData.RightHeart.PowerConsumption.toFixed(2)} Watts`, 'power.png')
                    )
                )
            ),
            // Pressure Data
            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body' },
                    React.createElement('h2', { className: 'card-title opacity-80' }, 'Pressures'),
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' },
                        createDetailCard('CVP', `${detailedData.pressures.cvp.toFixed(1)} mmHg`, 'pressure.png'),
                        createDetailCard('PAP', `${detailedData.pressures.pap.toFixed(1)} mmHg`, 'pressure.png'),
                        createDetailCard('AoP', `${detailedData.pressures.aop.toFixed(1)} mmHg`, 'pressure.png'),
                        createDetailCard('Arterial', `${detailedData.pressures.arterial.toFixed(1)} mmHg`, 'pressure.png')
                    )
                )
            ),
            // Flow Info
            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body' },
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4' },
                        createDetailCard('Flow Lmt', `${detailedData.FlowLimit.toFixed(2)}`, 'flow.png'),
                        createDetailCard('Flow State', detailedData.FlowLimitState, 'flow.png')
                    )
                )
            )
        );
    }

    // Charts view
    function renderCharts() {
        //console.log('Rendering charts view');
        return React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' },
            createChartCard(
                'Heart Rate',
                `${detailedData.HeartRate} bpm`,
                'red',
                'heartRateChart'
            ),
            createChartCard(
                'Blood Pressure',
                `${Math.round(detailedData.bloodPressure.systolic)}/${Math.round(detailedData.bloodPressure.diastolic)} mmHg`,
                'blue',
                'bloodPressureChart'
            ),
            createChartCard(
                'Power Cons.',
                `L: ${detailedData.LeftHeart.PowerConsumption.toFixed(2)} W\nR: ${detailedData.RightHeart.PowerConsumption.toFixed(2)} W`,
                'yellow',
                'powerConsumptionChart'
            ),
            createChartCard(
                'Atrial Press',
                `L: ${detailedData.LeftHeart.AtrialPressure.toFixed(1)} mmHg\nR: ${detailedData.RightHeart.AtrialPressure.toFixed(1)} mmHg`,
                'sky',
                'atrialPressureChart'
            ),
            createChartCard(
                'Cardiac Output',
                `L: ${detailedData.LeftHeart.CardiacOutput.toFixed(1)} L/min\nR: ${detailedData.RightHeart.CardiacOutput.toFixed(1)} L/min`,
                'green',
                'cardiacOutputChart'
            ),
            createChartCard(
                'Stroke Volume',
                `L: ${detailedData.LeftHeart.StrokeVolume.toFixed(1)} ml\nR: ${detailedData.RightHeart.StrokeVolume.toFixed(1)} ml`,
                'purple',
                'strokeVolumeChart'
            ),
            createChartCard(
                'Low Press (CVP, PAP)',
                `CVP: ${detailedData.pressures.cvp.toFixed(1)}  mmHg\nPAP: ${detailedData.pressures.pap.toFixed(1)} mmHg`,
                'blue',
                'lowPressuresChart'
            ),
            createChartCard(
                'High Press (AoP, Art)',
                `AoP: ${detailedData.pressures.aop.toFixed(1)}  mmHg\nArt: ${detailedData.pressures.arterial.toFixed(1)} mmHg`,
                'red',
                'highPressuresChart'
            )
        );
    }

    const handleViewToggle = () => {
        console.log('Toggle view clicked, current view:', viewMode);
        setViewMode(viewMode === 'dashboard' ? 'charts' : 'dashboard');
    };

    const handleThemeToggle = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return React.createElement('div', { className: 'container mx-auto p-4 max-w-7xl' },
        React.createElement('div', { className: 'flex items-center justify-between mb-4' },
            React.createElement('div', { className: 'flex-1' },
                createHeader(status, lastUpdate, viewMode === 'charts', handleViewToggle, theme)
            ),
            React.createElement(ThemeToggle, {
                theme: theme,
                onToggle: handleThemeToggle
            })
        ),
        viewMode === 'dashboard' ? renderDashboard() : renderCharts()
    );
}

ReactDOM.render(
    React.createElement(CombinedDashboard),
    document.getElementById('root')
);