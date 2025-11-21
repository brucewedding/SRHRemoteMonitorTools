# Implementation Plan

- [x] 1. Set up Fastify server infrastructure




  - Install Fastify and required plugins (@fastify/websocket, @fastify/cors)
  - Create new Fastify server file with basic configuration
  - Set up WebSocket route handler
  - Configure logging and error handling
  - _Requirements: 10.1_

- [ ]* 1.1 Write property test for Fastify server initialization
  - **Property 41: Connection logic is preserved**
  - **Validates: Requirements 10.1**

- [x] 2. Implement message parser





  - Create MessageParser class with parse() and validate() methods
  - Implement validation for required fields (messageType, timestampUtc, source, data)
  - Add error handling for malformed JSON
  - Support all telemetry message types from sample data
  - _Requirements: 1.1, 1.3_

- [ ]* 2.1 Write property test for message parsing
  - **Property 1: Message parsing preserves valid messages**
  - **Validates: Requirements 1.1**

- [ ]* 2.2 Write property test for message source tracking
  - **Property 3: Message source is tracked**
  - **Validates: Requirements 1.3**

- [ ]* 2.3 Write property test for malformed message handling
  - **Property 5: Malformed messages don't crash the server**
  - **Validates: Requirements 1.5**

- [x] 3. Create state aggregator foundation





  - Create StateAggregator class with initial state structure
  - Implement getState() method to return current aggregated state
  - Implement reset() method to clear state
  - Define AggregatedState, HeartData, SensorData, and SystemStatus interfaces
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 3.1 Write property test for aggregated state structure
  - **Property 16: Aggregated state has required heart fields**
  - **Validates: Requirements 3.1**

- [ ]* 3.2 Write property test for heart rate field
  - **Property 17: Aggregated state has numeric heart rate**
  - **Validates: Requirements 3.2**

- [ ]* 3.3 Write property test for sensor objects
  - **Property 18: Aggregated state has sensor objects**
  - **Validates: Requirements 3.3**

- [x] 4. Implement message type handlers




  - Create base MessageTypeHandler class
  - Implement MotorCurrentHandler for power consumption extraction
  - Implement InstantaneousAtrialPressureHandler for atrial pressure updates
  - Implement StrokewiseAtrialPressureHandler for min/max/avg pressure
  - Implement ManualPhysiologicalSettingsHandler for heart rate and stroke length
  - Implement ActualStrokeLengthHandler for actual stroke length updates
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 4.1 Write property test for power consumption extraction
  - **Property 6: Power consumption extraction is correct**
  - **Validates: Requirements 2.1**

- [ ]* 4.2 Write property test for atrial pressure updates
  - **Property 7: Atrial pressure updates correctly**
  - **Validates: Requirements 2.2**

- [ ]* 4.3 Write property test for strokewise pressure updates
  - **Property 8: Strokewise pressure updates all values**
  - **Validates: Requirements 2.3**

- [ ]* 4.4 Write property test for physiological settings
  - **Property 9: Physiological settings update multiple fields**
  - **Validates: Requirements 2.4**

- [ ]* 4.5 Write property test for actual stroke length
  - **Property 10: Actual stroke length updates correctly**
  - **Validates: Requirements 2.5**

- [ ] 5. Implement system health handlers
  - Implement TemperatureHandler for temperature data
  - Implement SupplyVoltageHandler for voltage metrics
  - Implement CPUDataHandler for CPU load
  - Implement AccelerometerHandler for acceleration data
  - Calculate accelerometer magnitude as sqrt(x² + y² + z²)
  - _Requirements: 2.6, 2.7, 2.8, 8.1_

- [ ]* 5.1 Write property test for temperature data storage
  - **Property 11: Temperature data is stored correctly**
  - **Validates: Requirements 2.6**

- [ ]* 5.2 Write property test for voltage data storage
  - **Property 12: Voltage data is stored correctly**
  - **Validates: Requirements 2.7**

- [ ]* 5.3 Write property test for CPU data storage
  - **Property 13: CPU data is stored correctly**
  - **Validates: Requirements 2.8**

- [ ]* 5.4 Write property test for accelerometer data storage
  - **Property 35: Accelerometer data is stored completely**
  - **Validates: Requirements 8.1**

- [ ]* 5.5 Write property test for accelerometer magnitude calculation
  - **Property 36: Accelerometer magnitude is calculated**
  - **Validates: Requirements 8.2**

