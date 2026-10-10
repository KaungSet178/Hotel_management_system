/**
 * Role-Based Access Control (RBAC) Role Guard Middleware Factory
 * 
 * Usage:
 *   requireRole('ADMIN')
 *   requireRole('RECEPTIONIST', 'ADMIN')
 *   requireRole('HOUSEKEEPING', 'RECEPTIONIST', 'ADMIN')
 */

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Ensure authentication has run
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required before checking roles.',
        code: 'UNAUTHORIZED'
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: User role "${userRole}" is not authorized for this action.`,
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
        currentRole: userRole
      });
    }

    next();
  };
}

module.exports = {
  requireRole
};
