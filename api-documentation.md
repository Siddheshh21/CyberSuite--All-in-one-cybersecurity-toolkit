# CyberSuite API Documentation

## Overview
CyberSuite is a comprehensive cybersecurity toolkit providing multiple API endpoints for security analysis, vulnerability scanning, and threat intelligence.

## Base URL
- Local: `http://localhost:8080`
- Production: `https://cybersuite-all-in-one-cybersecurity-toolkit-production.up.railway.app`

## API Endpoints

### 1. Password Analysis (`/api/password`)

#### POST /api/password/analyze
**Description**: Analyzes password strength and checks for breaches

**Request Body**:
```json
{
  "password": "string (required)",
  "username": "string (optional)"
}
```

**Response**:
```json
{
  "ok": true,
  "password": "string",
  "entropy_bits": 45.32,
  "score": 3,
  "guesses": 12345678,
  "crack_time_display": "2 days",
  "crack_time_seconds": 172800,
  "feedback": {
    "warning": "string",
    "suggestions": ["string"]
  },
  "sequence": [
    {
      "pattern": "dictionary",
      "token": "string",
      "i": 0,
      "j": 4,
      "guesses": 12345,
      "guesses_log10": 4.09,
      "dictionary_name": "english",
      "rank": 123,
      "display": "pattern=\"dictionary\" • token=\"string\" • 12,345 guesses"
    }
  ],
  "breach_check": {
    "breached": false,
    "count": 0,
    "error": null
  },
  "mutations": [
    "Str0ngP@ssw0rd!",
    "STRONGPASSWORD123",
    "strongpassword!"
  ]
}
```

**Error Responses**:
- `400`: `{ "error": "password required" }`

---

#### GET /api/password/test
**Description**: Simple health check for password endpoint

**Response**:
```json
{
  "message": "Test route works"
}
```

### 2. Website Security Scan (`/api/website`)

#### POST /api/website/scan
**Description**: Comprehensive website security analysis including headers, SSL, and reputation

**Request Body**:
```json
{
  "url": "string (required)"
}
```

**Response** (Success):
```json
{
  "ok": true,
  "scan_info": {
    "original_url": "https://example.com",
    "final_url": "https://example.com",
    "protocol_used": "https",
    "status_code": 200
  },
  "https_status": {
    "secure": true,
    "protocol": "HTTPS",
    "note": "Secure communication enabled"
  },
  "ssl": {
    "valid": true,
    "validFrom": "2023-01-01",
    "validTo": "2024-01-01",
    "daysRemaining": 180,
    "protocol_version": "TLS 1.3",
    "issuer_name": "Let's Encrypt",
    "wildcard_cert": false
  },
  "reputation": {
    "status": "safe",
    "matches": []
  },
  "headers": {
    "https": {
      "status": "present",
      "severity": "Informational",
      "value": "HTTPS",
      "note": "Secure communication enabled"
    },
    "hsts": {
      "status": "present",
      "severity": "Informational",
      "value": "max-age=31536000",
      "note": "HSTS header forces HTTPS connections"
    },
    "csp": {
      "status": "not_detected",
      "severity": "Medium",
      "value": null,
      "note": "Add CSP to prevent XSS attacks"
    },
    "server": {
      "status": "exposed",
      "severity": "Informational",
      "value": "cloudflare",
      "note": "Server software version exposed - consider hiding"
    }
  },
  "context": {
    "cdn_managed": true
  },
  "risk_assessment": {
    "level": "Low",
    "confidence": "High",
    "critical_issues": 0,
    "advisory_issues": 1
  },
  "limitations": [
    "CDN-based sites may rotate headers by region",
    "Bot protection may alter response headers"
  ]
}
```

**Response** (Unreachable Host):
```json
{
  "ok": false,
  "error": "UNREACHABLE_HOST",
  "message": "Domain could not be resolved or is unreachable",
  "context": {
    "original_url": "https://invalid.example",
    "dns_error": "ENOTFOUND"
  }
}
```

