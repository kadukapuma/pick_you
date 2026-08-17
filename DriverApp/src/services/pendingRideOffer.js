/**
 * Hand-off point between a tapped "ride_offer" push notification (handled in
 * app.js, outside any screen) and HomeScreen, which owns the incoming-ride
 * modal. Decoupled from navigation since MainNavigator/BottomTabs aren't
 * reachable as nested routes from the root navigator.
 */

let pendingRideId = null;
const listeners = new Set();

export const setPendingRideOffer = (offer) => {
  const rideId = typeof offer === "object" ? offer?.rideId : offer;
  if (!rideId) return;
  pendingRideId = {
    rideId,
    expiresAt: typeof offer === "object" ? offer?.expiresAt : null,
  };
  listeners.forEach((listener) => listener(pendingRideId));
};

export const consumePendingRideOffer = () => {
  const rideId = pendingRideId;
  pendingRideId = null;
  return rideId;
};

export const subscribePendingRideOffer = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
