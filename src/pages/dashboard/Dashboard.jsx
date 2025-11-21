import React from 'react';
import { useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { ChartManager } from '../../utils/ChartManager';
import { ThemeToggle } from '../../components/ThemeToggle';
import MessageLog from '../../components/MessageLog';
import {
    createCard,
    createDetailCard,
    createPressureCard,
    createStrokeCard,
    createSensorStatusCard,
    createChatModal,
    createHeader,
    createFooter,
    ChartCard
} from '../../components/Components';

import { UserButton, useUser } from '@clerk/clerk-react';

// Import all atoms and the update function
import {
    systemIdAtom,
    heartRateAtom,
    operationStateAtom,
    heartStatusAtom,
    leftPowerAtom,
    leftAtrialPressureAtom,
    leftCardiacOutputAtom,
    leftTargetStrokeLenAtom,
    leftActualStrokeLenAtom,
    leftIntPressureAtom,
    leftIntPressureMinAtom,
    leftIntPressureMaxAtom,
    leftMedicalPressureAtom,
    rightPowerAtom,
    rightAtrialPressureAtom,
    rightCardiacOutputAtom,
    rightTargetStrokeLenAtom,
    rightActualStrokeLenAtom,
    rightIntPressureAtom,
    rightIntPressureMinAtom,
    rightIntPressureMaxAtom,
    rightMedicalPressureAtom,
    cvpSensorAtom,
    papSensorAtom,
    aopSensorAtom,
    artPressSensorAtom,
    ivcPressSensorAtom,
    statusDataAtom,
    temperatureAtom,
    voltageAtom,
    cpuLoadAtom,
    accelerometerAtom,
    flowLimitStateAtom,
    flowLimitAtom,
    useMedicalSensorAtom,
    lastUpdateAtom,
    noDataReceivedAtom,
    leftHeartAvailableAtom,
    rightHeartAvailableAtom,
    updateAtomsFromState
} from '../../atoms';

function CombinedDashboard() {
    const { user } = useUser();

    // State management
    const MAX_MESSAGES = 100;
    const [viewMode, setViewMode] = React.useState('dashboard');
    const [theme, setTheme] = React.useState('light');
    const [isChatOpen, setIsChatOpen] = React.useState(false);
    const [messages, setMessages] = React.useState([]);
    const [data, setData] = React.useState(null);
    const [status, setStatus] = React.useState('Connecting...');
    const [dataUpdateCount, setDataUpdateCount] = React.useState(0);
    const [availableSystems, setAvailableSystems] = React.useState([]);
    const [selectedSystem, setSelectedSystem] = React.useState(null);

    // Use Jotai atoms for telemetry data
    const [systemId, setSystemId] = useAtom(systemIdAtom);
    const heartRate = useAtomValue(heartRateAtom);
    const operationState = useAtomValue(operationStateAtom);
    const heartStatus = useAtomValue(heartStatusAtom);
    
    const leftPower = useAtomValue(leftPowerAtom);
    const leftAtrialPressure = useAtomValue(leftAtrialPressureAtom);
    const leftCardiacOutput = useAtomValue(leftCardiacOutputAtom);
    const leftTargetStrokeLen = useAtomValue(leftTargetStrokeLenAtom);
    const leftActualStrokeLen = useAtomValue(leftActualStrokeLenAtom);
    const leftIntPressure = useAtomValue(leftIntPressureAtom);
    const leftIntPressureMin = useAtomValue(leftIntPressureMinAtom);
    const leftIntPressureMax = useAtomValue(leftIntPressureMaxAtom);
    const leftMedicalPressure = useAtomValue(leftMedicalPressureAtom);
    
    const rightPower = useAtomValue(rightPowerAtom);
    const rightAtrialPressure = useAtomValue(rightAtrialPressureAtom);
    const rightCardiacOutput = useAtomValue(rightCardiacOutputAtom);
    const rightTargetStrokeLen = useAtomValue(rightTargetStrokeLenAtom);
    const rightActualStrokeLen = useAtomValue(rightActualStrokeLenAtom);
    const rightIntPressure = useAtomValue(rightIntPressureAtom);
    const rightIntPressureMin = useAtomValue(rightIntPressureMinAtom);
    const rightIntPressureMax = useAtomValue(rightIntPressureMaxAtom);
    const rightMedicalPressure = useAtomValue(rightMedicalPressureAtom);
    
    const cvpSensor = useAtomValue(cvpSensorAtom);
    const papSensor = useAtomValue(papSensorAtom);
    const aopSensor = useAtomValue(aopSensorAtom);
    const artPressSensor = useAtomValue(artPressSensorAtom);
    const ivcPressSensor = useAtomValue(ivcPressSensorAtom);
    
    const statusData = useAtomValue(statusDataAtom);
    const temperature = useAtomValue(temperatureAtom);
    const voltage = useAtomValue(voltageAtom);
    const cpuLoad = useAtomValue(cpuLoadAtom);
    const accelerometer = useAtomValue(accelerometerAtom);
    const flowLimitState = useAtomValue(flowLimitStateAtom);
    const flowLimit = useAtomValue(flowLimitAtom);
    const useMedicalSensor = useAtomValue(useMedicalSensorAtom);
    const lastUpdate = useAtomValue(lastUpdateAtom);
    
    // Get the Jotai store for updating atoms
    const store = useStore();
    
    // Telemetry status atoms for graceful degradation (Requirements 9.1, 9.2, 9.4)
    const noDataReceived = useAtomValue(noDataReceivedAtom);
    const leftHeartAvailable = useAtomValue(leftHeartAvailableAtom);
    const rightHeartAvailable = useAtomValue(rightHeartAvailableAtom);
    
    // Get the setAtom function for updating atoms from WebSocket
    const setAtom = useSetAtom((get, set, update) => set(update.atom, update.value));

    // Refs
    const wsRef = React.useRef(null);
    const chartManager = React.useRef(new ChartManager());
    const chartInitializedRef = React.useRef(false);

    // Callbacks
    const addMessage = React.useCallback((newMessage) => {
        setMessages(currentMessages => {
            const updatedMessages = [newMessage, ...currentMessages];
            return updatedMessages.slice(0, MAX_MESSAGES);
        });
    }, []);

    // WebSocket handlers
    const handleDisconnect = React.useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setStatus('Disconnected');
        setSelectedSystem(null);
        setSystemId(null);
    }, []);

    const handleConnect = React.useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const email = user.emailAddresses[0].emailAddress;
        const params = new URLSearchParams();
        
        if (selectedSystem) {
            params.append('systemId', selectedSystem);
        }
        if (email) {
            params.append('email', email);
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = import.meta.env.DEV ? 'localhost:3000' : 'realheartremote.live';
        const wsPath = '/ws';
        const wsUrl = `${wsProtocol}//${wsHost}${wsPath}${params.toString() ? '?' + params.toString() : ''}`;
        
        console.log('[Connecting to WebSocket]:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[WebSocket Connected]');
            setStatus('Connected');
        };

        ws.onclose = () => {
            console.log('[WebSocket Disconnected]');
            setStatus('Disconnected');
            wsRef.current = null;
            setSelectedSystem(null);
            setSystemId(null);
        };

        ws.onerror = (error) => {
            console.error('[WebSocket Error]:', error);
            setStatus('Error');
            wsRef.current = null;
            setSelectedSystem(null);
            setSystemId(null);
        };

        ws.onmessage = handleWebSocketMessage;

    }, [user, selectedSystem]);

    const handleWebSocketMessage = React.useCallback((event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'deviceMessage') {
                addMessage(data);
                return;
            }

            if (data.type === 'systemMessage') {
                addMessage({
                    username: data.source || 'System',
                    message: data.message,
                    timestamp: data.timestamp,
                    type: data.messageType
                });
                return;
            }

            if (data.type === 'systems_list') {
                // Deduplicate and sort systems
                const uniqueSystems = Array.from(new Set(data.systems)).sort();
                setAvailableSystems(uniqueSystems);
                return;
            }

            // If we receive data with a SystemId, add it to available systems if not present
            if (data.SystemId && !availableSystems.includes(data.SystemId)) {
                setAvailableSystems(prev => {
                    const newSystems = Array.from(new Set([...prev, data.SystemId])).sort();
                    return newSystems;
                });
            }

            if (data.SystemId) {
                setSystemId(data.SystemId);
            }

            // Handle system messages in status update
            if (data.Messages && Array.isArray(data.Messages)) {
                data.Messages.forEach(msg => {
                    addMessage({
                        username: msg.Source || 'System',
                        message: msg.Message,
                        timestamp: msg.Timestamp,
                        type: msg.MessageType
                    });
                });
            }

            // Update Jotai atoms from WebSocket state
            updateAtomsFromState(data, (atom, value) => store.set(atom, value));

            if (chartManager.current) {
                chartManager.current.updateStoredChartData(data);
                setDataUpdateCount(count => count + 1);
            }
        } catch (error) {
            console.error('[WebSocket Error Parsing Data]:', error);
        }
    }, [addMessage, setSystemId, setAtom]);

    const handleStatusClick = React.useCallback(() => {
        console.log('[Status Click]', { status, wsRef: !!wsRef.current });
        if (status === 'Connected') {
            handleDisconnect();
        } else {
            document.getElementById('system_select_modal').showModal();
        }
    }, [status, handleDisconnect]);

    const handleSystemSelect = React.useCallback((system) => {
        setSelectedSystem(system);
        setSystemId(system);
        document.getElementById('system_select_modal').close();
        handleConnect();
    }, [handleConnect]);

    const handleConnectToFirst = React.useCallback(() => {
        const firstSystem = availableSystems[0];
        if (firstSystem) {
            handleSystemSelect(firstSystem);
        }
    }, [availableSystems, handleSystemSelect]);

    // Effects
    React.useEffect(() => {
        handleConnect();
        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, [handleConnect]);

    const handleThemeToggle = React.useCallback(() => {
        const newTheme = theme === 'light' ? 'halloween' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    }, [theme]);

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
        return React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'max-w-7xl mx-auto' },
                // No Data Indicator (Requirement 9.2)
                noDataReceived && React.createElement('div', { 
                    className: 'alert alert-warning shadow-lg mb-4',
                    role: 'alert'
                },
                    React.createElement('svg', {
                        xmlns: 'http://www.w3.org/2000/svg',
                        className: 'stroke-current flex-shrink-0 h-6 w-6',
                        fill: 'none',
                        viewBox: '0 0 24 24'
                    },
                        React.createElement('path', {
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round',
                            strokeWidth: '2',
                            d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                        })
                    ),
                    React.createElement('div', null,
                        React.createElement('h3', { className: 'font-bold' }, 'No Data Received'),
                        React.createElement('div', { className: 'text-xs' }, 'No telemetry data has been received for an extended period. Check device connection.')
                    )
                ),
                // Status Cards
                React.createElement('div', { className: 'card bg-base-200 shadow-xl mt-1 mb-1 p-0' },
                    React.createElement('div', { className: 'card-body px-1.5 py-0.5' },
                        React.createElement('h2', { className: 'card-title opacity-80 mt-0  py-0' }, 'System Status'),

                        React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4' },
                            createCard('Heart Rate', `${heartRate} BPM`, 'red'),
                            createCard('Operation State', operationState, 'blue'),
                            createCard('Heart Status', heartStatus, 'green'),
                            React.createElement('div', { className: 'grid grid-rows-2 gap-2 py-1' },
                                createSensorStatusCard('Medical Sensors', useMedicalSensor),
                                createSensorStatusCard('Internal Sensors', !useMedicalSensor)
                            )
                        ),
                        React.createElement('div', { className: 'flex justify-between items-start mt-2 mb-2 flex-wrap gap-2' },
                            React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                                React.createElement('span', { 
                                    className: 'badge w-full text-center',
                                    style: { 
                                        backgroundColor: stripAlphaChannel(statusData.ExtLeft.Color),
                                        color: '#000000'
                                    }
                                }, statusData.ExtLeft.Text),
                                React.createElement('span', { className: 'text-xs mt-1' }, 'Ext L')
                            ),
                            React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                                React.createElement('span', { 
                                    className: 'badge w-full text-center',
                                    style: { 
                                        backgroundColor: stripAlphaChannel(statusData.ExtRight.Color),
                                        color: '#000000'
                                    }
                                }, statusData.ExtRight.Text),
                                React.createElement('span', { className: 'text-xs mt-1' }, 'Ext R')
                            ),
                            React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                                React.createElement('span', { 
                                    className: 'badge w-full text-center',
                                    style: { 
                                        backgroundColor: stripAlphaChannel(statusData.IntLeft.Color),
                                        color: '#000000'
                                    }
                                }, statusData.IntLeft.Text),
                                React.createElement('span', { className: 'text-xs mt-1' }, 'Int Lt')
                            ),
                            React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                                React.createElement('span', { 
                                    className: 'badge w-full text-center',
                                    style: { 
                                        backgroundColor: stripAlphaChannel(statusData.IntRight.Color),
                                        color: '#000000'
                                    }
                                }, statusData.IntRight.Text),
                                React.createElement('span', { className: 'text-xs mt-1' }, 'Int Rt')
                            ),
                            React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                                React.createElement('span', { className: `badge ${statusData.Strokes.Color} w-full text-center` }, statusData.Strokes.Text),
                                React.createElement('span', { className: 'text-xs mt-1' }, 'Strokes')
                            ),
                            React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                                React.createElement('span', { className: `badge ${statusData.BytesSent.Color} w-full text-center` }, statusData.BytesSent.Text),
                                React.createElement('span', { className: 'text-xs mt-1' }, 'Sent')
                            ),
                            React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                                React.createElement('span', { className: `badge ${statusData.BytesRecd.Color} w-full text-center` }, statusData.BytesRecd.Text),
                                React.createElement('span', { className: 'text-xs mt-1' }, 'MB Rec')
                            ),
                            React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                                React.createElement('span', { className: `badge ${statusData.CANStatus.Color} w-full text-center` }, statusData.CANStatus.Text),
                                React.createElement('span', { className: 'text-xs mt-1' }, 'CAN')
                            ),
                            React.createElement('div', { className: 'flex-1 flex flex-col items-center' },
                                React.createElement('span', { 
                                    className: 'badge w-full text-center',
                                    style: { 
                                        backgroundColor: stripAlphaChannel(statusData.BusLoad.Color),
                                        color: '#000000'
                                    }
                                }, statusData.BusLoad.Text),
                                React.createElement('span', { className: 'text-xs mt-1' }, 'Bus Load')
                            )

                        )

                    )

                ),

                // Left Heart Data

                React.createElement('div', { 
                    className: `card bg-base-200 shadow-xl mb-2 mt-2 ${!leftHeartAvailable ? 'opacity-50' : ''}` 
                },
                    React.createElement('div', { className: 'card-body py-1 px-1.5' },
                        React.createElement('div', { className: 'flex justify-between items-center' },
                            React.createElement('h2', { className: 'card-title opacity-80' }, 'Left Heart'),
                            !leftHeartAvailable && React.createElement('span', { 
                                className: 'badge badge-warning badge-sm' 
                            }, 'No Data')
                        ),

                        React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4' },
                            createStrokeCard('Stroke Len', leftTargetStrokeLen, leftActualStrokeLen, 'piston.png'),

                            createPressureCard('Int Press', leftIntPressure, leftIntPressureMax, leftIntPressureMin, 'pressure.png'),

                            createDetailCard('Medical Press', leftMedicalPressure, 'pressure.png', 'base-content', null, 'mmHg'),

                            createDetailCard('Cardiac Out', leftCardiacOutput, 'cardiacout.png', 'base-content', null, 'L/min'),

                            createDetailCard('Power', leftPower, 'watts.png', 'base-content', null, 'W')

                        )

                    )

                ),

                // Right Heart Data

                React.createElement('div', { 
                    className: `card bg-base-200 shadow-xl mb-2 mt-2 ${!rightHeartAvailable ? 'opacity-50' : ''}` 
                },
                    React.createElement('div', { className: 'card-body px-1.5 py-1' },
                        React.createElement('div', { className: 'flex justify-between items-center' },
                            React.createElement('h2', { className: 'card-title opacity-80' }, 'Right Heart'),
                            !rightHeartAvailable && React.createElement('span', { 
                                className: 'badge badge-warning badge-sm' 
                            }, 'No Data')
                        ),

                        React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4' },
                            createStrokeCard('Stroke Len', rightTargetStrokeLen, rightActualStrokeLen, 'piston.png'),

                            createPressureCard('Int Press', rightIntPressure, rightIntPressureMax, rightIntPressureMin, 'pressure.png'),

                            createDetailCard('Medical Press', rightMedicalPressure, 'pressure.png', 'base-content', null, 'mmHg'),

                            createDetailCard('Cardiac Out', rightCardiacOutput, 'cardiacout.png', 'base-content', null, 'L/min'),

                            createDetailCard('Power', rightPower, 'watts.png', 'base-content', null, 'W')

                        )

                    )

                ),

                // Pressure Data

                React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                    React.createElement('div', { className: 'card-body px-1.5 py-1' },
                        React.createElement('h2', { className: 'card-title opacity-80' }, 'System Pressures'),

                        React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4' },
                            createDetailCard('CVP', cvpSensor, 'pressure.png', 'base-content', null, 'mmHg'),

                            createDetailCard('PAP', papSensor, 'pressure.png', 'base-content', null, 'mmHg'),

                            createDetailCard('AoP', aopSensor, 'pressure.png', 'base-content', null, 'mmHg'),

                            createDetailCard('Arterial', artPressSensor, 'pressure.png', 'base-content', null, 'mmHg'),

                            createDetailCard('IVC', ivcPressSensor, 'pressure.png', 'base-content', null, 'mmHg')

                        )

                    )

                ),

                // System Health

                React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                    React.createElement('div', { className: 'card-body px-1.5 py-1' },
                        React.createElement('h2', { className: 'card-title opacity-80' }, 'System Health'),

                        React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4' },
                            React.createElement('div', { 
                                className: `stat bg-base-100 rounded-lg shadow ${temperature.Color === 'badge-error' ? 'ring-2 ring-error' : ''}` 
                            },
                                React.createElement('div', { className: 'stat-title' }, 'Temperature'),
                                React.createElement('div', { 
                                    className: `stat-value text-2xl ${temperature.Color === 'badge-error' ? 'text-error' : ''}` 
                                }, temperature.Text),
                                React.createElement('div', { className: 'stat-desc' }, 
                                    '°C',
                                    temperature.Color === 'badge-error' && React.createElement('span', { 
                                        className: 'badge badge-error badge-sm ml-2' 
                                    }, 'HIGH')
                                )
                            ),

                            React.createElement('div', { 
                                className: `stat bg-base-100 rounded-lg shadow ${voltage.Color === 'badge-warning' ? 'ring-2 ring-warning' : ''}` 
                            },
                                React.createElement('div', { className: 'stat-title' }, 'Voltage'),
                                React.createElement('div', { 
                                    className: `stat-value text-2xl ${voltage.Color === 'badge-warning' ? 'text-warning' : ''}` 
                                }, voltage.Text),
                                React.createElement('div', { className: 'stat-desc' }, 
                                    'V',
                                    voltage.Color === 'badge-warning' && React.createElement('span', { 
                                        className: 'badge badge-warning badge-sm ml-2' 
                                    }, 'OUT OF RANGE')
                                )
                            ),

                            React.createElement('div', { className: 'stat bg-base-100 rounded-lg shadow' },
                                React.createElement('div', { className: 'stat-title' }, 'CPU Load'),
                                React.createElement('div', { className: 'stat-value text-2xl' }, cpuLoad.Text),
                                React.createElement('div', { className: 'stat-desc' }, '%')
                            ),

                            React.createElement('div', { 
                                className: `stat bg-base-100 rounded-lg shadow ${accelerometer.Color === 'badge-error' ? 'ring-2 ring-error' : ''}` 
                            },
                                React.createElement('div', { className: 'stat-title' }, 'Accelerometer'),
                                React.createElement('div', { 
                                    className: `stat-value text-2xl ${accelerometer.Color === 'badge-error' ? 'text-error' : ''}` 
                                }, accelerometer.Text),
                                React.createElement('div', { className: 'stat-desc' }, 
                                    'g',
                                    accelerometer.Color === 'badge-error' && React.createElement('span', { 
                                        className: 'badge badge-error badge-sm ml-2' 
                                    }, '⚠ WARNING')
                                )
                            )

                        )

                    )

                ),

                // Flow Info

                React.createElement('div', { className: 'card bg-base-200 shadow-xl mb-2 mt-2' },
                    React.createElement('div', { className: 'card-body py-1 px-1.5' },
                        React.createElement('h2', { className: 'card-title opacity-80' }, 'Flow Status'),

                        React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4' },
                            createDetailCard('Flow Lmt', flowLimit, 'flow.png', 'base-content', null, 'L/min'),

                            createDetailCard('Flow State', flowLimitState, 'flow.png', 'base-content', null)

                        )

                    )

                )
            )
        );
    }

    function renderCharts() {

        return React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4' },
            React.createElement(ChartCard, {

                title: 'Heart Rate',

                value: `${heartRate} bpm`,

                color: 'red',

                chartId: 'heartRateChart'

            }),

            React.createElement(ChartCard, {

                title: 'Power Consumption',

                value: `L: ${leftPower} W R: ${rightPower} W`,

                color: 'blue',

                chartId: 'powerConsumptionChart'

            }),

            React.createElement(ChartCard, {

                title: 'Atrial Pressure',

                value: `L: ${leftAtrialPressure} mmHg R: ${rightAtrialPressure} mmHg`,

                color: 'blue',

                chartId: 'atrialPressureChart'

            }),

            React.createElement(ChartCard, {

                title: 'Cardiac Output',

                value: `L: ${leftCardiacOutput} L/min R: ${rightCardiacOutput} L/min`,

                color: 'blue',

                chartId: 'cardiacOutputChart'

            }),

            React.createElement(ChartCard, {

                title: 'Stroke Length',

                value: `L: ${leftActualStrokeLen} mm R: ${rightActualStrokeLen} mm`,

                color: 'blue',

                chartId: 'strokeLengthChart'

            }),

            React.createElement(ChartCard, {

                title: 'Low Pressures',

                value: `CVP: ${cvpSensor?.PrimaryValue || 0} mmHg PAP: ${papSensor?.PrimaryValue || 0} mmHg`,

                color: 'blue',

                chartId: 'lowPressuresChart'

            }),

            React.createElement(ChartCard, {

                title: 'High Pressures',

                value: `AoP: ${aopSensor?.PrimaryValue || 0} mmHg Art: ${artPressSensor?.PrimaryValue || 0} mmHg`,

                color: 'blue',

                chartId: 'highPressuresChart'

            })

        );

    }

    return React.createElement('div', { className: 'container mx-auto p-4 max-w-7xl' },
        React.createElement('div', { className: 'flex items-center justify-between mb-4' },
            React.createElement('div', { className: 'flex-1' },
                createHeader(status, lastUpdate, viewMode === 'charts', handleViewToggle, theme, () => setIsChatOpen(true), systemId, handleStatusClick)
            ),
            React.createElement(ThemeToggle, {
                theme: theme,
                onToggle: handleThemeToggle
            })
        ),
        React.createElement('div', { className: 'pb-16' },
            viewMode === 'dashboard' ? (
                React.createElement(React.Fragment, null,
                    renderDashboard(),
                    React.createElement('div', { className: 'card bg-base-200 shadow-xl mt-4' },
                        React.createElement('div', { className: 'card-body' },
                            React.createElement('h2', { className: 'card-title' }, 'System Messages'),
                            React.createElement(MessageLog, { messages: messages })
                        )
                    )
                )
            ) : renderCharts()
        ),
        createChatModal(isChatOpen, () => setIsChatOpen(false), handleSendMessage, messages),
        createFooter(),
        // System Select Modal
        React.createElement('dialog', { id: 'system_select_modal', className: 'modal modal-bottom sm:modal-middle' },
            React.createElement('div', { className: 'modal-box' },
                React.createElement('h3', { className: 'font-bold text-lg' }, 'Select System'),
                React.createElement('div', { className: 'py-4' },
                    React.createElement('div', { className: 'space-y-2' },
                        availableSystems.length === 0 ? (
                            React.createElement('div', { className: 'text-center py-4' },
                                React.createElement('div', { className: 'loading loading-spinner loading-lg' }),
                                React.createElement('p', { className: 'text-sm text-gray-500 mt-2' }, 'Waiting for available systems...')
                            )
                        ) : (
                            // Deduplicate systems before rendering
                            Array.from(new Set(availableSystems)).sort().map(system => (
                                React.createElement('button', {
                                    key: system,
                                    className: `btn btn-block ${selectedSystem === system ? 'btn-primary' : 'btn-ghost'} justify-between`,
                                    onClick: () => handleSystemSelect(system)
                                },
                                    React.createElement('span', null, system),
                                    selectedSystem === system && React.createElement('span', { className: 'badge badge-primary' }, 'Connected')
                                )
                            ))
                        )
                    )
                ),
                React.createElement('div', { className: 'modal-action' },
                    React.createElement('form', { method: 'dialog', className: 'flex gap-2' },
                        React.createElement('button', {
                            type: 'button',
                            className: 'btn btn-primary',
                            onClick: handleConnectToFirst,
                            disabled: availableSystems.length === 0
                        }, 'Connect to First Available'),
                        React.createElement('button', { className: 'btn' }, 'Cancel')
                    )
                )
            )
        )
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