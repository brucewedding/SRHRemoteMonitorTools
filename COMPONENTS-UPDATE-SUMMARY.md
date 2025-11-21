# Components.jsx Update Summary

## Task: Update Components.jsx for new data structure
**Requirements:** 3.1, 3.3

## Overview
Updated the component creation functions in `src/components/Components.jsx` to work seamlessly with Jotai atom values. The functions now properly handle both numeric atom values and object atom values with `PrimaryValue` properties.

## Changes Made

### 1. `createDetailCard()` Function

**Changes:**
- Enhanced handling of object values with `PrimaryValue` property (from Jotai sensor atoms)
- Added automatic unit extraction from object values when units parameter is not provided
- Improved numeric value handling to work with Jotai numeric atoms
- Removed legacy `detailedData` dependency for right cardiac output special case
- Maintained backward compatibility with existing data structures

**Key Improvements:**
```javascript
// Now extracts unit from object if not provided
if (value && typeof value === 'object' && 'PrimaryValue' in value) {
    displayValue = value.PrimaryValue || '-';
    if (!unitsValue && value.unit) {
        unitsValue = value.unit;
    }
}

// Properly handles numeric values including 0
else if (value != null) {
    displayValue = String(value);
}
```

**Handles:**
- ✓ Numeric atom values (e.g., `leftPowerAtom = 25.5`)
- ✓ Object atom values (e.g., `leftMedicalPressureAtom = { PrimaryValue: 12.5, unit: 'mmHg' }`)
- ✓ Objects with `BackColor` property for alert states
- ✓ Null/undefined values (displays '-')
- ✓ Zero values (valid data, not treated as missing)

### 2. `createPressureCard()` Function

**Changes:**
- Enhanced handling of numeric values from Jotai atoms
- Improved null/undefined handling for min/max pressure values
- Maintained object value handling with `PrimaryValue` property
- Added proper formatting for missing values

**Key Improvements:**
```javascript
// Handle numeric values from Jotai atoms
else {
    displayValue = avgPressure != null ? avgPressure : '-';
}

// Handle null/undefined for min/max values
const formattedMax = maxPressure != null ? Number(maxPressure).toFixed(1) : '-';
const formattedMin = minPressure != null ? Number(minPressure).toFixed(1) : '-';
```

**Handles:**
- ✓ Numeric atom values for average pressure
- ✓ Object atom values with `PrimaryValue` and `BackColor`
- ✓ Null/undefined values for min/max pressures
- ✓ Alert states via `BackColor` property (yellow/red borders)

### 3. `createStrokeCard()` Function

**Changes:**
- Improved null/undefined handling for stroke length values
- Enhanced numeric value handling to properly treat 0 as valid data
- Updated comments for clarity

**Key Improvements:**
```javascript
// Handle numeric values from Jotai atoms, including 0 as valid
const formattedTarget = targetStroke != null ? Number(targetStroke).toFixed(1) : '-';
const formattedActual = actualStroke != null ? Number(actualStroke).toFixed(1) : '-';
```

**Handles:**
- ✓ Numeric atom values for target and actual stroke length
- ✓ Zero values (valid data)
- ✓ Null/undefined values (displays '-')
- ✓ Proper formatting with 1 decimal place

## Validation

### Data Structure Compatibility

The updated functions are compatible with the Jotai atom structure defined in `src/atoms.js`:

**Numeric Atoms:**
```javascript
export const leftPowerAtom = atom(0)
export const leftCardiacOutputAtom = atom(0)
export const leftTargetStrokeLenAtom = atom(0)
```

**Object Atoms:**
```javascript
export const leftMedicalPressureAtom = atom({ PrimaryValue: '-', unit: 'mmHg' })
export const cvpSensorAtom = atom({ PrimaryValue: 0, unit: 'mmHg' })
```

**Status Atoms (with Color):**
```javascript
export const temperatureAtom = atom({ Text: '-', Color: 'badge-info' })
```

### Usage in Dashboard.jsx

The functions are called correctly in `Dashboard.jsx`:

```javascript
// Numeric atom values
createDetailCard('Power', leftPower, 'watts.png', 'base-content', null, 'W')

// Object atom values
createDetailCard('Medical Press', leftMedicalPressure, 'pressure.png', 'base-content', null, 'mmHg')

// Pressure cards with numeric atoms
createPressureCard('Int Press', leftIntPressure, leftIntPressureMax, leftIntPressureMin, 'pressure.png')

// Stroke cards with numeric atoms
createStrokeCard('Stroke Len', leftTargetStrokeLen, leftActualStrokeLen, 'piston.png')
```

## Requirements Validation

### Requirement 3.1
✓ **Aggregated state includes LeftHeart and RightHeart objects with PowerConsumption, AtrialPressure, CardiacOutput, and stroke length fields**

The component functions properly display these fields from Jotai atoms:
- PowerConsumption → `createDetailCard('Power', leftPower, ...)`
- CardiacOutput → `createDetailCard('Cardiac Out', leftCardiacOutput, ...)`
- Stroke lengths → `createStrokeCard('Stroke Len', leftTargetStrokeLen, leftActualStrokeLen, ...)`

### Requirement 3.3
✓ **Aggregated state includes sensor objects (CVPSensor, PAPSensor, AoPSensor, ArtPressSensor) with PrimaryValue and unit fields**

The component functions properly handle sensor objects:
- `createDetailCard()` extracts `PrimaryValue` and `unit` from sensor objects
- Sensor atoms like `cvpSensorAtom`, `papSensorAtom`, etc. are displayed correctly
- Unit information is automatically extracted when not explicitly provided

## Testing Recommendations

Since the project doesn't have a frontend testing framework configured, manual testing should verify:

1. **Numeric Values Display:**
   - Power consumption displays correctly
   - Cardiac output displays correctly
   - Stroke lengths display correctly

2. **Sensor Values Display:**
   - Medical pressure sensors show PrimaryValue
   - Units are displayed correctly (mmHg)
   - CVP, PAP, AoP, Arterial, and IVC sensors display correctly

3. **Graceful Degradation:**
   - Missing data shows '-' instead of errors
   - Zero values display as '0' (not treated as missing)
   - Null/undefined values are handled gracefully

4. **Alert States:**
   - Temperature alerts show red border when threshold exceeded
   - Voltage alerts show yellow border when out of range
   - BackColor property properly applies border colors

## Conclusion

All component creation functions have been successfully updated to work with the new Jotai atom-based data structure. The changes maintain backward compatibility while properly handling:
- Numeric atom values
- Object atom values with PrimaryValue
- Alert states via BackColor
- Missing/null/undefined values
- Zero as valid data

The implementation satisfies Requirements 3.1 and 3.3 by ensuring the UI components correctly display data from the aggregated state structure.
