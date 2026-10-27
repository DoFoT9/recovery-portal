// components/onboarding/clientTourSteps.ts
//
// v7.8 — the client-side welcome tour. Deliberately short and reassuring: a new
// client should feel oriented in under a minute. Steps with a `selector` spotlight
// a real element (graceful centred fallback if it isn't found); the rest are calm
// centred cards. Keep copy warm and plain-English.

export interface ClientTourStep {
  id: string
  title: string
  body: string
  selector?: string
  route?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export const CLIENT_TOUR_STEPS: ClientTourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome 👋',
    body: "This is your recovery portal. In about a minute we'll show you where everything is — your programme, your videos, and how to reach your clinician. You can skip anytime.",
  },
  {
    id: 'programme',
    title: 'Your programme',
    body: 'Your assigned programmes appear here. Each one is broken into phases you work through at your own pace.',
    selector: '[data-tour="client-programme"]',
    placement: 'bottom',
  },
  {
    id: 'videos',
    title: 'Watch & tick off',
    body: 'Open a programme to see your exercise videos. Watch each one, then mark it complete so your clinician can see your progress.',
    selector: '[data-tour="client-videos"]',
    placement: 'bottom',
  },
  {
    id: 'milestones',
    title: 'Track your progress',
    body: 'As you complete videos and phases, your progress bar fills up. Little wins add up — keep going!',
    selector: '[data-tour="client-progress"]',
    placement: 'bottom',
  },
  {
    id: 'messages',
    title: 'Talk to your clinician',
    body: "Got a question about an exercise? Leave a comment on it. When your clinician replies, you'll see a red alert here so you never miss it.",
    selector: '[data-tour="client-messages"]',
    placement: 'bottom',
  },
  {
    id: 'done',
    title: "You're ready 🎉",
    body: "That's it! Work through your programme at your own pace, tick things off, and message your clinician anytime. You can replay this tour from your account menu.",
  },
]
