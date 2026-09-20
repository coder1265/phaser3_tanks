// Identify this file in editor tabs and stack traces.
// Import the class that manages PeerJS networking.
import { NetworkManager } from "./network.js";

// Create one shared network manager for this game instance.
const net = new NetworkManager();

// Store tanks by their network client ID.
let tanks = {};
// Keep the game paused until the host starts the match.
let gameStarted = false;

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  // Scale the 800-by-600 game world to fit its available parent area.
  scale: {
    // Preserve the game's 4:3 aspect ratio while resizing the canvas.
    mode: Phaser.Scale.FIT,
    // Keep the canvas centered inside the available parent area.
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Configure Phaser's physics system.
  physics: {
    // Use Phaser Arcade Physics.
    default: "arcade",
    // Disable the physics debug overlay.
    arcade: { debug: false },
  },
  // Register the scene lifecycle functions.
  scene: { preload, create, update },
};

// Start Phaser with the configuration above.
const game = new Phaser.Game(config);

function preload() {
  // Load the atlas image and its frame definitions from the assets folder.
  this.load.atlas("game", "assets/game.png", "assets/game.json");
}

function create() {
  // Keep a reference to the current scene for nested callbacks.
  const scene = this;
  // Cache the main UI elements used to launch and label the game.
  const appShell = document.getElementById("app-shell");
  const launchPanel = document.querySelector(".launch-panel");
  const lobbyPanel = document.getElementById("lobby-panel");
  const gameContainer = document.getElementById("game-container");
  const hostButton = document.getElementById("host-btn");
  const joinButton = document.getElementById("join-btn");
  const joinInput = document.getElementById("join-id");
  const statusText = document.getElementById("status-text");
  const lobbyTitle = document.getElementById("lobby-title");
  const lobbyStatus = document.getElementById("lobby-status");
  const hostId = document.getElementById("host-id");
  const hostCodeRow = document.getElementById("host-code-row");
  const playerList = document.getElementById("player-list");
  const playerCount = document.getElementById("player-count");
  const startGameButton = document.getElementById("start-game-btn");

  // Display the lobby and hide the initial mode-selection controls.
  const showLobby = (title, status, isHost) => {
    launchPanel.hidden = true;
    lobbyPanel.hidden = false;
    lobbyTitle.textContent = title;
    lobbyStatus.textContent = status;
    hostCodeRow.hidden = !isHost;
    startGameButton.hidden = !isHost;
  };

  // Reveal the canvas only after the host starts the match.
  const startGame = () => {
    gameStarted = true;
    lobbyPanel.hidden = true;
    // Hide the menu and lobby while keeping the game container visible to Phaser.
    appShell.classList.add("gone");
    gameContainer.classList.add("is-visible");
    requestAnimationFrame(() => scene.scale.refresh());
  };

  // Replace the lobby player list with the current set of player IDs.
  const renderPlayers = (players) => {
    playerList.replaceChildren();
    players.forEach((player, index) => {
      const item = document.createElement("li");
      item.textContent = index === 0 ? `${player} (host)` : player;
      playerList.appendChild(item);
    });
    playerCount.textContent = players.length;
  };

  // Keep the host ID current if PeerJS finishes connecting after the click.
  net.peer.on("open", (id) => {
    hostId.textContent = id;
  });

  // Start hosting when the host button is pressed.
  hostButton.onclick = () => {
    showLobby(
      "Your lobby",
      "Share your host ID, then start when everyone is ready.",
      true,
    );
    hostId.textContent = net.getClientId() || "Connecting...";
    renderPlayers([net.getClientId() || "Host"]);
    // Start hosting and register callbacks for network events.
    net.initHost(
      // Handle a new client joining the hosted game.
      (clientId) => {
        const players = [
          net.getClientId() || "Host",
          ...Object.keys(tanks),
          clientId,
        ];
        renderPlayers([...new Set(players)]);
        net.broadcast({ type: "lobby", players: [...new Set(players)] });
        // Create a physics-enabled remote tank for the new client.
        tanks[clientId] = scene.physics.add.sprite(
          // Set the remote tank's starting horizontal position.
          160,
          // Set the remote tank's starting vertical position.
          128,
          // Select the loaded game atlas.
          "game",
          // Select the player's body frame from the atlas.
          "game/player/body_1.png",
        );
      },
      // Handle input received from a connected client.
      (clientId, inputData) => {
        if (inputData?.type === "join-lobby") {
          return;
        }
        // Only update the sprite if this client has a tank.
        if (tanks[clientId]) {
          // Apply the client's horizontal velocity.
          tanks[clientId].setVelocityX(inputData.vx);
          // Apply the client's vertical velocity.
          tanks[clientId].setVelocityY(inputData.vy);
          // Apply the client's aiming rotation.
          tanks[clientId].rotation = inputData.rotation;
        }
      },
    );
  };

  // Start the match locally and tell every connected player to start.
  startGameButton.onclick = () => {
    net.broadcast({ type: "start-game" });
    startGame();
  };

  // Connect to a host when the join button is pressed.
  joinButton.onclick = () => {
    // Read the host's PeerJS ID from the input field.
    const hostPeerId = joinInput.value.trim();
    if (!hostPeerId) {
      statusText.textContent = "Enter a host ID to join";
      joinInput.focus();
      return;
    }
    showLobby(
      "Waiting for host",
      "Connected players will appear when the host starts the lobby.",
      false,
    );
    // Connect to the host and receive world-state updates.
    net.connectToHost(
      hostPeerId,
      (worldState) => {
        if (worldState?.type === "lobby") {
          renderPlayers(worldState.players);
          lobbyStatus.textContent = "Waiting for the host to start the game.";
          return;
        }
        if (worldState?.type === "start-game") {
          startGame();
          return;
        }
        // Process every tank included in the received state.
        Object.keys(worldState).forEach((id) => {
          // Create a local display sprite for a tank seen for the first time.
          if (!tanks[id]) {
            tanks[id] = scene.add.sprite(
              // Use the tank's received horizontal position.
              worldState[id].x,
              // Use the tank's received vertical position.
              worldState[id].y,
              // Select the loaded game atlas.
              "game",
              // Select the player's body frame from the atlas.
              "game/player/body_1.png",
            );
          } else {
            // Update an existing tank's horizontal position.
            tanks[id].x = worldState[id].x;
            // Update an existing tank's vertical position.
            tanks[id].y = worldState[id].y;
            // Update an existing tank's rotation.
            tanks[id].rotation = worldState[id].rotation;
          }
        });
      },
      () => {
        net.sendToHost({ type: "join-lobby" });
      },
    );
  };

  // Register W, A, S, and D as movement keys.
  this.cursors = this.input.keyboard.addKeys("W,A,S,D");

  // Define a 32-by-24 world made from 50-by-50 tiles.
  const tileSize = 50;
  const worldWidth = 32 * tileSize;
  const worldHeight = 24 * tileSize;

  // Create a real 50-by-50 texture from the 54-by-54 atlas frame once.
  const grassTexture = this.textures.createCanvas(
    "grass-50",
    tileSize,
    tileSize,
  );
  const atlasTexture = this.textures.get("game");
  const grassFrame = atlasTexture.get("game/grass.png");
  grassTexture.context.drawImage(
    atlasTexture.source[0].image,
    grassFrame.cutX,
    grassFrame.cutY,
    grassFrame.cutWidth,
    grassFrame.cutHeight,
    0,
    0,
    tileSize,
    tileSize,
  );
  grassTexture.refresh();

  // Fill the complete world with 50-by-50 grass tiles.
  this.add.tileSprite(
    worldWidth / 2,
    worldHeight / 2,
    worldWidth,
    worldHeight,
    "grass-50",
  );

  // Create the local player using a frame from the loaded atlas.
  this.playerTank = this.physics.add.sprite(
    160,
    128,
    "game",
    "game/player/body_1.png",
  );
  this.turret = this.add.sprite(160, 128, "game", "game/player/minigun.png");

  // Keep the player and camera inside the larger world.
  this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
  this.playerTank.setCollideWorldBounds(true);
  this.turret.setDepth(1);
  this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
  this.cameras.main.startFollow(this.playerTank, true);
}

