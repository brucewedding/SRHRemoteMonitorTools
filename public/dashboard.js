import { extractValue } from './utils.js';
import { ThemeToggle } from './theme-toggle.js';
import { ChartManager } from './chart-manager.js';

function CombinedDashboard() {
    const [viewMode, setViewMode] = React.useState('dashboard');
    const [theme, setTheme] = React.useState('light');
    const [detailedData, setDetailedData] = React.useState({
        LeftHeart: { 
            StrokeVolume: '0', 
            PowerConsumption: '0', 
            IntPressure: '0', 
            IntPressureMin: '0', 
            IntPressureMax: '0', 
            AtrialPressure: '0', 
            CardiacOutput: '0',
            MedicalPressure: {
                Name: '',
                PrimaryValue: '-',
                SecondaryValue: null,
                BackColor: null
            }
        },
        RightHeart: { 
            StrokeVolume: '0', 
            PowerConsumption: '0', 
            IntPressure: '0', 
            IntPressureMin: '0', 
            IntPressureMax: '0', 
            AtrialPressure: '0', 
            CardiacOutput: '0',
            MedicalPressure: {
                Name: '',
                PrimaryValue: '-',
                SecondaryValue: null,
                BackColor: null
            }
        },
        HeartRate: '0',
        OperationState: '',
        HeartStatus: '',
        FlowLimitState: '',
        FlowLimit: '0',
        UseMedicalSensor: false,
        UseInternalSensor: true,
        CVPSensor: '0',
        PAPSensor: '0',
        AoPSensor: '0',
        ArtPressSensor: '0'
    });
    const [lastUpdate, setLastUpdate] = React.useState(null);
    const [status, setStatus] = React.useState('Connecting...');
    const dataUpdateRef = React.useRef(0);
    const chartManager = React.useRef(new ChartManager());

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (viewMode === 'charts') {
            chartManager.current.destroyCharts();
            chartManager.current.setupCharts(theme);
        }
    }, [theme]);

    React.useEffect(() => {
        const ws = new WebSocket('ws://' + window.location.hostname);
        ws.onopen = () => setStatus('Connected');
        ws.onclose = () => setStatus('Disconnected');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setLastUpdate(new Date());
            
            // Process the data to extract PrimaryValue from any objects
            const processedData = {
                ...detailedData,
                HeartRate: extractValue(data.HeartRate),
                OperationState: extractValue(data.OperationState),
                HeartStatus: extractValue(data.HeartStatus),
                FlowLimitState: extractValue(data.FlowLimitState),
                FlowLimit: extractValue(data.FlowLimit),
                UseMedicalSensor: data.UseMedicalSensor,
                UseInternalSensor: !data.UseMedicalSensor,
                CVPSensor: data.CVPSensor || '0',
                PAPSensor: data.PAPSensor || '0',
                AoPSensor: data.AoPSensor || '0',
                ArtPressSensor: data.ArtPressSensor || '0',
                LeftHeart: {
                    StrokeVolume: data.LeftHeart?.StrokeVolume || '0',
                    PowerConsumption: data.LeftHeart?.PowerConsumption || '0',
                    IntPressure: data.LeftHeart?.IntPressure || '0',
                    IntPressureMin: data.LeftHeart?.IntPressureMin || '0',
                    IntPressureMax: data.LeftHeart?.IntPressureMax || '0',
                    AtrialPressure: data.LeftHeart?.AtrialPressure || '0',
                    CardiacOutput: data.LeftHeart?.CardiacOutput || '0',
                    MedicalPressure: data.LeftHeart?.MedicalPressure || {
                        Name: '',
                        PrimaryValue: '-',
                        SecondaryValue: null,
                        BackColor: null
                    }
                },
                RightHeart: {
                    StrokeVolume: data.RightHeart?.StrokeVolume || '0',
                    PowerConsumption: data.RightHeart?.PowerConsumption || '0',
                    IntPressure: data.RightHeart?.IntPressure || '0',
                    IntPressureMin: data.RightHeart?.IntPressureMin || '0',
                    IntPressureMax: data.RightHeart?.IntPressureMax || '0',
                    AtrialPressure: data.RightHeart?.AtrialPressure || '0',
                    CardiacOutput: data.RightHeart?.CardiacOutput || '0',
                    MedicalPressure: data.RightHeart?.MedicalPressure || {
                        Name: '',
                        PrimaryValue: '-',
                        SecondaryValue: null,
                        BackColor: null
                    }
                }
            };
            
            setDetailedData(processedData);
            chartManager.current.updateStoredChartData(data);
            dataUpdateRef.current += 1;
        };
        
        return () => ws.close();
    }, []);

    React.useEffect(() => {
        if (viewMode === 'charts') {
            chartManager.current.destroyCharts();
            chartManager.current.setupCharts(theme);
        }
    }, [viewMode]);

    React.useEffect(() => {
        if (viewMode === 'charts') {
            chartManager.current.updateCharts();
        }
    }, [dataUpdateRef.current, viewMode]);

    function renderDashboard() {
        return React.createElement('div', null,
            // Status Cards
            React.createElement('div', { className: 'card bg-base-200 shadow-xl mt-1 mb-1 p-0' },
                React.createElement('div', { className: 'card-body px-1.5 py-0.5' },
                    React.createElement('h2', { className: 'card-title opacity-80 mt-0  py-0' }, 'System Status'),
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4' },
                        createCard('Heart Rate', `${detailedData.HeartRate} BPM`, 'red'),
                        createCard('Operation State', detailedData.OperationState, 'blue'),
                        createCard('Heart Status', detailedData.HeartStatus, 'green'),
                        React.createElement('div', { className: 'grid grid-rows-2 gap-2 p-1' },
                            createSensorStatusCard('Medical Sensors', detailedData.UseMedicalSensor),
                            createSensorStatusCard('Internal Sensors', detailedData.UseInternalSensor)
                        )
                    )
                )
            ),
            // Left Heart Data
            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body py-0.5 px-1.5' },
                    React.createElement('h2', { className: 'card-title opacity-80' }, 'Left Heart'),
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4' },
                        createDetailCard('Stroke Vol', detailedData.LeftHeart.StrokeVolume, 'stroke.png'),
                        createPressureCard('Int Press', detailedData.LeftHeart.IntPressure, detailedData.LeftHeart.IntPressureMax, detailedData.LeftHeart.IntPressureMin, 'pressure.png'),
                        createDetailCard('Atrial Press', detailedData.LeftHeart.AtrialPressure, 'pressure.png'),
                        createDetailCard('Medical Press', detailedData.LeftHeart.MedicalPressure, 'pressure.png'),
                        createDetailCard('Cardiac Out', detailedData.LeftHeart.CardiacOutput, 'cardiacout.png'),
                        createDetailCard('Power', detailedData.LeftHeart.PowerConsumption, 'power.png')
                    )
                )
            ),
            // Right Heart Data
            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body px-1.5 py-0.5' },
                    React.createElement('h2', { className: 'card-title opacity-80' }, 'Right Heart'),
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4' },
                        createDetailCard('Stroke Vol', detailedData.RightHeart.StrokeVolume, 'stroke.png'),
                        createPressureCard('Int Press', detailedData.RightHeart.IntPressure, detailedData.RightHeart.IntPressureMax, detailedData.RightHeart.IntPressureMin, 'pressure.png'),
                        createDetailCard('Atrial Press', detailedData.RightHeart.AtrialPressure, 'pressure.png'),
                        createDetailCard('Medical Press', detailedData.RightHeart.MedicalPressure, 'pressure.png'),
                        createDetailCard('Cardiac Out', detailedData.RightHeart.CardiacOutput, 'cardiacout.png'),
                        createDetailCard('Power', detailedData.RightHeart.PowerConsumption, 'power.png')
                    )
                )
            ),
            // Pressure Data
            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body px-1.5 py-0.5' },
                    React.createElement('h2', { className: 'card-title opacity-80' }, 'System Pressures'),
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' },
                        createDetailCard('CVP', detailedData.CVPSensor, 'pressure.png'),
                        createDetailCard('PAP', detailedData.PAPSensor, 'pressure.png'),
                        createDetailCard('AoP', detailedData.AoPSensor, 'pressure.png'),
                        createDetailCard('Arterial', detailedData.ArtPressSensor, 'pressure.png')
                    )
                )
            ),
            // Flow Info
            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body py-0.5 px-1.5' },
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4' },
                        createDetailCard('Flow Lmt', detailedData.FlowLimit, 'flow.png'),
                        createDetailCard('Flow State', detailedData.FlowLimitState, 'flow.png')
                    )
                )
            )
        );
    }

    function renderCharts() {
        return React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' },
            createChartCard(
                'Heart Rate',
                `${detailedData.HeartRate} bpm`,
                'red',
                'heartRateChart'
            ),
            createChartCard(
                'Power Cons.',
                `L: ${extractValue(detailedData.LeftHeart.PowerConsumption)} W\nR: ${extractValue(detailedData.RightHeart.PowerConsumption)} W`,
                'yellow',
                'powerConsumptionChart'
            ),
            createChartCard(
                'Atrial Press',
                `L: ${extractValue(detailedData.LeftHeart.AtrialPressure)} mmHg\nR: ${extractValue(detailedData.RightHeart.AtrialPressure)} mmHg`,
                'sky',
                'atrialPressureChart'
            ),
            createChartCard(
                'Cardiac Output',
                `L: ${extractValue(detailedData.LeftHeart.CardiacOutput)} L/min\nR: ${extractValue(detailedData.RightHeart.CardiacOutput)} L/min`,
                'green',
                'cardiacOutputChart'
            ),
            createChartCard(
                'Stroke Volume',
                `L: ${extractValue(detailedData.LeftHeart.StrokeVolume)} ml\nR: ${extractValue(detailedData.RightHeart.StrokeVolume)} ml`,
                'purple',
                'strokeVolumeChart'
            ),
            createChartCard(
                'Low Press (CVP, PAP)',
                `CVP: ${extractValue(detailedData.CVPSensor)} mmHg\nPAP: ${extractValue(detailedData.PAPSensor)} mmHg`,
                'blue',
                'lowPressuresChart'
            ),
            createChartCard(
                'High Press (AoP, Art)',
                `AoP: ${extractValue(detailedData.AoPSensor)} mmHg\nArt: ${extractValue(detailedData.ArtPressSensor)} mmHg`,
                'red',
                'highPressuresChart'
            )
        );
    }

    const handleViewToggle = () => {
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

export { CombinedDashboard };
