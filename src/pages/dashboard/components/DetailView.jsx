import React from 'react';
import { createCard, createDetailCard, createPressureCard, createSensorStatusCard } from '../../../components/Components';

export function DetailView({ detailedData }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Cards */}
            <div className="lg:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {createCard('Heart Rate', `${detailedData.HeartRate} bpm`, 'primary')}
                    {createCard('Operation State', detailedData.OperationState, 'secondary')}
                    {createCard('Heart Status', detailedData.HeartStatus, 'accent')}
                    {createCard('Flow Limit State', detailedData.FlowLimitState, 'info')}
                    {createCard('Flow Limit', `${detailedData.FlowLimit} L/min`, 'warning')}
                </div>
            </div>

            {/* Sensor Status */}
            <div className="lg:col-span-1">
                {createSensorStatusCard(detailedData.StatusData)}
            </div>

            {/* Left Heart Details */}
            <div className="lg:col-span-1">
                {createDetailCard('Left Heart', {
                    'Stroke Volume': `${detailedData.LeftHeart.StrokeVolume} ml`,
                    'Power Consumption': `${detailedData.LeftHeart.PowerConsumption} W`,
                    'Internal Pressure': `${detailedData.LeftHeart.IntPressure} mmHg`,
                    'Min Pressure': `${detailedData.LeftHeart.IntPressureMin} mmHg`,
                    'Max Pressure': `${detailedData.LeftHeart.IntPressureMax} mmHg`,
                    'Atrial Pressure': `${detailedData.LeftHeart.AtrialPressure} mmHg`,
                    'Cardiac Output': `${detailedData.LeftHeart.CardiacOutput} L/min`
                })}
            </div>

            {/* Right Heart Details */}
            <div className="lg:col-span-1">
                {createDetailCard('Right Heart', {
                    'Stroke Volume': `${detailedData.RightHeart.StrokeVolume} ml`,
                    'Power Consumption': `${detailedData.RightHeart.PowerConsumption} W`,
                    'Internal Pressure': `${detailedData.RightHeart.IntPressure} mmHg`,
                    'Min Pressure': `${detailedData.RightHeart.IntPressureMin} mmHg`,
                    'Max Pressure': `${detailedData.RightHeart.IntPressureMax} mmHg`,
                    'Atrial Pressure': `${detailedData.RightHeart.AtrialPressure} mmHg`,
                    'Cardiac Output': `${detailedData.RightHeart.CardiacOutput} L/min`
                })}
            </div>

            {/* Medical Sensors */}
            {detailedData.UseMedicalSensor && (
                <div className="lg:col-span-1">
                    <div className="grid grid-cols-1 gap-4">
                        {createPressureCard('CVP', detailedData.CVPSensor)}
                        {createPressureCard('PAP', detailedData.PAPSensor)}
                        {createPressureCard('AoP', detailedData.AoPSensor)}
                        {createPressureCard('Art', detailedData.ArtPressSensor)}
                    </div>
                </div>
            )}
        </div>
    );
}
