const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');

// ── Model imports ──────────────────────────────────────────────────────────
const Fortune           = require('../models/Fortune');           // FortuneSchema
const FriendFortune     = require('../models/FriendFortune');     // FriendFortuneSchema
const PredictionLog     = require('../models/PredictionLog');     // PredictionLogSchema
const WhatsAppStatus    = require('../models/WhatsAppStatus');    // WhatsAppStatusSchema
const BollywoodDialogue = require('../models/BollywoodDialogue'); // BollywoodDialogueSchema
const MummyScolding     = require('../models/MummyScolding');     // MummyScoldingSchema
const SharmaJiBeta      = require('../models/SharmaJiBeta');      // SharmaJiBetaSchema
const NameFortune       = require('../models/NameFortune');       // NameFortuneSchema
const Review            = require('../models/Review');            // ReviewSchema (new)
const BulkOrder         = require('../models/BulkOrder');         // BulkOrderSchema (new)
const GiftSet           = require('../models/GiftSet');           // GiftSetSchema (new)

// ── Utility ────────────────────────────────────────────────────────────────
const paginate = (page, limit) => ({
  skip:  (Math.max(1, parseInt(page) || 1) - 1) * (parseInt(limit) || 9),
  limit: Math.min(parseInt(limit) || 9, 100),
});

const safeId = (id, res) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid ID format.' });
    return false;
  }
  return true;
};

// ══════════════════════════════════════════════════════════════════════════
// 1. FORTUNE COOKIES  ·  /api/feature/pages/fortunes
// ══════════════════════════════════════════════════════════════════════════

