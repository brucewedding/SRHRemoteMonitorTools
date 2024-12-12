using SRH_CommonAssembly.Communication.Enums;
using SRH_CommonAssembly.Communication.Interfaces.Values;
using SRH_CommonAssembly.Communication.Interfaces;
using SRH_CommonAssembly.HeartState.Enums;
using SRH_CommonAssembly.HeartState;
using System;
using System.Globalization;
using SRH_CommonAssembly.Communication.Values;
using SRH_CommonAssembly.HeartState.Interfaces;
using SRH_CommonAssembly.Infrastructure.Notification.Value.Editable;
using SRH_CommonAssembly.Infrastructure.Notification.Value;
using SRH_CommonAssembly.MessageHandling;
using System.Windows.Input;
using SRH_CommonAssembly.Communication;
using SRH_CommonAssembly.Infrastructure.Notification;
using SRH_CommonAssembly.HeartState.ViewModels;
using System.Collections.ObjectModel;
using System.Windows.Media;
using SRH_CommonAssembly.AnalogSensorCommunication.Interfaces;
using SRH_CommonAssembly.FlowSensorCommunication;
using SRH_CommonAssembly.Infrastructure.RangeAlarms;
using SRH_PC.OperationRoom.ViewModels;
using SRH_PC.OperationRoom;
using System.Security.Permissions;
using System.Diagnostics;
using System.Windows;

namespace SRH_CommonAssembly.Communication.RemoteViewer
{
    public class MonitorDataCollector : NotifyPropertyChangedBase, IDisposable
    {
        private readonly ICommunicationManager _comMan;
        private readonly OperationStateManager _stateManager;

        // Cache the value objects to avoid repeated GetXValue calls
        private readonly IByteValue _FlowLimitState;
        // ... etc for other values

        public MonitorDataCollector(IHeartStatusMonitor heartStatusMonitor, ISensorFactory factory,
            IOperationStateManager operationStateManager, ICommunicationManager comMan, IRangeAlarmFactory alarmFactory,
            IFlowSensor flowSensor)
        {
            _comMan = comMan;
            var alivenessHandler = factory.AlivenessHandler;
            var pressureSensorFactory = factory.PressureSensorFactory;

            HeartRate = new MeasurementViewModel(comMan.GetByteValue(Value.HeartRateActual, DataSource.Left), alivenessHandler);
            LeftStrokeVolume = new MeasurementViewModel(comMan.GetInt32Value(Value.LeftStrokeVolumeTarget, DataSource.Left), alivenessHandler);
            RightStrokeVolume = new MeasurementViewModel(comMan.GetInt32Value(Value.RightStrokeVolumeTarget, DataSource.Right), alivenessHandler);

            LeftFlow = new MeasurementViewModel(new CardiacOutputViewModel(comMan.GetInt32Value(Value.StrokeVolumeActual, DataSource.Left), comMan.GetByteValue(Value.HeartRateActual, DataSource.Left), "Left cardiac output", "l/min"), alivenessHandler, alarmFactory.Get("FLOW", Brushes.Red, Brushes.Yellow));
            RightFlow = new MeasurementViewModel(new CardiacOutputViewModel(comMan.GetInt32Value(Value.StrokeVolumeActual, DataSource.Right), comMan.GetByteValue(Value.HeartRateActual, DataSource.Left), "Right cardiac output", "l/min"), alivenessHandler);
            // We only need to alarm of the flow on one side. If the flow is low
            // on the right side it will be low on the left as well...

            var lapAlarm = alarmFactory.Get("LAP", Brushes.Red, Brushes.Yellow);
            var rapAlarm = alarmFactory.Get("RAP", Brushes.Red, Brushes.Yellow);
            var aOpAlarm = alarmFactory.Get("AOP", Brushes.Red, Brushes.Yellow);
            var pApAlarm = alarmFactory.Get("PAP", Brushes.Red, Brushes.Yellow);
            var artAlarm = alarmFactory.Get("ART", Brushes.Red, Brushes.Yellow);

            LAPInt = new MeasurementViewModel(comMan.GetInt32Value(Value.LeftIntPressure, DataSource.Left), alivenessHandler, lapAlarm);
            RAPInt = new MeasurementViewModel(comMan.GetInt32Value(Value.RightIntPressure, DataSource.Left), alivenessHandler, rapAlarm);

            controlState = new StateMeasurementViewModel(alivenessHandler, "Control state", AlarmUtils.OpStateDictionary);
            operationStateManager.CurrentStateChanged += (obj, args) =>
            {
                var state = operationStateManager.CurrentState;

                // In the particular case that homing succeeds on the left side byt fails on the right,
                // the CurrentState would still return HomingDone. Override this.
                if (operationStateManager.CurrentStateRight == OperationState.HomingFailed)
                {
                    state = OperationState.HomingFailed;
                }

                controlState.Update(state);
            };
            controlState.Update(operationStateManager.CurrentState);

            AoP = new SensorMeasurementViewModel(pressureSensorFactory.AoPSensor, heartStatusMonitor, operationStateManager, aOpAlarm);
            CVP = new SensorMeasurementViewModel(pressureSensorFactory.CVPSensor, heartStatusMonitor, operationStateManager);
            PAP = new SensorMeasurementViewModel(pressureSensorFactory.PAPSensor, heartStatusMonitor, operationStateManager, pApAlarm);
            Clock = new ClockViewModel(new Clock());
            LAPMed = new SensorMeasurementViewModel(pressureSensorFactory.LAPSensor, heartStatusMonitor, operationStateManager, lapAlarm);
            RAPMed = new SensorMeasurementViewModel(pressureSensorFactory.RAPSensor, heartStatusMonitor, operationStateManager, rapAlarm);
            FlowSensors = new ObservableCollection<IMeasurementViewModel>();
            ArtPressure = new SensorMeasurementViewModel(pressureSensorFactory.ArtSensor, heartStatusMonitor, operationStateManager, artAlarm);
            LeftPower = new MeasurementViewModel(comMan.GetInt32Value(Value.PowerConsumption, DataSource.Left), alivenessHandler);
            RightPower = new MeasurementViewModel(comMan.GetInt32Value(Value.PowerConsumption, DataSource.Right), alivenessHandler);

            // add a list of SensorMeasurementViewModel, containing one instance per analog flow value
            foreach (var flowValue in factory.AnalogFlowValues)
            {
                FlowSensors.Add(new SensorMeasurementViewModel(flowValue, 1));
            }

            // add a list of SensorMeasurementViewModel, containing one instance per analog flow coupling
            foreach (var flowCoupling in factory.AnalogFlowCouplings)
            {
                FlowSensors.Add(new SensorMeasurementViewModel(flowCoupling));
            }

            var flowSensorAlarm = alarmFactory.Get("FLOW_SENSOR", Brushes.Red, Brushes.Yellow);
            FlowSensor = new DigitalFlowMeasurementViewModel(flowSensorAlarm, flowSensor);
        }

