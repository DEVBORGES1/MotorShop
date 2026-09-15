export function serializeStore(store) {
  if (!store) return null;

  // `key` é o discriminador do singleton; não interessa ao cliente.
  const { _id, __v, key: _key, ...rest } = store;
  return { id: String(_id), ...rest };
}
