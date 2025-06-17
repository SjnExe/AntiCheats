# Packet Anomaly Detection Research (via Scripting API Inference)

This document summarizes research into detecting packet anomalies by inferring them from server-side observations through the scripting API. Direct packet inspection is not assumed to be available.

## I. Common Packet Anomalies & Script-Level Manifestations

Many cheats involve manipulating network packets sent to the server. While scripts cannot inspect these packets directly, the *effects* of such manipulations can sometimes be observed.

1.  **Movement Packet Manipulation:**
    *   **Fly Hacks:** Player airborne without cause. (Covered by `flyCheck.js`)
    *   **Speed Hacks:** Player moves faster than legitimate speed. (Covered by `speedCheck.js`)
    *   **Teleport/Blink (Short-Range):** Abrupt, large position changes without legitimate cause (pearl, command, chorus fruit). Observable via `player.location` polling. Potentially detectable but sensitive to lag.
    *   **NoFall:** Player takes no damage from significant falls. (Covered by `noFallCheck.js`)
    *   **Phase/Noclip:** Player position inside solid blocks. Observable via `player.location` and `dimension.getBlock()`. Server may self-correct.
    *   **Jesus/WaterWalk:** Player walks on liquids. Observable via `player.location`, `player.isOnGround`, block checks.
    *   **Spider/WallClimb:** Player ascends vertical surfaces without aid. Observable via movement analysis.

2.  **Combat Packet Manipulation:**
    *   **Killaura/Aimbot (some aspects):**
        *   Rapid target switching: (Covered by `multiTargetCheck.js`)
        *   Excessive Reach: (Covered by `reachCheck.js`)
        *   High CPS: (Covered by `cpsCheck.js`)
    *   **Force Criticals:** Player's attacks are always critical, regardless of actual movement (e.g., not jumping/falling). Potentially detectable if API can confirm a hit was critical and player's vertical motion was inconsistent with vanilla crit conditions.
    *   **AntiKnockback:** Player receives no or greatly reduced knockback from attacks. Very hard to reliably detect due to many legitimate factors affecting knockback.
    *   **FastBow/RapidFire:** Firing arrows faster than bow mechanics allow. Potentially detectable by timing bow use/projectile spawn events.

3.  **Inventory/Item Packet Manipulation:**
    *   **Insta-Eat/FastUse:** Consuming items faster than normal. (Covered by `fastUseCheck.js`)
    *   **Item Duplication/Spawning:** Very difficult to detect generally; relies on specific exploit knowledge. Inventory scanning for illegal items is a partial mitigation.

4.  **World Interaction Packet Manipulation:**
    *   **FastBreak/InstaBreak/Nuker:** Breaking blocks too quickly or in large areas. (Covered by `instaBreakCheck.js`, `nukerCheck.js`)
    *   **Ghost Hand/Block Through Walls:** Interacting with blocks through obstacles. Theoretically detectable with script-side raycasting, but extremely difficult to make reliable and performant.

5.  **Timer Abuse:**
    *   Client reports actions at an accelerated rate. Detected indirectly by other checks (speed, fastbreak, fastuse) flagging the symptoms.

## II. Scripting API Capabilities & Limitations for Detection

*   **Strengths:** The API provides good access to player state (location, velocity, effects, inventory) and game events (entity hurt, block break, item use).
*   **Limitations:**
    *   No direct packet access (cannot see packet content, timing, or order directly).
    *   Event-driven nature means scripts often see the *result* of an action after initial server processing.
    *   Polling frequency (tick-based) may miss very rapid, transient anomalies that occur between ticks or are averaged out.
    *   Distinguishing determined cheating from severe lag, client-server desync, or unusual but legitimate gameplay can be very challenging for certain anomalies.

## III. Proposed Conceptual Detection Strategies (Feasible via API Inference)