- [x] 6. Implement pressure data handlers




  - Implement StrokewisePressureHandler for UDP pressure data
  - Map leftAtrial to LeftHeart.MedicalPressure
  - Map rightAtrial to RightHeart.MedicalPressure
  - Map pulmonaryArterial to PAPSensor
  - Map aortic to AoPSensor
  - Implement StreamingPressureHandler for streaming pressure buffering
  - _Requirements: 2.9, 2.10, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 6.1 Write property test for left atrial pressure mapping
  - **Property 24: Left atrial pressure maps correctly**
  - **Validates: Requirements 5.1**

- [ ]* 6.2 Write property test for right atrial pressure mapping
  - **Property 25: Right atrial pressure maps correctly**
  - **Validates: Requirements 5.2**

- [ ]* 6.3 Write property test for pulmonary arterial pressure mapping
  - **Property 26: Pulmonary arterial pressure maps to PAPSensor**
  - **Validates: Requirements 5.3**

- [ ]* 6.4 Write property test for aortic pressure mapping
  - **Property 27: Aortic pressure maps to AoPSensor**
  - **Validates: Requirements 5.4**

- [ ]* 6.5 Write property test for pressure field mapping
  - **Property 28: Pressure fields map to sensor structure**
  - **Validates: Requirements 5.5**

- [ ]* 6.6 Write property test for streaming pressure buffering
  - **Property 15: Streaming pressure data is buffered**
  - **Validates: Requirements 2.10**

- [x] 7. Implement pump side routing logic





  - Add routing logic in StateAggregator.updateState()
  - Route messages with pumpSide="Left" to LeftHeart
  - Route messages with pumpSide="Right" to RightHeart
  - Handle messages with pumpSide="All" for both sides
  - _Requirements: 1.4_

- [ ]* 7.1 Write property test for pump side routing
  - **Property 4: Pump side routing is correct**
  - **Validates: Requirements 1.4**

- [x] 8. Implement cardiac output calculation




  - Define pump cross-section area constant
  - Implement calculation: (HeartRate × StrokeLength × CrossSectionArea) / 1000
  - Update LeftHeart.CardiacOutput and RightHeart.CardiacOutput
  - Handle missing data by using zero or previous value
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 8.1 Write property test for cardiac output calculation
  - **Property 21: Cardiac output calculation is correct**
  - **Validates: Requirements 4.1**

- [ ]* 8.2 Write property test for cardiac output routing
  - **Property 22: Cardiac output routes to correct side**
  - **Validates: Requirements 4.2**

- [ ]* 8.3 Write property test for missing data handling
  - **Property 23: Missing data doesn't break cardiac output**
  - **Validates: Requirements 4.3**

- [x] 9. Integrate message handlers with Fastify WebSocket





  - Wire MessageParser into WebSocket message handler
  - Call StateAggregator.updateState() for each parsed message
  - Implement message ordering by timestampUtc
  - Add error handling and logging
  - _Requirements: 1.2, 1.5_

- [ ]* 9.1 Write property test for message ordering
  - **Property 2: Messages are ordered by timestamp**
  - **Validates: Requirements 1.2**

- [x] 10. Implement broadcast logic





  - Broadcast aggregated state to all connected clients after each update
  - Include timestamp in broadcast
  - Preserve SystemId for client filtering
  - Filter broadcasts by SystemId for each client
  - Implement timeout logic to continue broadcasting last known state
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 10.2_

- [ ]* 10.1 Write property test for broadcast triggers
  - **Property 29: State updates trigger broadcasts**
  - **Validates: Requirements 6.1**

- [ ]* 10.2 Write property test for broadcast timestamp
  - **Property 30: Broadcasts include timestamp**
  - **Validates: Requirements 6.2**

- [ ]* 10.3 Write property test for timeout behavior
  - **Property 31: Timeout preserves last state**
  - **Validates: Requirements 6.3**

- [ ]* 10.4 Write property test for SystemId preservation
  - **Property 32: Broadcasts preserve SystemId**
  - **Validates: Requirements 6.4**

- [ ]* 10.5 Write property test for SystemId filtering
  - **Property 42: Broadcasts are filtered by SystemId**
  - **Validates: Requirements 10.2**

- [x] 11. Preserve existing WebSocket features




  - Migrate client authentication logic to Fastify
  - Migrate system selection modal logic
  - Migrate device message broadcasting
  - Implement system disconnect cleanup
  - Maintain wsClients map for email/device tracking
  - _Requirements: 10.1, 10.3, 10.4_

- [ ]* 11.1 Write property test for device message broadcasting
  - **Property 43: Device messages are broadcast**
  - **Validates: Requirements 10.3**

- [ ]* 11.2 Write property test for system cleanup
  - **Property 44: Disconnected systems are removed**
  - **Validates: Requirements 10.4**

