# n8n Dievio B2B Lead Collector Template (Google Sheets + API)

A production-ready **n8n workflow template** to collect **B2B leads** from the **Dievio API** and automatically append results to **Google Sheets**.

> **Sidebar Link (Dievio):** [Dievio API Docs](https://docs.dievio.com/api-reference/overview)

## Why this template

If you need an n8n workflow for lead generation, this template gives you a fast setup for:

- B2B contact discovery via Dievio filters
- verified email-focused lead pulls
- direct Google Sheets output for sales ops, outreach, and CRM prep
- webhook-based automation (works with forms, bots, internal tools)

## What this workflow does

1. Receives a POST request in n8n Webhook
2. Validates input parameters (result limits, filters, sheet target)
3. Calls Dievio `POST /api/public/search` via HTTP Request node
4. Normalizes lead fields for tabular export
5. Appends rows to Google Sheets
6. Returns a structured JSON response with run summary

## Template files

- `workflow/dievio-b2b-lead-collector-template.json` - importable n8n workflow export with **API key placeholder**

## Required credentials and setup

### 1) Dievio API key

In node **Run Dievio Search**, set header:

- `X-API-Key: PASTE_DIEVIO_API_KEY_HERE`

Replace placeholder with your real key.

### 2) Google Sheets credentials in n8n

Use Google Sheets OAuth2 credential in n8n and connect it to the Google Sheets node.

### 3) Spreadsheet and tab

The workflow appends rows into your selected document/tab.

## Input payload example

```json
{
  "spreadsheetId": "YOUR_GOOGLE_SHEET_ID",
  "sheetName": "Leads",
  "maxResults": 50,
  "perPage": 50,
  "includeEmails": true,
  "emailStatus": "verified",
  "filters": {
    "job_titles": ["Founder"],
    "person_location_country": ["United States"],
    "business_model": ["b2b"]
  }
}
```

## Test request (cURL)

```bash
curl -X POST 'https://YOUR_N8N_DOMAIN/webhook/dievio-b2b-leads' \
  -H 'Content-Type: application/json' \
  -d '{
    "spreadsheetId":"YOUR_GOOGLE_SHEET_ID",
    "sheetName":"Leads",
    "maxResults":50,
    "perPage":50,
    "includeEmails":true,
    "emailStatus":"verified",
    "filters":{
      "job_titles":["Founder"],
      "person_location_country":["United States"],
      "business_model":["b2b"]
    }
  }'
```

## Main lead fields written to Google Sheets

- `first_name`, `last_name`, `full_name`
- `job_title`, `company`
- `city`, `state`, `country`
- `work_email`, `personal_emails`, `email_status`
- `mobile_phone`, `phone_status`
- `linkedin_url`, `linkedin_status`
- `request_id`, `collected_at`

## SEO keywords covered naturally

This workflow is relevant for users searching terms like:

- n8n lead generation workflow
- Dievio API n8n integration
- n8n Google Sheets lead scraper
- B2B contact enrichment automation
- webhook to Google Sheets leads pipeline

## Import into n8n

1. Open n8n
2. Click **Import from file**
3. Select `workflow/dievio-b2b-lead-collector-template.json`
4. Configure credentials
5. Activate workflow

## Dievio references

- [API Overview](https://docs.dievio.com/api-reference/overview)
- [Authentication](https://docs.dievio.com/api-reference/authentication)
- [Lead Search](https://docs.dievio.com/api-reference/search)
- [Filters](https://docs.dievio.com/api-reference/filters)
- [Pagination](https://docs.dievio.com/api-reference/pagination)

## License

MIT