**Error Responses**:
- `400`: `{ "error": "URL required" }`
- `400`: `{ "error": "Invalid URL", "details": "string" }`
- `502`: `{ "error": "fetch_failed", "message": "string" }`

### 3. CVE Search (`/api/cve`)

#### GET /api/cve/search
**Description**: Search for Common Vulnerabilities and Exposures

**Query Parameters**:
- `q` (required): Search query (e.g., "apache")
- `limit` (optional): Number of results (1-100, default: 10)
- `min_cvss` (optional): Minimum CVSS score filter
- `since_year` (optional): Filter by year
- `version` (optional): Software version for targeted search

**Response** (Success with results):
```json
{
  "ok": true,
  "query": "apache",
  "count": 5,
  "items": [
    {
      "id": "CVE-2021-44228",
      "summary": "Apache Log4j2 JNDI features do not protect against attacker controlled LDAP and other JNDI related endpoints.",
      "cvss": 10.0,
      "severity": "Critical",
      "published": "2021-12-10",
      "nvd_url": "https://nvd.nist.gov/vuln/detail/CVE-2021-44228",
      "references": [
        "https://logging.apache.org/log4j/2.x/security.html"
      ]
    }
  ]
}
```

**Response** (Skipped - No Version):
```json
{
  "ok": true,
  "query": "apache",
  "count": 0,
  "items": [],
  "message": "CVE scan skipped because detected software is managed infrastructure or version was not provided."
}
```

**Response** (Skipped - Managed Infrastructure):
```json
{
  "ok": true,
  "query": "cloudflare",
  "count": 0,
  "items": [],
  "message": "CVE scan skipped because detected software is managed infrastructure or version was not provided."
}
```

**Error Responses**:
- `400`: `{ "error": "missing_query" }`

### 4. Network Port Scan (`/api/network`)

#### GET /api/network/scan
**Description**: Scan common network ports on a target host

**Query Parameters**:
- `target` (required): Hostname or IP address
- `ports` (optional): Comma-separated port list (e.g., "80,443,8080")
- `timeout` (optional): Connection timeout in ms (200-5000, default: 800)

**Response** (Success):
```json
{
  "ok": true,
  "target": "example.com",
  "address": "93.184.216.34",
  "family": 4,
  "scanned_ports": 13,
  "timeout_ms": 800,
  "retries": 2,
  "duration_ms": 1240,
  "results": [
    {
      "port": 80,
      "status": "open",
      "banner": "HTTP/1.1 200 OK"
    },
    {
      "port": 443,
      "status": "open",
      "banner": "HTTP/1.1 200 OK"
    },
    {
      "port": 22,
      "status": "closed"
    }
  ]
}
```

**Error Responses**:
- `400`: `{ "error": "target_required", "details": "target query param required" }`
- `400`: `{ "error": "invalid_host", "details": "Unable to resolve hostname" }`
- `400`: `{ "error": "blocked_target", "details": "Private/loopback/link-local targets are not allowed" }`

### 5. Vulnerability Scanner Lite (`/api/vuln`)

#### POST /api/vuln/lite
**Description**: Combined vulnerability scan (website + network + CVE + threat intel)

**Request Body**:
```json
{
  "url": "string (required)",
  "software": "string (optional - e.g., \"apache 2.4.49\")"
}
```

