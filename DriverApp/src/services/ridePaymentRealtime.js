/**
 * Push-based ride/payment status updates for a single ride, e.g. so the
 * driver learns a card payment completed without waiting on the next poll.
 * Purely additive - callers should keep their existing HTTP poll as a
 * fallback in case the socket connection drops.
 */

import createEchoInstance from "./echo";

export const subscribeToRideStatus = async (rideId, onUpdate) => {
  if (!rideId) return () => {};

  const { echo } = await createEchoInstance();
  const channelName = `ride.${rideId}`;
  const channel = echo.private(channelName);

  const handler = (raw) => {
    const payload = raw?.data ?? raw;
    const ride = payload?.ride ?? payload;
    if (ride?.id) onUpdate(ride);
  };

  channel.listen(".RideStatusUpdated", handler);

  return () => {
    channel.unbind(".RideStatusUpdated", handler);
    echo.leaveChannel(`private-${channelName}`);
  };
};

export default subscribeToRideStatus;
