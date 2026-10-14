export type PreparerDetails = { name: string; email: string; phone: string };
export type PreparedSnapshot = { preparedBy: string; preparedByEmail: string; preparedByPhone: string };

// Never accept preparer identity from form data. Revisions keep the saved author.
export function preparedBySnapshot(user: PreparerDetails, existing?: PreparedSnapshot): PreparedSnapshot {
  return existing ? {
    preparedBy: existing.preparedBy,
    preparedByEmail: existing.preparedByEmail,
    preparedByPhone: existing.preparedByPhone,
  } : { preparedBy: user.name, preparedByEmail: user.email, preparedByPhone: user.phone };
}
