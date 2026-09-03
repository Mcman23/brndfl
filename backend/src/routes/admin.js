import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import prisma from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { StorageService } from '../services/storage.js';
import { aiService } from '../services/gemini.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Apply requireAuth globally to all admin routes
router.use(requireAuth);

// Helper helper for slug cleanups
const generateSlug = (text) => {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[əə]/g, 'e')
    .replace(/[ıı]/g, 'i')
    .replace(/[öö]/g, 'o')
    .replace(/[ğğ]/g, 'g')
    .replace(/[şş]/g, 's')
    .replace(/[üü]/g, 'u')
    .replace(/[çç]/g, 'c')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// ==========================================================================
// 1. DASHBOARD & STATS
// ==========================================================================
router.get('/dashboard-stats', async (req, res, next) => {
  try {
    const [
      totalProjects, draftProjects, publishedProjects,
      totalSolutions, draftSolutions, publishedSolutions,
      totalArticles, publishedArticles,
      totalJobs, activeJobs,
      totalClients,
      totalInquiries, newInquiries, inProgressInquiries, contactedInquiries, closedInquiries,
      totalApplications, newApplications,
      totalSubscribers,
      recentInquiries,
      recentProjects,
      recentApplications,
      mediaCount
    ] = await Promise.all([
      prisma.project.count(), prisma.project.count({ where: { published: false } }), prisma.project.count({ where: { published: true } }),
      prisma.solution.count(), prisma.solution.count({ where: { published: false } }), prisma.solution.count({ where: { published: true } }),
      prisma.article.count(), prisma.article.count({ where: { published: true } }),
      prisma.job.count(), prisma.job.count({ where: { active: true } }),
      prisma.client.count(),
      prisma.inquiry.count(), prisma.inquiry.count({ where: { status: 'NEW' } }), prisma.inquiry.count({ where: { status: 'IN_PROGRESS' } }), prisma.inquiry.count({ where: { status: 'CONTACTED' } }), prisma.inquiry.count({ where: { status: 'CLOSED' } }),
      prisma.application.count(), prisma.application.count({ where: { status: 'Yeni' } }),
      prisma.subscriber.count(),
      prisma.inquiry.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.project.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, category: true, published: true, image: true, createdAt: true } }),
      prisma.application.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { job: { select: { title: true } } } }),
      prisma.media.count()
    ]);

    res.json({
      success: true,
      data: {
        projects: { total: totalProjects, draft: draftProjects, published: publishedProjects },
        solutions: { total: totalSolutions, draft: draftSolutions, published: publishedSolutions },
        articles: { total: totalArticles, published: publishedArticles },
        jobs: { total: totalJobs, active: activeJobs },
        clients: { total: totalClients },
        inquiries: { total: totalInquiries, new: newInquiries, inProgress: inProgressInquiries, contacted: contactedInquiries, closed: closedInquiries },
        applications: { total: totalApplications, new: newApplications },
        subscribers: { total: totalSubscribers },
        media: { total: mediaCount },
        recentInquiries,
        recentProjects,
        recentApplications: recentApplications.map(app => ({
          ...app,
          jobTitle: app.job ? app.job.title : 'Ümumi Müraciət'
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================================================
// 1B. GLOBAL SEARCH
// ==========================================================================
router.get('/search', async (req, res, next) => {
  try {
    const q = req.query.q;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const searchStr = q.toLowerCase();
    
    // Concurrently search all relevant tables
    const [projects, solutions, articles, clients, inquiries] = await Promise.all([
      prisma.project.findMany({
        where: { title: { contains: searchStr, mode: 'insensitive' } },
        take: 3, select: { id: true, title: true, category: true, image: true }
      }),
      prisma.solution.findMany({
        where: { title: { contains: searchStr, mode: 'insensitive' } },
        take: 3, select: { id: true, title: true, image: true }
      }),
      prisma.article.findMany({
        where: { title: { contains: searchStr, mode: 'insensitive' } },
        take: 3, select: { id: true, title: true, tag: true, image: true }
      }),
      prisma.client.findMany({
        where: { name: { contains: searchStr, mode: 'insensitive' } },
        take: 3, select: { id: true, name: true, logoUrl: true }
      }),
      prisma.inquiry.findMany({
        where: {
          OR: [
            { name: { contains: searchStr, mode: 'insensitive' } },
            { email: { contains: searchStr, mode: 'insensitive' } },
            { company: { contains: searchStr, mode: 'insensitive' } }
          ]
        },
        take: 3, select: { id: true, name: true, company: true, status: true }
      })
    ]);

    const results = [
      ...projects.map(p => ({ type: 'PROJECT', id: p.id, title: p.title, subtitle: p.category, image: p.image })),
      ...solutions.map(s => ({ type: 'SOLUTION', id: s.id, title: s.title, subtitle: 'Həll', image: s.image })),
      ...articles.map(a => ({ type: 'ARTICLE', id: a.id, title: a.title, subtitle: a.tag, image: a.image })),
      ...clients.map(c => ({ type: 'CLIENT', id: c.id, title: c.name, subtitle: 'Müştəri', image: c.logoUrl })),
      ...inquiries.map(i => ({ type: 'INQUIRY', id: i.id, title: i.name, subtitle: i.company || i.status, image: null }))
    ];

    res.json({ success: true, data: results });
  } catch(err) {
    next(err);
  }
});

// ==========================================================================
// CLIENTS CRUD
// ==========================================================================
router.get('/clients', async (req, res, next) => {
  try {
    const list = await prisma.client.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { projects: true }
        }
      }
    });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/clients', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { name, websiteUrl, logoUrl, description, active, order } = req.body;
    if (!name) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Müştəri adı vacibdir.' } });
    }
    const slug = generateSlug(name);
    const existing = await prisma.client.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Bu adda müştəri artıq mövcuddur.' } });
    }
    const client = await prisma.client.create({
      data: {
        name,
        slug,
        websiteUrl: websiteUrl || '',
        logoUrl: logoUrl || null,
        description: description || '',
        active: active !== undefined ? !!active : true,
        order: Number(order) || 0
      }
    });
    await logAction({ adminUserId: req.user.id, action: 'CREATE', entity: 'Client', entityId: client.id, metadata: { name: client.name } });
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

router.put('/clients/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    if (updateData.name) {
      updateData.slug = generateSlug(updateData.name);
      const existing = await prisma.client.findFirst({ where: { slug: updateData.slug, NOT: { id } } });
      if (existing) {
        return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Bu adda müştəri artıq mövcuddur.' } });
      }
    }

    if (updateData.order !== undefined) {
      updateData.order = Number(updateData.order);
    }

    const client = await prisma.client.update({
      where: { id },
      data: updateData
    });
    await logAction({ adminUserId: req.user.id, action: 'UPDATE', entity: 'Client', entityId: client.id, metadata: { name: client.name } });
    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

router.delete('/clients/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const count = await prisma.project.count({ where: { clientId: id } });
    if (count > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REFERENCE_CONFLICT',
          message: `Bu müştəri hələ də ${count} layihəyə bağlıdır. Silmək üçün əvvəlcə əlaqəli layihələri silin və ya digər müştəriyə keçirin.`
        }
      });
    }
    await prisma.client.delete({ where: { id } });
    await logAction({ adminUserId: req.user.id, action: 'DELETE', entity: 'Client', entityId: id });
    res.json({ success: true, message: 'Müştəri silindi.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================================================
// MEDIA LIBRARY & UPLOADS
// ==========================================================================
router.get('/media', async (req, res, next) => {
  try {
    const list = await prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/media/upload', requireRole(['SUPER_ADMIN']), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'Fayl seçilməyib.' } });
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_MIME_TYPE', message: 'Yalnız JPG, JPEG, PNG, WEBP və SVG şəkilləri dəstəklənir.' } });
    }

    const uploadRes = await StorageService.uploadMedia(req.file);

    const mediaObj = await prisma.media.create({
      data: {
        filename: uploadRes.key,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: uploadRes.url
      }
    });

    await logAction({ adminUserId: req.user.id, action: 'UPLOAD', entity: 'Media', entityId: mediaObj.id, metadata: { originalName: mediaObj.originalName } });
    res.status(201).json({ success: true, data: mediaObj });
  } catch (err) {
    next(err);
  }
});


router.post('/media/vimeo', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || !url.includes('vimeo.com')) {
      return res.status(400).json({ success: false, error: { message: 'Düzgün Vimeo linki daxil edin.' } });
    }
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (!match) {
      return res.status(400).json({ success: false, error: { message: 'Düzgün Vimeo linki daxil edin.' } });
    }
    const vimeoId = match[1];
    const embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
    
    const mediaObj = await prisma.media.create({
      data: {
        filename: vimeoId,
        originalName: `Vimeo Video ${vimeoId}`,
        mimeType: 'video/vimeo',
        size: 0,
        url: embedUrl
      }
    });
    
    await logAction({ adminUserId: req.user.id, action: 'UPLOAD', entity: 'Media', entityId: mediaObj.id, metadata: { originalName: mediaObj.originalName } });
    res.status(201).json({ success: true, data: mediaObj });
  } catch (err) {
    next(err);
  }
});

