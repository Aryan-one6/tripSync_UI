# Screen Inventory

Routes below come from the existing web application and are the recommended Flutter feature inventory.

## Public and authentication

- Home/discovery landing (`/`), discover search/filter (`/discover`), agency directory (`/agencies`) and agency profile (`/agencies/:slug`).
- Public traveler/social profile (`/travelers/:username`, `/profile/:username`), public plan (`/plans/:id`) and package (`/packages/:id`) detail.
- Login (`/login`), role choice (`/signup`), traveler signup (`/signup/traveler`), agency signup (`/signup/agency`).
- Static fees, privacy, terms screens.

## Traveler shell

- Dashboard overview, social feed, discover, messages/direct inbox.
- Trips list, plan list/detail/create/edit wizard, group chat, group checkout, and group reviews.
- Wallet, invoices/invoice detail, refer-and-earn, profile, settings/Aadhaar verification, storefront/public-profile launchpad.

## Agency shell

- Agency overview/dashboard, analytics, settings and storefront.
- Packages list/create/edit; open referrals and bids/offers.
- Group chat and direct inbox; invoices/invoice detail.

## Key reusable Flutter flows

- Plan/package detail: gallery, itinerary day stepper, inclusions/exclusions, pricing tiers, cancellation rules, reviews, members, primary CTA, and a mobile bottom action bar.
- Plan wizard and package editor: URL-based image gallery input until a generic media API exists; client-side mirrors Zod constraints but server remains authoritative.
- Checkout: payment breakdown preview, points/wallet/promo controls, Razorpay checkout, verification, pending/captured state, and retry-safe idempotent UI.
- Messaging: paginated reverse list, polling cards, offer cards/counter sheet, typing indicator, socket connection status, and REST catch-up on reconnect.
- Notifications: unread list/badge, deep-link `href`, mark-one/mark-all, plus profile viewer list.

## Recommended navigation

Use `go_router` with public routes plus authenticated role gates. A bottom navigation bar suits traveler Home/Discover/Trips/Inbox/Profile; agency Home/Packages/Bids/Inbox/Settings. Keep checkout, editors, chat, invoice detail, and public profiles as pushed routes. Deep links must resolve public slugs/handles and notification `href` paths.
