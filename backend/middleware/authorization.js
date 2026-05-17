// Authorization middleware for role-based access control

/**
 * Middleware to ensure user is a Super Admin
 */
export const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
    }

    next();
};

/**
 * Middleware to ensure user is any admin (super or sub)
 */
export const requireAnyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'sub_admin') {
        return res.status(403).json({ message: "Admin access required" });
    }

    next();
};

/**
 * Middleware to ensure sub-admin can only access their department
 * Super admins have full access
 * @param {string} departmentField - The field name in req.body or req.params that contains the department
 */
export const requireDepartmentAccess = (departmentField = 'department') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }

        // Super admins have access to all departments
        if (req.user.role === 'super_admin') {
            return next();
        }

        // Sub admins can only access their own department
        if (req.user.role === 'sub_admin') {
            const requestedDepartment = req.body[departmentField] || req.params[departmentField];

            if (!requestedDepartment) {
                // If no department specified, allow (will be filtered in query)
                return next();
            }

            if (req.user.department !== requestedDepartment) {
                return res.status(403).json({
                    message: "You can only access data from your assigned department",
                    yourDepartment: req.user.department
                });
            }
        }

        next();
    };
};

/**
 * Helper function to check if user is super admin
 * @param {object} user - req.user object from JWT
 */
export const isSuperAdmin = (user) => {
    return user && user.role === 'super_admin';
};

/**
 * Helper function to check if user is sub admin
 * @param {object} user - req.user object from JWT
 */
export const isSubAdmin = (user) => {
    return user && user.role === 'sub_admin';
};
