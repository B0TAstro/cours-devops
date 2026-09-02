// In-memory stand-in for the realtime database, shaped like the slice of the
// admin sdk the app uses: ref().set(), ref().get(), and snapshots that can be
// walked with forEach. Keeps the tests off the network and off the shared
// class database.
const tree = {};

function segmentsOf(path) {
  return String(path)
    .split('/')
    .filter(Boolean);
}

function readAt(segments) {
  return segments.reduce(
    (node, segment) => (node === null || node === undefined ? undefined : node[segment]),
    tree
  );
}

function snapshotFor(value, key) {
  return {
    key,
    val: () => (value === undefined ? null : value),
    exists: () => value !== undefined && value !== null,
    forEach: action => {
      const children = value && typeof value === 'object' ? value : {};

      Object.keys(children).forEach(childKey => {
        action(snapshotFor(children[childKey], childKey));
      });
    }
  };
}

function ref(path) {
  const segments = segmentsOf(path);
  const leaf = segments[segments.length - 1];

  return {
    set(value) {
      const parent = segments
        .slice(0, -1)
        .reduce((node, segment) => {
          node[segment] = node[segment] || {};
          return node[segment];
        }, tree);

      parent[leaf] = value;

      return Promise.resolve();
    },

    get() {
      return Promise.resolve(snapshotFor(readAt(segments), leaf));
    }
  };
}

// lets a test start from an empty database
function __reset() {
  Object.keys(tree).forEach(key => delete tree[key]);
}

module.exports = {
  firebaseApp: { name: 'mock-admin-app' },
  database: { ref },
  __reset
};
