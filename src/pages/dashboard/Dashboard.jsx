import React from 'react';
import { ChartManager } from '../../utils/ChartManager';
import { ThemeToggle } from '../../components/ThemeToggle';
import {
    createCard,
    createDetailCard,
    createPressureCard,
    createSensorStatusCard,
    createChatModal,
    createHeader,
    createFooter,
    ChartCard
} from '../../components/Components';

import { UserButton, useUser } from '@clerk/clerk-react';

function CombinedDashboard() {
    const { user } = useUser();

    // State management
    const [viewMode, setViewMode] = React.useState('dashboard');
    const [theme, setTheme] = React.useState('light');
    const [isChatOpen, setIsChatOpen] = React.useState(false);
    const [messages, setMessages] = React.useState([]);
    const [data, setData] = React.useState(null);
    const [status, setStatus] = React.useState('Connecting...');
    const [systemId, setSystemId] = React.useState('');
    const [dataUpdateCount, setDataUpdateCount] = React.useState(0);
    const [detailedData, setDetailedData] = React.useState({
        StatusData: {
            ExtLeft: { Text: '-', Color: 'badge-info' },
            ExtRight: { Text: '-', Color: 'badge-info' },
            IntLeft: { Text: '-', Color: 'badge-info' },
            IntRight: { Text: '-', Color: 'badge-info' },
            CANStatus: { Text: '-', Color: 'badge-info' },
            BytesSent: { Text: '-', Color: 'badge-info' },
            BytesRecd: { Text: '-', Color: 'badge-info' },
            Strokes: { Text: '-', Color: 'badge-info' },
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
        OperationState: '-',
        HeartStatus: '-',
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
        },
        LastUpdate: new Date().toLocaleString()
    });

    // Refs
    const wsRef = React.useRef(null);
    const chartManager = React.useRef(new ChartManager());
    const chartInitializedRef = React.useRef(false);

    // Callbacks
    const handleThemeToggle = React.useCallback(() => {
        setTheme(prevTheme => prevTheme === 'light' ? 'business' : 'light');
    }, []);

    const handleViewToggle = React.useCallback(() => {
        setViewMode(prev => prev === 'dashboard' ? 'charts' : 'dashboard');
    }, []);

    const handleSendMessage = React.useCallback((message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const email = user.emailAddresses[0].emailAddress;
            const messageData = {
                type: 'deviceMessage',
                message: message,
                email: user.emailAddresses[0].emailAddress
            };

            //console.log('[Sending Message]:', messageData);
            wsRef.current.send(JSON.stringify(messageData));
        }
    }, [user]);

    // Effects
    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    React.useEffect(() => {
        if (viewMode === 'charts' && !chartInitializedRef.current) {
            chartManager.current.setupCharts(theme);
            chartInitializedRef.current = true;
        } else if (viewMode !== 'charts' && chartInitializedRef.current) {
            chartManager.current.destroyCharts();
            chartInitializedRef.current = false;
        }
    }, [viewMode]);

    // Update charts when theme changes
    React.useEffect(() => {
        if (viewMode === 'charts' && chartInitializedRef.current) {
            chartManager.current.destroyCharts();
            chartManager.current.setupCharts(theme);
        }
    }, [theme]);

    // Update chart data
    React.useEffect(() => {
        if (viewMode === 'charts' && chartInitializedRef.current) {
            chartManager.current.updateCharts();
        }
    }, [dataUpdateCount, viewMode]);

    React.useEffect(() => {
        const email = user.emailAddresses[0].emailAddress;
        const wsUrl = `${import.meta.env.VITE_WS_URL}?email=${encodeURIComponent(email)}`;
        console.log('[Connecting WebSocket]:', wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        const handleOpen = () => {
            console.log('[WebSocket Connected]');
            setStatus('Connected');
        };

        const handleClose = () => {
            console.log('[WebSocket Disconnected]');
            setStatus('Disconnected');
        };

        const handleMessage = (event) => {
            const data = JSON.parse(event.data);

           if (data.type === 'deviceMessage') 
                {
                const messageObj = { 
                    message: data.message,  
                    sender: data.self ? 'user' : 'device',
                    username: data.username,
                    timestamp: data.timestamp || new Date().toISOString()
                };

                setMessages(prev => [...prev, messageObj]);
                return;
            }

            if (data.SystemId) {
                setSystemId(data.SystemId);
            }

            setDetailedData(prevData => ({
                ...prevData,
                StatusData: data.StatusData || prevData.StatusData,
                LeftHeart: data.LeftHeart || prevData.LeftHeart,
                RightHeart: data.RightHeart || prevData.RightHeart,
                HeartRate: data.HeartRate || prevData.HeartRate,
                CVPSensor: data.CVPSensor || prevData.CVPSensor,
                PAPSensor: data.PAPSensor || prevData.PAPSensor,
                AoPSensor: data.AoPSensor || prevData.AoPSensor,
                ArtPressSensor: data.ArtPressSensor || prevData.ArtPressSensor,
                OperationState: data.OperationState || prevData.OperationState,
                HeartStatus: data.HeartStatus || prevData.HeartStatus,
                LastUpdate: new Date().toLocaleTimeString()
            }));

            if (chartManager.current) {
                chartManager.current.updateStoredChartData(data);
                setDataUpdateCount(count => count + 1);
            }
        };

        ws.addEventListener('open', handleOpen);
        ws.addEventListener('close', handleClose);
        ws.addEventListener('message', handleMessage);
        return () => {
            ws.removeEventListener('open', handleOpen);
            ws.removeEventListener('close', handleClose);
            ws.removeEventListener('message', handleMessage);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [user]);

    // Auto-scroll messages when new ones arrive
    React.useEffect(() => {
        if (isChatOpen) {
            const container = document.getElementById('messagesContainer');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [messages, isChatOpen]);

    // Helper function to strip alpha channel from hex color
    const stripAlphaChannel = (hexColor) => {
        // If the color starts with 0xFF, remove it and return the remaining 6 characters
        if (hexColor && hexColor.length >= 8) {
            return '#' + hexColor.substring(hexColor.length - 6);
        }
        return hexColor;
    };

    // Render functions
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
                            React.createElement('span', { 
                                className: 'badge w-full text-center',
                                style: { 
                                    backgroundColor: stripAlphaChannel(detailedData.StatusData.ExtLeft.Color),
                                    color: '#000000'
                                }
                            }, detailedData.StatusData.ExtLeft.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'Ext L')
                        ),
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { 
                                className: 'badge w-full text-center',
                                style: { 
                                    backgroundColor: stripAlphaChannel(detailedData.StatusData.ExtRight.Color),
                                    color: '#000000'
                                }
                            }, detailedData.StatusData.ExtRight.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'Ext R')
                        ),
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { 
                                className: 'badge w-full text-center',
                                style: { 
                                    backgroundColor: stripAlphaChannel(detailedData.StatusData.IntLeft.Color),
                                    color: '#000000'
                                }
                            }, detailedData.StatusData.IntLeft.Text),
                            React.createElement('span', { className: 'text-xs mt-1' }, 'Int Lt')
                        ),
                        React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                            React.createElement('span', { 
                                className: 'badge w-full text-center',
                                style: { 
                                    backgroundColor: stripAlphaChannel(detailedData.StatusData.IntRight.Color),
                                    color: '#000000'
                                }
                            }, detailedData.StatusData.IntRight.Text),
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
                            React.createElement('span', { 
                                className: 'badge w-full text-center',
                                style: { 
                                    backgroundColor: stripAlphaChannel(detailedData.StatusData.BusLoad.Color),
                                    color: '#000000'
                                }
                            }, detailedData.StatusData.BusLoad.Text),
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
                        createDetailCard('Stroke Vol', detailedData.LeftHeart.StrokeVolume, 'stroke.png', 'base-content', detailedData),

                        createPressureCard('Int Press', detailedData.LeftHeart.IntPressure, detailedData.LeftHeart.IntPressureMax, detailedData.LeftHeart.IntPressureMin, 'pressure.png'),

                        createDetailCard('Atrial Press', detailedData.LeftHeart.AtrialPressure, 'pressure.png', 'base-content', detailedData),

                        createDetailCard('Medical Press', detailedData.LeftHeart.MedicalPressure, 'pressure.png', 'base-content', detailedData),

                        createDetailCard('Cardiac Out', detailedData.LeftHeart.CardiacOutput, 'cardiacout.png', 'base-content', detailedData),

                        createDetailCard('Power', detailedData.LeftHeart.PowerConsumption, 'power.png', 'base-content', detailedData)

                    )

                )

            ),

            // Right Heart Data

            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body px-1.5 py-1' },
                    React.createElement('h2', { className: 'card-title opacity-80' }, 'Right Heart'),

                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4' },
                        createDetailCard('Stroke Vol', detailedData.RightHeart.StrokeVolume, 'stroke.png', 'base-content', detailedData),

                        createPressureCard('Int Press', detailedData.RightHeart.IntPressure, detailedData.RightHeart.IntPressureMax, detailedData.RightHeart.IntPressureMin, 'pressure.png'),

                        createDetailCard('Atrial Press', detailedData.RightHeart.AtrialPressure, 'pressure.png', 'base-content', detailedData),

                        createDetailCard('Medical Press', detailedData.RightHeart.MedicalPressure, 'pressure.png', 'base-content', detailedData),

                        createDetailCard('Cardiac Out', detailedData.RightHeart.CardiacOutput, 'cardiacout.png', 'base-content', detailedData),

                        createDetailCard('Power', detailedData.RightHeart.PowerConsumption, 'power.png', 'base-content', detailedData)

                    )

                )

            ),

            // Pressure Data

            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body px-1.5 py-1' },
                    React.createElement('h2', { className: 'card-title opacity-80' }, 'System Pressures'),

                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' },
                        createDetailCard('CVP', detailedData.CVPSensor, 'pressure.png', 'base-content', detailedData),

                        createDetailCard('PAP', detailedData.PAPSensor, 'pressure.png', 'base-content', detailedData),

                        createDetailCard('AoP', detailedData.AoPSensor, 'pressure.png', 'base-content', detailedData),

                        createDetailCard('Arterial', detailedData.ArtPressSensor, 'pressure.png', 'base-content', detailedData)

                    )

                )

            ),

            // Flow Info

            React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                React.createElement('div', { className: 'card-body py-1 px-1.5' },
                    React.createElement('h2', { className: 'card-title opacity-80' }, 'Flow Status'),

                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4' },
                        createDetailCard('Flow Lmt', detailedData.FlowLimit, 'flow.png', 'base-content', detailedData),

                        createDetailCard('Flow State', detailedData.FlowLimitState, 'flow.png', 'base-content', detailedData)

                    )

                )

            )

        );

    }


    function renderCharts() {

        return React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4' },
            React.createElement(ChartCard, {

                title: 'Heart Rate',

                value: `${detailedData?.HeartRate?.PrimaryValue || detailedData?.HeartRate || 0} bpm`,

                color: 'red',

                chartId: 'heartRateChart'

            }),

            React.createElement(ChartCard, {

                title: 'Power Consumption',

                value: `L: ${detailedData?.LeftHeart?.PowerConsumption?.PrimaryValue || detailedData?.LeftHeart?.PowerConsumption || 0} W R: ${detailedData?.RightHeart?.PowerConsumption?.PrimaryValue || detailedData?.RightHeart?.PowerConsumption || 0} W`,

                color: 'blue',

                chartId: 'powerConsumptionChart'

            }),

            React.createElement(ChartCard, {

                title: 'Atrial Pressure',

                value: `L: ${detailedData?.LeftHeart?.AtrialPressure?.PrimaryValue || detailedData?.LeftHeart?.AtrialPressure || 0} mmHg R: ${detailedData?.RightHeart?.AtrialPressure?.PrimaryValue || detailedData?.RightHeart?.AtrialPressure || 0} mmHg`,

                color: 'blue',

                chartId: 'atrialPressureChart'

            }),

            React.createElement(ChartCard, {

                title: 'Cardiac Output',

                value: `L: ${detailedData?.LeftHeart?.CardiacOutput?.PrimaryValue || detailedData?.LeftHeart?.CardiacOutput || 0} L/min R: ${detailedData?.RightHeart?.CardiacOutput?.PrimaryValue || detailedData?.RightHeart?.CardiacOutput || 0} L/min`,

                color: 'blue',

                chartId: 'cardiacOutputChart'

            }),

            React.createElement(ChartCard, {

                title: 'Stroke Volume',

                value: `L: ${detailedData?.LeftHeart?.StrokeVolume?.PrimaryValue || detailedData?.LeftHeart?.StrokeVolume || 0} ml R: ${detailedData?.RightHeart?.StrokeVolume?.PrimaryValue || detailedData?.RightHeart?.StrokeVolume || 0} ml`,

                color: 'blue',

                chartId: 'strokeVolumeChart'

            }),

            React.createElement(ChartCard, {

                title: 'Low Pressures',

                value: `CVP: ${detailedData?.CVPSensor?.PrimaryValue || detailedData?.CVPSensor || 0} mmHg PAP: ${detailedData?.PAPSensor?.PrimaryValue || detailedData?.PAPSensor || 0} mmHg`,

                color: 'blue',

                chartId: 'lowPressuresChart'

            }),

            React.createElement(ChartCard, {

                title: 'High Pressures',

                value: `AoP: ${detailedData?.AoPSensor?.PrimaryValue || detailedData?.AoPSensor || 0} mmHg Art: ${detailedData?.ArtPressSensor?.PrimaryValue || detailedData?.ArtPressSensor || 0} mmHg`,

                color: 'blue',

                chartId: 'highPressuresChart'

            })

        );

    }


    // Component render

    return React.createElement('div', { className: 'container mx-auto p-4 max-w-7xl' },
        React.createElement('div', { className: 'flex items-center justify-between mb-4' },
            React.createElement('div', { className: 'flex-1' },
                createHeader(status, detailedData.LastUpdate, viewMode === 'charts', handleViewToggle, theme, () => setIsChatOpen(true), systemId)
            ),
            React.createElement(ThemeToggle, {
                theme: theme,
                onToggle: handleThemeToggle
            })
        ),
        React.createElement('div', { className: 'pb-16' },
            viewMode === 'dashboard' ? renderDashboard() : renderCharts()
        ),
        createChatModal(isChatOpen, () => setIsChatOpen(false), handleSendMessage, messages),
        createFooter()
    );
}

function Dashboard() {
    const { user } = useUser();
    return (
        <div>
            <UserButton />
            <CombinedDashboard />
        </div>
    );
}
export default Dashboard;