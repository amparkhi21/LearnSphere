const { AccessToken, RoomServiceClient } = require("livekit-server-sdk");

const getConfigPresence = () => ({
  urlConfigured: Boolean(process.env.LIVEKIT_URL?.trim()),
  apiKeyConfigured: Boolean(process.env.LIVEKIT_API_KEY?.trim()),
  apiSecretConfigured: Boolean(process.env.LIVEKIT_API_SECRET?.trim()),
});

const logInitialization = (component, error) => {
  const details = { component, ...getConfigPresence() };
  if (error) {
    console.error("[LiveKit] SDK operation failed", { ...details, errorType: error.name || "Error" });
  } else {
    console.info("[LiveKit] SDK client constructed", details);
  }
};

class LiveKitConfigurationError extends Error {
  constructor() {
    super("Live classes are not configured yet. Ask the site administrator to add the LiveKit server settings.");
    this.code = "LIVEKIT_NOT_CONFIGURED";
  }
}

const getConfig = () => {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) {
    console.error("[LiveKit] Configuration incomplete", getConfigPresence());
    throw new LiveKitConfigurationError();
  }
  return { url, apiKey, apiSecret };
};

const getRoomService = () => {
  const { url, apiKey, apiSecret } = getConfig();
  const httpUrl = url.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
  try {
    const client = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    logInitialization("RoomServiceClient");
    return client;
  } catch (error) {
    logInitialization("RoomServiceClient", error);
    throw error;
  }
};

const createRoom = async (roomName) => {
  try {
    return await getRoomService().createRoom({ name: roomName, emptyTimeout: 60, departureTimeout: 60, maxParticipants: 100 });
  } catch (error) {
    logInitialization("createRoom", error);
    throw error;
  }
};

const deleteRoom = async (roomName) => {
  try {
    return await getRoomService().deleteRoom(roomName);
  } catch (error) {
    logInitialization("deleteRoom", error);
    throw error;
  }
};

const createParticipantToken = async ({ room, identity, name, canPublish }) => {
  const { apiKey, apiSecret } = getConfig();
  try {
    const accessToken = new AccessToken(apiKey, apiSecret, { identity, name, ttl: "15m" });
    accessToken.addGrant({ roomJoin: true, room, canPublish, canSubscribe: true, canPublishData: true });
    const token = await accessToken.toJwt();
    console.info("[LiveKit] Access token generated", { component: "AccessToken", ...getConfigPresence() });
    return token;
  } catch (error) {
    logInitialization("AccessToken", error);
    throw error;
  }
};

module.exports = { createRoom, deleteRoom, createParticipantToken, getConfigPresence, LiveKitConfigurationError };
