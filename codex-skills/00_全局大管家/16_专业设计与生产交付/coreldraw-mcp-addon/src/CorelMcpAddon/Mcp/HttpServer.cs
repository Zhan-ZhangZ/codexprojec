using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using CorelMcp.Json;
using CorelMcp.Config;

namespace CorelMcp.Mcp
{
    /// <summary>
    /// Minimal MCP "Streamable HTTP" endpoint backed by <see cref="HttpListener"/>.
    /// Bound to an explicit loopback prefix, which needs no URL ACL / admin rights.
    /// </summary>
    public class HttpServer
    {
        /// <summary>How many requests may be handled at once before the endpoint reports 503.</summary>
        private const int MaxConcurrentRequests = 4;

        private const int BodyChunkBytes = 16 * 1024;

        private readonly AddonConfig _config;
        private readonly McpProtocol _protocol;
        private readonly SemaphoreSlim _slots =
            new SemaphoreSlim(MaxConcurrentRequests, MaxConcurrentRequests);

        private HttpListener _listener;
        private Thread _thread;
        private volatile bool _running;
        private string _sessionId;

        public long RequestCount;

        public HttpServer(AddonConfig config, McpProtocol protocol)
        {
            _config = config;
            _protocol = protocol;
        }

        public string Prefix { get { return _config.HttpPrefix; } }

        public void Start()
        {
            if (_running) return;

            _listener = new HttpListener();
            _listener.Prefixes.Add(_config.HttpPrefix);
            _listener.Start();
            _running = true;

            _thread = new Thread(AcceptLoop) { IsBackground = true, Name = "CorelMcp.HttpListener" };
            _thread.Start();

            Log.Info("MCP endpoint listening on " + _config.HttpPrefix + "mcp");
        }

        public void Stop()
        {
            if (!_running) return;
            _running = false;

            try { _listener.Stop(); } catch { }
            try { _listener.Close(); } catch { }

            var thread = _thread;
            if (thread != null && thread.IsAlive)
            {
                try { thread.Join(2000); } catch { }
            }
            _thread = null;
            _listener = null;
            Log.Info("MCP endpoint stopped.");
        }

        private void AcceptLoop()
        {
            while (_running)
            {
                var listener = _listener;
                if (listener == null) break;

                HttpListenerContext context;
                try
                {
                    context = listener.GetContext();
                }
                catch (HttpListenerException)
                {
                    break; // listener stopped
                }
                catch (InvalidOperationException)
                {
                    break; // listener closed (ObjectDisposedException included)
                }
                catch (Exception ex)
                {
                    if (_running) Log.Error("HTTP accept failed", ex);
                    break;
                }

                // Never handle a request on this thread: a tool call can wait for CorelDRAW's
                // UI thread for up to CorelBridge.InvokeTimeoutMs, and a slow client body would
                // otherwise stall /health and every other client with it.
                ThreadPool.QueueUserWorkItem(state => HandleGuarded(context));
            }
        }

        private void HandleGuarded(HttpListenerContext context)
        {
            if (!_slots.Wait(0))
            {
                Log.Warn("Too many concurrent requests; answering 503.");
                TryWriteStatus(context, 503, "Server is busy handling other requests. Retry shortly.", true);
                return;
            }

            try
            {
                if (!_running) return;
                Handle(context);
            }
            catch (Exception ex)
            {
                Log.Error("HTTP request handling failed", ex);
                TryWriteStatus(context, 500, "Internal server error");
            }
            finally
            {
                _slots.Release();
            }
        }