function update() {
  // Do not process movement or networking while the lobby is open.
  if (!gameStarted) return;
  // Start with no horizontal movement.
  let vx = 0;
  // Start with no vertical movement.
  let vy = 0;
  // Move left while the A key is held.
  if (this.cursors.A.isDown) vx = -160;
  // Move right while the D key is held.
  if (this.cursors.D.isDown) vx = 160;
  // Move up while the W key is held.
  if (this.cursors.W.isDown) vy = -160;
  // Move down while the S key is held.
  if (this.cursors.S.isDown) vy = 160;

  // Read the current mouse or touch pointer.
  const pointer = this.input.activePointer;
  // Calculate the angle from the player area toward the pointer.
  const rotation = Phaser.Math.Angle.Between(400, 300, pointer.x, pointer.y);

  // Use host logic when this peer is the authoritative game host.
  if (net.isHost) {
    // The host should update local player physics here.
    // ...

    // Create an object for the state that will be broadcast.
    const stateMap = {};
    // Visit every known tank and copy its network-relevant properties.
    Object.keys(tanks).forEach((id) => {
      // Store this tank's current state under its client ID.
      stateMap[id] = {
        // Store the tank's horizontal position.
        x: tanks[id].x,
        // Store the tank's vertical position.
        y: tanks[id].y,
        // Store the tank's current rotation.
        rotation: tanks[id].rotation,
      };
    });
    // Send the complete state map to connected clients.
    net.broadcast(stateMap);
  } else {
    // Send this client's movement and aiming intent to the host.
    net.sendToHost({ vx, vy, rotation });
  }
}