        public MonitorData CollectCurrentData()
        {
            string GetBrushColorString(IMeasurementViewModel measurement)
            {
                string colorString = null;
                Application.Current.Dispatcher.Invoke(() =>
                {
                    colorString = measurement?.BackgroundColor?.ToString();
                });
                return colorString;
            }

            var statusString = GetStatusString();

            var data = new MonitorData
            {
                Timestamp = DateTime.UtcNow,
                LeftHeart = new HeartHalfData
                {
                    StrokeVolume = LeftStrokeVolume.PrimaryReading,
                    PowerConsumption = new AlarmedValue
                    {
                        PrimaryValue = LeftPower.PrimaryReading,
                        SecondaryValue = LeftPower.SecondaryReading,
                        BackColor = GetBrushColorString(LeftPower),
                    },
                    IntPressure = new AlarmedValue
                    {
                        PrimaryValue = LAPInt.PrimaryReading,
                        SecondaryValue = LAPInt.SecondaryReading,
                        BackColor = GetBrushColorString(LAPInt),

                    },
                    MedicalPressure = new AlarmedValue
                    {
                        PrimaryValue = LAPMed.PrimaryReading,
                        SecondaryValue = LAPMed.SecondaryReading,
                        BackColor = GetBrushColorString(LAPMed),
                    },
                    IntPressureMin = float.Parse(_comMan.GetInt32Value(Value.LeftIntPressureMin, DataSource.Left).GetValueWithDisplayfactor(CultureInfo.CurrentCulture)),
                    IntPressureMax = float.Parse(_comMan.GetInt32Value(Value.LeftIntPressureMax, DataSource.Left).GetValueWithDisplayfactor(CultureInfo.CurrentCulture)),
                    CardiacOutput = new AlarmedValue
                    {
                        PrimaryValue = LeftFlow.PrimaryReading,
                        SecondaryValue = LeftFlow.SecondaryReading,
                        BackColor = GetBrushColorString(LeftFlow),
                    },
                },
                RightHeart = new HeartHalfData
                {
                    StrokeVolume = RightStrokeVolume.PrimaryReading,
                    PowerConsumption = new AlarmedValue
                    {
                        PrimaryValue = RightPower.PrimaryReading,
                        SecondaryValue = RightPower.SecondaryReading,
                        BackColor = GetBrushColorString(RightPower),
                    },
                    IntPressure = new AlarmedValue
                    {
                        PrimaryValue = RAPInt.PrimaryReading,
                        SecondaryValue = RAPInt.SecondaryReading,
                        BackColor = GetBrushColorString(RAPInt),

                    },
                    MedicalPressure = new AlarmedValue
                    {
                        PrimaryValue = RAPMed.PrimaryReading,
                        SecondaryValue = RAPMed.SecondaryReading,
                        BackColor = GetBrushColorString(RAPMed),
                    },
                    IntPressureMin  = float.Parse(_comMan.GetInt32Value(Value.RightIntPressureMin, DataSource.Right).GetValueWithDisplayfactor(CultureInfo.CurrentCulture)),
                    IntPressureMax  = float.Parse(_comMan.GetInt32Value(Value.RightIntPressureMax, DataSource.Right).GetValueWithDisplayfactor(CultureInfo.CurrentCulture)),
                    CardiacOutput   = new AlarmedValue 
                                        {
                        PrimaryValue = RightFlow.PrimaryReading,
                        SecondaryValue = RightFlow.SecondaryReading,
                        BackColor = GetBrushColorString(RightFlow),
                    },
                },

                HeartRate = HeartRate.PrimaryReading,
                OperationState = controlState.Text,
                HeartStatus = statusString,
                FlowLimitState = GetFlowLimitState(),
                FlowLimit = _comMan.GetInt32Value(Value.FlowLimit, DataSource.Left).GetValueWithDisplayfactor(CultureInfo.CurrentCulture),
                AtmosPressure = _comMan.GetInt32Value(Value.AtmosphericPressure, DataSource.Left).GetValueWithDisplayfactor(CultureInfo.CurrentCulture),
                UseMedicalSensor = _comMan.GetBoolValue(Value.UseMedicalSensor, DataSource.Left).BoolValue,

                AoPSensor = AoP.PrimaryReading,
                CVPSensor = CVP.PrimaryReading,
                PAPSensor = PAP.PrimaryReading,
                ArtPressSensor = ArtPressure.PrimaryReading,
                LocalClock = Clock.PrimaryReading,

            };
            return data;
        }

