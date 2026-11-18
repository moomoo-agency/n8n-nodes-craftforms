# n8n-nodes-craftforms

n8n nodes for [CraftForms](https://craftformswp.com), the WordPress form, booking and order plugin: start workflows when a form is submitted or an order or booking changes, and read or create submissions, orders, bookings and catalog items from any workflow.

[Installation](#installation) · [Credentials](#credentials) · [Nodes](#nodes) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter `n8n-nodes-craftforms`. See n8n's [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credentials

You need **CraftForms PRO 2.4 or later** on your WordPress site.

1. In WordPress, open **CraftForms → Settings → API Keys** and click **Create key**.
2. Name it (for example "n8n") and tick the scopes your workflows need: reading forms, submissions, orders, catalog and people, and writing submissions, orders or catalog. You can also limit the key to some forms.
3. Copy the key (it starts with `cfk_`). It is shown once.
4. In n8n, create a **CraftForms API** credential with your site's address (`https://example.com`) and the key.

## Nodes

### CraftForms Trigger

Starts the workflow when:

| Event | When |
|---|---|
| Submission Created | A form is submitted |
| Order Created | An order or booking is made, also one added by hand |
| Order Status Changed | An order or booking is confirmed, paid, cancelled or refunded (`change` holds from, to and who changed it) |

Activating the workflow subscribes it on your site; deactivating removes the subscription. Every delivery is signed by your site and checked by the node, so nobody else can start your workflow. Your n8n must be reachable at a public **https** address. A key limited to some forms only hears about those forms.

### CraftForms

| Resource | Operations |
|---|---|
| Submission | Create (submits the form as a visitor would: validation, actions and emails run), Get, Get Many |
| Order | Get, Get Many (filters: bookings by arrival or stay dates, status, form, item, person), Update Status (pending, confirmed, paid, cancelled) |
| Catalog Item | Get, Get Many, Get Availability (free dates and times), Update (price, base price, stock) |
| Form | Get (with its fields, and the options of choice fields), Get Many |
| Person | Get, Get Many (search, email) |

**Create a submission:** pick the form, then add the answers by field name (Form → Get lists the names and, for choice fields, the values). For a list of values (checkboxes), use **Options → Fields (JSON)**. Set an **Idempotency Key** when a workflow may run twice for the same thing: the same key within 24 hours returns the first submission instead of creating another.

When the site refuses something, the node shows the site's own reason (for example `Field "email" is required.`).

The node can also be used as a tool by n8n's AI Agent.

## Compatibility

- n8n 1.x (tested with the n8n that `n8n-node dev` installs, November 2026).
- CraftForms PRO 2.4 or later, on a site whose REST API is reachable at `/wp-json/`.

## Resources

- [CraftForms Data API](https://kb.craftformswp.com/documentation/for-developers/data-api)
- [n8n community nodes](https://docs.n8n.io/integrations/#community-nodes)

## Development

```bash
npm install
npm run dev     # n8n at http://localhost:5678 with these nodes loaded
npm run lint
npm run build
```
