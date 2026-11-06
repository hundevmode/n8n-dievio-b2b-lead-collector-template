import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const workflow = JSON.parse(readFileSync(new URL('../workflow/dievio-b2b-lead-collector-template.json', import.meta.url)))
const node = name => workflow.nodes.find(item => item.name === name)

function execute(name, input, previous = {}, configured = true) {
    let source = node(name).parameters.jsCode
    if (configured) {
        source = source.replace("const spreadsheetId = 'REPLACE_WITH_SPREADSHEET_ID';", "const spreadsheetId = 'test-sheet';")
    }
    const result = runInNewContext(`(function () { ${source}\n })()`, {
        $json: input,
        $execution: { id: 'test' },
        $: nodeName => ({ first: () => ({ json: previous[nodeName] }) }),
    })
    return JSON.parse(JSON.stringify(result[0]?.json ?? result))
}

test('webhook auth and the fixed Dievio endpoint are configured without embedded credentials', () => {
    const http = node('Run Dievio Search').parameters
    assert.equal(workflow.active, false)
    assert.match(workflow.versionId, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i)
    assert.equal(node('Webhook In').parameters.authentication, 'headerAuth')
    assert.equal(http.url, 'https://dievio.com/api/public/search')
    assert.equal(http.authentication, 'genericCredentialType')
    assert.equal(http.genericAuthType, 'httpHeaderAuth')
    assert.equal(http.options.redirect.redirect.followRedirects, false)
    assert.ok(workflow.nodes.every(item => !item.credentials))
})

test('webhook input cannot override the destination, provider URL or paid request limits', () => {
    for (const body of [{ endpoint: 'https://other.example.invalid' }, { spreadsheetId: 'other' }, { includeRaw: true }, { maxResults: 101 }]) {
        assert.equal(execute('Prepare Request', { body }).ok, false)
    }
    assert.equal(execute('Prepare Request', { body: {} }, {}, false).ok, false)
    const input = execute('Prepare Request', { body: { filters: { job_titles: ['Founder'], _page: 999, max_results: 2000, _include_raw: true, include_raw: true, include_phones: true } } })
    assert.deepEqual(execute('Fetch Dievio Leads', input).dievioBody, {
        job_titles: ['Founder'], _page: 1, max_results: 1, _include_raw: false, include_raw: false,
        include_phones: false, _per_page: 1, include_emails: true, email_status: 'all',
    })
})

test('work email mode is opt-in and reaches the API with email output enabled', () => {
    for (const status of ['all', 'verified', 'likely', 'work']) {
        const prepared = execute('Prepare Request', { body: { emailStatus: status } })
        assert.equal(prepared.ok, true)
        const { dievioBody } = execute('Fetch Dievio Leads', prepared)
        assert.equal(dievioBody.email_status, status)
        assert.equal(dievioBody.include_emails, true)
    }
    assert.equal(execute('Prepare Request', { body: { emailStatus: 'work', includeEmails: false } }).ok, false)
    assert.equal(execute('Prepare Request', { body: { emailStatus: 'unsupported' } }).ok, false)
    const legacy = execute('Prepare Request', { body: { emailStatus: 'verified', includeEmails: false } })
    assert.equal(execute('Fetch Dievio Leads', legacy).dievioBody.include_emails, false)
})

test('the n8n v2 IF filters route rejected requests and empty results to their response nodes', () => {
    const validation = node('Is Request Valid?')
    const matches = node('Has Leads?')
    for (const item of [validation, matches]) {
        assert.equal(item.typeVersion, 2)
        assert.equal(item.parameters.conditions.options.version, 1)
        assert.equal(item.parameters.conditions.conditions.length, 1)
    }
    const [validRule] = validation.parameters.conditions.conditions
    assert.equal(validRule.leftValue, '={{ $json.ok }}')
    assert.deepEqual(validRule.operator, { type: 'boolean', operation: 'true', singleValue: true })
    assert.equal(workflow.connections[validation.name].main[1][0].node, 'Respond Validation Error')
    const [countRule] = matches.parameters.conditions.conditions
    assert.equal(countRule.leftValue, '={{ $json.leadsCount }}')
    assert.equal(countRule.rightValue, 0)
    assert.deepEqual(countRule.operator, { type: 'number', operation: 'gt' })
    assert.equal(workflow.connections[matches.name].main[1][0].node, 'Build Empty Response')
})

test('response mapping reports a write, no match or API failure correctly', () => {
    const request = execute('Fetch Dievio Leads', execute('Prepare Request', { body: {} }))
    const previous = { 'Fetch Dievio Leads': request }
    const row = { first_name: '=1+1', work_email: 'example@example.invalid', personal_emails: ['excluded@example.invalid'] }
    const parsed = execute('Normalize Dievio Leads', { success: true, preview_data: [row], has_more: true }, previous)
    const cells = execute('Expand Lead Items', parsed)
    const sheets = node('Append Rows To Google Sheets').parameters
    assert.equal(sheets.options.cellFormat, 'RAW')
    assert.equal(cells.first_name, '=1+1')
    assert.deepEqual(sheets.columns.schema.map(field => field.id), Object.keys(cells))
    assert.ok(!('personal_emails' in cells) && !('googleSheets' in cells))
    assert.equal(execute('Build Success Response', {}, { 'Normalize Dievio Leads': parsed }).writtenRows, 1)
    const empty = execute('Normalize Dievio Leads', { success: true, preview_data: [], has_more: false }, previous)
    assert.equal(execute('Build Empty Response', empty).writtenRows, 0)
    assert.throws(() => execute('Normalize Dievio Leads', { success: false }, previous), /did not return/)
})