        private string GetFlowLimitState()
        {
            var state = _comMan.GetByteValue(Value.FlowLimitState, DataSource.Left).Value;
            switch (state)
            {
                case 1:
                    return "Decrease";
                case 2:
                    return "Allow Increasing";
                    case 3:
                    return "Keep Constant";
            }
            return "Unknown";
        }

        private string GetStatusString()
        {
            string statusString = "Both Running";
            return statusString;
        }

        public void Dispose()
        {

        }
        
        private readonly StateMeasurementViewModel controlState;
        public IMeasurementViewModel HeartRate { get; }
        public IMeasurementViewModel LeftStrokeVolume { get; }
        public IMeasurementViewModel RightStrokeVolume { get; }
        public IMeasurementViewModel LeftFlow { get; }
        public IMeasurementViewModel RightFlow { get; }
        public IMeasurementViewModel LAPInt { get; }
        public IMeasurementViewModel RAPInt { get; }
        public IMeasurementViewModel ControlState => controlState;
        public IMeasurementViewModel LAPMed { get; }
        public IMeasurementViewModel RAPMed { get; }
        public IMeasurementViewModel AoP { get; }
        public IMeasurementViewModel CVP { get; }
        public IMeasurementViewModel PAP { get; }
        public IMeasurementViewModel LeftPower { get; }
        public IMeasurementViewModel RightPower { get; }
        public IMeasurementViewModel ArtPressure { get; }
        public IMeasurementViewModel Clock { get; }
        public ObservableCollection<IMeasurementViewModel> FlowSensors { get; }
        public IMeasurementViewModel FlowSensor { get; }
    }

    public class MonitorData
    {
        public DateTime         Timestamp { get; set; }
        public HeartHalfData    LeftHeart { get; set; }
        public HeartHalfData    RightHeart { get; set; }
        public string           HeartRate { get; set; }
        public string           OperationState { get; set; }
        public string           HeartStatus { get; set; }
        public string           FlowLimitState { get; set; }
        public string           FlowLimit { get; set; }
        public string           AtmosPressure { get; set; }
        public bool             UseMedicalSensor { get; set; }
        public string           AoPSensor { get; set; }
        public string           CVPSensor { get; set; }
        public string           PAPSensor { get; set; }
        public string           ArtPressSensor { get; set; }
        public string           LocalClock { get; set; }
    }

    public enum AlarmStatus
    {
        None = 0,
        Warning = 1,
        Error = 2
    }

    public class AlarmedValue
    {
        public string Name { get; set; } = string.Empty;
        public string PrimaryValue { get; set; }
        public string SecondaryValue { get; set; }
        public string BackColor { get; set; }
    }

    public class HeartHalfData
    {
        public string       StrokeVolume { get; set; }
        public AlarmedValue PowerConsumption { get; set; }
        public AlarmedValue IntPressure { get; set; }
        public AlarmedValue MedicalPressure { get; set; }
        public float        IntPressureMin { get; set; }
        public float        IntPressureMax { get; set; }
        public AlarmedValue CardiacOutput { get; set; }
    }

}
