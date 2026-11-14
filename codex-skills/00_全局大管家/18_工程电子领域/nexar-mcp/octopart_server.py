#!/usr/bin/env python3
"""Octopart MCP Server - Search electronic components and get datasheets via Nexar API."""
import os
import sys
import logging
import time
import base64
import json
import re
import httpx
from mcp.server.fastmcp import FastMCP

# Configure logging to stderr
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger("octopart-server")

# Initialize MCP server
mcp = FastMCP("octopart")

# Configuration - API credentials
NEXAR_CLIENT_ID = os.environ.get("NEXAR_CLIENT_ID", "")
NEXAR_CLIENT_SECRET = os.environ.get("NEXAR_CLIENT_SECRET", "")
TOKEN_URL = "https://identity.nexar.com/connect/token"
GRAPHQL_URL = "https://api.nexar.com/graphql"

# User preferences (configurable via environment variables)
DEFAULT_SORT_QUANTITY = int(os.environ.get("NEXAR_DEFAULT_SORT_QUANTITY", "100"))
DEFAULT_DISTRIBUTOR = os.environ.get("NEXAR_DEFAULT_DISTRIBUTOR", "")
DEFAULT_IN_STOCK_ONLY = os.environ.get("NEXAR_DEFAULT_IN_STOCK_ONLY", "").lower() in ("true", "1", "yes")

# Token cache
_token_cache = {"token": None, "expires_at": 0}


