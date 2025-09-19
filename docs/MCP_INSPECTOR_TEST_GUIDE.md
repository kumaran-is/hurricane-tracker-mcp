# MCP Inspector Testing Guide for Hurricane Tracker

This guide provides comprehensive test cases for all 5 Hurricane Tracker MCP tools using MCP Inspector.

## Setup MCP Inspector

### Connection Configuration
- **Transport Type**: HTTP
- **URL**: `http://localhost:8080/mcp`
- **Protocol Version**: 2025-06-18

### Prerequisites
1. Ensure Docker container is running:
   ```bash
   docker-compose up --build -d
   ```

2. Verify health endpoint:
   ```bash
   curl http://localhost:8080/health
   ```

3. Start the MCP inpsector:
   ```bash
   npx @modelcontextprotocol/inspector 
   ```
   It will start the MCP inspector and opens the http://localhost:6274/ on the browser

## Tool Testing Guide

### 1. get_active_storms

**Purpose**: Retrieve currently active tropical cyclones worldwide with optional basin filtering.

#### Success Test Cases

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Get all active storms | `{}` | Returns all active storms with count and details |
| Filter Atlantic (uppercase) | `{"basin": "AL"}` | Returns storms in Atlantic basin only |
| Filter Atlantic (lowercase) | `{"basin": "al"}` | Case-insensitive, same as uppercase |
| Filter Eastern Pacific | `{"basin": "EP"}` | Returns Eastern Pacific storms |
| Filter Western Pacific | `{"basin": "WP"}` | Returns Western Pacific storms |
| Filter North Indian | `{"basin": "NI"}` | Returns North Indian Ocean storms |

**Example Success Response**:
```json
{
  "success": true,
  "count": 1,
  "results": [
    {
      "id": "al072025",
      "name": "Gabrielle",
      "basin": "al",
      "advisoryTime": "2025-09-19T09:00:00.000Z",
      "lat": 21.9,
      "lon": 54.8,
      "windKts": 0,
      "pressureMb": 1013,
      "status": "Tropical Depression",
      "nhcLinks": {}
    }
  ],
  "message": "Found 1 result"
}
```

**Empty Result Response**:
```json
{
  "success": true,
  "count": 0,
  "results": [],
  "message": "No active tropical cyclones found. The Atlantic and Pacific hurricane seasons typically run from June through November."
}
```

#### Failure Test Cases

| Test Case | Input | Expected Error |
|-----------|-------|----------------|
| Invalid basin code | `{"basin": "XXX"}` | Validation error: Basin code must be 2 letters |
| Basin too short | `{"basin": "A"}` | Validation error: Basin code must be 2 letters |
| Basin too long | `{"basin": "ATLANTIC"}` | Validation error: Basin code must be 2 letters |
| Invalid basin type | `{"basin": 123}` | Type error: Expected string |

**Example Error Response**:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid arguments for tool get_active_storms: Basin code must be 2 letters (e.g., AL, EP, WP)"
  }
}
```

---

### 2. get_storm_cone

**Purpose**: Retrieve the cone of uncertainty (forecast path) for a specific storm.

#### Success Test Cases

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid storm (if exists) | `{"stormId": "AL012024"}` | Returns cone data with forecast points |
| Lowercase storm ID | `{"stormId": "al012024"}` | Case-insensitive, returns same data |
| Mixed case storm ID | `{"stormId": "Al012024"}` | Case-insensitive, returns same data |

**Example Success Response** (when storm has cone data):
```json
{
  "success": true,
  "stormId": "AL012024",
  "name": "Alberto",
  "cone": {
    "center": {...},
    "forecast": [...],
    "uncertainty": {...}
  }
}
```

#### Failure Test Cases

| Test Case | Input | Expected Error |
|-----------|-------|----------------|
| Missing storm ID | `{}` | Validation error: Required field |
| Non-existent storm | `{"stormId": "AL999999"}` | NOT_FOUND: Storm cone not found |
| Invalid format (too short) | `{"stormId": "AL01"}` | Validation error: Invalid storm ID format |
| Invalid format (no numbers) | `{"stormId": "INVALID"}` | Validation error: Invalid storm ID format |
| Numeric storm ID | `{"stormId": "12345678"}` | Validation error: Invalid storm ID format |
| Wrong type | `{"stormId": 12345}` | Type error: Expected string |

**Example Error Response**:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Storm cone not found: AL999999",
    "hint": "Check the identifier format or use get_active_storms to find valid storm IDs"
  }
}
```

---

### 3. get_storm_track

**Purpose**: Retrieve the historical track (past positions) of a specific storm.

#### Success Test Cases

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid storm (if exists) | `{"stormId": "AL012024"}` | Returns track points with timestamps |
| Lowercase storm ID | `{"stormId": "al012024"}` | Case-insensitive, returns same data |
| Mixed case | `{"stormId": "aL012024"}` | Case-insensitive, returns same data |

