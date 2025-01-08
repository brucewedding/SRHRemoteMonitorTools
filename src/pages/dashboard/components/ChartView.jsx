import React from 'react';
import { createChartCard } from '../../../components/Components';

export function ChartView({ detailedData, theme }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Left Heart Charts */}
            {createChartCard(
                'Left Heart Stroke Volume',
                `${detailedData.LeftHeart.StrokeVolume} ml`,
                'blue',
                'leftStrokeVolume'
            )}
            {createChartCard(
                'Left Heart Power',
                `${detailedData.LeftHeart.PowerConsumption} W`,
                'blue',
                'leftPower'
            )}
            {createChartCard(
                'Left Heart Pressure',
                `L: ${detailedData.LeftHeart.IntPressure} mmHg`,
                'blue',
                'leftPressure'
            )}

            {/* Right Heart Charts */}
            {createChartCard(
                'Right Heart Stroke Volume',
                `${detailedData.RightHeart.StrokeVolume} ml`,
                'red',
                'rightStrokeVolume'
            )}
            {createChartCard(
                'Right Heart Power',
                `${detailedData.RightHeart.PowerConsumption} W`,
                'red',
                'rightPower'
            )}
            {createChartCard(
                'Right Heart Pressure',
                `R: ${detailedData.RightHeart.IntPressure} mmHg`,
                'red',
                'rightPressure'
            )}

            {/* Medical Sensors */}
            {detailedData.UseMedicalSensor && (
                <>
                    {createChartCard(
                        'CVP',
                        `CVP: ${detailedData.CVPSensor.PrimaryValue} mmHg`,
                        'blue',
                        'cvp'
                    )}
                    {createChartCard(
                        'PAP',
                        `PAP: ${detailedData.PAPSensor.PrimaryValue} mmHg`,
                        'red',
                        'pap'
                    )}
                    {createChartCard(
                        'AoP',
                        `AoP: ${detailedData.AoPSensor.PrimaryValue} mmHg`,
                        'blue',
                        'aop'
                    )}
                    {createChartCard(
                        'Art',
                        `Art: ${detailedData.ArtPressSensor.PrimaryValue} mmHg`,
                        'red',
                        'art'
                    )}
                </>
            )}
        </div>
    );
}