router.delete('/media/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Fayl tapılmadı.' } });
    }

    // Check references in Project covers, client logos, gallery images
    const fileUrl = media.url;
    const projectCoversCount = await prisma.project.count({ where: { image: fileUrl } });
    const projectLogosCount = await prisma.project.count({ where: { clientLogo: fileUrl } });
    const clientLogosCount = await prisma.client.count({ where: { logoUrl: fileUrl } });
    
    // Gallery search
    const allProjects = await prisma.project.findMany();
    let galleryCount = 0;
    for (const p of allProjects) {
      let gal = [];
      try {
        gal = Array.isArray(p.gallery) ? p.gallery : JSON.parse(p.gallery || '[]');
      } catch(e) {}
      if (gal.includes(fileUrl)) {
        galleryCount++;
      }
    }

    if (projectCoversCount > 0 || projectLogosCount > 0 || clientLogosCount > 0 || galleryCount > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REFERENCE_CONFLICT',
          message: 'Bu şəkil bəzi layihələr və ya müştərilər tərəfindən istifadə edilir, silinə bilməz.'
        }
      });
    }

    await StorageService.delete(media.filename);
    await prisma.media.delete({ where: { id } });
    await logAction({ adminUserId: req.user.id, action: 'DELETE', entity: 'Media', entityId: id });
    res.json({ success: true, message: 'Media faylı silindi.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================================================
// 2. PROJECTS CRUD
// ==========================================================================
router.get('/projects', async (req, res, next) => {
  try {
    const list = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/projects', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { 
      id, client, title, category, tag, image, clientLogo, span, featured, year, 
      headline, overview, challenge, solution, impact, clientId, gallery, 
      metaTitle, metaDesc, order, published 
    } = req.body;
    
    if (!id || !title) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ID və Başlıq vacibdir.' } });
    }

    const slug = generateSlug(id);
    const existing = await prisma.project.findFirst({ where: { OR: [{ id }, { slug }] } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Bu ID və ya Slug ilə layihə artıq mövcuddur.' } });
    }

    // Resolve client relationships
    let resolvedClientName = client || 'General';
    let resolvedClientLogo = clientLogo || '';
    if (clientId) {
      const clientRecord = await prisma.client.findUnique({ where: { id: clientId } });
      if (clientRecord) {
        resolvedClientName = clientRecord.name;
        if (!resolvedClientLogo && clientRecord.logoUrl) {
          resolvedClientLogo = clientRecord.logoUrl;
        }
      }
    }

    const project = await prisma.project.create({
      data: {
        id,
        client: resolvedClientName,
        title,
        slug,
        category: category || 'General',
        tag: tag || '',
        image: image || '',
        clientLogo: resolvedClientLogo,
        span: span || 'span-6',
        featured: featured !== undefined ? !!featured : false,
        year: year || String(new Date().getFullYear()),
        headline: headline || '',
        overview: overview || '',
        challenge: challenge || '',
        solution: solution || '',
        impact: impact || [],
        
        // CMS Fields
        clientId: clientId || null,
        gallery: gallery || [],
        metaTitle: metaTitle || '',
        metaDesc: metaDesc || '',
        order: Number(order) || 0,
        published: published !== undefined ? !!published : false // defaults to draft (false)
      }
    });

    await logAction({ adminUserId: req.user.id, action: 'CREATE', entity: 'Project', entityId: project.id, metadata: { title: project.title } });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

router.put('/projects/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    if (updateData.slug) {
      updateData.slug = generateSlug(updateData.slug);
      const existing = await prisma.project.findFirst({ where: { slug: updateData.slug, NOT: { id } } });
      if (existing) {
        return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Bu slug artıq başqa layihə tərəfindən istifadə olunur.' } });
      }
    }

    if (updateData.order !== undefined) {
      updateData.order = Number(updateData.order);
    }

    // Dynamic Client Sync
    if (updateData.clientId) {
      const clientRecord = await prisma.client.findUnique({ where: { id: updateData.clientId } });
      if (clientRecord) {
        updateData.client = clientRecord.name;
        if (!updateData.clientLogo && clientRecord.logoUrl) {
          updateData.clientLogo = clientRecord.logoUrl;
        }
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData
    });

    await logAction({ adminUserId: req.user.id, action: 'UPDATE', entity: 'Project', entityId: project.id });
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

router.delete('/projects/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    await logAction({ adminUserId: req.user.id, action: 'DELETE', entity: 'Project', entityId: id });
    res.json({ success: true, message: 'Layihə silindi.' });
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/duplicate', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldProj = await prisma.project.findUnique({ where: { id } });
    if (!oldProj) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Layihə tapılmadı.' } });
    }

    let newId = `${oldProj.id}-copy`;
    let newSlug = `${oldProj.slug}-copy`;
    let suffix = 2;

    while (true) {
      const existing = await prisma.project.findFirst({ where: { OR: [{ id: newId }, { slug: newSlug }] } });
      if (!existing) break;
      newId = `${oldProj.id}-copy-${suffix}`;
      newSlug = `${oldProj.slug}-copy-${suffix}`;
      suffix++;
    }

    const duplicated = await prisma.project.create({
      data: {
        id: newId,
        client: oldProj.client,
        title: `${oldProj.title} (Kopya)`,
        slug: newSlug,
        category: oldProj.category,
        tag: oldProj.tag,
        image: oldProj.image,
        clientLogo: oldProj.clientLogo,
        span: oldProj.span,
        featured: false,
        year: oldProj.year,
        headline: oldProj.headline,
        overview: oldProj.overview,
        challenge: oldProj.challenge,
        solution: oldProj.solution,
        impact: oldProj.impact || [],
        clientId: oldProj.clientId,
        gallery: oldProj.gallery || [],
        metaTitle: oldProj.metaTitle,
        metaDesc: oldProj.metaDesc,
        order: oldProj.order,
        published: false
      }
    });

    await logAction({ adminUserId: req.user.id, action: 'DUPLICATE', entity: 'Project', entityId: duplicated.id, metadata: { sourceId: oldProj.id } });
    res.status(201).json({ success: true, data: duplicated });
  } catch (err) {
    next(err);
  }
});

// ==========================================================================
// 3. SOLUTIONS CRUD
// ==========================================================================
router.get('/solutions', async (req, res, next) => {
  try {
    const list = await prisma.solution.findMany({ orderBy: { order: 'asc' } });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/solutions', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { 
      id, num, title, tagline, desc, deliverables, 
      features, benefits, process, cta, metaTitle, metaDesc, published, image, order 
    } = req.body;

    if (!id || !title) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ID və Başlıq vacibdir.' } });
    }

    const slug = generateSlug(id);
    const existing = await prisma.solution.findFirst({ where: { OR: [{ id }, { slug }] } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Bu ID və ya Slug ilə xidmət artıq mövcuddur.' } });
    }

    const sol = await prisma.solution.create({
      data: {
        id,
        num: num || '01',
        title,
        slug,
        tagline: tagline || '',
        desc: desc || '',
        deliverables: deliverables || [],
        features: features || [],
        benefits: benefits || [],
        process: process || [],
        cta: cta || '',
        metaTitle: metaTitle || '',
        metaDesc: metaDesc || '',
        published: published !== undefined ? !!published : false, // defaults to draft (false)
        image: image || '',
        order: order !== undefined ? Number(order) : 0
      }
    });

    await logAction({ adminUserId: req.user.id, action: 'CREATE', entity: 'Solution', entityId: sol.id });
    if (sol.published) {
      await logAction({ adminUserId: req.user.id, action: 'PUBLISH', entity: 'Solution', entityId: sol.id });
    }
    res.status(201).json({ success: true, data: sol });
  } catch (err) {
    next(err);
  }
});

