import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    TimeScale,
    Title,
    Legend,
    Tooltip
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { createChartConfig } from './utils';

// Register required components
Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    TimeScale,
    Title,
    Legend,
    Tooltip,
    zoomPlugin
);

const MAX_DATA_POINTS = 180;

class ChartManager {
    constructor() {
        this.chartsRef = {
            heartRate: null,
            powerConsumption: null,
            atrialPressure: null,
            cardiacOutput: null,
            strokeVolume: null,
            lowPressures: null,
            highPressures: null
        };

        this.chartDataRef = {
            heartRate: [],
            powerConsumption: [],
            atrialPressure: [],
            cardiacOutput: [],
            strokeVolume: [],
            lowPressures: [],
            highPressures: []
        };

        this.chartConfigs = {
            heartRate: {
                ctx: 'heartRateChart',
                label: 'Heart Rate',
                color: 'rgb(239, 68, 68)',
                minY: 0,
                maxY: 155,
                datasets: [{
                    label: 'Heart Rate',
                    color: 'rgb(239, 68, 68)'
                }]
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
    }

    updateStoredChartData(data) {
        const timeStr = new Date(data.Timestamp || data.LocalClock).toLocaleTimeString();
        
        // Extract and parse numeric values, ensuring we handle both string and object formats
        const extractNumericValue = (value) => {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'object' && 'PrimaryValue' in value) {
                return parseFloat(value.PrimaryValue) || 0;
            }
            return parseFloat(value) || 0;
        };

        // Get heart data with proper null checks
        const leftHeart = data.LeftHeart || {};
        const rightHeart = data.RightHeart || {};

        // Create data entries with proper value extraction
        const entries = {
            heartRate: [[extractNumericValue(data.HeartRate)]],
            powerConsumption: [
                [
                    extractNumericValue(leftHeart.PowerConsumption),
                    extractNumericValue(rightHeart.PowerConsumption)
                ]
            ],
            atrialPressure: [
                [
                    extractNumericValue(leftHeart.AtrialPressure),
                    extractNumericValue(rightHeart.AtrialPressure)
                ]
            ],
            cardiacOutput: [
                [
                    extractNumericValue(leftHeart.CardiacOutput),
                    extractNumericValue(rightHeart.CardiacOutput)
                ]
            ],
            strokeVolume: [
                [
                    extractNumericValue(leftHeart.StrokeVolume),
                    extractNumericValue(rightHeart.StrokeVolume)
                ]
            ],
            lowPressures: [
                [
                    extractNumericValue(data.CVPSensor),
                    extractNumericValue(data.PAPSensor)
                ]
            ],
            highPressures: [
                [
                    extractNumericValue(data.AoPSensor),
                    extractNumericValue(data.ArtPressSensor)
                ]
            ]
        };

        // Update chart data
        Object.entries(entries).forEach(([key, values]) => {
            this.chartDataRef[key].push({
                time: timeStr,
                values: values[0]
            });
            if (this.chartDataRef[key].length > MAX_DATA_POINTS) {
                this.chartDataRef[key].shift();
            }
        });
    }

    setupCharts(theme) {
        const isDark = theme === 'business';
        Chart.defaults.color = isDark ? 'rgb(229, 231, 235)' : 'rgb(31, 41, 55)';
        Chart.defaults.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        Object.entries(this.chartConfigs).forEach(([key, config]) => {
            const ctx = document.getElementById(config.ctx);
            if (ctx) {
                this.chartsRef[key] = new Chart(ctx, createChartConfig(
                    config.label,
                    config.color,
                    config.minY,
                    config.maxY,
                    config.datasets,
                    [...this.chartDataRef[key]],
                    theme
                ));
            } else {
                console.warn('Canvas element not found for chart:', key);
            }
        });
    }

    updateCharts() {
        Object.entries(this.chartsRef).forEach(([key, chart]) => {
            if (chart && chart.data) {
                const data = this.chartDataRef[key];
                chart.data.labels = data.map(d => d.time);
                chart.data.datasets.forEach((dataset, i) => {
                    dataset.data = data.map(d => d.values[i]);
                });
                chart.update('none');
            }
        });
    }

    destroyCharts() {
        Object.values(this.chartsRef).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
    }
}

export { ChartManager };