def decode_jwt_exp(token: str) -> int:
    """Decode JWT and return expiration timestamp."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return 0
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding
        decoded = base64.urlsafe_b64decode(payload)
        data = json.loads(decoded)
        return data.get("exp", 0)
    except Exception:
        return 0


async def get_access_token() -> str:
    """Get Nexar access token using client credentials flow."""
    global _token_cache

    if not NEXAR_CLIENT_ID or not NEXAR_CLIENT_SECRET:
        raise ValueError("NEXAR_CLIENT_ID and NEXAR_CLIENT_SECRET must be set")

    current_time = time.time()
    if _token_cache["token"] and _token_cache["expires_at"] > current_time + 300:
        return _token_cache["token"]

    async with httpx.AsyncClient() as client:
        response = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": NEXAR_CLIENT_ID,
                "client_secret": NEXAR_CLIENT_SECRET,
            },
            timeout=30
        )
        response.raise_for_status()
        token_data = response.json()
        access_token = token_data.get("access_token", "")
        _token_cache["token"] = access_token
        _token_cache["expires_at"] = decode_jwt_exp(access_token)
        return access_token


async def execute_graphql(query: str, variables: dict = None) -> dict:
    """Execute a GraphQL query against the Nexar API."""
    token = await get_access_token()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            GRAPHQL_URL,
            json={"query": query, "variables": variables or {}},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=60
        )
        response.raise_for_status()
        return response.json()


# Distributor name to ID mapping (common distributors)
DISTRIBUTOR_IDS = {
    "digikey": "459",
    "digi-key": "459",
    "mouser": "2401",
    "newark": "334",
    "arrow": "542",
    "avnet": "31",
    "farnell": "427",
    "rs components": "2539",
    "rs": "2539",
    "tme": "1332",
    "lcsc": "5788",
    "chip1stop": "5245",
}


# ==================== VALUE NORMALIZERS ====================

def normalize_resistance(value: str) -> str:
    """Normalize resistance value: '10k' -> '10 kOhms', '4.7k' -> '4.7 kOhms', '100' -> '100 Ohms'."""
    if not value.strip():
        return ""
    value = value.strip().lower()

    # Handle various formats: 10k, 10K, 4.7k, 100R, 1M, 10 ohm, etc.
    patterns = [
        (r'^(\d+(?:\.\d+)?)\s*m(?:eg)?(?:ohm)?s?$', 1e6),  # megohms
        (r'^(\d+(?:\.\d+)?)\s*k(?:ohm)?s?$', 1e3),  # kilohms
        (r'^(\d+(?:\.\d+)?)\s*r$', 1),  # R notation
        (r'^(\d+(?:\.\d+)?)\s*(?:ohm)?s?$', 1),  # ohms or bare number
    ]

    for pattern, multiplier in patterns:
        match = re.match(pattern, value, re.IGNORECASE)
        if match:
            num = float(match.group(1)) * multiplier
            if num >= 1e6:
                return f"{num/1e6:.6g} MOhms"
            elif num >= 1e3:
                return f"{num/1e3:.6g} kOhms"
            else:
                return f"{num:.6g} Ohms"

    return value  # Return as-is if no pattern matched


def normalize_capacitance(value: str) -> str:
    """Normalize capacitance value: '100nF' -> '100 nF', '10uF' -> '10 uF'."""
    if not value.strip():
        return ""
    value = value.strip().lower()

    patterns = [
        (r'^(\d+(?:\.\d+)?)\s*[uμµ]f?$', 1e-6),  # microfarads
        (r'^(\d+(?:\.\d+)?)\s*nf?$', 1e-9),  # nanofarads
        (r'^(\d+(?:\.\d+)?)\s*pf?$', 1e-12),  # picofarads
    ]

    for pattern, multiplier in patterns:
        match = re.match(pattern, value, re.IGNORECASE)
        if match:
            num = float(match.group(1)) * multiplier
            if num >= 1e-6:
                return f"{num*1e6:.6g} uF"
            elif num >= 1e-9:
                return f"{num*1e9:.6g} nF"
            else:
                return f"{num*1e12:.6g} pF"

    return value


def normalize_inductance(value: str) -> str:
    """Normalize inductance value: '10uH' -> '10 uH', '100nH' -> '100 nH'."""
    if not value.strip():
        return ""
    value = value.strip().lower()

    patterns = [
        (r'^(\d+(?:\.\d+)?)\s*mh$', 1e-3),  # millihenries
        (r'^(\d+(?:\.\d+)?)\s*[uμµ]h$', 1e-6),  # microhenries
        (r'^(\d+(?:\.\d+)?)\s*nh$', 1e-9),  # nanohenries
    ]

    for pattern, multiplier in patterns:
        match = re.match(pattern, value, re.IGNORECASE)
        if match:
            num = float(match.group(1)) * multiplier
            if num >= 1e-3:
                return f"{num*1e3:.6g} mH"
            elif num >= 1e-6:
                return f"{num*1e6:.6g} uH"
            else:
                return f"{num*1e9:.6g} nH"

    return value


def normalize_frequency(value: str) -> str:
    """Normalize frequency value: '8MHz' -> '8 MHz', '32.768kHz' -> '32.768 kHz'."""
    if not value.strip():
        return ""
    value = value.strip().lower()

    patterns = [
        (r'^(\d+(?:\.\d+)?)\s*ghz$', 1e9),
        (r'^(\d+(?:\.\d+)?)\s*mhz$', 1e6),
        (r'^(\d+(?:\.\d+)?)\s*khz$', 1e3),
        (r'^(\d+(?:\.\d+)?)\s*hz$', 1),
    ]

    for pattern, multiplier in patterns:
        match = re.match(pattern, value, re.IGNORECASE)
        if match:
            num = float(match.group(1)) * multiplier
            if num >= 1e9:
                return f"{num/1e9:.6g} GHz"
            elif num >= 1e6:
                return f"{num/1e6:.6g} MHz"
            elif num >= 1e3:
                return f"{num/1e3:.6g} kHz"
            else:
                return f"{num:.6g} Hz"

    return value


def normalize_voltage(value: str) -> str:
    """Normalize voltage value: '16V' -> '16 V', '3.3V' -> '3.3 V'."""
    if not value.strip():
        return ""
    value = value.strip()

    match = re.match(r'^(\d+(?:\.\d+)?)\s*v$', value, re.IGNORECASE)
    if match:
        return f"{match.group(1)} V"

    return value


def normalize_current(value: str) -> str:
    """Normalize current value: '500mA' -> '500 mA', '3A' -> '3 A'."""
    if not value.strip():
        return ""
    value = value.strip().lower()

    match_ma = re.match(r'^(\d+(?:\.\d+)?)\s*ma$', value)
    if match_ma:
        return f"{match_ma.group(1)} mA"

    match_a = re.match(r'^(\d+(?:\.\d+)?)\s*a$', value)
    if match_a:
        return f"{match_a.group(1)} A"

    return value


def normalize_tolerance(value: str) -> str:
    """Normalize tolerance value: '1%' -> '1 %', '0.1%' -> '0.1 %'."""
    if not value.strip():
        return ""
    value = value.strip()

    match = re.match(r'^(\d+(?:\.\d+)?)\s*%$', value)
    if match:
        return f"{match.group(1)} %"

    return value


def normalize_power(value: str) -> str:
    """Normalize power rating: '0.25W' -> '0.25 W', '1/4W' -> '0.25 W', '125mW' -> '125 mW'."""
    if not value.strip():
        return ""
    value = value.strip().lower()

    # Fractional watts
    fractions = {
        "1/8w": "0.125 W",
        "1/4w": "0.25 W",
        "1/2w": "0.5 W",
    }
    for frac, normalized in fractions.items():
        if frac in value.replace(" ", ""):
            return normalized

    # Milliwatts
    match_mw = re.match(r'^(\d+(?:\.\d+)?)\s*mw$', value)
    if match_mw:
        return f"{match_mw.group(1)} mW"

    # Watts
    match_w = re.match(r'^(\d+(?:\.\d+)?)\s*w$', value)
    if match_w:
        return f"{match_w.group(1)} W"

    return value


# ==================== SEARCH HELPERS ====================

def build_search_query(base_terms: list, specs: dict) -> str:
    """Build search query string from base terms and normalized specs."""
    query_parts = [t for t in base_terms if t.strip()]

    # Add spec values that enhance the search
    for key, value in specs.items():
        if value.strip():
            query_parts.append(value)

    return " ".join(query_parts)


def format_price(price: float, currency: str = "USD") -> str:
    """Format price with currency symbol."""
    symbols = {"USD": "$", "EUR": "€", "GBP": "£"}
    symbol = symbols.get(currency, currency + " ")
    return f"{symbol}{price:.4f}"


def get_best_price_at_quantity(part: dict, quantity: int, distributor_filter: str = "") -> tuple:
    """Get the best price at a specific quantity from all sellers. Returns (price, currency, seller_name, sku)."""
    best_price = None
    best_currency = "USD"
    best_seller = ""
    best_sku = ""

    sellers = part.get("sellers", []) or []
    for seller in sellers:
        company = seller.get("company", {})
        seller_name = company.get("name", "Unknown")

        # Filter by distributor if specified
        if distributor_filter:
            if distributor_filter.lower() not in seller_name.lower():
                continue

        offers = seller.get("offers", []) or []

        for offer in offers:
            stock = offer.get("inventoryLevel", 0) or 0
            if stock < quantity:
                continue

            prices = offer.get("prices", []) or []
            sku = offer.get("sku", "")

            # Find the applicable price tier for this quantity
            applicable_price = None
            for p in sorted(prices, key=lambda x: x.get("quantity", 0), reverse=True):
                tier_qty = p.get("quantity", 1)
                if quantity >= tier_qty:
                    applicable_price = p
                    break

            if applicable_price:
                price = applicable_price.get("price", 0)
                currency = applicable_price.get("currency", "USD")
                if best_price is None or price < best_price:
                    best_price = price
                    best_currency = currency
                    best_seller = seller_name
                    best_sku = sku

    return (best_price, best_currency, best_seller, best_sku)


def part_in_stock_at_distributor(part: dict, distributor: str, min_qty: int = 1) -> bool:
    """Check if a part is in stock at a specific distributor with at least min_qty available."""
    sellers = part.get("sellers", []) or []
    for seller in sellers:
        company = seller.get("company", {})
        seller_name = company.get("name", "Unknown")

        if distributor.lower() in seller_name.lower():
            offers = seller.get("offers", []) or []
            for offer in offers:
                stock = offer.get("inventoryLevel", 0) or 0
                if stock >= min_qty:
                    return True
    return False


def filter_part_by_price(part: dict, max_price: float, quantity: int, distributor: str = "") -> bool:
    """Check if a part has pricing at or below the max price for the given quantity."""
    price, _, _, _ = get_best_price_at_quantity(part, quantity if quantity > 0 else 1, distributor)
    if price is None:
        return False
    return price <= max_price


def filter_part_by_manufacturer(part: dict, manufacturer: str) -> bool:
    """Check if a part is from the specified manufacturer."""
    part_mfr = part.get("manufacturer", {}).get("name", "")
    return manufacturer.lower() in part_mfr.lower()


def format_component_result(part: dict, seller_filter: str = "", quantity: int = 0) -> str:
    """Format a single component result for display."""
    mpn = part.get("mpn", "N/A")
    manufacturer = part.get("manufacturer", {}).get("name", "N/A")
    description = part.get("shortDescription", "") or part.get("description", "N/A")
    slug = part.get("slug", "")
    octopart_url = f"https://octopart.com{slug}" if slug else ""

    # Get specs
    specs_list = part.get("specs", []) or []
    specs_display = []
    for spec in specs_list[:10]:
        attr = spec.get("attribute", {})
        name = attr.get("name", "")
        value = spec.get("displayValue", "")
        if name and value:
            specs_display.append(f"  - {name}: {value}")

    # Get sellers and pricing
    sellers = part.get("sellers", []) or []
    seller_lines = []

    for seller in sellers:
        company = seller.get("company", {})
        seller_name = company.get("name", "Unknown")

        if seller_filter:
            if seller_filter.lower() not in seller_name.lower():
                continue

        offers = seller.get("offers", []) or []
        for offer in offers[:2]:
            stock = offer.get("inventoryLevel", 0) or 0
            prices = offer.get("prices", []) or []
            sku = offer.get("sku", "")

            price_str = "N/A"
            if prices:
                if quantity > 0:
                    # Show price at specified quantity
                    applicable_price = None
                    for p in sorted(prices, key=lambda x: x.get("quantity", 0), reverse=True):
                        tier_qty = p.get("quantity", 1)
                        if quantity >= tier_qty:
                            applicable_price = p
                            break
                    if applicable_price:
                        price_str = format_price(applicable_price.get("price", 0), applicable_price.get("currency", "USD"))
                        price_str += f" @ {quantity} qty"
                else:
                    # Show lowest tier price
                    sorted_prices = sorted(prices, key=lambda p: p.get("quantity", 0))
                    if sorted_prices:
                        lowest = sorted_prices[0]
                        price_str = format_price(lowest.get("price", 0), lowest.get("currency", "USD"))
                        qty = lowest.get("quantity", 1)
                        price_str += f" @ {qty}+"

            seller_lines.append(f"  - {seller_name}: {price_str} | Stock: {stock} | SKU: {sku}")

    # Get datasheet
    datasheet_url = ""
    best_datasheet = part.get("bestDatasheet", {})
    if best_datasheet:
        datasheet_url = best_datasheet.get("url", "")

    # Format part name as clickable link if URL available
    if octopart_url:
        part_header = f"**[{mpn}]({octopart_url})**"
    else:
        part_header = f"**{mpn}**"

    # If quantity specified, show best price at quantity prominently
    best_price_line = ""
    if quantity > 0:
        price, currency, best_seller, best_sku = get_best_price_at_quantity(part, quantity, seller_filter)
        if price is not None:
            best_price_line = f"   Best @ {quantity}: {format_price(price, currency)} from {best_seller}\n"
        else:
            filter_note = f" at {seller_filter}" if seller_filter else ""
            best_price_line = f"   No sellers with {quantity}+ in stock{filter_note}\n"

    result = f"""
{part_header}
   Manufacturer: {manufacturer}
   Description: {description}