- [ ] 12. Checkpoint - Ensure server tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Install Jotai on frontend





  - Install jotai package
  - Create atoms.js file in src directory
  - Define all telemetry atoms (heart rate, pressures, temperatures, voltages, etc.)
  - _Requirements: 12.1_

- [x] 14. Implement WebSocket state updater




  - Create updateAtomsFromState() function
  - Map aggregated state fields to corresponding atoms
  - Batch atom updates for performance
  - Handle missing or null fields gracefully
  - _Requirements: 12.2_

- [ ]* 14.1 Write property test for atom updates
  - **Property 48: Atoms update from WebSocket state**
  - **Validates: Requirements 12.2**

- [x] 15. Refactor Dashboard component to use Jotai




  - Replace React.useState for detailedData with Jotai atoms
  - Update WebSocket message handler to call updateAtomsFromState()
  - Replace detailedData references with useAtomValue() hooks
  - Test that UI updates correctly with new state management
  - _Requirements: 12.4_

- [x] 16. Add System Health UI section





  - Create new card section for System Health
  - Display temperature readings with unit (°C)
  - Display voltage readings (supply, core, motor) with unit (V)
  - Display CPU load with unit (%)
  - Display accelerometer magnitude with unit (g)
  - _Requirements: 7.1, 7.2, 7.3, 8.2_

- [x] 17. Implement health monitoring alerts




  - Add temperature threshold checking (e.g., > 60°C)
  - Highlight temperature display when threshold exceeded
  - Add voltage range checking (e.g., 12-18V for supply)
  - Highlight voltage display when out of range
  - Add accelerometer threshold checking (e.g., > 2g)
  - Display warning indicator when acceleration threshold exceeded
  - _Requirements: 7.4, 7.5, 8.3_

- [ ]* 17.1 Write property test for temperature highlighting
  - **Property 33: High temperature triggers highlighting**
  - **Validates: Requirements 7.4**

- [ ]* 17.2 Write property test for voltage highlighting
  - **Property 34: Abnormal voltage triggers highlighting**
  - **Validates: Requirements 7.5**

- [ ]* 17.3 Write property test for accelerometer warning
  - **Property 37: High acceleration triggers warning**
  - **Validates: Requirements 8.3**

- [x] 18. Update ChartManager for new data format





  - Modify updateStoredChartData() to work with new aggregated state structure
  - Update value extraction to handle Jotai atom values
  - Replace stroke volume chart with stroke length chart
  - Ensure chart buffer limiting still works (MAX_DATA_POINTS)
  - Handle missing data by using zero or last known value
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ]* 18.1 Write property test for chart data extraction
  - **Property 45: Chart data extraction works correctly**
  - **Validates: Requirements 11.1**

- [ ]* 18.2 Write property test for chart buffer limiting
  - **Property 46: Chart buffer is bounded**
  - **Validates: Requirements 11.3**

- [ ]* 18.3 Write property test for missing chart data
  - **Property 47: Missing chart data is handled**
  - **Validates: Requirements 11.4**

- [x] 19. Implement graceful degradation for missing data





  - Add default value handling in StateAggregator
  - Display "No Data" indicator when no telemetry received for extended period
  - Show available pump side data when one side is unavailable
  - Ensure system recovers when telemetry resumes
  - _Requirements: 9.1, 9.2, 9.4_

- [ ]* 19.1 Write property test for default values
  - **Property 38: Missing fields use defaults**
  - **Validates: Requirements 9.1**

- [ ]* 19.2 Write property test for partial data handling
  - **Property 39: Partial data is handled gracefully**
  - **Validates: Requirements 9.2**

- [ ]* 19.3 Write property test for recovery after gap
  - **Property 40: Recovery after gap works correctly**
  - **Validates: Requirements 9.4**

- [x] 20. Update Components.jsx for new data structure





  - Ensure createDetailCard() works with atom values
  - Ensure createPressureCard() works with new pressure structure
  - Ensure createStrokeCard() works with stroke length data
  - Update any hardcoded field references
  - _Requirements: 3.1, 3.3_

- [ ] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 22. Test end-to-end with sample telemetry




  - Send sample-telemetry.json messages to server
  - Verify UI displays all data correctly
  - Verify charts update correctly
  - Verify System Health section displays correctly
  - Verify alerts trigger at appropriate thresholds
  - _Requirements: All_

- [ ]* 22.1 Write integration test for complete telemetry flow
  - Test message flow from WebSocket to UI display
  - Verify all message types are handled correctly
  - Verify UI updates reflect telemetry data
