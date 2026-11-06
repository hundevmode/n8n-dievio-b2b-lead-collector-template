# Dievio lead search to Google Sheets with n8n

Import the [Dievio lead collector workflow](workflow/dievio-b2b-lead-collector-template.json) to retrieve one page of B2B contacts with Dievio and append the results to a fixed Google Sheets tab. The workflow starts inactive and requires separate credentials for the incoming webhook and the Dievio API.

## Set up the workflow

1. Use **Import from File** in n8n and select the workflow JSON.
2. In **Webhook In**, create a Header Auth credential. Set the name to `X-Webhook-Secret` and choose a private value for the client that calls the webhook.
3. In **Run Dievio Search**, select a different Header Auth credential. Set the name to `X-API-Key` and use your [Dievio API key](https://dievio.com/dashboard/api). The node sends requests to `https://dievio.com/api/public/search`.
4. In **Prepare Request**, set the spreadsheet ID and tab name. In **Append Rows To Google Sheets**, connect a Google Sheets credential with edit access to that sheet.
5. Put these headers in the first row of the target tab.

```text
request_id,collected_at,first_name,last_name,full_name,job_title,company,city,state,country,work_email,email_status,mobile_phone,phone_status,linkedin_url,linkedin_status,twitter_status,facebook_status
```

## Run a one-row test

Select **Listen for test event** on **Webhook In**. Send a request to the test URL from your n8n instance using the webhook credential.

```bash
curl --request POST "$N8N_TEST_WEBHOOK_URL" \
  --header "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" \
  --header 'Content-Type: application/json' \
  --data '{
    "maxResults": 1,
    "includeEmails": true,
    "emailStatus": "work",
    "filters": {
      "company_websites": ["stripe.com"],
      "job_titles": ["Founder"]
    }
  }'
```

When the search finds a match, check that a row was added and that the JSON response shows `writtenRows: 1`. A search with no matches returns `writtenRows: 0` and skips Google Sheets. Try a different company or title if you need to test a write. Once the test works, activate the workflow and switch your client to the production URL.

Each run requests one page, with a default of one result and a maximum of 100. The response includes `hasMore` from Dievio. The workflow uses the API credit balance and appends the returned work contact fields. Phone retrieval is opt-in through `includePhones`. The webhook response contains counts rather than contact rows.

Use `emailStatus: "work"` with `includeEmails: true` to require a stored address in `work_email`. The default is `all`. The `verified` filter can include profiles with a personal email only. Check deliverability separately if your workflow requires it. [Search API filters](https://docs.dievio.com/api-reference/filters)

If the Sheet write fails after a successful Dievio search, check the n8n execution before retrying. The API search may already have consumed credits.

Each webhook call starts a separate search. If you build a custom workflow, you can retry the same Search API page within one hour using a stable `Idempotency-Key` from the first attempt. Handle repeat writes to Google Sheets separately. [Search API retry rules](https://docs.dievio.com/api-reference/search#retry-a-page-safely)

- [Dievio API overview](https://dievio.com/api)
- [Dievio setup guide](https://dievio.com/integrations/n8n)
- [Import and export workflows in n8n](https://docs.n8n.io/workflows/export-import/)
- [n8n Webhook authentication](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)

## License

MIT