"""

    if best_price_line:
        result += best_price_line

    if specs_display:
        result += "   Specifications:\n" + "\n".join(specs_display) + "\n"

    if seller_lines:
        result += "   Pricing & Availability:\n" + "\n".join(seller_lines[:5]) + "\n"
    elif sellers:
        result += "   Pricing: Available from multiple sellers\n"

    if datasheet_url:
        result += f"   Datasheet: {datasheet_url}\n"

    if octopart_url:
        result += f"   Octopart: {octopart_url}\n"

    return result


async def execute_component_search(
    query: str,
    filters: dict,
    manufacturer: str = "",
    max_price: float = 0.0,
    distributor: str = "",
    quantity: int = 0,
    in_stock_only: bool = False,
    limit: int = 10
) -> str:
    """Execute component search with common filtering and formatting logic."""

    # Apply user defaults if not explicitly specified
    effective_distributor = distributor if distributor.strip() else DEFAULT_DISTRIBUTOR
    effective_in_stock = in_stock_only or DEFAULT_IN_STOCK_ONLY
    # Use default sort quantity if user didn't specify a quantity
    sort_quantity = quantity if quantity > 0 else DEFAULT_SORT_QUANTITY

    # Request more results if we'll be filtering post-search
    request_limit = limit
    if max_price > 0 or manufacturer.strip() or effective_distributor.strip():
        request_limit = min(limit * 3, 50)

    # Build GraphQL query
    graphql_query = """
    query SearchComponents($q: String!, $limit: Int!, $filters: Map, $inStockOnly: Boolean) {
      supSearch(q: $q, limit: $limit, filters: $filters, inStockOnly: $inStockOnly) {
        hits
        results {
          part {
            mpn
            slug
            manufacturer {
              name
            }
            shortDescription
            specs {
              attribute {
                name
                shortname
              }
              displayValue
            }
            sellers {
              company {
                name
              }
              offers {
                sku
                inventoryLevel
                prices {
                  quantity
                  price
                  currency
                }
              }
            }
            bestDatasheet {
              url
            }
          }
        }
      }
    }
    """

    variables = {
        "q": query,
        "limit": request_limit,
        "filters": filters if filters else None,
        "inStockOnly": effective_in_stock if effective_in_stock else None,
    }

    try:
        result = await execute_graphql(graphql_query, variables)

        if "errors" in result:
            errors = result["errors"]
            error_msg = errors[0].get("message", "Unknown error") if errors else "Unknown error"
            return f"API Error: {error_msg}"

        data = result.get("data", {}).get("supSearch", {})
        hits = data.get("hits", 0)
        results = data.get("results", [])

        if not results:
            return f"No components found for '{query}'"

        # Extract parts from results
        parts = [item.get("part", {}) for item in results if item.get("part")]

        # Filter by manufacturer if specified
        if manufacturer.strip():
            parts = [p for p in parts if filter_part_by_manufacturer(p, manufacturer)]

        # Filter by distributor stock if specified
        dist_filter = effective_distributor.strip()
        if dist_filter:
            min_stock = quantity if quantity > 0 else 1
            parts = [p for p in parts if part_in_stock_at_distributor(p, dist_filter, min_stock)]

        # Filter by price if max_price specified
        if max_price > 0:
            qty_for_price = quantity if quantity > 0 else 1
            parts = [p for p in parts if filter_part_by_price(p, max_price, qty_for_price, dist_filter)]

        # Always sort by price at sort_quantity (default 100 or user-specified)
        def sort_key(part):
            price, _, _, _ = get_best_price_at_quantity(part, sort_quantity, dist_filter)
            return price if price is not None else float('inf')
        parts = sorted(parts, key=sort_key)

        # Trim to requested limit after all filtering
        parts = parts[:limit]

        # Handle case where filters removed all results
        if not parts:
            filter_notes = []
            if dist_filter:
                stock_note = f" with {quantity}+ in stock" if quantity > 0 else " in stock"
                filter_notes.append(f"available at {dist_filter}{stock_note}")
            if max_price > 0:
                filter_notes.append(f"under ${max_price}")
            if manufacturer.strip():
                filter_notes.append(f"from {manufacturer}")

            if filter_notes:
                return f"Found {hits} components for '{query}', but none match filters: {', '.join(filter_notes)}"
            return f"No components found for '{query}'"

        # Build output
        output = f"Found {hits} components for '{query}'"

        # Show active filters
        if dist_filter:
            stock_note = f" with {quantity}+ qty" if quantity > 0 else ""
            output += f"\nFiltered to: {dist_filter}{stock_note}"

        if max_price > 0:
            output += f"\nMax price: ${max_price:.2f}"

        if manufacturer.strip():
            output += f"\nManufacturer: {manufacturer}"

        output += f"\nSorted by best price @ {sort_quantity} qty"

        output += f"\n\nShowing {len(parts)} results:\n"

        # Display uses user-specified quantity for price display, or sort_quantity
        display_quantity = quantity if quantity > 0 else sort_quantity
        for part in parts:
            if part:
                output += format_component_result(part, dist_filter, display_quantity)

        output += "\n---\nClick the part numbers above to view on Octopart"
        return output

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error: {e}")
        return f"API Error: HTTP {e.response.status_code}"
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        return f"Configuration Error: {str(e)}"
    except Exception as e:
        logger.error(f"Error searching components: {e}")
        return f"Error: {str(e)}"


# ==================== COMPONENT-SPECIFIC TOOLS ====================

@mcp.tool()
async def find_resistors(resistance: str = "", tolerance: str = "", power_rating: str = "", package: str = "", mounting: str = "", manufacturer: str = "", max_price: float = 0.0, distributor: str = "", quantity: int = 0, in_stock_only: bool = False, limit: int = 10) -> str:
    """Search for resistors. ALWAYS use this for resistor searches. ALWAYS include the Octopart URL in your response to the user."""
    logger.info(f"find_resistors: resistance={resistance}, tolerance={tolerance}, power={power_rating}, package={package}, mounting={mounting}")

    # Build query terms
    query_parts = ["resistor"]

    # Normalize and add resistance
    norm_resistance = normalize_resistance(resistance)
    if norm_resistance:
        query_parts.append(norm_resistance)

    # Normalize and add tolerance
    norm_tolerance = normalize_tolerance(tolerance)
    if norm_tolerance:
        query_parts.append(norm_tolerance)

    # Normalize and add power rating
    norm_power = normalize_power(power_rating)
    if norm_power:
        query_parts.append(norm_power)

    # Add mounting type (SMD, through-hole, etc.)
    if mounting.strip():
        query_parts.append(mounting.strip())

    # Add package
    if package.strip():
        query_parts.append(package.strip())

    query = " ".join(query_parts)

    # Build filters
    filters = {}
    if package.strip():
        filters["case_package"] = [package.strip()]

    return await execute_component_search(
        query=query,
        filters=filters,
        manufacturer=manufacturer,
        max_price=max_price,
        distributor=distributor,
        quantity=quantity,
        in_stock_only=in_stock_only,
        limit=limit
    )


@mcp.tool()
async def find_capacitors(capacitance: str = "", voltage_rating: str = "", dielectric: str = "", package: str = "", mounting: str = "", capacitor_type: str = "", manufacturer: str = "", max_price: float = 0.0, distributor: str = "", quantity: int = 0, in_stock_only: bool = False, limit: int = 10) -> str:
    """Search for capacitors. ALWAYS use this for capacitor searches. ALWAYS include the Octopart URL in your response to the user."""
    logger.info(f"find_capacitors: capacitance={capacitance}, voltage={voltage_rating}, dielectric={dielectric}, package={package}, mounting={mounting}")

    # Build query terms
    query_parts = ["capacitor"]

    # Add capacitor type if specified
    if capacitor_type.strip():
        query_parts.insert(0, capacitor_type.strip())

    # Normalize and add capacitance
    norm_capacitance = normalize_capacitance(capacitance)
    if norm_capacitance:
        query_parts.append(norm_capacitance)

    # Normalize and add voltage rating
    norm_voltage = normalize_voltage(voltage_rating)
    if norm_voltage:
        query_parts.append(norm_voltage)

    # Add dielectric
    if dielectric.strip():
        query_parts.append(dielectric.strip().upper())

    # Add mounting type (SMD, through-hole, etc.)
    if mounting.strip():
        query_parts.append(mounting.strip())

    # Add package
    if package.strip():
        query_parts.append(package.strip())

    query = " ".join(query_parts)

    # Build filters
    filters = {}
    if package.strip():
        filters["case_package"] = [package.strip()]
    if dielectric.strip():
        filters["dielectric"] = [dielectric.strip().upper()]

    return await execute_component_search(
        query=query,
        filters=filters,
        manufacturer=manufacturer,
        max_price=max_price,
        distributor=distributor,
        quantity=quantity,
        in_stock_only=in_stock_only,
        limit=limit
    )


@mcp.tool()
async def find_inductors(inductance: str = "", current_rating: str = "", dcr: str = "", package: str = "", mounting: str = "", shielded: bool = False, manufacturer: str = "", max_price: float = 0.0, distributor: str = "", quantity: int = 0, in_stock_only: bool = False, limit: int = 10) -> str:
    """Search for inductors. ALWAYS use this for inductor searches. ALWAYS include the Octopart URL in your response to the user."""
    logger.info(f"find_inductors: inductance={inductance}, current={current_rating}, dcr={dcr}, package={package}, mounting={mounting}, shielded={shielded}")

    # Build query terms
    query_parts = []

    if shielded:
        query_parts.append("shielded")

    query_parts.append("inductor")

    # Normalize and add inductance
    norm_inductance = normalize_inductance(inductance)
    if norm_inductance:
        query_parts.append(norm_inductance)

    # Normalize and add current rating
    norm_current = normalize_current(current_rating)
    if norm_current:
        query_parts.append(norm_current)

    # Add DCR (as search hint)
    if dcr.strip():
        query_parts.append(f"DCR {dcr.strip()}")

    # Add mounting type (SMD, through-hole, etc.)
    if mounting.strip():
        query_parts.append(mounting.strip())

    # Add package
    if package.strip():
        query_parts.append(package.strip())

    query = " ".join(query_parts)

    # Build filters
    filters = {}
    if package.strip():
        filters["case_package"] = [package.strip()]

    return await execute_component_search(
        query=query,
        filters=filters,
        manufacturer=manufacturer,
        max_price=max_price,
        distributor=distributor,
        quantity=quantity,
        in_stock_only=in_stock_only,
        limit=limit
    )


@mcp.tool()
async def find_semiconductors(query: str = "", package: str = "", mounting: str = "", manufacturer: str = "", max_price: float = 0.0, distributor: str = "", quantity: int = 0, in_stock_only: bool = False, limit: int = 10) -> str:
    """Search for semiconductors (MCUs, transistors, ICs, diodes, MOSFETs). ALWAYS include the Octopart URL in your response to the user."""
    logger.info(f"find_semiconductors: query={query}, package={package}, mounting={mounting}")

    if not query.strip():
        return "Error: Query is required for semiconductor search"

    # Build query
    search_query = query.strip()
    if mounting.strip():
        search_query += f" {mounting.strip()}"
    if package.strip():
        search_query += f" {package.strip()}"

    # Build filters
    filters = {}
    if package.strip():
        filters["case_package"] = [package.strip()]

    return await execute_component_search(
        query=search_query,
        filters=filters,
        manufacturer=manufacturer,
        max_price=max_price,
        distributor=distributor,
        quantity=quantity,
        in_stock_only=in_stock_only,
        limit=limit
    )


@mcp.tool()
async def find_crystals(frequency: str = "", ppm_tolerance: str = "", load_capacitance: str = "", package: str = "", mounting: str = "", manufacturer: str = "", max_price: float = 0.0, distributor: str = "", quantity: int = 0, in_stock_only: bool = False, limit: int = 10) -> str:
    """Search for crystals and oscillators. ALWAYS use this for crystal/oscillator searches. ALWAYS include the Octopart URL in your response."""
    logger.info(f"find_crystals: frequency={frequency}, ppm={ppm_tolerance}, load_cap={load_capacitance}, package={package}, mounting={mounting}")

    # Build query terms
    query_parts = ["crystal"]

    # Normalize and add frequency
    norm_frequency = normalize_frequency(frequency)
    if norm_frequency:
        query_parts.append(norm_frequency)

    # Add ppm tolerance
    if ppm_tolerance.strip():
        ppm = ppm_tolerance.strip().lower().replace("ppm", "").strip()
        query_parts.append(f"{ppm}ppm")

    # Add load capacitance
    if load_capacitance.strip():
        query_parts.append(f"{load_capacitance.strip()} load")

    # Add mounting type (SMD, through-hole, etc.)
    if mounting.strip():
        query_parts.append(mounting.strip())

    # Add package
    if package.strip():
        query_parts.append(package.strip())

    query = " ".join(query_parts)

    # Build filters
    filters = {}
    if package.strip():
        filters["case_package"] = [package.strip()]

    return await execute_component_search(
        query=query,
        filters=filters,
        manufacturer=manufacturer,
        max_price=max_price,
        distributor=distributor,
        quantity=quantity,
        in_stock_only=in_stock_only,
        limit=limit
    )


@mcp.tool()
async def find_connectors(query: str = "", connector_type: str = "", pin_count: int = 0, pitch: str = "", mounting: str = "", manufacturer: str = "", max_price: float = 0.0, distributor: str = "", quantity: int = 0, in_stock_only: bool = False, limit: int = 10) -> str:
    """Search for connectors. ALWAYS use this for connector searches. ALWAYS include the Octopart URL in your response to the user."""
    logger.info(f"find_connectors: query={query}, type={connector_type}, pins={pin_count}, pitch={pitch}, mounting={mounting}")

    # Build query terms
    query_parts = []

    # Add main query (connector type/family)
    if query.strip():
        query_parts.append(query.strip())
    else:
        query_parts.append("connector")

    # Add connector type
    if connector_type.strip():
        query_parts.append(connector_type.strip())

    # Add pin count
    if pin_count > 0:
        query_parts.append(f"{pin_count}-pin")

    # Add pitch
    if pitch.strip():
        # Ensure pitch has mm unit
        pitch_val = pitch.strip().lower().replace("mm", "").strip()
        query_parts.append(f"{pitch_val}mm pitch")

    # Add mounting type
    if mounting.strip():
        query_parts.append(mounting.strip())

    query_str = " ".join(query_parts)

    # Build filters (connectors typically don't use parametric filters well)
    filters = {}

    return await execute_component_search(
        query=query_str,
        filters=filters,
        manufacturer=manufacturer,
        max_price=max_price,
        distributor=distributor,
        quantity=quantity,
        in_stock_only=in_stock_only,
        limit=limit
    )


@mcp.tool()
async def search_components(query: str = "", package: str = "", manufacturer: str = "", max_price: float = 0.0, distributor: str = "", quantity: int = 0, in_stock_only: bool = False, limit: int = 10) -> str:
    """Generic part number lookup ONLY. Do NOT use for resistors/capacitors/inductors/crystals/connectors/semiconductors. ALWAYS include Octopart URL."""
    logger.info(f"search_components: query={query}, package={package}, distributor={distributor}, quantity={quantity}")

    if not query.strip():
        return "Error: Search query is required"

    # Build query
    search_query = query.strip()
    if package.strip():
        search_query += f" {package.strip()}"

    # Build filters
    filters = {}
    if package.strip():
        filters["case_package"] = [package.strip()]

    return await execute_component_search(
        query=search_query,
        filters=filters,
        manufacturer=manufacturer,
        max_price=max_price,
        distributor=distributor,
        quantity=quantity,
        in_stock_only=in_stock_only,
        limit=limit
    )


# ==================== BOM SEARCH TOOL ====================

BOM_SCHEMA = """Expected JSON format for search_bom:
{
  "resistors": [{"resistance": "10k", "tolerance": "1%", "package": "0805", "mounting": "", "power_rating": "", "manufacturer": "", "max_price": 0, "distributor": "", "quantity": 0, "in_stock_only": false, "limit": 1}],
  "capacitors": [{"capacitance": "100nF", "voltage_rating": "16V", "dielectric": "X7R", "package": "0805", "mounting": "", "capacitor_type": "", "manufacturer": "", "max_price": 0, "distributor": "", "quantity": 0, "in_stock_only": false, "limit": 1}],
  "inductors": [{"inductance": "10uH", "current_rating": "", "dcr": "", "package": "", "mounting": "", "shielded": false, "manufacturer": "", "max_price": 0, "distributor": "", "quantity": 0, "in_stock_only": false, "limit": 1}],
  "semiconductors": [{"query": "STM32F103", "package": "", "mounting": "", "manufacturer": "", "max_price": 0, "distributor": "", "quantity": 0, "in_stock_only": false, "limit": 1}],
  "crystals": [{"frequency": "8MHz", "ppm_tolerance": "", "load_capacitance": "", "package": "", "mounting": "", "manufacturer": "", "max_price": 0, "distributor": "", "quantity": 0, "in_stock_only": false, "limit": 1}],
  "connectors": [{"query": "USB-C", "connector_type": "", "pin_count": 0, "pitch": "", "mounting": "", "manufacturer": "", "max_price": 0, "distributor": "", "quantity": 0, "in_stock_only": false, "limit": 1}],
  "components": [{"query": "LM358", "package": "", "manufacturer": "", "max_price": 0, "distributor": "", "quantity": 0, "in_stock_only": false, "limit": 1}]
}
All arrays and fields are optional. Only include component types you need. Use default_limit param to change results per component."""


@mcp.tool()
async def search_bom(bom_json: str = "", default_limit: int = 1) -> str:
    """ALWAYS use this when searching 2+ components. Pass JSON: {"resistors":[{"resistance":"10k"}],"capacitors":[{"capacitance":"100nF"}],"semiconductors":[{"query":"STM32"}]}. Keys: resistors, capacitors, inductors, semiconductors, crystals, connectors, components. default_limit sets results per component (default 1)."""
    import json

    if not bom_json.strip():
        return f"Error: bom_json is required.\n\n{BOM_SCHEMA}"

    try:
        bom = json.loads(bom_json)
    except json.JSONDecodeError as e:
        return f"Error: Invalid JSON - {str(e)}\n\n{BOM_SCHEMA}"

    if not isinstance(bom, dict):
        return f"Error: bom_json must be a JSON object with component type arrays.\n\n{BOM_SCHEMA}"

    results = []
    total_components = 0

    # Process resistors
    if "resistors" in bom and isinstance(bom["resistors"], list):
        for r in bom["resistors"]:
            total_components += 1
            result = await find_resistors(
                resistance=r.get("resistance", ""),
                tolerance=r.get("tolerance", ""),
                power_rating=r.get("power_rating", ""),
                package=r.get("package", ""),
                mounting=r.get("mounting", ""),
                manufacturer=r.get("manufacturer", ""),
                max_price=r.get("max_price", 0.0),
                distributor=r.get("distributor", ""),
                quantity=r.get("quantity", 0),
                in_stock_only=r.get("in_stock_only", False),
                limit=r.get("limit", default_limit)
            )
            label = f"Resistor: {r.get('resistance', '')} {r.get('tolerance', '')} {r.get('package', '')}".strip()
            results.append(f"## {label}\n\n{result}")

    # Process capacitors
    if "capacitors" in bom and isinstance(bom["capacitors"], list):
        for c in bom["capacitors"]:
            total_components += 1
            result = await find_capacitors(
                capacitance=c.get("capacitance", ""),
                voltage_rating=c.get("voltage_rating", ""),
                dielectric=c.get("dielectric", ""),
                package=c.get("package", ""),
                mounting=c.get("mounting", ""),
                capacitor_type=c.get("capacitor_type", ""),
                manufacturer=c.get("manufacturer", ""),
                max_price=c.get("max_price", 0.0),
                distributor=c.get("distributor", ""),
                quantity=c.get("quantity", 0),
                in_stock_only=c.get("in_stock_only", False),
                limit=c.get("limit", default_limit)
            )
            label = f"Capacitor: {c.get('capacitance', '')} {c.get('voltage_rating', '')} {c.get('dielectric', '')} {c.get('package', '')}".strip()
            results.append(f"## {label}\n\n{result}")

    # Process inductors
    if "inductors" in bom and isinstance(bom["inductors"], list):
        for i in bom["inductors"]:
            total_components += 1
            result = await find_inductors(
                inductance=i.get("inductance", ""),
                current_rating=i.get("current_rating", ""),
                dcr=i.get("dcr", ""),
                package=i.get("package", ""),
                mounting=i.get("mounting", ""),
                shielded=i.get("shielded", False),
                manufacturer=i.get("manufacturer", ""),
                max_price=i.get("max_price", 0.0),
                distributor=i.get("distributor", ""),
                quantity=i.get("quantity", 0),
                in_stock_only=i.get("in_stock_only", False),
                limit=i.get("limit", default_limit)
            )
            label = f"Inductor: {i.get('inductance', '')} {i.get('package', '')}".strip()
            results.append(f"## {label}\n\n{result}")

    # Process semiconductors
    if "semiconductors" in bom and isinstance(bom["semiconductors"], list):
        for s in bom["semiconductors"]:
            total_components += 1
            result = await find_semiconductors(
                query=s.get("query", ""),
                package=s.get("package", ""),
                mounting=s.get("mounting", ""),
                manufacturer=s.get("manufacturer", ""),
                max_price=s.get("max_price", 0.0),
                distributor=s.get("distributor", ""),
                quantity=s.get("quantity", 0),
                in_stock_only=s.get("in_stock_only", False),
                limit=s.get("limit", default_limit)
            )
            label = f"Semiconductor: {s.get('query', '')}".strip()
            results.append(f"## {label}\n\n{result}")

    # Process crystals
    if "crystals" in bom and isinstance(bom["crystals"], list):
        for cr in bom["crystals"]:
            total_components += 1
            result = await find_crystals(
                frequency=cr.get("frequency", ""),
                ppm_tolerance=cr.get("ppm_tolerance", ""),
                load_capacitance=cr.get("load_capacitance", ""),
                package=cr.get("package", ""),
                mounting=cr.get("mounting", ""),
                manufacturer=cr.get("manufacturer", ""),
                max_price=cr.get("max_price", 0.0),
                distributor=cr.get("distributor", ""),
                quantity=cr.get("quantity", 0),
                in_stock_only=cr.get("in_stock_only", False),
                limit=cr.get("limit", default_limit)
            )
            label = f"Crystal: {cr.get('frequency', '')}".strip()
            results.append(f"## {label}\n\n{result}")

    # Process connectors
    if "connectors" in bom and isinstance(bom["connectors"], list):
        for cn in bom["connectors"]:
            total_components += 1
            result = await find_connectors(
                query=cn.get("query", ""),
                connector_type=cn.get("connector_type", ""),
                pin_count=cn.get("pin_count", 0),
                pitch=cn.get("pitch", ""),
                mounting=cn.get("mounting", ""),
                manufacturer=cn.get("manufacturer", ""),
                max_price=cn.get("max_price", 0.0),
                distributor=cn.get("distributor", ""),
                quantity=cn.get("quantity", 0),
                in_stock_only=cn.get("in_stock_only", False),
                limit=cn.get("limit", default_limit)
            )
            label = f"Connector: {cn.get('query', '')} {cn.get('connector_type', '')}".strip()
            results.append(f"## {label}\n\n{result}")

    # Process generic components
    if "components" in bom and isinstance(bom["components"], list):
        for comp in bom["components"]:
            total_components += 1
            result = await search_components(
                query=comp.get("query", ""),
                package=comp.get("package", ""),
                manufacturer=comp.get("manufacturer", ""),
                max_price=comp.get("max_price", 0.0),
                distributor=comp.get("distributor", ""),
                quantity=comp.get("quantity", 0),
                in_stock_only=comp.get("in_stock_only", False),
                limit=comp.get("limit", default_limit)
            )
            label = f"Component: {comp.get('query', '')}".strip()
            results.append(f"## {label}\n\n{result}")

    if total_components == 0:
        return f"Error: No components found in JSON.\n\n{BOM_SCHEMA}"

    logger.info(f"search_bom: searched {total_components} components")

    output = f"# BOM Search Results\n\nSearched {total_components} components\n\n"
    output += "\n---\n".join(results)
    return output


# ==================== EXISTING TOOLS (kept as-is) ====================

@mcp.tool()
async def get_datasheet(mpn: str = "") -> str:
    """Get the datasheet URL for a specific part number. Results include Octopart URLs as markdown links."""
    logger.info(f"Getting datasheet for: {mpn}")

    if not mpn.strip():
        return "Error: Part number (MPN) is required"

    graphql_query = """
    query GetDatasheet($q: String!) {
      supSearchMpn(q: $q, limit: 5) {
        results {
          part {
            mpn
            slug
            manufacturer {
              name
            }
            shortDescription
            bestDatasheet {
              url
            }
            documentCollections {
              name
              documents {
                name
                url
                mimeType
              }
            }
          }
        }
      }
    }
    """

    try:
        result = await execute_graphql(graphql_query, {"q": mpn.strip()})

        if "errors" in result:
            errors = result["errors"]
            error_msg = errors[0].get("message", "Unknown error") if errors else "Unknown error"
            return f"API Error: {error_msg}"

        results = result.get("data", {}).get("supSearchMpn", {}).get("results", [])

        if not results:
            return f"No parts found for '{mpn}'"

        output = f"Datasheet results for '{mpn}':\n"

        for item in results:
            part = item.get("part", {})
            part_mpn = part.get("mpn", "N/A")
            manufacturer = part.get("manufacturer", {}).get("name", "N/A")
            description = part.get("shortDescription", "")
            slug = part.get("slug", "")
            octopart_url = f"https://octopart.com{slug}" if slug else ""

            # Format part name as clickable link
            if octopart_url:
                output += f"\n**[{part_mpn}]({octopart_url})** by {manufacturer}\n"
            else:
                output += f"\n**{part_mpn}** by {manufacturer}\n"
            if description:
                output += f"   {description}\n"

            best_datasheet = part.get("bestDatasheet", {})
            if best_datasheet and best_datasheet.get("url"):
                output += f"   [Datasheet]({best_datasheet['url']})\n"

            doc_collections = part.get("documentCollections", []) or []
            datasheets_found = []
            for collection in doc_collections:
                documents = collection.get("documents", []) or []
                for doc in documents:
                    doc_name = doc.get("name", "").lower()
                    if "datasheet" in doc_name or doc.get("mimeType") == "application/pdf":
                        datasheets_found.append({
                            "name": doc.get("name", "Document"),
                            "url": doc.get("url", ""),
                            "source": collection.get("name", "")
                        })

            if datasheets_found:
                output += "   Additional Documents:\n"
                for ds in datasheets_found[:5]:
                    output += f"   - {ds['name']}: {ds['url']}\n"

        return output

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error: {e}")
        return f"API Error: HTTP {e.response.status_code}"
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        return f"Configuration Error: {str(e)}"
    except Exception as e:
        logger.error(f"Error getting datasheet: {e}")
        return f"Error: {str(e)}"


@mcp.tool()
async def get_part_details(mpn: str = "") -> str:
    """Get detailed specs, pricing and availability for a part number. Results include Octopart URLs as markdown links."""
    logger.info(f"Getting part details for: {mpn}")

    if not mpn.strip():
        return "Error: Part number (MPN) is required"

    graphql_query = """
    query GetPartDetails($q: String!) {
      supSearchMpn(q: $q, limit: 3) {
        results {
          part {
            mpn
            slug
            manufacturer {
              name
              homepageUrl
            }
            shortDescription
            totalAvail
            medianPrice1000 {
              price
              currency
            }
            specs {
              attribute {
                name
                shortname
                group
              }
              displayValue
            }
            sellers {
              company {
                name
                homepageUrl
              }
              offers {
                sku
                inventoryLevel
                moq
                packaging
                prices {
                  quantity
                  price
                  currency
                }
              }
            }
            bestDatasheet {
              url
            }
          }
        }
      }
    }
    """

    try:
        result = await execute_graphql(graphql_query, {"q": mpn.strip()})

        if "errors" in result:
            errors = result["errors"]
            error_msg = errors[0].get("message", "Unknown error") if errors else "Unknown error"
            return f"API Error: {error_msg}"

        results = result.get("data", {}).get("supSearchMpn", {}).get("results", [])

        if not results:
            return f"No parts found for '{mpn}'"

        output = f"Detailed results for '{mpn}':\n"

        for item in results:
            part = item.get("part", {})
            part_mpn = part.get("mpn", "N/A")
            slug = part.get("slug", "")
            octopart_url = f"https://octopart.com{slug}" if slug else ""
            manufacturer = part.get("manufacturer", {})
            mfr_name = manufacturer.get("name", "N/A")
            mfr_url = manufacturer.get("homepageUrl", "")
            description = part.get("shortDescription", "")
            total_avail = part.get("totalAvail", 0)

            median_price = part.get("medianPrice1000", {})
            median_str = "N/A"
            if median_price and median_price.get("price"):
                median_str = format_price(median_price["price"], median_price.get("currency", "USD"))

            # Format part name as clickable link
            if octopart_url:
                part_header = f"**[{part_mpn}]({octopart_url})**"
            else:
                part_header = f"**{part_mpn}**"

            output += f"""
