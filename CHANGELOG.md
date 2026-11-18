# Changelog

## 0.1.0 (unreleased)

- CraftForms Trigger: Submission Created, Order Created, Order Status Changed; subscribes on activation, removes on deactivation, checks every delivery's signature (and refuses deliveries older than 5 minutes); answers the site's ping without starting the workflow.
- CraftForms node: submissions (create with idempotency key, get, get many), orders (get, get many with booking date filters, update status), catalog items (get, get many, availability, update price and stock), forms (get with fields and choice options, get many), people (get, get many). Usable as an AI Agent tool. Errors show the site's own message.
- CraftForms API credential: site address and API key, tested against `/me`.
