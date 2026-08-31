const ADMIN_ROLE = 'admin';

function hasAdminValue(value) {
  if (Array.isArray(value)) {
    return value.includes(ADMIN_ROLE);
  }

  return value === ADMIN_ROLE;
}

export function hasAdminAccess(user) {
  const metadata = user?.publicMetadata || {};

  return (
    metadata.isAdmin === true ||
    hasAdminValue(metadata.role) ||
    hasAdminValue(metadata.roles)
  );
}
