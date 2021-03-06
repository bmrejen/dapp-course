import { createStore, applyMiddleware, compose } from "redux";
import { createLogger } from "redux-logger";
import rootReducer from "./reducers";

const loggerMiddleware = createLogger();
const middleware = [];

// For Redux Devtools in Chrome
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default function configureStore(preloadedState) {
  let store = createStore(
    rootReducer,
    preloadedState,
    applyMiddleware(...middleware, loggerMiddleware)
  );

  return store;
}
