import merge from "deepmerge";
import * as shvl from "shvl";

export default function(options, storage, key) {
  options = options || {};
  storage = options.storage || (window && window.localStorage);
  key = options.key || "vuex";

  function canWriteStorage(storage) {
    try {
      storage.setItem("@@", 1);
      storage.removeItem("@@");
      return true;
    } catch (e) {}

    return false;
  }

  function getState(key, storage, value) {
    try {
      return (value = storage.getItem(key)) && typeof value !== "undefined"
        ? JSON.parse(value)
        : undefined;
    } catch (err) {}

    return undefined;
  }

  function filter() {
    return true;
  }

  function setState(key, state, storage) {
    try {
      return storage.setItem(key, JSON.stringify(state));
    } catch (err) {}

    return undefined;
  }

  function reducer(state, paths) {
    return paths.length === 0
      ? state
      : paths.reduce(function(substate, path) {
          return shvl.set(substate, path, shvl.get(state, path));
        }, {});
  }

  function subscriber(store) {
    return function(handler) {
      return store.subscribe(handler);
    };
  }

  if (!canWriteStorage(storage)) {
    throw new Error("Invalid storage instance given");
  }

  const savedState = shvl.get(options, "getState", getState)(key, storage);

  return function(store) {
    if (typeof savedState === "object" && savedState !== null) {
      store.replaceState(
        merge(store.state, savedState, {
          arrayMerge:
            options.arrayMerger ||
            function(store, saved) {
              return saved;
            },
          clone: false
        })
      );
      (options.rehydrated || function() {})(store);
    }

    (options.subscriber || subscriber)(store)(function(mutation, state) {
      if ((options.filter || filter)(mutation)) {
        (options.setState || setState)(
          key,
          (options.reducer || reducer)(state, options.paths || []),
          storage
        );
      }
    });
  };
}
