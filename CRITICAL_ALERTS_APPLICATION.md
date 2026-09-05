# Application for Apple Critical Alerts Entitlement
**Entitlement Key**: `com.apple.developer.usernotifications.critical-alerts`  
**Application Name**: Personal Safety Agent  
**Bundle Identifier**: `com.personalsafety.agent`  
**Developer**: Kiril Romanchuk  
**Category**: Public Safety / Personal Protection  

---

## 1. Executive Summary & Purpose

Personal Safety Agent is a specialized personal safety application designed to notify individual users about immediate, time-sensitive physical danger (such as incoming aerial strikes, loitering munitions, and missile threats) based on verified public safety information correlated with the user's current geographic location.

In wartime environments, timely notification is a matter of physical survival. Personal Safety Agent is engineered specifically to wake sleeping users or alert drivers who have their devices silenced or placed in iOS Focus / Do Not Disturb modes when an aerial threat is detected within immediate tactical proximity.

---

## 2. Why Notifications Are Time-Critical

- **Kinetic Flight Times**: High-speed aerial threats (ballistic missiles, cruise missiles, and low-flying loitering munitions/Shahed drones) often provide only **2 to 5 minutes** of tactical warning from trajectory detection to impact.
- **Urgent Action Window**: The user requires every available second to take cover in a hardened shelter, move away from external windows, or pull over safely while operating a motor vehicle.
- **Severe Consequence of Delay**: A delay of 60 seconds due to an unnoticed standard notification can be fatal.

---

## 3. Why Standard Notifications Are Insufficient

- **Muted Devices & Do Not Disturb**: Users routinely activate Sleep Focus, Driving Focus, or hardware silent switches. Standard iOS notifications produce no sound or vibration during these modes, resulting in missed life-critical warnings.
- **Ambient Vehicle Noise**: While driving at highway speeds, standard notification chimes are drowned out by engine and road acoustics. Critical Alerts allow playback at an appropriate volume level to pierce ambient noise.
- **Interruption Guarantee**: Ordinary APNs delivery can be queued or silenced by iOS power-saving heuristics, whereas Critical Alerts guarantee immediate audible delivery.

---

## 4. Conditions That Generate a Critical Alert

Personal Safety Agent strictly limits Critical Alerts to verifiable, high-severity physical threats. An alert is triggered ONLY when ALL of the following criteria are met:

1. **Verified Threat Ingestion**: The threat is confirmed by official national warning systems (e.g., State Emergency Service, Air Force Command) or verified high-authority tactical monitoring feeds.
2. **Tactical Proximity**: The user's monitored GPS location is calculated to be within **≤ 15.0 km** of the threat's confirmed coordinate or moving trajectory.
3. **Imminent Vector**: The threat is active and moving in the direction of the user's immediate vicinity.
4. **Dynamic Re-Evaluation**: If a user is traveling and moves significantly closer (≥ 3 km closer) to an active threat, an updated proximity alert is dispatched.

*Note: General informational news, regional sirens outside the user's municipality, and post-strike damage reports NEVER trigger a Critical Alert.*

---

## 5. False Alert Minimization Protocol

To eliminate alert fatigue and ensure the utmost reliability:
- **Spatial Geometry Filters**: We do not broadcast blanket sirens. Alerts are filtered using geodesic Haversine distance and regional polygonal boundaries.
- **De-duplication & Cooldown**: Repeated mentions of the same tracked target within a 15-minute window are suppressed unless distance decreases significantly into the immediate critical zone (< 5 km).
- **Multi-Source Cross-Correlation**: Ingestion confidence weights prevent unverified rumors from reaching the alert dispatcher.
- **Failsafe Test Mode**: All test and simulation alerts are clearly tagged with `[TEST]` in title and payload, ensuring zero confusion with real-world alarms.

---

## 6. User Control & Privacy

- **Explicit User Consent**: Users must explicitly activate protection and authorize notification permissions via standard iOS system dialogs.
- **Transparent Diagnostics**: The application interface displays real-time status: `CRITICAL ALERTS ENABLED` vs `STANDARD ALERTS`, GPS age, and monitoring health.
- **Privacy Assurance**: Location coordinates are transmitted securely over TLS exclusively to the user's dedicated monitoring session and are never sold, shared, or retained indefinitely.
