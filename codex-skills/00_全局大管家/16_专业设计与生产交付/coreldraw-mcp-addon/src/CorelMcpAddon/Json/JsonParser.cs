using System;
using System.Globalization;
using System.Text;

namespace CorelMcp.Json
{
    /// <summary>
    /// Recursive-descent JSON parser. Never throws anything but <see cref="JsonParseException"/>.
    /// </summary>
    internal sealed class JsonParser
    {
        /// <summary>Guards against stack exhaustion from a hostile request body.</summary>
        public const int MaxDepth = JsonValue.MaxDepth;

        private readonly string _text;
        private int _index;

        private JsonParser(string text)
        {
            _text = text;
        }

        public static JsonValue Parse(string json)
        {
            if (string.IsNullOrEmpty(json))
                throw new JsonParseException("Empty JSON document.");

            var parser = new JsonParser(json);
            parser.SkipWhitespace();
            var value = parser.ReadValue(0);
            parser.SkipWhitespace();

            if (parser._index < parser._text.Length)
                throw parser.Error("Unexpected trailing content");

            return value;
        }

        private JsonValue ReadValue(int depth)
        {
            if (_index >= _text.Length)
                throw Error("Unexpected end of input");

            if (depth > MaxDepth)
                throw Error("Maximum nesting depth of " + MaxDepth + " exceeded");

            char c = _text[_index];
            switch (c)
            {
                case '{': return ReadObject(depth);
                case '[': return ReadArray(depth);
                case '"': return JsonLeaf.String(ReadString());
                case 't': Expect("true"); return JsonLeaf.Boolean(true);
                case 'f': Expect("false"); return JsonLeaf.Boolean(false);
                case 'n': Expect("null"); return JsonLeaf.NullValue;
                default: return ReadNumber();
            }
        }

        private JsonValue ReadObject(int depth)
        {
            var result = new JsonObject();
            _index++; // '{'
            SkipWhitespace();

            if (Peek() == '}')
            {
                _index++;
                return result;
            }

            while (true)
            {
                SkipWhitespace();
                if (Peek() != '"') throw Error("Expected a member name");

                var name = ReadString();
                SkipWhitespace();
                if (Peek() != ':') throw Error("Expected ':' after member name");
                _index++;

                SkipWhitespace();
                // Duplicate members: the last one wins.
                result[name] = ReadValue(depth + 1);

                SkipWhitespace();
                char next = Peek();
                if (next == ',')
                {
                    _index++;
                    continue;
                }
                if (next == '}')
                {
                    _index++;
                    return result;
                }
                throw Error("Expected ',' or '}' in object");
            }
        }

        private JsonValue ReadArray(int depth)
        {
            var result = new JsonArray();
            _index++; // '['
            SkipWhitespace();

            if (Peek() == ']')
            {
                _index++;
                return result;
            }

            while (true)
            {
                SkipWhitespace();
                result.Add(ReadValue(depth + 1));
                SkipWhitespace();

                char next = Peek();
                if (next == ',')
                {
                    _index++;
                    continue;
                }
                if (next == ']')
                {
                    _index++;
                    return result;
                }
                throw Error("Expected ',' or ']' in array");
            }
        }

        private string ReadString()
        {
            _index++; // opening quote
            var builder = new StringBuilder();

            while (true)
            {
                if (_index >= _text.Length) throw Error("Unterminated string");

                char c = _text[_index++];
                if (c == '"') return builder.ToString();

                if (c != '\\')
                {
                    builder.Append(c);
                    continue;
                }

                if (_index >= _text.Length) throw Error("Unterminated escape sequence");

                char escape = _text[_index++];
                switch (escape)
                {
                    case '"': builder.Append('"'); break;
                    case '\\': builder.Append('\\'); break;
                    case '/': builder.Append('/'); break;
                    case 'b': builder.Append('\b'); break;
                    case 'f': builder.Append('\f'); break;
                    case 'n': builder.Append('\n'); break;
                    case 'r': builder.Append('\r'); break;
                    case 't': builder.Append('\t'); break;
                    case 'u': builder.Append(ReadUnicodeEscape()); break;
                    default: throw Error("Unsupported escape sequence '\\" + escape + "'");
                }
            }
        }

        private char ReadUnicodeEscape()
        {
            if (_index + 4 > _text.Length) throw Error("Truncated \\u escape sequence");

            int code = 0;
            for (int i = 0; i < 4; i++)
            {
                int digit = HexValue(_text[_index + i]);
                if (digit < 0) throw Error("Invalid hexadecimal digit in \\u escape sequence");
                code = (code << 4) | digit;
            }
            _index += 4;
            return (char)code;
        }

        private JsonValue ReadNumber()
        {
            int start = _index;
            bool isFloat = false;

            while (_index < _text.Length)
            {
                char c = _text[_index];
                if (c >= '0' && c <= '9' || c == '-' || c == '+')
                {
                    _index++;
                    continue;
                }
                if (c == '.' || c == 'e' || c == 'E')
                {
                    isFloat = true;
                    _index++;
                    continue;
                }
                break;
            }

            if (_index == start) throw Error("Unexpected character '" + _text[start] + "'");

            var token = _text.Substring(start, _index - start);

            if (!isFloat)
            {
                long integer;
                if (long.TryParse(token, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out integer))
                    return JsonLeaf.Integer(integer);
            }

            double number;
            if (double.TryParse(token,
                    NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint | NumberStyles.AllowExponent,
                    CultureInfo.InvariantCulture, out number))
                return JsonLeaf.Float(number);

            throw Error("Invalid number '" + token + "'");
        }

        private void Expect(string literal)
        {
            if (_index + literal.Length > _text.Length ||
                string.CompareOrdinal(_text, _index, literal, 0, literal.Length) != 0)
                throw Error("Expected '" + literal + "'");

            _index += literal.Length;
        }

        private char Peek()
        {
            return _index < _text.Length ? _text[_index] : '\0';
        }

        private void SkipWhitespace()
        {
            while (_index < _text.Length)
            {
                char c = _text[_index];
                if (c == ' ' || c == '\t' || c == '\n' || c == '\r') _index++;
                else break;
            }
        }

        private JsonParseException Error(string message)
        {
            return new JsonParseException(message + " at position " + _index + ".");
        }

        private static int HexValue(char c)
        {
            if (c >= '0' && c <= '9') return c - '0';
            if (c >= 'a' && c <= 'f') return c - 'a' + 10;
            if (c >= 'A' && c <= 'F') return c - 'A' + 10;
            return -1;
        }
    }
}
