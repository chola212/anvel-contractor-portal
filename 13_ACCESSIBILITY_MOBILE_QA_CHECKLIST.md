# ANVEL Contractor Portal - Accessibility and Mobile QA Checklist

Use this checklist after meaningful UI changes and before production handover updates. Test with controlled development or smoke-test accounts only; do not use real contractor data for layout checks.

## Automated Checks

Run these from the project root:

```bash
npm run test:a11y-mobile
npm run lint
npm run build
```

The static QA script checks for:

- visible page headings;
- labelled forms;
- active navigation state for screen readers;
- responsive layout classes;
- horizontal scrolling wrappers for wide operational tables;
- PDF-free visual assumptions such as no negative letter spacing.

## Manual Viewports

Check these widths in browser developer tools:

- 390 px mobile;
- 768 px tablet;
- 1280 px desktop.

For each viewport, confirm:

- no text overlaps another element;
- navigation is usable and the active page is clear;
- buttons remain visible and readable;
- tables scroll horizontally instead of breaking the page;
- forms keep labels next to the correct input;
- long contractor, project, document, invoice, and export values do not hide key actions.

## Role Coverage

Check these pages as an admin:

- Dashboard;
- Contractors;
- Projects;
- Documents;
- Timesheets;
- Invoices;
- Payments;
- Exports;
- Settings.

Check these pages as a contractor:

- Dashboard;
- My Profile;
- Documents;
- Timesheets;
- Invoices;
- Payments.

Confirm the contractor cannot open admin-only routes such as `/exports`.

## Keyboard And Screen Reader Basics

Confirm:

- Tab moves through links, forms, and buttons in a useful order;
- the visible focus position is clear;
- every page has one clear main heading;
- form fields have visible labels;
- compact status controls have labels, including screen-reader-only labels when needed;
- the current navigation item is announced as the current page.

## Recording Findings

For each issue, record:

- page path;
- user role;
- viewport width;
- expected result;
- actual result;
- whether the issue blocks production use.
