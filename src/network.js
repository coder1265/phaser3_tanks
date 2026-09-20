// src/network.js
export class NetworkManager {
  constructor() {
    this.peer = new Peer(); // Uses PeerJS public cloud signaling server
    this.connections = [];
    this.isHost = false;

    this.peer.on("open", (id) => {
      console.log("Your Peer ID is: " + id);
      // Display this ID so other players can connect to you
    });
  }

  getClientId() {
    return this.peer.id;
  }

  initHost(onClientConnect, onDataReceived) {
    this.isHost = true;
    this.peer.on("connection", (conn) => {
      this.connections.push(conn);

      conn.on("open", () => {
        onClientConnect(conn.peer);
      });

      conn.on("data", (data) => {
        onDataReceived(conn.peer, data);
      });
    });
  }

  connectToHost(hostId, onDataReceived, onConnected) {
    this.isHost = false;
    this.hostConnection = this.peer.connect(hostId);

    this.hostConnection.on("open", () => {
      console.log("Connected to Host:", hostId);
      onConnected?.();
    });

    this.hostConnection.on("data", (data) => {
      onDataReceived(data);
    });
  }

  sendToHost(data) {
    if (this.hostConnection) {
      this.hostConnection.send(data);
    }
  }

  broadcast(data) {
    if (this.isHost) {
      this.connections.forEach((conn) => conn.send(data));
    }
  }
}