**Response** (Success):
```json
{
  "ok": true,
  "url": "https://example.com",
  "host": "example.com",
  "site": {
    "quick": {
      "status_code": 200,
      "final_url": "https://example.com"
    },
    "ssl": {
      "valid": true,
      "daysRemaining": 180
    },
    "reputation": {
      "status": "safe",
      "matches": []
    },
    "headers": {
      "server": "cloudflare",
      "https": true,
      "hsts": true,
      "csp": false
    },
    "risk_assessment": {
      "level": "Low",
      "confidence": "High"
    }
  },
  "network": {
    "target": "example.com",
    "address": "93.184.216.34",
    "results": [
      {
        "port": 80,
        "status": "open"
      },
      {
        "port": 443,
        "status": "open"
      }
    ]
  },
  "cves": {
    "ok": true,
    "query": "apache",
    "count": 2,
    "items": [
      {
        "id": "CVE-2021-44228",
        "severity": "Critical"
      }
    ],
    "message": "CVE scan skipped because detected software is managed infrastructure or version was not provided."
  },
  "findings": [
    {
      "category": "website",
      "title": "CSP: not_detected",
      "severity": "Medium",
      "detail": "Add CSP to prevent XSS attacks",
      "evidence": {
        "header": "csp"
      }
    },
    {
      "category": "network",
      "title": "SSH (Port 22) is open",
      "severity": "High",
      "detail": "Port 22 (SSH) is reachable and open on host example.com.",
      "evidence": {
        "port": 22,
        "service": "SSH"
      }
    },
    {
      "category": "threat-intel",
      "title": "Domain associated with 3 threat reports (OTX)",
      "severity": "Medium",
      "detail": "AlienVault OTX shows 3 pulses referencing this domain.",
      "evidence": {
        "pulses": []
      }
    }
  ],
  "errors": []
}
```

**Response** (Unreachable Host):
```json
{
  "ok": false,
  "error": "UNREACHABLE_HOST",
  "message": "Domain could not be resolved or is unreachable",
  "context": {
    "original_url": "https://invalid.example",
    "dns_error": "ENOTFOUND"
  }
}
```

**Error Responses**:
- `400`: `{ "error": "provide url or software" }`

### 6. Report Generation (`/api/report`)

#### POST /api/report/generate
**Description**: Generate PDF vulnerability report

**Request Body**:
```json
{
  "url": "https://example.com",
  "site": { /* website scan data */ },
  "cves": { /* CVE data */ },
  "findings": [ /* findings array */ ]
}
```

**Response**: Binary PDF file (Content-Type: application/pdf)

**Error Responses**:
- `400`: `{ "ok": false, "error": "Report data required" }`

### 7. Email Breach Check (`/api/email`)

#### POST /api/email/check
**Description**: Check if email address has been involved in data breaches

**Request Body**:
```json
{
  "email": "string (required)"
}
```

**Response**:
```json
{
  "ok": true,
  "email": "user@example.com",
  "breached": true,
  "breach_count": 3,
  "summary": {
    "high": 1,
    "medium": 1,
    "low": 1,
    "total": 3,
    "latest_breach": "2023-01-15"
  },
  "breaches": [
    {
      "name": "LinkedIn",
      "title": "LinkedIn (2012)",
      "domain": "linkedin.com",
      "breach_date": "2012-06-05",
      "added_date": "2016-05-21",
      "modified_date": "2016-05-21",
      "data_classes": ["email addresses", "passwords"],
      "description": "2012 LinkedIn breach where hashed passwords of millions of users were exposed.",
      "verified": true,
      "severity": "High"
    }
  ]
}
```

**Error Responses**:
- `400`: Missing email parameter

---

## Common Response Patterns

### Success Response Structure
```json
{
  "ok": true,
  "data": { /* endpoint-specific data */ }
}
```

### Error Response Structure
```json
{
  "ok": false,
  "error": "error_code",
  "message": "Human readable message",
  "details": "Additional details (optional)",
  "context": { /* additional context (optional) */ }
}
```

### Rate Limiting
- Network scan endpoint: 100 requests per 15-minute window
- Other endpoints: No explicit rate limiting (implement as needed)

### Security Considerations
- Private IP ranges are blocked (127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16, etc.)
- Managed infrastructure is filtered from CVE searches
- SSL certificate validation is optional (accepts self-signed certs for scanning)
- CORS is configured for multiple frontend origins

### Performance Notes
- Website scan timeout: 30 seconds
- Network scan timeout: Configurable (200-5000ms, default 800ms)
- CVE search timeout: 20 seconds
- In-memory caching for CVE results (5-minute TTL)
- In-memory caching for email breach checks (6-hour TTL)