router.put('/solutions/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const oldSol = await prisma.solution.findUnique({ where: { id } });
    if (!oldSol) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Xidmət tapılmadı.' } });
    }

    if (updateData.slug) {
      updateData.slug = generateSlug(updateData.slug);
      const existing = await prisma.solution.findFirst({ where: { slug: updateData.slug, NOT: { id } } });
      if (existing) {
        return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Bu slug artıq istifadə olunur.' } });
      }
    }

    if (updateData.order !== undefined) {
      updateData.order = Number(updateData.order);
    }

    const sol = await prisma.solution.update({
      where: { id },
      data: updateData
    });

    // Logging transitions
    if (oldSol.published !== sol.published) {
      await logAction({ adminUserId: req.user.id, action: sol.published ? 'PUBLISH' : 'UNPUBLISH', entity: 'Solution', entityId: sol.id });
    }
    if (oldSol.order !== sol.order) {
      await logAction({ adminUserId: req.user.id, action: 'ORDER_CHANGE', entity: 'Solution', entityId: sol.id, metadata: { old: oldSol.order, new: sol.order } });
    }
    await logAction({ adminUserId: req.user.id, action: 'UPDATE', entity: 'Solution', entityId: sol.id });

    res.json({ success: true, data: sol });
  } catch (err) {
    next(err);
  }
});

