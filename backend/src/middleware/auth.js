import jwt from 'jsonwebtoken';
import prisma from '../db.js';

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies.brandfull_token;
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Daxil olmaq tələb olunur.' }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'brandfull_dev_jwt_secret_key');
    const user = await prisma.adminUser.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'İstifadəçi tapılmadı və ya aktiv deyil.' }
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Sessiya etibarsızdır. Yenidən daxil olun.' }
    });
  }
};

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Bu əməliyyatı yerinə yetirmək üçün icazəniz yoxdur.' }
      });
    }
    next();
  };
};
