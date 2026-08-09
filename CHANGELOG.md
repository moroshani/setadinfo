# Changelog

All notable public changes to SetadInfo are recorded here. The project has not
yet published a tagged source release.

## Unreleased

### Added

- Safe browser-only public lab deployed through GitHub Pages with synthetic data,
  in-memory mutations, hash routing, and coverage for every main route.
- Automated public-demo verification that rejects API requests, browser errors,
  layout overflow, and broken search interaction at desktop and mobile widths.
- CI, CodeQL, grouped Dependabot policy, private vulnerability reporting, and
  public contributor/security documentation.
- Sanitized product screenshots and documented full-stack demo seeding.

### Changed

- Centralized official Setad board mapping for purchase, tender, and auction.
- Hardened responsive workbench layouts, search filters, Persian date display,
  and mobile result presentation.
- Updated vulnerable backend and frontend dependencies and modernized GitHub
  Actions.

### Security

- Removed cleartext demo-password logging.
- Kept production credentials, Rubika identifiers, customer data, and private
  operational files outside the public repository and demo bundle.