// GET  /fortunes  — paginated list with filters + stats
router.get('/fortunes', async (req, res) => {
  try {
    const { page, limit, search, mood, language, timeOfDay, city, weather, dayOfWeek, festival } = req.query;
    const { skip, limit: lim } = paginate(page, limit);

    const query = {};
    if (search)    query.text      = { $regex: search, $options: 'i' };
    if (mood)      query.mood      = mood;
    if (language)  query.language  = language;
    if (timeOfDay) query.timeOfDay = timeOfDay;
    if (city)      query.city      = city;
    if (weather)   query.weather   = weather;
    if (dayOfWeek) query.dayOfWeek = dayOfWeek;
    if (festival)  query.festival  = festival;

    const [data, total] = await Promise.all([
      Fortune.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      Fortune.countDocuments(query),
    ]);

    // Stats aggregation
    const [statsAgg] = await Fortune.aggregate([
      { $group: {
        _id: null,
        totalActive:  { $sum: { $cond: ['$isActive', 1, 0] } },
        totalShared:  { $sum: '$shareCount' },
        totalServed:  { $sum: '$timesServed' },
      }},
    ]);

    res.json({
      success: true,
      data,
      total,
      page: parseInt(page) || 1,
      stats: {
        total,
        active:  statsAgg?.totalActive || 0,
        shared:  statsAgg?.totalShared || 0,
        served:  statsAgg?.totalServed || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET  /fortunes/random  — single random active fortune
router.get('/fortunes/random', async (req, res) => {
  try {
    const { mood, language, city, timeOfDay, festival } = req.query;
    const query = { isActive: true };
    if (mood)      query.mood      = mood;
    if (language)  query.language  = language;
    if (city)      query.city      = city;
    if (timeOfDay) query.timeOfDay = timeOfDay;
    if (festival && festival !== 'none') query.festival = festival;

    const count  = await Fortune.countDocuments(query);
    if (!count) return res.json({ success: false, message: 'No fortunes match these filters.' });

    const random = Math.floor(Math.random() * count);
    const fortune = await Fortune.findOne(query).skip(random).lean();

    // Increment timesServed
    await Fortune.findByIdAndUpdate(fortune._id, {
      $inc: { timesServed: 1 },
      lastServedAt: new Date(),
    });

    res.json({ success: true, data: { ...fortune, timesServed: (fortune.timesServed || 0) + 1 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET  /fortunes/:id
router.get('/fortunes/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const fortune = await Fortune.findById(req.params.id).lean();
    if (!fortune) return res.status(404).json({ success: false, message: 'Fortune not found.' });
    res.json({ success: true, data: fortune });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /fortunes
router.post('/fortunes', async (req, res) => {
  try {
    const fortune = new Fortune({ ...req.body, updatedAt: new Date() });
    await fortune.save();
    res.status(201).json({ success: true, data: fortune, message: 'Fortune created.' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'This fortune text already exists.' });
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT  /fortunes/:id
router.put('/fortunes/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await Fortune.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Fortune not found.' });
    res.json({ success: true, data: updated, message: 'Fortune updated.' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'This fortune text already exists.' });
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /fortunes/:id
router.delete('/fortunes/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const deleted = await Fortune.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Fortune not found.' });
    res.json({ success: true, message: 'Fortune deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /fortunes/:id/share — increment share count
router.patch('/fortunes/:id/share', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await Fortune.findByIdAndUpdate(
      req.params.id,
      { $inc: { shareCount: 1 } },
      { new: true }
    ).lean();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════
// 2. CUSTOM MESSAGES  ·  /api/feature/pages/custom-messages
//    Routes tab-based: tab=friendFortunes|bollywood|mummyScolding|sharmaJiBeta
// ══════════════════════════════════════════════════════════════════════════

router.get('/custom-messages', async (req, res) => {
  try {
    const { page, limit, search, roastLevel, language, tab } = req.query;
    const { skip, limit: lim } = paginate(page, limit);

    let Model, query = {};

    switch (tab) {
      case 'bollywood':
        Model = BollywoodDialogue;
        if (search) query.template = { $regex: search, $options: 'i' };
        break;
      case 'mummyScolding':
        Model = MummyScolding;
        if (search) query.$or = [
          { context: { $regex: search, $options: 'i' } },
          { scolding: { $regex: search, $options: 'i' } },
        ];
        break;
      case 'sharmaJiBeta':
        Model = SharmaJiBeta;
        if (search) query.$or = [
          { achievement: { $regex: search, $options: 'i' } },
          { insult: { $regex: search, $options: 'i' } },
        ];
        break;
      default: // friendFortunes
        Model = FriendFortune;
        if (search)     query.prediction = { $regex: search, $options: 'i' };
        if (roastLevel) query.roastLevel = roastLevel;
        if (language)   query.language   = language;
    }

    const [data, total] = await Promise.all([
      Model.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      Model.countDocuments(query),
    ]);

    res.json({ success: true, data, total, page: parseInt(page) || 1 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /custom-messages  (FriendFortune only from this base route)
router.post('/custom-messages', async (req, res) => {
  try {
    const msg = new FriendFortune(req.body);
    await msg.save();
    res.status(201).json({ success: true, data: msg, message: 'Message created.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT  /custom-messages/:id
router.put('/custom-messages/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await FriendFortune.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, data: updated, message: 'Message updated.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /custom-messages/:id
router.delete('/custom-messages/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const deleted = await FriendFortune.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /custom-messages/:id/share
router.patch('/custom-messages/:id/share', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await FriendFortune.findByIdAndUpdate(req.params.id, { $inc: { shareCount: 1 } }, { new: true }).lean();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Bollywood sub-routes ─────────────────────────────────────────
router.get('/bollywood', async (req, res) => {
  try {
    const { page, limit, search, style } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const query = {};
    if (search) query.template = { $regex: search, $options: 'i' };
    if (style)  query.style    = style;
    const [data, total] = await Promise.all([
      BollywoodDialogue.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      BollywoodDialogue.countDocuments(query),
    ]);
    res.json({ success: true, data, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/bollywood', async (req, res) => {
  try {
    const doc = new BollywoodDialogue(req.body);
    await doc.save();
    res.status(201).json({ success: true, data: doc, message: 'Dialogue created.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.put('/bollywood/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await BollywoodDialogue.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/bollywood/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    await BollywoodDialogue.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── MummyScolding sub-routes ─────────────────────────────────────
router.get('/mummy', async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const query = {};
    if (search) query.$or = [{ context: { $regex: search, $options: 'i' } }, { scolding: { $regex: search, $options: 'i' } }];
    const [data, total] = await Promise.all([
      MummyScolding.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      MummyScolding.countDocuments(query),
    ]);
    res.json({ success: true, data, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/mummy', async (req, res) => {
  try {
    const doc = new MummyScolding(req.body);
    await doc.save();
    res.status(201).json({ success: true, data: doc, message: 'Scolding created.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.put('/mummy/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await MummyScolding.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/mummy/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    await MummyScolding.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── SharmaJiBeta sub-routes ──────────────────────────────────────
router.get('/sharma', async (req, res) => {
  try {
    const { page, limit, search, intensity } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const query = {};
    if (search)    query.$or = [{ achievement: { $regex: search, $options: 'i' } }, { insult: { $regex: search, $options: 'i' } }];
    if (intensity) query.intensity = intensity;
    const [data, total] = await Promise.all([
      SharmaJiBeta.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      SharmaJiBeta.countDocuments(query),
    ]);
    res.json({ success: true, data, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/sharma', async (req, res) => {
  try {
    const doc = new SharmaJiBeta({ ...req.body, lastUsed: new Date() });
    await doc.save();
    res.status(201).json({ success: true, data: doc, message: 'Entry created.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.put('/sharma/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await SharmaJiBeta.findByIdAndUpdate(req.params.id, { ...req.body, lastUsed: new Date() }, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/sharma/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    await SharmaJiBeta.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── NameFortune sub-routes ───────────────────────────────────────
router.get('/name-fortune', async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const query = { isActive: true };
    if (search) query.template = { $regex: search, $options: 'i' };
    const [data, total] = await Promise.all([
      NameFortune.find(query).sort({ popularity: -1 }).skip(skip).limit(lim).lean(),
      NameFortune.countDocuments(query),
    ]);
    res.json({ success: true, data, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/name-fortune', async (req, res) => {
  try {
    const doc = new NameFortune(req.body);
    await doc.save();
    res.status(201).json({ success: true, data: doc, message: 'Name Fortune created.' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Template already exists.' });
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/name-fortune/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await NameFortune.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/name-fortune/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    await NameFortune.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── WhatsApp Status sub-routes ───────────────────────────────────
router.get('/whatsapp-status', async (req, res) => {
  try {
    const { page, limit, search, templateName } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const query = {};
    if (search)       query.fortuneText  = { $regex: search, $options: 'i' };
    if (templateName) query.templateName = templateName;
    const [data, total] = await Promise.all([
      WhatsAppStatus.find(query).sort({ usageCount: -1 }).skip(skip).limit(lim).lean(),
      WhatsAppStatus.countDocuments(query),
    ]);
    res.json({ success: true, data, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/whatsapp-status', async (req, res) => {
  try {
    const doc = new WhatsAppStatus(req.body);
    await doc.save();
    res.status(201).json({ success: true, data: doc, message: 'WhatsApp Status created.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.put('/whatsapp-status/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await WhatsAppStatus.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/whatsapp-status/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    await WhatsAppStatus.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/whatsapp-status/:id/use', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await WhatsAppStatus.findByIdAndUpdate(req.params.id, { $inc: { usageCount: 1 } }, { new: true }).lean();
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── Prediction Log sub-routes ────────────────────────────────────
router.get('/prediction-log', async (req, res) => {
  try {
    const { page, limit, templateType, userReaction, userId } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const query = {};
    if (templateType)  query.templateType  = templateType;
    if (userReaction)  query.userReaction  = userReaction;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) query.user = userId;
    const [data, total] = await Promise.all([
      PredictionLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).populate('user', 'name email').lean(),
      PredictionLog.countDocuments(query),
    ]);
    res.json({ success: true, data, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/prediction-log', async (req, res) => {
  try {
    const log = new PredictionLog(req.body);
    await log.save();
    res.status(201).json({ success: true, data: log });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.patch('/prediction-log/:id/react', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const { userReaction } = req.body;
    const allowed = ['liked', 'disliked', 'shared', 'skipped'];
    if (!allowed.includes(userReaction))
      return res.status(400).json({ success: false, message: 'Invalid reaction.' });
    const updated = await PredictionLog.findByIdAndUpdate(req.params.id, { userReaction }, { new: true }).lean();
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Analytics summary for prediction log
router.get('/prediction-log/analytics', async (req, res) => {
  try {
    const summary = await PredictionLog.aggregate([
      { $group: {
        _id: '$templateType',
        total:    { $sum: 1 },
        liked:    { $sum: { $cond: [{ $eq: ['$userReaction', 'liked']    }, 1, 0] } },
        disliked: { $sum: { $cond: [{ $eq: ['$userReaction', 'disliked'] }, 1, 0] } },
        shared:   { $sum: { $cond: [{ $eq: ['$userReaction', 'shared']   }, 1, 0] } },
        skipped:  { $sum: { $cond: [{ $eq: ['$userReaction', 'skipped']  }, 1, 0] } },
      }},
      { $sort: { total: -1 } },
    ]);
    res.json({ success: true, data: summary });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/prediction-log/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    await PredictionLog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Log entry deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});


// ══════════════════════════════════════════════════════════════════════════
// 3. GIFT SETS  ·  /api/feature/pages/gift-sets
// ══════════════════════════════════════════════════════════════════════════

router.get('/gift-sets', async (req, res) => {
  try {
    const { page, limit, search, occasion, size, mood } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const query = {};
    if (search)   query.name     = { $regex: search, $options: 'i' };
    if (occasion) query.occasion = occasion;
    if (size)     query.size     = size;
    if (mood)     query.mood     = mood;

    const [data, total] = await Promise.all([
      GiftSet.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      GiftSet.countDocuments(query),
    ]);
    res.json({ success: true, data, total, page: parseInt(page) || 1 });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/gift-sets/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const doc = await GiftSet.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Gift set not found.' });
    res.json({ success: true, data: doc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/gift-sets', async (req, res) => {
  try {
    const doc = new GiftSet(req.body);
    await doc.save();
    res.status(201).json({ success: true, data: doc, message: 'Gift set created.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.put('/gift-sets/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await GiftSet.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Gift set not found.' });
    res.json({ success: true, data: updated, message: 'Gift set updated.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/gift-sets/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const deleted = await GiftSet.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Gift set not found.' });
    res.json({ success: true, message: 'Gift set deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});


// ══════════════════════════════════════════════════════════════════════════
// 4. BULK ORDERS  ·  /api/feature/pages/bulk-orders
// ══════════════════════════════════════════════════════════════════════════

router.get('/bulk-orders', async (req, res) => {
  try {
    const { page, limit, search, status, occasion, mood } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const query = {};
    if (search)   query.$or      = [{ companyName: { $regex: search, $options: 'i' } }, { contactName: { $regex: search, $options: 'i' } }, { contactEmail: { $regex: search, $options: 'i' } }];
    if (status)   query.status   = status;
    if (occasion) query.occasion = occasion;
    if (mood)     query.mood     = mood;

    const [data, total] = await Promise.all([
      BulkOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      BulkOrder.countDocuments(query),
    ]);

    const [statsAgg] = await BulkOrder.aggregate([
      { $group: {
        _id:           null,
        totalUnits:    { $sum: '$quantity' },
        totalPending:  { $sum: { $cond: [{ $eq: ['$status', 'pending']   }, 1, 0] } },
        totalDelivered:{ $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        totalOrders:   { $sum: 1 },
      }},
    ]);

    res.json({
      success: true, data, total, page: parseInt(page) || 1,
      stats: {
        total:     statsAgg?.totalOrders    || 0,
        pending:   statsAgg?.totalPending   || 0,
        delivered: statsAgg?.totalDelivered || 0,
        units:     statsAgg?.totalUnits     || 0,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/bulk-orders/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const doc = await BulkOrder.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, data: doc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/bulk-orders', async (req, res) => {
  try {
    if (!req.body.quantity || req.body.quantity < 50)
      return res.status(400).json({ success: false, message: 'Minimum quantity is 50 units.' });
    const doc = new BulkOrder({ ...req.body, status: 'pending' });
    await doc.save();
    res.status(201).json({ success: true, data: doc, message: 'Bulk order placed.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.put('/bulk-orders/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await BulkOrder.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, data: updated, message: 'Order updated.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/bulk-orders/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const deleted = await BulkOrder.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, message: 'Order deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/bulk-orders/:id/status', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const allowed = ['pending','confirmed','processing','shipped','delivered','cancelled'];
    if (!allowed.includes(req.body.status))
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    const updated = await BulkOrder.findByIdAndUpdate(req.params.id, { status: req.body.status, updatedAt: new Date() }, { new: true }).lean();
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});


// ══════════════════════════════════════════════════════════════════════════
// 5. REVIEWS  ·  /api/feature/pages/reviews
// ══════════════════════════════════════════════════════════════════════════

router.get('/reviews', async (req, res) => {
  try {
    const { page, limit, search, rating, category, isVerified, isFeatured } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const query = { isApproved: true };
    if (search)     query.$or        = [{ reviewerName: { $regex: search, $options: 'i' } }, { reviewText: { $regex: search, $options: 'i' } }];
    if (rating)     query.rating     = parseInt(rating);
    if (category)   query.category   = category;
    if (isVerified === 'true') query.isVerified = true;
    if (isFeatured === 'true') query.isFeatured = true;

    const [data, total] = await Promise.all([
      Review.find(query).sort({ isFeatured: -1, createdAt: -1 }).skip(skip).limit(lim).lean(),
      Review.countDocuments(query),
    ]);

    const statsAgg = await Review.aggregate([
      { $match: { isApproved: true } },
      { $group: {
        _id:         null,
        avgRating:   { $avg: '$rating' },
        total:       { $sum: 1 },
        fiveStar:    { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        fourStar:    { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        threeStar:   { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        twoStar:     { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        oneStar:     { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        totalHelpful:{ $sum: '$helpfulCount' },
      }},
    ]);

    res.json({
      success: true, data, total, page: parseInt(page) || 1,
      stats: statsAgg[0] || { avgRating: 0, total: 0, fiveStar: 0, fourStar: 0, threeStar: 0, twoStar: 0, oneStar: 0 },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: get all reviews including unapproved
router.get('/reviews/admin', async (req, res) => {
  try {
    const { page, limit, isApproved } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const query = {};
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    const [data, total] = await Promise.all([
      Review.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      Review.countDocuments(query),
    ]);
    res.json({ success: true, data, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/reviews/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const doc = await Review.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Review not found.' });
    res.json({ success: true, data: doc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/reviews', async (req, res) => {
  try {
    const doc = new Review({ ...req.body, isApproved: false }); // default pending moderation
    await doc.save();
    res.status(201).json({ success: true, data: doc, message: 'Review submitted for moderation.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.put('/reviews/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await Review.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Review not found.' });
    res.json({ success: true, data: updated, message: 'Review updated.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/reviews/:id', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Review deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/reviews/:id/approve', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await Review.findByIdAndUpdate(req.params.id, { isApproved: true, updatedAt: new Date() }, { new: true }).lean();
    res.json({ success: true, data: updated, message: 'Review approved.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/reviews/:id/feature', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const doc = await Review.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Review not found.' });
    doc.isFeatured = !doc.isFeatured;
    doc.updatedAt  = new Date();
    await doc.save();
    res.json({ success: true, data: doc, message: `Review ${doc.isFeatured ? 'featured' : 'unfeatured'}.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/reviews/:id/helpful', async (req, res) => {
  if (!safeId(req.params.id, res)) return;
  try {
    const updated = await Review.findByIdAndUpdate(req.params.id, { $inc: { helpfulCount: 1 } }, { new: true }).lean();
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── Our Story page — static content routes (for dynamic content blocks) ──
router.get('/our-story/milestones', async (req, res) => {
  // Static milestone data — can be moved to DB later if needed
  res.json({
    success: true,
    data: [
      { year: '2022', month: 'Jan', title: 'The Idea Cracks Open', desc: 'Founded in a Delhi PG kitchen at 2 AM over Maggi and bad decisions. The first fortune: "Kal subah se diet." Nobody believed it.' },
      { year: '2022', month: 'Aug', title: 'First 100 Fortunes', desc: 'The database hit 100 unique fortunes. The team celebrated with actual fortune cookies from a Chinese restaurant, which felt appropriately ironic.' },
      { year: '2023', month: 'Mar', title: 'Mood Engine Launch', desc: 'Shipped context-based fortune delivery — matching mood, city, time of day, and festival. First city: Delhi. First mood: roast.' },
      { year: '2023', month: 'Nov', title: 'Diwali Viral Moment', desc: '14,000 fortunes served on Diwali night alone. The servers were not ready. The memes were very ready.' },
      { year: '2024', month: 'Feb', title: '10K Users', desc: 'Ten thousand users, zero investor decks, one very overworked backend. The Prediction Log hit its first million entries.' },
      { year: '2024', month: 'Sep', title: 'Bulk Orders Launch', desc: 'First corporate bulk order: 500 units for a Bengaluru tech firm\'s offsite. Three team members still have their fortunes pinned above their monitors.' },
      { year: '2025', month: 'Jan', title: '50,000 Fortunes Served', desc: 'The milestone nobody planned for but everyone needed. Sharma Ji Beta alone accounted for 8,000 of those.' },
    ],
  });
});

router.get('/our-story/team', async (req, res) => {
  res.json({
    success: true,
    data: [
      { name: 'Arjun Malhotra', role: 'Co-Founder & Fortune Architect', city: 'Delhi', bio: 'Wrote the first 47 fortunes. Responsible for the entire roast category. His mother is not speaking to him about it.' },
      { name: 'Sneha Iyer',     role: 'Co-Founder & Backend Wizard',    city: 'Bengaluru', bio: 'Built the context engine at 3 AM during a Bengaluru rainstorm. The weather field in the schema was inspired by that exact night.' },
      { name: 'Rahul Gupta',    role: 'Content Lead',                   city: 'Mumbai', bio: 'Former screenwriter. Now writes fortunes. The Bollywood Dialogue templates are entirely his. His dad thinks he works in IT.' },
      { name: 'Priya Nair',     role: 'Design & Experience',            city: 'Kochi', bio: 'Designed the cookie SVG at 11 PM on a Tuesday. Said it would take 20 minutes. It took 4 hours. It was worth it.' },
    ],
  });
});


// ══════════════════════════════════════════════════════════════════════════
// 6. QUALITY PROMISE  ·  /api/feature/pages/quality
// ══════════════════════════════════════════════════════════════════════════

router.get('/quality/standards', async (req, res) => {
  res.json({
    success: true,
    data: [
      { title: 'Zero Duplicate Fortunes',   desc: 'The Fortune schema enforces unique: true on the text field. Every fortune in the database is provably unique at the database constraint level — not just "checked manually."', metric: '0 duplicates', icon: 'shield' },
      { title: 'Context Accuracy Rate',     desc: 'Fortunes are tagged across 8 parameters. Our internal audit checks that served fortunes match all requested context filters with >97% accuracy per batch.', metric: '97%+ accuracy', icon: 'target' },
      { title: 'Content Moderation',        desc: 'Every fortune and custom message goes through a 3-stage review: automated filter, peer review, and final approval before isActive is set to true.', metric: '3-stage review', icon: 'check-circle' },
      { title: 'Engagement Tracking',       desc: 'timesServed and shareCount fields track real engagement. Fortunes with zero serves after 30 days are flagged for review. Top performers are promoted to featured status.', metric: 'Real-time metrics', icon: 'bar-chart' },
      { title: 'Language Accuracy',         desc: 'Hindi and Hinglish fortunes are reviewed by native speakers. We maintain a separate internal style guide for Hinglish that avoids cliché while preserving authenticity.', metric: 'Native reviewed', icon: 'globe' },
      { title: 'Roast Level Calibration',   desc: 'The three roast levels (friendly, savage, deadly) are calibrated against a panel of 50 test users annually. What counts as "deadly" is a very specific and carefully maintained bar.', metric: 'Panel calibrated', icon: 'zap' },
    ],
  });
});

router.get('/quality/audit-log', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    // Return prediction log as proxy for quality audit trail
    const [data, total] = await Promise.all([
      PredictionLog.find().sort({ createdAt: -1 }).skip(skip).limit(lim).populate('user', 'name').lean(),
      PredictionLog.countDocuments(),
    ]);
    res.json({ success: true, data, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/quality/stats', async (req, res) => {
  try {
    const [fortuneStats] = await Fortune.aggregate([
      { $group: {
        _id:          null,
        total:        { $sum: 1 },
        active:       { $sum: { $cond: ['$isActive', 1, 0] } },
        totalServed:  { $sum: '$timesServed' },
        totalShared:  { $sum: '$shareCount' },
      }},
    ]);
    const [reactionStats] = await PredictionLog.aggregate([
      { $group: {
        _id:      null,
        liked:    { $sum: { $cond: [{ $eq: ['$userReaction', 'liked']    }, 1, 0] } },
        shared:   { $sum: { $cond: [{ $eq: ['$userReaction', 'shared']   }, 1, 0] } },
        total:    { $sum: 1 },
      }},
    ]);
    res.json({
      success: true,
      data: {
        fortunes:  fortuneStats  || {},
        reactions: reactionStats || {},
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});


module.exports = router;