router.delete('/solutions/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.solution.delete({ where: { id } });
    await logAction({ adminUserId: req.user.id, action: 'DELETE', entity: 'Solution', entityId: id });
    res.json({ success: true, message: 'Həll silindi.' });
  } catch (err) {
    next(err);
  }
});

router.get('/articles', async (req, res, next) => {
  try {
    const list = await prisma.article.findMany({ orderBy: { publishedAt: 'desc' } });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/articles', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { 
      id, tag, date, title, author, readTime, excerpt, content, 
      published, image, featured, metaTitle, metaDesc 
    } = req.body;

    if (!id || !title) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ID və Başlıq vacibdir.' } });
    }

    const slug = generateSlug(id);
    const existing = await prisma.article.findFirst({ where: { OR: [{ id }, { slug }] } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Bu ID və ya Slug ilə məqalə artıq mövcuddur.' } });
    }

    const article = await prisma.article.create({
      data: {
        id,
        tag: tag || 'Perspektiv',
        date: date || '',
        title,
        slug,
        author: author || '',
        readTime: readTime || '',
        excerpt: excerpt || '',
        content: content || '',
        published: published !== false,
        image: image || '',
        featured: !!featured,
        metaTitle: metaTitle || '',
        metaDesc: metaDesc || ''
      }
    });

    await logAction({ adminUserId: req.user.id, action: 'CREATE', entity: 'Article', entityId: article.id });
    if (article.published) {
      await logAction({ adminUserId: req.user.id, action: 'PUBLISH', entity: 'Article', entityId: article.id });
    }

    res.status(201).json({ success: true, data: article });
  } catch (err) {
    next(err);
  }
});

