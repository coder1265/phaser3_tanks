// src/main.js
import { NetworkManager } from './network.js';

const net = new NetworkManager();
let tanks = {};

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  // Load a simple tank sprite or placeholder graphic
  this.load.image('game', 'assets/game.png');
}

function create() {
  const scene = this;

  // Set up UI handlers
  document.getElementById('host-btn').onclick = () => {
    net.initHost(
      (clientId) => {
        // Spawn remote tank on host when a guest joins
        tanks[clientId] = scene.physics.add.sprite(200, 200, 'game');
      },
      (clientId, inputData) => {
        // Host applies guest inputs to the guest's sprite
        if (tanks[clientId]) {
          tanks[clientId].setVelocityX(inputData.vx);
          tanks[clientId].setVelocityY(inputData.vy);
          tanks[clientId].rotation = inputData.rotation;
        }
      }
    );
  };

  document.getElementById('join-btn').onclick = () => {
    const hostId = document.getElementById('join-id').value;
    net.connectToHost(hostId, (worldState) => {
      // Client receives position updates from Host
      Object.keys(worldState).forEach(id => {
        if (!tanks[id]) {
          tanks[id] = scene.add.sprite(worldState[id].x, worldState[id].y, 'tank');
        } else {
          tanks[id].x = worldState[id].x;
          tanks[id].y = worldState[id].y;
          tanks[id].rotation = worldState[id].rotation;
        }
      });
    });
  };

  // Local Controls setup
  this.cursors = this.input.keyboard.addKeys('W,A,S,D');
  // Example map data: 0 is empty, 1 is a wall
  const levelData = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ];

  const map = this.make.tilemap({
    data: levelData,
    tileWidth: 32,
    tileHeight: 32
  });

  const tileset = map.addTilesetImage('game', null, 32, 32);
  const layer = map.createLayer(0, tileset, 0, 0);

  layer.setCollision(1);

  // Extract one tank region from game.png.
  // Replace these coordinates with the actual tank region.
  this.textures.get('game').add(
    'tank',
    0,
    910, // x in game.png
    515, // y in game.png
    64,  // width
    48   // height
  );

  this.playerTank = this.physics.add.sprite(160, 128, 'game', 'tank');

  this.physics.add.collider(this.playerTank, layer);
}


function update() {
  // Gather keyboard controls
  let vx = 0;
  let vy = 0;
  if (this.cursors.A.isDown) vx = -160;
  if (this.cursors.D.isDown) vx = 160;
  if (this.cursors.W.isDown) vy = -160;
  if (this.cursors.S.isDown) vy = 160;

  const pointer = this.input.activePointer;
  const rotation = Phaser.Math.Angle.Between(400, 300, pointer.x, pointer.y);

  if (net.isHost) {
    // Host updates local player tank physics directly
    // ...
    
    // Host broadcasts entire state map
    const stateMap = {};
    Object.keys(tanks).forEach(id => {
      stateMap[id] = {
        x: tanks[id].x,
        y: tanks[id].y,
        rotation: tanks[id].rotation
      };
    });
    net.broadcast(stateMap);
  } else {
    // Client sends user intent to host
    net.sendToHost({ vx, vy, rotation });
  }
}