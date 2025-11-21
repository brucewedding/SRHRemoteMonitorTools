// atoms.js
import { atom } from 'jotai'

// System-level atoms
export const systemIdAtom = atom('')
export const heartRateAtom = atom(0)
export const operationStateAtom = atom('-')
export const heartStatusAtom = atom('-')

// Left heart atoms
export const leftPowerAtom = atom(0)
export const leftAtrialPressureAtom = atom(0)
export const leftCardiacOutputAtom = atom(0)
export const leftTargetStrokeLenAtom = atom(0)
export const leftActualStrokeLenAtom = atom(0)
export const leftIntPressureAtom = atom(0)
export const leftIntPressureMinAtom = atom(0)
export const leftIntPressureMaxAtom = atom(0)
export const leftMedicalPressureAtom = atom({ PrimaryValue: '-', unit: 'mmHg' })

// Right heart atoms (similar structure)
export const rightPowerAtom = atom(0)
export const rightAtrialPressureAtom = atom(0)
export const rightCardiacOutputAtom = atom(0)
export const rightTargetStrokeLenAtom = atom(0)
export const rightActualStrokeLenAtom = atom(0)
export const rightIntPressureAtom = atom(0)
export const rightIntPressureMinAtom = atom(0)
export const rightIntPressureMaxAtom = atom(0)
export const rightMedicalPressureAtom = atom({ PrimaryValue: '-', unit: 'mmHg' })

// Sensor atoms
export const cvpSensorAtom = atom({ PrimaryValue: 0, unit: 'mmHg' })
export const papSensorAtom = atom({ PrimaryValue: 0, unit: 'mmHg' })
export const aopSensorAtom = atom({ PrimaryValue: 0, unit: 'mmHg' })
export const artPressSensorAtom = atom({ PrimaryValue: 0, unit: 'mmHg' })
export const ivcPressSensorAtom = atom({ PrimaryValue: 0, unit: 'mmHg' })



// Status data atoms - legacy fields
export const extLeftAtom = atom({ Text: '-', Color: 'badge-info' })
export const extRightAtom = atom({ Text: '-', Color: 'badge-info' })
export const intLeftAtom = atom({ Text: '-', Color: 'badge-info' })
export const intRightAtom = atom({ Text: '-', Color: 'badge-info' })
export const canStatusAtom = atom({ Text: '-', Color: 'badge-info' })
export const bytesSentAtom = atom({ Text: '-', Color: 'badge-info' })
export const bytesRecdAtom = atom({ Text: '-', Color: 'badge-info' })
export const strokesAtom = atom({ Text: '-', Color: 'badge-info' })
export const busLoadAtom = atom({ Text: '-', Color: 'badge-info' })

// Status data atoms - new telemetry fields
export const temperatureAtom = atom({ Text: '-', Color: 'badge-info' })
export const voltageAtom = atom({ Text: '-', Color: 'badge-info' })
export const cpuLoadAtom = atom({ Text: '-', Color: 'badge-info' })
export const accelerometerAtom = atom({ Text: '-', Color: 'badge-info' })

// Additional system atoms
export const flowLimitStateAtom = atom('')
export const flowLimitAtom = atom('0')
export const useMedicalSensorAtom = atom(false)
export const lastUpdateAtom = atom(new Date().toLocaleString())

// Telemetry status atoms for graceful degradation (Requirements 9.1, 9.2, 9.4)
export const noDataReceivedAtom = atom(false)
export const leftHeartAvailableAtom = atom(true)
export const rightHeartAvailableAtom = atom(true)