router.put('/articles/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const oldArt = await prisma.article.findUnique({ where: { id } });
    if (!oldArt) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Məqalə tapılmadı.' } });
    }

    if (updateData.slug) {
      updateData.slug = generateSlug(updateData.slug);
      const existing = await prisma.article.findFirst({ where: { slug: updateData.slug, NOT: { id } } });
      if (existing) {
        return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Bu slug istifadə olunur.' } });
      }
    }

    const article = await prisma.article.update({
      where: { id },
      data: updateData
    });

    // Logging transitions
    if (oldArt.published !== article.published) {
      await logAction({ adminUserId: req.user.id, action: article.published ? 'PUBLISH' : 'UNPUBLISH', entity: 'Article', entityId: article.id });
    }
    await logAction({ adminUserId: req.user.id, action: 'UPDATE', entity: 'Article', entityId: article.id });

    res.json({ success: true, data: article });
  } catch (err) {
    next(err);
  }
});

router.post('/articles/:id/duplicate', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldArt = await prisma.article.findUnique({ where: { id } });
    if (!oldArt) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Məqalə tapılmadı.' } });
    }

    const newId = `${oldArt.id}-copy`;
    const newSlug = `${oldArt.slug}-copy`;

    // Make sure cloned identifiers are unique
    const existing = await prisma.article.findFirst({ where: { OR: [{ id: newId }, { slug: newSlug }] } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Kopyalanmış ID və ya Slug ilə məqalə artıq mövcuddur.' } });
    }

    const duplicated = await prisma.article.create({
      data: {
        id: newId,
        tag: oldArt.tag,
        date: oldArt.date,
        title: `${oldArt.title} (Kopya)`,
        slug: newSlug,
        author: oldArt.author,
        readTime: oldArt.readTime,
        excerpt: oldArt.excerpt,
        content: oldArt.content,
        published: false, // Duplicated sets to Draft
        image: oldArt.image,
        featured: oldArt.featured,
        metaTitle: oldArt.metaTitle,
        metaDesc: oldArt.metaDesc
      }
    });

    await logAction({ adminUserId: req.user.id, action: 'DUPLICATE', entity: 'Article', entityId: duplicated.id, metadata: { sourceId: oldArt.id } });
    res.status(201).json({ success: true, data: duplicated });
  } catch (err) {
    next(err);
  }
});

router.delete('/articles/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.article.delete({ where: { id } });
    await logAction({ adminUserId: req.user.id, action: 'DELETE', entity: 'Article', entityId: id });
    res.json({ success: true, message: 'Məqalə silindi.' });
  } catch (err) {
    next(err);
  }
});
// ==========================================================================
// 5. JOBS CRUD
// ==========================================================================
router.get('/jobs', async (req, res, next) => {
  try {
    const list = await prisma.job.findMany({ 
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { applications: true }
        }
      }
    });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/jobs', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id, title, type, location, department, description, requirements, active, order } = req.body;

    if (!id || !title) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ID və Başlıq vacibdir.' } });
    }

    const slug = generateSlug(id);
    const existing = await prisma.job.findFirst({ where: { OR: [{ id }, { slug }] } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Bu ID və ya Slug ilə vakansiya artıq mövcuddur.' } });
    }

    const job = await prisma.job.create({
      data: {
        id,
        title,
        slug,
        type: type || 'Full-time',
        location: location || 'Bakı',
        department: department || 'Dizayn',
        description: description || '',
        requirements: requirements || [],
        active: active !== false,
        order: order !== undefined ? Number(order) : 0
      }
    });

    await logAction({ adminUserId: req.user.id, action: 'CREATE', entity: 'Job', entityId: job.id });
    if (job.active) {
      await logAction({ adminUserId: req.user.id, action: 'ACTIVATE', entity: 'Job', entityId: job.id });
    }
    res.status(201).json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
});

router.put('/jobs/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const oldJob = await prisma.job.findUnique({ where: { id } });
    if (!oldJob) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vakansiya tapılmadı.' } });
    }

    if (updateData.slug) {
      updateData.slug = generateSlug(updateData.slug);
      const existing = await prisma.job.findFirst({ where: { slug: updateData.slug, NOT: { id } } });
      if (existing) {
        return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Bu slug istifadə olunur.' } });
      }
    }

    if (updateData.order !== undefined) {
      updateData.order = Number(updateData.order);
    }

    const job = await prisma.job.update({
      where: { id },
      data: updateData
    });

    // Logging transitions
    if (oldJob.active !== job.active) {
      await logAction({ adminUserId: req.user.id, action: job.active ? 'ACTIVATE' : 'DEACTIVATE', entity: 'Job', entityId: job.id });
    }
    if (oldJob.order !== job.order) {
      await logAction({ adminUserId: req.user.id, action: 'ORDER_CHANGE', entity: 'Job', entityId: job.id, metadata: { old: oldJob.order, new: job.order } });
    }
    await logAction({ adminUserId: req.user.id, action: 'UPDATE', entity: 'Job', entityId: job.id });

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
});