        private void Handle(HttpListenerContext context)
        {
            var request = context.Request;
            var path = (request.Url.AbsolutePath ?? "/").TrimEnd('/');
            if (path.Length == 0) path = "/";

            // A page in the user's browser must not be able to drive this endpoint. A request
            // with a foreign Host header is a DNS-rebinding attempt; a request with a foreign
            // Origin is cross-site. Native clients and stdio bridges send neither.
            if (!IsHostAllowed(request) || !IsOriginAllowed(request))
            {
                Log.Warn("Rejected " + request.HttpMethod + " " + request.Url.AbsolutePath +
                         " (Host '" + (request.Headers["Host"] ?? string.Empty) + "', Origin '" +
                         (request.Headers["Origin"] ?? string.Empty) + "').");
                TryWriteStatus(context, 403,
                    "Forbidden: this endpoint only accepts requests addressed to loopback and, " +
                    "from a browser, only from a page served on loopback.");
                return;
            }

            Log.Info(request.HttpMethod + " " + request.Url.AbsolutePath);

            if (request.HttpMethod == "OPTIONS")
            {
                WriteCors(context);
                context.Response.StatusCode = 204;
                context.Response.Close();
                return;
            }

            if (path == "/health" && request.HttpMethod == "GET")
            {
                TryWriteStatus(context, 200, "ok");
                return;
            }

            if (path != "/mcp" && path != "/")
            {
                TryWriteStatus(context, 404, "Not found. The MCP endpoint is /mcp (POST); GET /health reports readiness.");
                return;
            }

            if (!IsAuthorised(request))
            {
                context.Response.StatusCode = 401;
                context.Response.AddHeader("WWW-Authenticate", "Bearer");
                TryWriteStatus(context, 401, "Unauthorized: this server requires a bearer token. Configure AuthToken in config.json and send Authorization: Bearer <token>.");
                return;
            }

            switch (request.HttpMethod)
            {
                case "POST":
                    HandlePost(context);
                    return;

                case "GET":
                    // Server-initiated SSE stream is not implemented; 405 is spec-compliant.
                    context.Response.AddHeader("Allow", "POST, OPTIONS, DELETE");
                    TryWriteStatus(context, 405, "This server does not offer a standalone SSE stream. Send MCP requests as POST /mcp.");
                    return;

                case "DELETE":
                    // Session termination: nothing to clean up (stateless), acknowledge.
                    _sessionId = null;
                    TryWriteStatus(context, 200, "session terminated");
                    return;

                default:
                    context.Response.AddHeader("Allow", "POST, OPTIONS, DELETE");
                    TryWriteStatus(context, 405, "Method not allowed. Send MCP requests as POST /mcp.");
                    return;
            }
        }

        private void HandlePost(HttpListenerContext context)
        {
            var request = context.Request;

            // MCP payloads are JSON. Requiring the JSON content type is also what forces a
            // browser to preflight a cross-site request, which the Origin check then rejects.
            // An absent Content-Type is tolerated for hand-written requests (curl, scripts).
            var contentType = request.ContentType;
            if (!string.IsNullOrEmpty(contentType) &&
                contentType.IndexOf("application/json", StringComparison.OrdinalIgnoreCase) < 0)
            {
                TryWriteStatus(context, 415, "Unsupported Content-Type '" + contentType +
                    "'. Send application/json.");
                return;
            }

            bool tooLarge;
            var body = ReadBody(request, out tooLarge);
            if (tooLarge)
            {
                TryWriteStatus(context, 413, "Request body too large (MaxBodyBytes = " +
                    _config.MaxBodyBytes + ").");
                return;
            }

            JsonValue parsed;
            try
            {
                parsed = string.IsNullOrWhiteSpace(body) ? null : JsonValue.Parse(body);
            }
            catch (JsonParseException ex)
            {
                WriteJson(context, JsonRpcResponse.Fail(null,
                    new JsonRpcError(JsonRpcErrors.ParseError, "Invalid JSON: " + ex.Message)).ToJson());
                return;
            }

            if (parsed == null)
            {
                WriteJson(context, JsonRpcResponse.Fail(null,
                    new JsonRpcError(JsonRpcErrors.InvalidRequest, "Empty request body.")).ToJson());
                return;
            }

            Interlocked.Increment(ref RequestCount);

            if (parsed.Type == JsonType.Array)
            {
                var responses = new JsonArray();
                foreach (var element in (JsonArray)parsed)
                {
                    var request2 = JsonRpcRequest.FromJson(element);
                    if (request2 != null && string.Equals(request2.Method, "initialize", StringComparison.Ordinal))
                        _sessionId = Guid.NewGuid().ToString("N");
                    var response = _protocol.Handle(request2);
                    if (response != null) responses.Add(response.ToJson());
                }
                if (responses.Count == 0)
                {
                    context.Response.StatusCode = 202;
                    context.Response.Close();
                    return;
                }
                WriteJson(context, responses);
                return;
            }

            var single = JsonRpcRequest.FromJson(parsed);
            if (single != null && string.Equals(single.Method, "initialize", StringComparison.Ordinal))
                _sessionId = Guid.NewGuid().ToString("N");

            var result = _protocol.Handle(single);
            if (result == null)
            {
                // Notification: no response body.
                context.Response.StatusCode = 202;
                context.Response.Close();
                return;
            }
            WriteJson(context, result.ToJson());
        }