// Complete status data atom for backward compatibility
export const statusDataAtom = atom({
  ExtLeft: { Text: '-', Color: 'badge-info' },
  ExtRight: { Text: '-', Color: 'badge-info' },
  IntLeft: { Text: '-', Color: 'badge-info' },
  IntRight: { Text: '-', Color: 'badge-info' },
  CANStatus: { Text: '-', Color: 'badge-info' },
  BytesSent: { Text: '-', Color: 'badge-info' },
  BytesRecd: { Text: '-', Color: 'badge-info' },
  Strokes: { Text: '-', Color: 'badge-info' },
  BusLoad: { Text: '-', Color: 'badge-info' },
  Temperature: { Text: '-', Color: 'badge-info' },
  Voltage: { Text: '-', Color: 'badge-info' },
  CPULoad: { Text: '-', Color: 'badge-info' },
  Accelerometer: { Text: '-', Color: 'badge-info' }
})

/**
 * Update all atoms from aggregated state received via WebSocket
 * Validates: Requirements 12.2
 * 
 * This function maps the aggregated state structure from the server
 * to the corresponding Jotai atoms. It handles missing or null fields
 * gracefully by using default values.
 * 
 * @param {Object} state - Aggregated state from WebSocket server
 * @param {Function} setAtom - Jotai setter function (from useSetAtom)
 */