router.post('/jobs/:id/duplicate', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldJob = await prisma.job.findUnique({ where: { id } });
    if (!oldJob) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vakansiya tapılmadı.' } });
    }

    let newId = `${oldJob.id}-copy`;
    let newSlug = `${oldJob.slug}-copy`;
    let suffix = 2;

    while (true) {
      const existing = await prisma.job.findFirst({ where: { OR: [{ id: newId }, { slug: newSlug }] } });
      if (!existing) break;
      newId = `${oldJob.id}-copy-${suffix}`;
      newSlug = `${oldJob.slug}-copy-${suffix}`;
      suffix++;
    }

    const duplicated = await prisma.job.create({
      data: {
        id: newId,
        title: `${oldJob.title} (Kopya)`,
        slug: newSlug,
        type: oldJob.type,
        location: oldJob.location,
        department: oldJob.department,
        description: oldJob.description,
        requirements: oldJob.requirements || [],
        active: false, // Cloned defaults to inactive
        order: oldJob.order
      }
    });

    await logAction({ adminUserId: req.user.id, action: 'DUPLICATE', entity: 'Job', entityId: duplicated.id, metadata: { sourceId: oldJob.id } });
    res.status(201).json({ success: true, data: duplicated });
  } catch (err) {
    next(err);
  }
});

router.delete('/jobs/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const appsCount = await prisma.application.count({ where: { jobId: id } });
    if (appsCount > 0) {
      return res.status(422).json({ 
        success: false, 
        error: { 
          code: 'RELATION_CONSTRAINT', 
          message: 'Bu vakansiya üzrə daxil olmuş müraciətlər var. Silinmə bloklandı. Vakansiyanı passivləşdirmək üçün onun statusunu qeyri-aktiv edin.' 
        } 
      });
    }

    await prisma.job.delete({ where: { id } });
    await logAction({ adminUserId: req.user.id, action: 'DELETE', entity: 'Job', entityId: id });
    res.json({ success: true, message: 'Vakansiya silindi.' });
  } catch (err) {
    next(err);
  }
});
// ==========================================================================
// 6. INQUIRIES MANAGEMENT
// ==========================================================================
router.get('/inquiries', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    const list = await prisma.inquiry.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.put('/inquiries/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, internalNote, assignedTo } = req.body;

    const dataToUpdate = {};
    if (status !== undefined) {
      if (!['NEW', 'IN_PROGRESS', 'CONTACTED', 'CLOSED'].includes(status)) {
        return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Yanlış status.' } });
      }
      dataToUpdate.status = status;
    }
    if (priority !== undefined) {
      if (!['Low', 'Normal', 'High', 'Urgent'].includes(priority)) {
        return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Yanlış priority.' } });
      }
      dataToUpdate.priority = priority;
    }
    if (internalNote !== undefined) dataToUpdate.internalNote = internalNote;
    if (assignedTo !== undefined) dataToUpdate.assignedTo = assignedTo;

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: dataToUpdate
    });

    await logAction({ adminUserId: req.user.id, action: 'UPDATE', entity: 'Inquiry', entityId: id, metadata: dataToUpdate });
    res.json({ success: true, data: inquiry });
  } catch (err) {
    next(err);
  }
});

router.delete('/inquiries/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.inquiry.delete({ where: { id } });
    await logAction({ adminUserId: req.user.id, action: 'DELETE', entity: 'Inquiry', entityId: id });
    res.json({ success: true, message: 'Müraciət silindi.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================================================
// 7. APPLICATIONS MANAGEMENT
// ==========================================================================
router.get('/applications', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const list = await prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
      include: { job: { select: { title: true } } }
    });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.put('/applications/:id/status', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['New', 'Reviewing', 'Shortlisted', 'Rejected', 'Hired'].includes(status)) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Yanlış status.' } });
    }

    const app = await prisma.application.update({
      where: { id },
      data: { status }
    });

    await logAction({ adminUserId: req.user.id, action: 'STATUS_CHANGE', entity: 'Application', entityId: id, metadata: { status } });
    res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
});
router.delete('/applications/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const app = await prisma.application.findUnique({
      where: { id }
    });

    if (app && app.cvUrl) {
      // Clean up CV file from storage provider
      await StorageService.delete(app.cvUrl);
      await logAction({ adminUserId: req.user.id, action: 'DELETE_CV', entity: 'Application', entityId: id });
    }

    await prisma.application.delete({ where: { id } });
    await logAction({ adminUserId: req.user.id, action: 'DELETE', entity: 'Application', entityId: id });
    res.json({ success: true, message: 'Müraciət və əlaqəli fayl silindi.' });
  } catch (err) {
    next(err);
  }
});

