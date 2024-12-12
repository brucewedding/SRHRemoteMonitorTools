import { extractValue } from './utils.js';
import { ThemeToggle } from './theme-toggle.js';
import { ChartManager } from './chart-manager.js';

function CombinedDashboard() {
    const [viewMode, setViewMode] = React.useState('dashboard');
    const [theme, setTheme] = React.useState('light');
    const [isChatOpen, setIsChatOpen] = React.useState(false);
    const [messages, setMessages] = React.useState([]);
    const wsRef = React.useRef(null);
    const [detailedData, setDetailedData] = React.useState({
        StatusData: {
            ExtLeft: { Text: '-', Color: 'badge-info' },
            ExtRight: { Text: '-', Color: 'badge-info' },
            CANStatus: { Text: '-', Color: 'badge-info' },
            BytesSent: { Text: '-', Color: 'badge-info' },
            BytesRecd: { Text: '-', Color: 'badge-info' },
            Strokes: { Text: '-', Color: 'badge-info' },
            IntLeft: { Text: '-', Color: 'badge-info' },
            IntRight: { Text: '-', Color: 'badge-info' },
            BusLoad: { Text: '-', Color: 'badge-info' }
        },
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
        CVPSensor: {
            Name: '',
            PrimaryValue: '0',
            SecondaryValue: null,
            BackColor: null
        },
        PAPSensor: {
            Name: '',
            PrimaryValue: '0',
            SecondaryValue: null,
            BackColor: null
        },
        AoPSensor: {
            Name: '',
            PrimaryValue: '0',
            SecondaryValue: null,
            BackColor: null
        },
        ArtPressSensor: {
            Name: '',
            PrimaryValue: '0',
            SecondaryValue: null,
            BackColor: null
        }
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
        wsRef.current = ws;
        
        ws.onopen = () => setStatus('Connected');
        ws.onclose = () => setStatus('Disconnected');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            // Handle device messages
            if (data.type === 'deviceMessage') {
                setMessages(prevMessages => [...prevMessages, {
                    username: data.username,
                    message: data.message,
                    timestamp: data.timestamp
                }]);
                return;
            }
            
            // Handle regular data updates
            setLastUpdate(new Date());
            
            // Process the data to extract PrimaryValue from any objects
            const processedData = {
                ...detailedData,
                StatusData: data.StatusData || detailedData.StatusData,
                HeartRate: extractValue(data.HeartRate),
                OperationState: extractValue(data.OperationState),
                HeartStatus: extractValue(data.HeartStatus),
                FlowLimitState: extractValue(data.FlowLimitState),
                FlowLimit: extractValue(data.FlowLimit),
                UseMedicalSensor: data.UseMedicalSensor,
                UseInternalSensor: !data.UseMedicalSensor,
                CVPSensor: data.CVPSensor || {
                    Name: '',
                    PrimaryValue: '0',
                    SecondaryValue: null,
                    BackColor: null
                },
                PAPSensor: data.PAPSensor || {
                    Name: '',
                    PrimaryValue: '0',
                    SecondaryValue: null,
                    BackColor: null
                },
                AoPSensor: data.AoPSensor || {
                    Name: '',
                    PrimaryValue: '0',
                    SecondaryValue: null,
                    BackColor: null
                },
                ArtPressSensor: data.ArtPressSensor || {
                    Name: '',
                    PrimaryValue: '0',
                    SecondaryValue: null,
                    BackColor: null
                },
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

    // Auto-scroll messages when new ones arrive
    React.useEffect(() => {
        if (isChatOpen) {
            const container = document.getElementById('messagesContainer');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [messages, isChatOpen]);

    const handleSendMessage = (message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'deviceMessage',
                message: message
            }));
        }
    };

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
                        React.createElement('div', { className: 'grid grid-rows-2 gap-2 py-1' },
                            createSensorStatusCard('Medical Sensors', detailedData.UseMedicalSensor),
                            createSensorStatusCard('Internal Sensors', detailedData.UseInternalSensor)
                        )
                    ),
                    React.createElement('div', { className: 'flex justify-between items-start mt-2 mb-2 flex-wrap gap-2' },
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { className: `badge ${detailedData.StatusData.ExtLeft.Color} w-full text-center` }, detailedData.StatusData.ExtLeft.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'Ext L')
                        ),
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { className: `badge ${detailedData.StatusData.ExtRight.Color} w-full text-center` }, detailedData.StatusData.ExtRight.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'Ext R')
                        ),
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { className: `badge ${detailedData.StatusData.IntLeft.Color} w-full text-center` }, detailedData.StatusData.IntLeft.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'Int Lft')
                        ),
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { className: `badge ${detailedData.StatusData.IntRight.Color} w-full text-center` }, detailedData.StatusData.IntRight.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'Int Rt')
                        ),
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { className: `badge ${detailedData.StatusData.Strokes.Color} w-full text-center` }, detailedData.StatusData.Strokes.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'Strokes')
                        ),
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { className: `badge ${detailedData.StatusData.BytesSent.Color} w-full text-center` }, detailedData.StatusData.BytesSent.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'Sent')
                        ),
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { className: `badge ${detailedData.StatusData.BytesRecd.Color} w-full text-center` }, detailedData.StatusData.BytesRecd.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'MB Rec')
                        ),
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { className: `badge ${detailedData.StatusData.CANStatus.Color} w-full text-center` }, detailedData.StatusData.CANStatus.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'CAN')
                        ),
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { className: `badge ${detailedData.StatusData.BusLoad.Color} w-full text-center` }, detailedData.StatusData.BusLoad.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'Bus Load')
                        )
                    )
                )
            ),
            // Left Heart Data
            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body py-1 px-1.5' },
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
                React.createElement('div', { className: 'card-body px-1.5 py-1' },
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
                React.createElement('div', { className: 'card-body px-1.5 py-1' },
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
                React.createElement('div', { className: 'card-body py-1 px-1.5' },
                    React.createElement('h2', { className: 'card-title opacity-80' }, 'Flow Status'),
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
                createHeader(status, lastUpdate, viewMode === 'charts', handleViewToggle, theme, () => setIsChatOpen(true))
            ),
            React.createElement(ThemeToggle, {
                theme: theme,
                onToggle: handleThemeToggle
            })
        ),
        React.createElement('div', { className: 'pb-16' }, // Add padding at the bottom to prevent content from being hidden behind the footer
            viewMode === 'dashboard' ? renderDashboard() : renderCharts()
        ),
        createChatModal(isChatOpen, () => setIsChatOpen(false), handleSendMessage, messages),
        createFooter()
    );
}

export { CombinedDashboard };
