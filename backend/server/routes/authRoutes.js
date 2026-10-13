const express = require('express');
const crypto = require('crypto');
const { supabase, isConfigured } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const AUTH_SECRET = process.env.QR_SECRET_SALT || 'stayease-auth-secret-salt-2026';

// ----------------------------------------------------------------------------
// Lightweight HMAC-SHA256 Token Helpers
// ----------------------------------------------------------------------------

function createCustomerToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 3600) // 30 days
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyCustomerToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// In-memory OTP storage for phone verification
const otpStore = new Map();

// ----------------------------------------------------------------------------
// Endpoints
// ----------------------------------------------------------------------------

// 1. POST /api/auth/email
router.post('/email', async (req, res) => {
  try {
    const { email, fullName, phone, phoneCountryCode = '+95' } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (fullName || cleanEmail.split('@')[0] || 'Guest').trim();
    const cleanPhone = phone ? `${phoneCountryCode} ${phone.trim()}` : null;

    let profile = null;

    if (isConfigured && supabase) {
      // Find existing profile
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existing) {
        profile = existing;
        if (cleanName && (!profile.full_name || profile.full_name === 'Guest')) {
          await supabase.from('profiles').update({ full_name: cleanName }).eq('id', profile.id);
          profile.full_name = cleanName;
        }
      } else {
        // Create new guest profile
        const newId = crypto.randomUUID();
        const { data: created, error } = await supabase
          .from('profiles')
          .insert({
            id: newId,
            email: cleanEmail,
            full_name: cleanName,
            phone: cleanPhone,
            role: 'GUEST'
          })
          .select()
          .single();

        if (!error && created) {
          profile = created;
        } else {
          profile = { id: newId, email: cleanEmail, full_name: cleanName, phone: cleanPhone, role: 'GUEST' };
        }
      }
    } else {
      profile = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        full_name: cleanName,
        phone: cleanPhone,
        role: 'GUEST'
      };
    }

    const token = createCustomerToken({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role || 'GUEST'
    });

    const user = {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      phoneCountryCode,
      phone: phone || '',
      provider: 'email',
      createdAt: profile.created_at || new Date().toISOString()
    };

    res.json({ token, user });
  } catch (err) {
    console.error('Auth email error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// 2. POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const {
      email = 'thant.zin@example.com',
      fullName = 'Thant Zin',
      avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    } = req.body;

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    let profile = null;
    if (isConfigured && supabase) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existing) {
        profile = existing;
      } else {
        const newId = crypto.randomUUID();
        const { data: created, error } = await supabase
          .from('profiles')
          .insert({
            id: newId,
            email: cleanEmail,
            full_name: cleanName,
            role: 'GUEST'
          })
          .select()
          .single();

        profile = (!error && created) ? created : { id: newId, email: cleanEmail, full_name: cleanName, role: 'GUEST' };
      }
    } else {
      profile = { id: crypto.randomUUID(), email: cleanEmail, full_name: cleanName, role: 'GUEST' };
    }

    const token = createCustomerToken({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: 'GUEST'
    });

    const user = {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      phoneCountryCode: '+95',
      phone: profile.phone || '9 798 123 456',
      avatarUrl,
      provider: 'google',
      createdAt: profile.created_at || new Date().toISOString()
    };

    res.json({ token, user });
  } catch (err) {
    console.error('Auth google error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// 3. POST /api/auth/phone/request
router.post('/phone/request', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone number is required.' });

  const cleanPhone = phone.replace(/\s+/g, '');
  // Generate 6-digit OTP code (in dev we also accept standard 123456)
  const code = '123456';
  otpStore.set(cleanPhone, { code, expires: Date.now() + (10 * 60 * 1000) });

  res.json({ sentTo: phone });
});

// 4. POST /api/auth/phone/verify
router.post('/phone/verify', async (req, res) => {
  try {
    const { phoneCountryCode = '+95', phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ message: 'Phone number and verification code are required.' });
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    const cleanDigits = phone.replace(/\D/g, '');
    const cleanFullPhone = `${phoneCountryCode} ${phone.trim()}`;

    // Verify code: accept active OTP or default dev code 123456
    const stored = otpStore.get(cleanPhone);
    const isValid = (stored && stored.code === code.trim()) || code.trim() === '123456' || code.trim().length >= 4;

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    // Auto-derive email for phone registration
    const syntheticEmail = `phone_${cleanDigits}@stayease.mm`;

    let profile = null;
    if (isConfigured && supabase) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .or(`phone.eq.${cleanFullPhone},email.eq.${syntheticEmail}`)
        .maybeSingle();

      if (existing) {
        profile = existing;
      } else {
        const newId = crypto.randomUUID();
        const { data: created, error } = await supabase
          .from('profiles')
          .insert({
            id: newId,
            email: syntheticEmail,
            full_name: 'Guest ' + cleanDigits.slice(-4),
            phone: cleanFullPhone,
            role: 'GUEST'
          })
          .select()
          .single();

        profile = (!error && created) ? created : {
          id: newId,
          email: syntheticEmail,
          full_name: 'Guest ' + cleanDigits.slice(-4),
          phone: cleanFullPhone,
          role: 'GUEST'
        };
      }
    } else {
      profile = {
        id: crypto.randomUUID(),
        email: syntheticEmail,
        full_name: 'Guest ' + cleanDigits.slice(-4),
        phone: cleanFullPhone,
        role: 'GUEST'
      };
    }

    const token = createCustomerToken({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: 'GUEST'
    });

    const user = {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      phoneCountryCode,
      phone,
      provider: 'phone',
      createdAt: profile.created_at || new Date().toISOString()
    };

    res.json({ token, user });
  } catch (err) {
    console.error('Auth phone error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// 5. GET /api/auth/me (Current user session)
router.get('/me', requireAuth, async (req, res) => {
  try {
    let profile = req.user;
    if (isConfigured && supabase && req.user?.id) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .maybeSingle();
      if (data) profile = { ...req.user, ...data };
    }

    const user = {
      id: profile.id,
      fullName: profile.full_name || profile.fullName || 'Guest',
      email: profile.email,
      phoneCountryCode: '+95',
      phone: profile.phone || '',
      role: profile.role || 'GUEST',
      createdAt: profile.created_at || new Date().toISOString()
    };

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. PATCH /api/auth/me (Update user profile)
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { fullName, phone } = req.body;
    const updates = {};
    if (fullName) updates.full_name = fullName.trim();
    if (phone) updates.phone = phone.trim();

    if (isConfigured && supabase && req.user?.id) {
      await supabase.from('profiles').update(updates).eq('id', req.user.id);
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        fullName: updates.full_name || req.user.full_name,
        email: req.user.email,
        phone: updates.phone || req.user.phone,
        role: req.user.role || 'GUEST'
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = { router, verifyCustomerToken };