**Example Success Response** (when storm has track data):
```json
{
  "success": true,
  "stormId": "AL012024",
  "name": "Alberto",
  "track": [
    {
      "timestamp": "2024-06-19T12:00:00Z",
      "lat": 22.5,
      "lon": -94.8,
      "windKts": 35,
      "pressureMb": 995,
      "status": "Tropical Storm"
    }
  ],
  "message": "Found 15 track points"
}
```

#### Failure Test Cases

| Test Case | Input | Expected Error |
|-----------|-------|----------------|
| Missing storm ID | `{}` | Validation error: Required field |
| Non-existent storm | `{"stormId": "EP999999"}` | NOT_FOUND: Storm track not found |
| Invalid format | `{"stormId": "STORM123"}` | Validation error: Invalid storm ID format |
| Too many digits | `{"stormId": "AL0120245"}` | Validation error: Invalid storm ID format |
| Special characters | `{"stormId": "AL-01-2024"}` | Validation error: Invalid storm ID format |

**Example Error Response**:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Storm track not found: EP999999",
    "hint": "Check the identifier format or use get_active_storms to find valid storm IDs"
  }
}
```

---

### 4. get_local_hurricane_alerts

**Purpose**: Retrieve hurricane-related weather alerts for a specific location.

#### Success Test Cases

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Miami, FL | `{"lat": 25.7617, "lon": -80.1918}` | Returns any active alerts or empty with message |
| New Orleans, LA | `{"lat": 29.9511, "lon": -90.0715}` | Hurricane-prone area alerts |
| Houston, TX | `{"lat": 29.7604, "lon": -95.3698}` | Gulf coast alerts |
| New York, NY | `{"lat": 40.7128, "lon": -74.0060}` | Northeast coast alerts |
| San Juan, PR | `{"lat": 18.4655, "lon": -66.1057}` | Caribbean alerts |

**Example Success Response** (with alerts):
```json
{
  "success": true,
  "count": 2,
  "results": [
    {
      "id": "NWS-ALERT-12345",
      "type": "Hurricane Watch",
      "severity": "Moderate",
      "headline": "Hurricane Watch in Effect",
      "description": "...",
      "effective": "2024-09-19T12:00:00Z",
      "expires": "2024-09-20T12:00:00Z"
    }
  ],
  "message": "Found 2 hurricane-related alerts"
}
```

**Empty Alerts Response**:
```json
{
  "success": true,
  "count": 0,
  "results": [],
  "message": "No hurricane-related alerts are currently active for this location. Continue to monitor weather conditions."
}
```

#### Failure Test Cases

| Test Case | Input | Expected Error |
|-----------|-------|----------------|
| Missing coordinates | `{}` | Validation error: lat and lon are required |
| Missing latitude | `{"lon": -80.0}` | Validation error: lat is required |
| Missing longitude | `{"lat": 25.0}` | Validation error: lon is required |
| Invalid latitude (too high) | `{"lat": 200, "lon": -80}` | Validation error: Latitude must be between -90 and 90 |
| Invalid latitude (too low) | `{"lat": -100, "lon": -80}` | Validation error: Latitude must be between -90 and 90 |
| Invalid longitude (too high) | `{"lat": 25, "lon": 200}` | Validation error: Longitude must be between -180 and 180 |
| Invalid longitude (too low) | `{"lat": 25, "lon": -200}` | Validation error: Longitude must be between -180 and 180 |
| Wrong type for lat | `{"lat": "25", "lon": -80}` | Type error: Expected number |
| Wrong type for lon | `{"lat": 25, "lon": "-80"}` | Type error: Expected number |

**Example Validation Error**:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid arguments: Latitude must be between -90 and 90"
  }
}
```

---

### 5. search_historical_tracks

**Purpose**: Search historical hurricane tracks within a geographic area and time range.

#### Success Test Cases

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Gulf of Mexico 2024 | See below | Returns storms that passed through area |
| Caribbean 2023 | See below | Returns Caribbean storms from 2023 |
| Atlantic 2024 season | See below | Returns Atlantic basin storms |
| Small area search | See below | May return empty with helpful message |

**Gulf of Mexico 2024 Input**:
```json
{
  "aoi": {
    "type": "Polygon",
    "coordinates": [[
      [-100, 20], [-80, 20], [-80, 30], [-100, 30], [-100, 20]
    ]]
  },
  "start": "2024-06-01",
  "end": "2024-11-30",
  "basin": "AL"
}
```

**Caribbean 2023 Input**:
```json
{
  "aoi": {
    "type": "Polygon",
    "coordinates": [[
      [-85, 10], [-60, 10], [-60, 25], [-85, 25], [-85, 10]
    ]]
  },
  "start": "2023-01-01",
  "end": "2023-12-31"
}
```

