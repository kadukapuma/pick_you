const React = require("react");

const PresenceContext = React.createContext({
  initial: true,
  custom: undefined,
});

const AnimatePresence = ({ children }) => React.createElement(React.Fragment, null, children);

const usePresence = () => [true, () => {}];

module.exports = {
  AnimatePresence,
  PresenceContext,
  usePresence,
};
