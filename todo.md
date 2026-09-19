#This is a Work in progress and such not everything will be implimented
Implimentation stages
Make menu, load screen and base tile map
First make multiplayer connection (by host id) with only basic turret and movement ablilty
Add turret turn lag & Add firing capability
Make visiblity range?
Add external objects (crates, enemy turrets (optional), destoyable obsticles)

#Processes & Functions / Tasks
1. Match & Session Management
- Room Creation: Host generates a unique Peer ID and initializes game state loop.

- Peer Handshake: Client requests join using Host's Peer ID; Host validates room capacity.

- Initial Sync: Host sends arena layout, spawn locations, and current player slot indices.

- State Recovery & Drop handling: Clean up tank instances and hitboxes on peer disconnect.

2. Player Character Systems
Chassis (Movement Node):

- Directional acceleration/velocity handling via keyboard inputs (WASD).

- Smooth rotation physics aligned to movement vector.

- Static terrain collision checking against map boundaries and walls.

Turret (Aiming Node):

- Decoupled rotation targeting cursor world coordinates.

- Recoil kickback animation vector calculation.

Health & Status:

- Health pool management with local visual feedback (HP bar offset).

- Status effects (e.g., speed boosts, fire rate modifiers, stunned state).

3. Combat & Projectile System
Weapon Engine:

- Weapon categories: High-velocity single-shot (Cannon), continuous beam (Laser), spread shot (Shotgun), tracked physics (Rockets).

- Fire-rate throttling and ammo heat/cooldown meters.

Projectile Lifecycle:

- Spawn event triggered on input -> trajectory velocity vector applied.

- On-impact detection against tank hitboxes and static geometry.

- Area-of-Effect (AOE) damage radius calculation on detonation.

4. Host-Client Networking Sync Engine
Client Input Emission:

- Input polling loop: Gathers movement vectors, target angle, and firing triggers.

- Serializes and transmits light payload packets to Host.

Host Authority & Physics Resolution:

- Applies received raw inputs to respective entity velocity vectors.

- Executes global Arcade Physics step.

- Resolves health reductions, bullet despawns, and tile destructions.

State Broadcast & Interp:

- Host aggregates global map state (player transform structs, projectile arrays).

- Sends serialized snapshot payload to all connected peers.

- Clients render snapshot positions with linear interpolation (lerp) to smooth out network jitter.

5. Level Environment & Map Logic
Tilemap System:

- Static collision geometry (indestructible boundary blocks).

- Destructible environmental obstacles (crates, barrels, weak walls with structural HP).

Spawn:

- Spawn of players determined by visibility (randomly picked spot that is not visible to another player and they can spawn there)

- 3s spawn timer
- Optional (upgrade on spawn)

6. Progression & Meta Loop (In-Match)
Economy System:

- Coins/currency drops on crate destruction or player elimination.

Upgrade Tree:

Stats increments: Armor thickness, base speed, damage output, reload speed.

Mid-match or round-end shop state overlay.