1.  **Force Criticals Detection (New Check - Medium Feasibility):**
    *   **Trigger:** On `entityHurt` if hit is critical (requires reliable API indicator for "isCritical").
    *   **Logic:** Check attacker's vertical movement state (e.g., `isOnGround`, `velocity.y`). If inconsistent with vanilla critical hit requirements, flag.
    *   **Challenges:** Reliable "isCritical" detection from API; precise timing/state correlation.

2.  **Blink/Short-Range Teleport Detection (New Check - Medium/Low Feasibility):**
    *   **Logic:** Track player location per tick. Flag if large distance moved in very short time without legitimate teleport item/command usage.
    *   **Challenges:** High risk of false positives due to lag; difficult threshold tuning. Existing speed/fly checks might cover extreme cases.

3.  **Enhanced FastBow/RapidFire (Refinement - Medium Feasibility):**
    *   **Logic:** More precise timing between bow `itemCompleteUse` events or projectile spawn events linked to a player.
    *   **Challenges:** Ensuring accurate event correlation.

## IV. Recommendations

*   Many "packet anomalies" are already symptomatically addressed by existing checks (Speed, Fly, NoFall, CPS, Reach, FastUse, InstaBreak, Nuker).
*   The most promising *new* area for a dedicated check based on API inference is **Force Criticals Detection**, provided the API can reliably indicate if a specific hit was critical.
*   **Blink Detection** is theoretically possible but requires careful implementation to minimize false positives from lag.
*   Direct detection of things like arbitrary inventory modification, timer manipulation, or complex packet malformation is likely beyond current scripting API capabilities.

Further investigation into "Force Criticals" could be a next step if deemed valuable.

## V. Feasibility of 'Force Criticals' Detection

Following the initial research on packet anomalies, a specific investigation was conducted into the feasibility of detecting "Force Criticals" (where a player's attacks register as critical hits without meeting the game's mechanical requirements).

**Key Findings:**

1.  **Melee Critical Hit Identification:**
    *   **No Explicit API Flag:** Standard Bedrock Scripting API events like `EntityHurtEvent` or its `damageSource` typically do not provide a direct boolean property (e.g., `isCritical`) to reliably indicate if a melee attack was a critical hit.
    *   **Damage-Based Inference:** Attempting to infer a critical hit by analyzing the final damage value is highly complex and unreliable. This is due to numerous factors affecting damage calculation (weapon type, enchantments on both attacker and victim, potion effects, armor, protection enchantments) and the critical multiplier being applied at a specific stage in this calculation. Replicating this perfectly to isolate the critical hit bonus is prone to errors and false positives/negatives.

2.  **Projectile (Arrow) Critical Hit Identification:**
    *   **Potential Indicators:** Critical arrows in vanilla Minecraft are usually tied to being fired from a fully charged bow by a player who is jumping or falling. The arrow entity itself *might* possess a state (e.g., a component or a consistently modified base damage value before impact calculations) that indicates it was spawned as a critical projectile.
    *   **API Dependency:** Feasibility here depends on whether the scripting API allows querying this state from the arrow entity (e.g., via `damagingProjectile` in `EntityHurtEvent`) or if the projectile hit event itself provides a critical hit flag. Without such API features, detection remains inferential.

3.  **"Force Criticals" Check Reliability:**
    *   A "Force Criticals" check would aim to identify situations where a critical hit (if it could be confirmed) occurred when the attacker did not meet the conditions for it (e.g., was standing still on the ground for a melee attack).
    *   **Conclusion:** Given the significant difficulty in reliably determining *whether a melee hit was critical* in the first place, a check for forced melee criticals is likely to be **unreliable and prone to false positives**. For projectiles, it remains dependent on specific API details that are not guaranteed to be available or consistent.

**Recommendation:**
Due to the current limitations in reliably identifying critical hits (especially melee) through the scripting API, implementing a "Force Criticals Detection" check is not recommended at this time if the goal is high accuracy and low false positives. Focus should remain on detecting anomalies with clearer and more direct API-provided evidence.
