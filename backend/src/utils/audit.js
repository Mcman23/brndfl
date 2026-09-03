import prisma from '../db.js';

export const logAction = async ({ adminUserId, action, entity, entityId, metadata = {} }) => {
  try {
    await prisma.auditLog.create({
      data: {
        adminUserId,
        action,
        entity,
        entityId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
      }
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
};