**Atlantic Hurricane Alley Input**:
```json
{
  "aoi": {
    "type": "Polygon",
    "coordinates": [[
      [-80, 10], [-20, 10], [-20, 35], [-80, 35], [-80, 10]
    ]]
  },
  "start": "2024-08-01",
  "end": "2024-10-31",
  "basin": "AL",
  "minWindKts": 64
}
```

**Small Area (Miami vicinity)**:
```json
{
  "aoi": {
    "type": "Polygon",
    "coordinates": [[
      [-81, 25], [-80, 25], [-80, 26], [-81, 26], [-81, 25]
    ]]
  },
  "start": "2024-01-01",
  "end": "2024-12-31"
}
```

**Example Success Response**:
```json
{
  "success": true,
  "count": 5,
  "results": [
    {
      "stormId": "2024147N19089",
      "name": "BERYL",
      "year": 2024,
      "basin": "AL",
      "maxWindKts": 145,
      "minPressureMb": 934,
      "trackSummary": {
        "startDate": "2024-06-28",
        "endDate": "2024-07-09",
        "trackPoints": 47
      }
    }
  ],
  "message": "Found 5 results"
}
```

#### Failure Test Cases

| Test Case | Input | Expected Error |
|-----------|-------|----------------|
| Missing AOI | `{"start": "2024-01-01", "end": "2024-12-31"}` | Validation error: aoi is required |
| Missing dates | `{"aoi": {...}}` | Validation error: start and end are required |
| Invalid date format | Use "2024/01/01" instead of "2024-01-01" | Validation error: Invalid date format |
| Invalid polygon type | Use "LineString" instead of "Polygon" | Validation error: Must be Polygon |
| Invalid coordinates | Less than 4 points in polygon | Validation error: Invalid polygon |
| End before start | `{"start": "2024-12-31", "end": "2024-01-01"}` | Validation error: End date must be after start |
| Invalid basin | `{"basin": "INVALID"}` | Validation error: Invalid basin code |
| Invalid wind threshold | `{"minWindKts": -10}` | Validation error: Wind speed must be positive |

**Invalid Date Format Input**:
```json
{
  "aoi": {
    "type": "Polygon",
    "coordinates": [[[-100, 20], [-80, 20], [-80, 30], [-100, 30], [-100, 20]]]
  },
  "start": "2024/06/01",
  "end": "2024/11/30"
}
```

**Invalid Geometry Type Input**:
```json
{
  "aoi": {
    "type": "LineString",
    "coordinates": [[-100, 20], [-80, 20]]
  },
  "start": "2024-01-01",
  "end": "2024-12-31"
}
```

## Testing Tips

### Performance Considerations
- `search_historical_tracks` may take 10-15 seconds for large area/date ranges
- This is normal behavior when querying extensive historical data
- Consider using smaller areas or date ranges for faster responses

### Basin Codes Reference
- **AL**: Atlantic
- **EP**: Eastern Pacific
- **WP**: Western Pacific
- **CP**: Central Pacific
- **NI**: North Indian Ocean
- **SI**: South Indian Ocean
- **SP**: South Pacific
- **SA**: South Atlantic

### Storm ID Format
- Format: `BBNNYYYY` where:
  - `BB`: Basin code (2 letters)
  - `NN`: Storm number (2 digits)
  - `YYYY`: Year (4 digits)
- Examples: `AL012024`, `EP052023`, `WP152024`

### Coordinate Validation
- Latitude: -90 to 90 (negative = South)
- Longitude: -180 to 180 (negative = West)
- US East Coast: Negative longitude
- US Gulf Coast: ~25-30°N, ~-80 to -97°W

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure Docker container is running: `docker ps`
   - Check port 8080 is accessible: `curl http://localhost:8080/health`

2. **Session Errors**
   - MCP Inspector handles sessions automatically
   - If issues persist, refresh the connection

3. **Empty Results**
   - Check date ranges (hurricane season: June-November)
   - Verify basin codes are correct
   - Consider that no storms may be active

4. **Validation Errors**
   - Ensure all required fields are provided
   - Check data types (numbers vs strings)
   - Verify coordinate ranges
   - Use correct date format (YYYY-MM-DD)

## Automated Testing

For automated testing, use the provided test script:

```bash
# Run comprehensive test suite
node test-mcp-comprehensive.cjs

# Test specific functionality
node test-basin-filter.cjs
```

These scripts test all tools programmatically and validate:
- Response format consistency
- LLM-friendly messages
- Error handling
- Case-insensitive inputs
- Edge cases

## Summary

All 5 tools should:
1. Return structured JSON responses
2. Provide helpful messages for empty results
3. Include actionable error hints
4. Support case-insensitive input where applicable
5. Follow consistent response patterns for LLM consumption