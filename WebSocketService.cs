using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Threading.Tasks;
using System.Timers;
using System.Text.Json;
using Timer = System.Threading.Timer;

namespace SRH_CommonAssembly.Communication.RemoteViewer
{
    using WebSocketSharp; // Add this NuGet package

    public class WebSocketService
    {
        private readonly WebSocket _ws;
        private readonly Timer _updateTimer;
        private readonly MonitorDataCollector _dataCollector;

        public WebSocketService(MonitorDataCollector dataCollector, string websocketUrl = "wss://realheartremote.live/ws", string userEmail = null)
        {
            _dataCollector = dataCollector;
            var finalUrl = userEmail != null ? $"{websocketUrl}?email={Uri.EscapeDataString(userEmail)}" : websocketUrl;
            _ws = new WebSocket(finalUrl);
            _ws.OnOpen += (sender, e) => Console.WriteLine("Connection opened");
            _ws.OnError += (sender, e) => Console.WriteLine($"Error: {e.Message}");
            _ws.OnClose += (sender, e) => Console.WriteLine($"Connection closed: {e.Reason}");

            _ws.Connect();

            _updateTimer = new Timer(SendUpdate, null, 0, 1000); // adjust timing as needed
        }

        private void SendUpdate(object state)
        {
            if (!_ws.IsAlive) 
                return;

            var data = _dataCollector.CollectCurrentData();
            var json = JsonSerializer.Serialize(data);
            Debug.WriteLine(json);
            _ws.Send(json);
        }

        public void Dispose()
        {
            _updateTimer?.Dispose();
            _ws?.Close();
        }
    }
}