        /// <summary>
        /// Read the body up to <see cref="AddonConfig.MaxBodyBytes"/> bytes. The limit is applied
        /// while reading, not after: the request is rejected as soon as it overshoots, so an
        /// oversized body is never buffered whole. Returns null with <paramref name="tooLarge"/>
        /// set when the limit was exceeded.
        /// </summary>
        private string ReadBody(HttpListenerRequest request, out bool tooLarge)
        {
            tooLarge = false;
            var limit = _config.MaxBodyBytes;

            var declared = request.ContentLength64;
            if (declared > limit)
            {
                tooLarge = true;
                return null;
            }

            // MCP payloads are UTF-8 by specification. Request.ContentEncoding must not be
            // used here: HttpListener defaults it to ISO-8859-1 when the request carries no
            // charset, which silently mangles non-ASCII text (e.g. Cyrillic tool arguments).
            using (var buffer = new MemoryStream())
            {
                var chunk = new byte[BodyChunkBytes];
                while (true)
                {
                    var read = request.InputStream.Read(chunk, 0, chunk.Length);
                    if (read <= 0) break;
                    if (buffer.Length + read > limit)
                    {
                        tooLarge = true;
                        return null;
                    }
                    buffer.Write(chunk, 0, read);
                }
                if (buffer.Length == 0) return string.Empty;
                return Encoding.UTF8.GetString(buffer.ToArray());
            }
        }

        /// <summary>
        /// The Host header must name this machine: anything else is a DNS-rebinding attempt.
        /// Absent Host is tolerated for non-HTTP/1.1 clients.
        /// </summary>
        private bool IsHostAllowed(HttpListenerRequest request)
        {
            var host = request.Headers["Host"];
            if (string.IsNullOrEmpty(host)) return true;

            var name = host;
            var portSeparator = host.LastIndexOf(':');
            if (portSeparator > 0 && host.IndexOf(']') < portSeparator)
                name = host.Substring(0, portSeparator);

            name = name.Trim().Trim('[', ']');
            return IsLoopbackName(name) ||
                   string.Equals(name, _config.BindAddress, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>Absent Origin (native client, stdio bridge) or a loopback Origin only.</summary>
        private static bool IsOriginAllowed(HttpListenerRequest request)
        {
            var origin = request.Headers["Origin"];
            if (string.IsNullOrEmpty(origin)) return true;

            Uri uri;
            if (!Uri.TryCreate(origin, UriKind.Absolute, out uri)) return false;
            if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return false;
            return IsLoopbackName(uri.DnsSafeHost.Trim('[', ']'));
        }

        private static bool IsLoopbackName(string name)
        {
            if (string.IsNullOrEmpty(name)) return false;
            if (string.Equals(name, "localhost", StringComparison.OrdinalIgnoreCase)) return true;

            IPAddress address;
            return IPAddress.TryParse(name, out address) && IPAddress.IsLoopback(address);
        }

        private bool IsAuthorised(HttpListenerRequest request)
        {
            var expected = _config.AuthToken;
            if (string.IsNullOrEmpty(expected)) return true;

            var header = request.Headers["Authorization"];
            if (string.IsNullOrEmpty(header)) return false;

            const string prefix = "Bearer ";
            if (!header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return false;
            return string.Equals(header.Substring(prefix.Length).Trim(), expected, StringComparison.Ordinal);
        }

        private void WriteJson(HttpListenerContext context, JsonValue payload)
        {
            string json = (payload ?? JsonValue.Null).ToString(JsonFormatting.Compact);

            var bytes = Encoding.UTF8.GetBytes(json);
            context.Response.StatusCode = 200;
            context.Response.ContentType = "application/json; charset=utf-8";
            context.Response.ContentEncoding = Encoding.UTF8;
            if (_sessionId != null) context.Response.AddHeader("Mcp-Session-Id", _sessionId);
            WriteCors(context);
            context.Response.ContentLength64 = bytes.Length;
            context.Response.OutputStream.Write(bytes, 0, bytes.Length);
            context.Response.OutputStream.Flush();
            context.Response.Close();
        }

        /// <summary>
        /// Echo the caller's Origin instead of "*": only loopback origins get this far, so a
        /// page served from another host cannot read a response even if it sends a request.
        /// </summary>
        private static void WriteCors(HttpListenerContext context)
        {
            var origin = context.Request.Headers["Origin"];
            if (string.IsNullOrEmpty(origin)) return;

            context.Response.AddHeader("Access-Control-Allow-Origin", origin);
            context.Response.AddHeader("Vary", "Origin");
            context.Response.AddHeader("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
            context.Response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id, Accept");
        }

        private static void TryWriteStatus(HttpListenerContext context, int status, string message,
            bool retryAfter = false)
        {
            try
            {
                var bytes = Encoding.UTF8.GetBytes(message ?? string.Empty);
                context.Response.StatusCode = status;
                context.Response.ContentType = "text/plain; charset=utf-8";
                context.Response.ContentEncoding = Encoding.UTF8;
                if (retryAfter) context.Response.AddHeader("Retry-After", "1");
                context.Response.ContentLength64 = bytes.Length;
                context.Response.OutputStream.Write(bytes, 0, bytes.Length);
                context.Response.Close();
            }
            catch
            {
                try { context.Response.Abort(); } catch { }
            }
        }
    }
}
