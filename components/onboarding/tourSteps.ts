// components/onboarding/tourSteps.ts
//
// v7.6 — the guided tour script. Each step highlights one element (by data-tour
// selector) and, if it lives on another page, routes there first. Steps whose
// selector can't be found simply render as a centred card (graceful fallback), so
// the tour never breaks even before every anchor is wired.

export interface TourStep {
  id: string
  title: string
  body: string
  /** CSS selector for the element to spotlight. Omit for a centred, page-agnostic step. */
  selector?: string
  /** If set, the tour routes here before showing this step. */
  route?: string
  /** Preferred tooltip placement relative to the target. */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to your portal 👋',
    body: "Let's take two minutes to set up the essentials: rehab types, stages, exercise videos, your branding, email, and your first client. You can skip anytime and restart later from Settings.",
  },
  {
    id: 'nav-rehab',
    title: '1. Rehab Types',
    body: 'Everything starts here. A rehab type is a programme template (e.g. “Knee Surgery”). Let’s open it.',
    selector: '[data-tour="nav-rehab"]',
    placement: 'right',
  },
  {
    id: 'rehab-add',
    title: 'Add a rehab type',
    body: 'Type a name and hit Add. New types now appear instantly. Create one or two to represent the programmes your clinic runs.',
    selector: '[data-tour="rehab-add"]',
    route: '/admin/rehab-types',
    placement: 'bottom',
  },
  {
    id: 'stage-add',
    title: '2. Add stages',
    body: 'Expand a rehab type and use the + to add stages (e.g. “Phase 1: Mobility”). Stages hold the milestones and videos clients work through.',
    selector: '[data-tour="stage-add"]',
    route: '/admin/rehab-types',
    placement: 'left',
  },
  {
    id: 'nav-upload',
    title: '3. Add exercise videos',
    body: 'Upload your instructional videos and attach each one to a rehab type or a specific stage. Let’s open the uploader.',
    selector: '[data-tour="nav-upload"]',
    placement: 'right',
  },
  {
    id: 'video-upload',
    title: 'Upload a workout video',
    body: 'Drop in a video, give it a title, set sets/reps/hold if relevant, and attach it to the right stage. Repeat for each exercise.',
    selector: '[data-tour="video-upload"]',
    route: '/admin/videos/upload',
    placement: 'bottom',
  },
  {
    id: 'nav-branding',
    title: '4. Complete your branding',
    body: 'Make the portal yours — logo, colours, name and footer. Head to Settings.',
    selector: '[data-tour="nav-settings"]',
    placement: 'right',
  },
  {
    id: 'branding-form',
    title: 'Branding',
    body: 'Upload your logo, set your brand colour, portal name and footer details. This is what your clients see.',
    selector: '[data-tour="branding-form"]',
    route: '/admin/settings/branding',
    placement: 'bottom',
  },
  {
    id: 'smtp-form',
    title: '5. Set up email (SMTP)',
    body: 'Add your own SMTP server so invites, reset emails and PDFs send from your clinic’s address. Enter host, port, credentials and sender identity.',
    selector: '[data-tour="smtp-form"]',
    route: '/admin/settings/email',
    placement: 'bottom',
  },
  {
    id: 'nav-clients',
    title: '6. Invite your first client',
    body: 'Last step — add a client so they can log in and start their programme. Let’s open Clients.',
    selector: '[data-tour="nav-clients"]',
    placement: 'right',
  },
  {
    id: 'client-invite',
    title: 'Add / invite a client',
    body: 'Create a client account (they’ll receive an email invite once SMTP is set). Then assign them a rehab type and you’re live!',
    selector: '[data-tour="client-invite"]',
    route: '/admin/clients',
    placement: 'bottom',
  },
  {
    id: 'done',
    title: 'You’re all set 🎉',
    body: 'That’s the core loop: types → stages → videos → branding → email → clients. You can restart this tour anytime from Settings → “Restart tutorial”.',
  },
]