export function updateAtomsFromState(state, setAtom) {
  if (!state) {
    return;
  }

  // Batch all atom updates together for performance
  // Jotai will automatically batch these updates in a single render cycle
  
  // System-level updates
  if (state.SystemId !== undefined && state.SystemId !== null) {
    setAtom(systemIdAtom, state.SystemId);
  }
  
  if (state.HeartRate !== undefined && state.HeartRate !== null) {
    setAtom(heartRateAtom, state.HeartRate);
  }
  
  if (state.OperationState !== undefined && state.OperationState !== null) {
    setAtom(operationStateAtom, state.OperationState);
  }
  
  if (state.HeartStatus !== undefined && state.HeartStatus !== null) {
    setAtom(heartStatusAtom, state.HeartStatus);
  }

  // Left heart updates
  if (state.LeftHeart) {
    const left = state.LeftHeart;
    
    if (left.PowerConsumption !== undefined && left.PowerConsumption !== null) {
      setAtom(leftPowerAtom, left.PowerConsumption);
    }
    
    if (left.AtrialPressure !== undefined && left.AtrialPressure !== null) {
      setAtom(leftAtrialPressureAtom, left.AtrialPressure);
    }
    
    if (left.CardiacOutput !== undefined && left.CardiacOutput !== null) {
      setAtom(leftCardiacOutputAtom, left.CardiacOutput);
    }
    
    if (left.TargetStrokeLen !== undefined && left.TargetStrokeLen !== null) {
      setAtom(leftTargetStrokeLenAtom, left.TargetStrokeLen);
    }
    
    if (left.ActualStrokeLen !== undefined && left.ActualStrokeLen !== null) {
      setAtom(leftActualStrokeLenAtom, left.ActualStrokeLen);
    }
    
    if (left.IntPressure !== undefined && left.IntPressure !== null) {
      setAtom(leftIntPressureAtom, left.IntPressure);
    }
    
    if (left.IntPressureMin !== undefined && left.IntPressureMin !== null) {
      setAtom(leftIntPressureMinAtom, left.IntPressureMin);
    }
    
    if (left.IntPressureMax !== undefined && left.IntPressureMax !== null) {
      setAtom(leftIntPressureMaxAtom, left.IntPressureMax);
    }
    
    if (left.MedicalPressure) {
      setAtom(leftMedicalPressureAtom, {
        PrimaryValue: left.MedicalPressure.PrimaryValue ?? '-',
        unit: left.MedicalPressure.unit ?? 'mmHg'
      });
    }
  }

  // Right heart updates
  if (state.RightHeart) {
    const right = state.RightHeart;
    
    if (right.PowerConsumption !== undefined && right.PowerConsumption !== null) {
      setAtom(rightPowerAtom, right.PowerConsumption);
    }
    
    if (right.AtrialPressure !== undefined && right.AtrialPressure !== null) {
      setAtom(rightAtrialPressureAtom, right.AtrialPressure);
    }
    
    if (right.CardiacOutput !== undefined && right.CardiacOutput !== null) {
      setAtom(rightCardiacOutputAtom, right.CardiacOutput);
    }
    
    if (right.TargetStrokeLen !== undefined && right.TargetStrokeLen !== null) {
      setAtom(rightTargetStrokeLenAtom, right.TargetStrokeLen);
    }
    
    if (right.ActualStrokeLen !== undefined && right.ActualStrokeLen !== null) {
      setAtom(rightActualStrokeLenAtom, right.ActualStrokeLen);
    }
    
    if (right.IntPressure !== undefined && right.IntPressure !== null) {
      setAtom(rightIntPressureAtom, right.IntPressure);
    }
    
    if (right.IntPressureMin !== undefined && right.IntPressureMin !== null) {
      setAtom(rightIntPressureMinAtom, right.IntPressureMin);
    }
    
    if (right.IntPressureMax !== undefined && right.IntPressureMax !== null) {
      setAtom(rightIntPressureMaxAtom, right.IntPressureMax);
    }
    
    if (right.MedicalPressure) {
      setAtom(rightMedicalPressureAtom, {
        PrimaryValue: right.MedicalPressure.PrimaryValue ?? '-',
        unit: right.MedicalPressure.unit ?? 'mmHg'
      });
    }
  }

  // Sensor updates
  if (state.CVPSensor) {
    setAtom(cvpSensorAtom, {
      PrimaryValue: state.CVPSensor.PrimaryValue ?? 0,
      unit: state.CVPSensor.unit ?? 'mmHg'
    });
  }
  
  if (state.PAPSensor) {
    setAtom(papSensorAtom, {
      PrimaryValue: state.PAPSensor.PrimaryValue ?? 0,
      unit: state.PAPSensor.unit ?? 'mmHg'
    });
  }
  
  if (state.AoPSensor) {
    setAtom(aopSensorAtom, {
      PrimaryValue: state.AoPSensor.PrimaryValue ?? 0,
      unit: state.AoPSensor.unit ?? 'mmHg'
    });
  }
  
  if (state.ArtPressSensor) {
    setAtom(artPressSensorAtom, {
      PrimaryValue: state.ArtPressSensor.PrimaryValue ?? 0,
      unit: state.ArtPressSensor.unit ?? 'mmHg'
    });
  }
  
  if (state.IvcPressSensor) {
    setAtom(ivcPressSensorAtom, {
      PrimaryValue: state.IvcPressSensor.PrimaryValue ?? 0,
      unit: state.IvcPressSensor.unit ?? 'mmHg'
    });
  }

  // Status data updates
  if (state.StatusData) {
    const status = state.StatusData;
    
    // Legacy status fields
    if (status.ExtLeft) {
      setAtom(extLeftAtom, {
        Text: status.ExtLeft.Text ?? '-',
        Color: status.ExtLeft.Color ?? 'badge-info'
      });
    }
    
    if (status.ExtRight) {
      setAtom(extRightAtom, {
        Text: status.ExtRight.Text ?? '-',
        Color: status.ExtRight.Color ?? 'badge-info'
      });
    }
    
    if (status.IntLeft) {
      setAtom(intLeftAtom, {
        Text: status.IntLeft.Text ?? '-',
        Color: status.IntLeft.Color ?? 'badge-info'
      });
    }
    
    if (status.IntRight) {
      setAtom(intRightAtom, {
        Text: status.IntRight.Text ?? '-',
        Color: status.IntRight.Color ?? 'badge-info'
      });
    }
    
    if (status.CANStatus) {
      setAtom(canStatusAtom, {
        Text: status.CANStatus.Text ?? '-',
        Color: status.CANStatus.Color ?? 'badge-info'
      });
    }
    
    if (status.BytesSent) {
      setAtom(bytesSentAtom, {
        Text: status.BytesSent.Text ?? '-',
        Color: status.BytesSent.Color ?? 'badge-info'
      });
    }
    
    if (status.BytesRecd) {
      setAtom(bytesRecdAtom, {
        Text: status.BytesRecd.Text ?? '-',
        Color: status.BytesRecd.Color ?? 'badge-info'
      });
    }
    
    if (status.Strokes) {
      setAtom(strokesAtom, {
        Text: status.Strokes.Text ?? '-',
        Color: status.Strokes.Color ?? 'badge-info'
      });
    }
    
    if (status.BusLoad) {
      setAtom(busLoadAtom, {
        Text: status.BusLoad.Text ?? '-',
        Color: status.BusLoad.Color ?? 'badge-info'
      });
    }
    
    // New telemetry status fields
    if (status.Temperature) {
      setAtom(temperatureAtom, {
        Text: status.Temperature.Text ?? '-',
        Color: status.Temperature.Color ?? 'badge-info'
      });
    }
    
    if (status.Voltage) {
      setAtom(voltageAtom, {
        Text: status.Voltage.Text ?? '-',
        Color: status.Voltage.Color ?? 'badge-info'
      });
    }
    
    if (status.CPULoad) {
      setAtom(cpuLoadAtom, {
        Text: status.CPULoad.Text ?? '-',
        Color: status.CPULoad.Color ?? 'badge-info'
      });
    }
    
    if (status.Accelerometer) {
      setAtom(accelerometerAtom, {
        Text: status.Accelerometer.Text ?? '-',
        Color: status.Accelerometer.Color ?? 'badge-info'
      });
    }
    
    // Update the complete status data atom for backward compatibility
    setAtom(statusDataAtom, {
      ExtLeft: status.ExtLeft ?? { Text: '-', Color: 'badge-info' },
      ExtRight: status.ExtRight ?? { Text: '-', Color: 'badge-info' },
      IntLeft: status.IntLeft ?? { Text: '-', Color: 'badge-info' },
      IntRight: status.IntRight ?? { Text: '-', Color: 'badge-info' },
      CANStatus: status.CANStatus ?? { Text: '-', Color: 'badge-info' },
      BytesSent: status.BytesSent ?? { Text: '-', Color: 'badge-info' },
      BytesRecd: status.BytesRecd ?? { Text: '-', Color: 'badge-info' },
      Strokes: status.Strokes ?? { Text: '-', Color: 'badge-info' },
      BusLoad: status.BusLoad ?? { Text: '-', Color: 'badge-info' },
      Temperature: status.Temperature ?? { Text: '-', Color: 'badge-info' },
      Voltage: status.Voltage ?? { Text: '-', Color: 'badge-info' },
      CPULoad: status.CPULoad ?? { Text: '-', Color: 'badge-info' },
      Accelerometer: status.Accelerometer ?? { Text: '-', Color: 'badge-info' }
    });
  }
  
  // Additional system fields
  if (state.FlowLimitState !== undefined && state.FlowLimitState !== null) {
    setAtom(flowLimitStateAtom, state.FlowLimitState);
  }
  
  if (state.FlowLimit !== undefined && state.FlowLimit !== null) {
    setAtom(flowLimitAtom, state.FlowLimit);
  }
  
  if (state.UseMedicalSensor !== undefined && state.UseMedicalSensor !== null) {
    setAtom(useMedicalSensorAtom, state.UseMedicalSensor === true || state.UseMedicalSensor === 'true');
  }
  
  // Update last update timestamp
  setAtom(lastUpdateAtom, new Date().toLocaleTimeString());
  
  // Update telemetry status atoms (Requirements 9.1, 9.2, 9.4)
  if (state._telemetryStatus) {
    setAtom(noDataReceivedAtom, state._telemetryStatus.noDataReceived ?? false);
    setAtom(leftHeartAvailableAtom, state._telemetryStatus.leftHeartAvailable ?? true);
    setAtom(rightHeartAvailableAtom, state._telemetryStatus.rightHeartAvailable ?? true);
  }
}