router.get('/applications/:id/cv', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const app = await prisma.application.findUnique({
      where: { id }
    });

    if (!app || !app.cvUrl) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'CV faylı tapılmadı.' }
      });
    }

    const stream = await StorageService.getDownloadStream(app.cvUrl);

    // Set response headers securely
    res.setHeader('Content-Type', app.cvMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(app.cvOriginalName || 'cv.pdf')}"`);

    await logAction({ adminUserId: req.user.id, action: 'DOWNLOAD_CV', entity: 'Application', entityId: id });

    if (typeof stream === 'string') {
      // Local storage returns file path, stream it
      res.sendFile(stream);
    } else {
      // S3 returns Readable stream, pipe it
      stream.pipe(res);
    }
  } catch (err) {
    next(err);
  }
});
// ==========================================================================
// 8. SUBSCRIBERS MANAGEMENT
// ==========================================================================
router.get('/subscribers', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const list = await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.delete('/subscribers/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.subscriber.delete({ where: { id } });
    await logAction({ adminUserId: req.user.id, action: 'DELETE', entity: 'Subscriber', entityId: id });
    res.json({ success: true, message: 'Abunəçi silindi.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================================================
// 9. ADMIN USERS (Restricted to SUPER_ADMIN)
// ==========================================================================
router.get('/users', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const users = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true, lastLoginAt: true }
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

router.post('/users', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Bütün sahələr doldurulmalıdır.' } });
    }

    const existing = await prisma.adminUser.findUnique({ where: { email: email.trim() } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Bu e-poçt ilə istifadəçi artıq mövcuddur.' } });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.adminUser.create({
      data: { email: email.trim(), passwordHash, name: name.trim(), role, active: true },
      select: { id: true, email: true, name: true, role: true, active: true }
    });

    await logAction({ adminUserId: req.user.id, action: 'CREATE_USER', entity: 'AdminUser', entityId: user.id, metadata: { email: user.email, role } });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, active, password } = req.body;

    const user = await prisma.adminUser.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'İstifadəçi tapılmadı.' } });
    }

    // Safety check: Prevent deactivating final active SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' && (active === false || role !== 'SUPER_ADMIN')) {
      const activeSuperAdmins = await prisma.adminUser.count({
        where: { role: 'SUPER_ADMIN', active: true }
      });
      if (activeSuperAdmins <= 1) {
        return res.status(422).json({ success: false, error: { code: 'ACTION_DENIED', message: 'Sistemdə ən azı bir aktiv SUPER_ADMIN olmalıdır.' } });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (role) updateData.role = role;
    if (active !== undefined) updateData.active = !!active;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    const updated = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, active: true }
    });

    await logAction({ adminUserId: req.user.id, action: 'UPDATE_USER', entity: 'AdminUser', entityId: id });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Safety: Prevent deleting yourself or the final active SUPER_ADMIN
    if (id === req.user.id) {
      return res.status(422).json({ success: false, error: { code: 'ACTION_DENIED', message: 'Öz hesabınızı silə bilməzsiniz.' } });
    }

    const user = await prisma.adminUser.findUnique({ where: { id } });
    if (user && user.role === 'SUPER_ADMIN') {
      const activeSuperAdmins = await prisma.adminUser.count({
        where: { role: 'SUPER_ADMIN', active: true }
      });
      if (activeSuperAdmins <= 1) {
        return res.status(422).json({ success: false, error: { code: 'ACTION_DENIED', message: 'Sistemdə sonuncu SUPER_ADMIN hesabını silmək olmaz.' } });
      }
    }

    await prisma.adminUser.delete({ where: { id } });
    await logAction({ adminUserId: req.user.id, action: 'DELETE_USER', entity: 'AdminUser', entityId: id });
    res.json({ success: true, message: 'İstifadəçi silindi.' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-db', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    // Clean dynamic data
    await prisma.project.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.media.deleteMany({});
    await prisma.solution.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.job.deleteMany({});
    await prisma.application.deleteMany({});
    await prisma.inquiry.deleteMany({});
    await prisma.subscriber.deleteMany({});
    await prisma.auditLog.deleteMany({});

    const { exec } = await import('child_process');
    exec('node prisma/seed.js', (error) => {
      if (error) console.error('Reset seed error:', error);
    });

    res.json({ success: true, message: 'Verilənlər bazası ilkin vəziyyətinə qaytarıldı.' });
  } catch (err) {
    next(err);
  }
});


// AI Test Endpoint
const aiTestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 requests per 15 minutes
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Çox sayda AI sorğusu göndərilib.' } }
});

router.post('/ai/test', requireRole(['SUPER_ADMIN']), aiTestLimiter, async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Prompt daxil edilməlidir.' } });
    }
    
    if (prompt.length > 1000) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Prompt çox uzundur (maksimum 1000 simvol).' } });
    }
    
    const responseText = await aiService.generateText(prompt, "Sən köməkçi bir AI-san.");
    
    res.json({ success: true, response: responseText });
  } catch (err) {
    next(err);
  }
});


