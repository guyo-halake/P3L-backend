// Singleton pattern for Socket.IO instance access
let ioInstance = null;
export function setIO(io) {
  ioInstance = io;
}
export function getIO() {
  return ioInstance;
}