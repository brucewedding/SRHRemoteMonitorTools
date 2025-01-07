namespace CLITester
{
    using System;
    using System.Diagnostics;
    using System.Net.WebSockets;
    using System.Text.Json;
    using WebSocketSharp;
    using WebSocketState = WebSocketSharp.WebSocketState;

    class Program
    {
        static Random random = new Random();
        static bool isRunning = true;
        static WebSocketSharp.WebSocket ws;
        const int RECONNECT_DELAY_MS = 5000; // 5 second delay between reconnection attempts
        const string WS_URL = "wss://realheartremote.live:3000";

        static void Main()
        {
            Console.CancelKeyPress += (sender, e) => {
                e.Cancel = true; // Prevent immediate termination
                isRunning = false;
                Console.WriteLine("Shutting down gracefully...");
            };

            while (isRunning)
            {
                try
                {
                    using (ws = new WebSocketSharp.WebSocket(WS_URL))
                    {
                        SetupWebSocketHandlers();
                        ws.Connect();
                        Console.WriteLine("Connected to WebSocket server");

                        var stopwatch = Stopwatch.StartNew();
                        var timeLimit = TimeSpan.FromHours(3);

                        while (isRunning && ws.ReadyState == WebSocketState.Open)
                        {
                            try
                            {
                                if (stopwatch.Elapsed >= timeLimit)
                                {
                                    break;
                                }

                                SendMonitorData();
                                Thread.Sleep(1500);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Error sending data: {ex.Message}");
                                break;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Connection error: {ex.Message}");
                }

                if (isRunning)
                {
                    Console.WriteLine($"Connection lost. Reconnecting in {RECONNECT_DELAY_MS/1000} seconds...");
                    Thread.Sleep(RECONNECT_DELAY_MS);
                }
            }

            Console.WriteLine("Program terminated.");
        }

        static void SetupWebSocketHandlers()
        {
            ws.OnError += (sender, e) => {
                Console.WriteLine($"WebSocket Error: {e.Message}");
            };

            ws.OnClose += (sender, e) => {
                Console.WriteLine($"WebSocket Closed: {e.Code} - {e.Reason}");
            };

            ws.OnMessage += (sender, e) => {
                Console.WriteLine($"Received: {e.Data}");
            };
        }

        static void SendMonitorData()
        {
            var data = new MonitorData
            {
                Timestamp = DateTime.UtcNow,
                LeftHeart = GenerateHeartHalfData(true),
                RightHeart = GenerateHeartHalfData(false),
                HeartRate = random.Next(60, 100),
                OperationState = "Auto",
                HeartStatus = "Both Running",
                FlowLimitState = "Keep constant",
                FlowLimit = 5 + (random.NextDouble() * 2),
                AtmosPressure = 905.0,
                UseMedicalSensor = random.Next(2) == 1,
                O2sat = 98 + (random.NextDouble() * 2),
                bloodPressure = new BloodPressure
                {
                    systolic = 120 + (random.NextDouble() * 20 - 10),
                    diastolic = 80 + (random.NextDouble() * 20 - 10)
                },
                pressures = new Pressures
                {
                    cvp = 8 + (random.NextDouble() * 4 - 2),      // CVP typically 3-8 mmHg
                    pap = 15 + (random.NextDouble() * 6 - 3),     // PAP typically 8-20 mmHg
                    aop = 90 + (random.NextDouble() * 20 - 10),   // AoP typically 80-100 mmHg
                    arterial = 85 + (random.NextDouble() * 20 - 10) // Arterial typically 75-95 mmHg
                }
            };

            var json = JsonSerializer.Serialize(data);
            
            if (ws.ReadyState == WebSocketState.Open)
            {
                ws.Send(json);
                Console.WriteLine($"Data sent at {DateTime.Now}");
                //Console.WriteLine(json);
            }
            else
            {
                throw new InvalidOperationException("WebSocket connection is not open");
            }
        }

        static HeartHalfData GenerateHeartHalfData(bool isLeft)
        {
            // Base values with small random variations
            double baseStrokeVolume = isLeft ? 30 : 28;
            double basePower = isLeft ? 20 : 18;
            double baseIntPressure = isLeft ? 25 : 22;

            return new HeartHalfData
            {
                StrokeVolume = baseStrokeVolume + (random.NextDouble() * 4 - 2),
                PowerConsumption = basePower + (random.NextDouble() * 2 - 1),
                IntPressure = baseIntPressure + (random.NextDouble() * 4 - 2),
                IntPressureMin = baseIntPressure - 5 + (random.NextDouble() * 2 - 1),
                IntPressureMax = baseIntPressure + 5 + (random.NextDouble() * 2 - 1),
                AtrialPressure = 10 + (random.NextDouble() * 2 - 1),
                CardiacOutput = 4.5 + (random.NextDouble() - 0.5)
            };
        }
    }

    public class HeartHalfData
    {
        public double StrokeVolume { get; set; }
        public double PowerConsumption { get; set; }
        public double IntPressure { get; set; }
        public double IntPressureMin { get; set; }
        public double IntPressureMax { get; set; }
        public double AtrialPressure { get; set; }
        public double CardiacOutput { get; set; }
    }

    public class BloodPressure
    {
        public double systolic { get; set; }
        public double diastolic { get; set; }
    }

    public class Pressures
    {
        public double cvp { get; set; }      // Central Venous Pressure
        public double pap { get; set; }      // Pulmonary Arterial Pressure
        public double aop { get; set; }      // Aortic Pressure
        public double arterial { get; set; } // Arterial Pressure
    }

    public class MonitorData
    {
        public DateTime Timestamp { get; set; }
        public HeartHalfData LeftHeart { get; set; }
        public HeartHalfData RightHeart { get; set; }
        public int HeartRate { get; set; }
        public string OperationState { get; set; }
        public string HeartStatus { get; set; }
        public string FlowLimitState { get; set; }
        public double FlowLimit { get; set; }
        public double AtmosPressure { get; set; }
        public bool UseMedicalSensor { get; set; }
        public double O2sat { get; set; }
        public BloodPressure bloodPressure { get; set; }
        public Pressures pressures { get; set; }
    }
}