// AI CMS Assistant Endpoint
router.post('/ai/generate', requireRole(['SUPER_ADMIN']), aiTestLimiter, async (req, res, next) => {
  try {
    const { entity, action, context, instruction, language, tone } = req.body;
    
    // 1. Validate Entity
    const allowedEntities = ['project', 'solution', 'article', 'job'];
    if (!allowedEntities.includes(entity)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unsupported entity type.' } });
    }

    // 2. Validate Action
    const allowedActions = ['generate', 'improve', 'rewrite', 'seo', 'translate', 'shorten', 'expand', 'cta', 'detect_missing'];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unsupported action.' } });
    }

    // 3. Define Schema & Allowlists
    let schema = {};
    let systemInstruction = `Sən Brandfull CMS-i idarə edən peşəkar, korporativ AI köməkçisisən.
Məqsəd: Məzmunu tənzimləmək, daha peşəkar etmək, müştəri tərəfindən daxil edilən təlimatları yerinə yetirmək.
Qaydalar:
- Heç bir uydurma məlumat (fakt, statistika, müştəri) əlavə etmə. Sırf mövcud verilənlərə və korporativ standartlara əsaslan.
- Bütün nəticələri CİDDİ şəkildə JSON formatında qaytar, başqa heç nə yazma.
Mövcud Context: ${JSON.stringify(context || {})}`;

    if (language) {
      systemInstruction += `\n- Məzmun dili: ${language}.`;
    } else {
      systemInstruction += `\n- Məzmun dili: Azərbaycan dilidir (fərqli tələb yoxdursa).`;
    }

    if (tone) {
      systemInstruction += `\n- Ton və Stil: ${tone}.`;
    }

    if (instruction) {
      systemInstruction += `\n\nİstifadəçinin təlimatı: ${instruction}`;
    }

    systemInstruction += `\n\nHazırki fəaliyyət: ${action}`;

    const { Type: SchemaType } = await import('@google/genai');

    if (entity === 'project') {
      schema = {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          tag: { type: SchemaType.STRING },
          year: { type: SchemaType.STRING },
          headline: { type: SchemaType.STRING },
          overview: { type: SchemaType.STRING },
          challenge: { type: SchemaType.STRING },
          solution: { type: SchemaType.STRING },
          metaTitle: { type: SchemaType.STRING },
          metaDesc: { type: SchemaType.STRING },
          slug: { type: SchemaType.STRING }
        }
      };
    } else if (entity === 'solution') {
      schema = {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          tagline: { type: SchemaType.STRING },
          desc: { type: SchemaType.STRING },
          cta: { type: SchemaType.STRING },
          metaTitle: { type: SchemaType.STRING },
          metaDesc: { type: SchemaType.STRING },
          slug: { type: SchemaType.STRING },
          features: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          benefits: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          process: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          deliverables: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        }
      };
    } else if (entity === 'article') {
      schema = {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          tag: { type: SchemaType.STRING },
          author: { type: SchemaType.STRING },
          excerpt: { type: SchemaType.STRING },
          content: { type: SchemaType.STRING },
          metaTitle: { type: SchemaType.STRING },
          metaDesc: { type: SchemaType.STRING },
          slug: { type: SchemaType.STRING }
        }
      };
    } else if (entity === 'job') {
      schema = {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          type: { type: SchemaType.STRING },
          location: { type: SchemaType.STRING },
          department: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          requirements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          slug: { type: SchemaType.STRING }
        }
      };
    }

    const responseJSON = await aiService.generateStructured(`Məzmunu ${action} et.`, systemInstruction, schema);
    
    // The response is safely scoped by the JSON Schema.
    res.json({ success: true, data: responseJSON });
  } catch (err) {
    next(err);
  }
});

// ==========================================================================
// SITE SETTINGS
// ==========================================================================
router.get('/settings', async (req, res, next) => {
  try {
    let settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) {
      settings = await prisma.siteSettings.create({ data: { id: 'singleton' } });
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const data = req.body;
    
    // Explicit allowlist of fields to update
    const allowedFields = [
      'heroTag', 'heroHeadline', 'heroSubtitle', 
      'showreelVideoUrl', 'showreelPosterUrl',
      'contactEmail', 'contactPhone', 'contactAddress', 'workingHours',
      'socialInstagram', 'socialFacebook', 'socialLinkedIn', 
      'socialYouTube', 'socialTikTok', 'socialVimeo',
      'copyrightText'
    ];
    
    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = String(data[field]).trim();
      }
    }
    
    if (data.footerLinks && Array.isArray(data.footerLinks)) {
        updateData.footerLinks = data.footerLinks;
    }
    
    if (data.offices && Array.isArray(data.offices)) {
        updateData.offices = data.offices;
    }
    
    // Validate URLs (basic check, reject javascript:)
    const urlFields = ['socialInstagram', 'socialFacebook', 'socialLinkedIn', 'socialYouTube', 'socialTikTok', 'socialVimeo', 'showreelVideoUrl', 'showreelPosterUrl'];
    for (const field of urlFields) {
      if (updateData[field]) {
        if (updateData[field].toLowerCase().startsWith('javascript:') || updateData[field].toLowerCase().startsWith('data:')) {
          return res.status(400).json({ success: false, error: { message: `Etibarsız URL formatı: ${field}` } });
        }
      }
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: { id: 'singleton', ...updateData }
    });
    
    await logAction({ adminUserId: req.user.id, action: 'UPDATE', entity: 'SiteSettings', entityId: 'singleton' });
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

export default router;