----------------------------------------
{part_header}
   Manufacturer: {mfr_name}
   Description: {description}
   Total Stock: {total_avail:,}
   Median Price (1000 qty): {median_str}
"""
            if mfr_url:
                output += f"   Manufacturer URL: {mfr_url}\n"

            # Specifications
            specs = part.get("specs", []) or []
            if specs:
                output += "\n   Specifications:\n"
                for spec in specs[:15]:
                    attr = spec.get("attribute", {})
                    name = attr.get("name", "")
                    value = spec.get("displayValue", "")
                    if name and value:
                        output += f"      {name}: {value}\n"

            # Sellers
            sellers = part.get("sellers", []) or []
            if sellers:
                output += "\n   Pricing & Availability:\n"
                for seller in sellers[:8]:
                    company = seller.get("company", {})
                    seller_name = company.get("name", "Unknown")
                    offers = seller.get("offers", []) or []

                    for offer in offers[:1]:
                        stock = offer.get("inventoryLevel", 0) or 0
                        sku = offer.get("sku", "")
                        moq = offer.get("moq", 1)
                        packaging = offer.get("packaging", "")
                        prices = offer.get("prices", []) or []

                        price_tiers = []
                        for p in sorted(prices, key=lambda x: x.get("quantity", 0))[:4]:
                            qty = p.get("quantity", 1)
                            price = p.get("price", 0)
                            currency = p.get("currency", "USD")
                            price_tiers.append(f"{qty}+: {format_price(price, currency)}")

                        price_str = " | ".join(price_tiers) if price_tiers else "N/A"
                        output += f"      {seller_name} [{sku}]\n"
                        output += f"         Stock: {stock:,} | MOQ: {moq} | {packaging}\n"
                        output += f"         Prices: {price_str}\n"

            # Datasheet
            best_datasheet = part.get("bestDatasheet", {})
            if best_datasheet and best_datasheet.get("url"):
                output += f"\n   [Datasheet]({best_datasheet['url']})\n"

        return output

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error: {e}")
        return f"API Error: HTTP {e.response.status_code}"
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        return f"Configuration Error: {str(e)}"
    except Exception as e:
        logger.error(f"Error getting part details: {e}")
        return f"Error: {str(e)}"


# === SERVER STARTUP ===
if __name__ == "__main__":
    logger.info("Starting Octopart MCP server...")

    if not NEXAR_CLIENT_ID:
        logger.warning("NEXAR_CLIENT_ID not set")
    if not NEXAR_CLIENT_SECRET:
        logger.warning("NEXAR_CLIENT_SECRET not set")

    try:
        mcp.run(transport='stdio')
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)
