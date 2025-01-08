import { useState, useEffect, useRef } from 'react';
import { extractValue } from '../../../utils/utils';

const initialDetailedData = {
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
    LeftHeart: getInitialHeartData(),
    RightHeart: getInitialHeartData(),
    HeartRate: '0',
    OperationState: '',
    HeartStatus: '',
    FlowLimitState: '',
    FlowLimit: '0',
    UseMedicalSensor: false,
    UseInternalSensor: true,
    CVPSensor: getInitialSensorData(),
    PAPSensor: getInitialSensorData(),
    AoPSensor: getInitialSensorData(),
    ArtPressSensor: getInitialSensorData()
};

function getInitialHeartData() {
    return {
        StrokeVolume: '0',
        PowerConsumption: '0',
        IntPressure: '0',
        IntPressureMin: '0',
        IntPressureMax: '0',
        AtrialPressure: '0',
        CardiacOutput: '0',
        MedicalPressure: getInitialSensorData()
    };
}

function getInitialSensorData() {
    return {
        Name: '',
        PrimaryValue: '0',
        SecondaryValue: null,
        BackColor: null
    };
}

export function useWebSocket() {
    const [detailedData, setDetailedData] = useState(initialDetailedData);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [status, setStatus] = useState('Connecting...');
    const [messages, setMessages] = useState([]);
    const wsRef = useRef(null);

    useEffect(() => {
        const ws = new WebSocket('wss://realheartremote.live/ws');
        wsRef.current = ws;
        
        ws.onopen = () => setStatus('Connected');
        ws.onclose = () => setStatus('Disconnected');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'deviceMessage') {
                setMessages(prevMessages => [...prevMessages, {
                    username: data.username,
                    message: data.message,
                    timestamp: data.timestamp
                }]);
                return;
            }
            
            setLastUpdate(new Date());
            
            setDetailedData(prevData => ({
                ...prevData,
                StatusData: data.StatusData || prevData.StatusData,
                HeartRate: extractValue(data.HeartRate),
                OperationState: extractValue(data.OperationState),
                HeartStatus: extractValue(data.HeartStatus),
                FlowLimitState: extractValue(data.FlowLimitState),
                FlowLimit: extractValue(data.FlowLimit),
                UseMedicalSensor: data.UseMedicalSensor,
                UseInternalSensor: !data.UseMedicalSensor,
                CVPSensor: data.CVPSensor || getInitialSensorData(),
                PAPSensor: data.PAPSensor || getInitialSensorData(),
                AoPSensor: data.AoPSensor || getInitialSensorData(),
                ArtPressSensor: data.ArtPressSensor || getInitialSensorData(),
                LeftHeart: {
                    ...prevData.LeftHeart,
                    ...data.LeftHeart
                },
                RightHeart: {
                    ...prevData.RightHeart,
                    ...data.RightHeart
                }
            }));
        };

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const sendMessage = (message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'message', content: message }));
        }
    };

    return {
        detailedData,
        lastUpdate,
        status,
        messages,
        sendMessage
    };
}
